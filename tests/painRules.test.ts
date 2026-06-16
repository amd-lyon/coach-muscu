import { describe, expect, it } from 'vitest'
import { computePainConstraints, detectRedFlags } from '@shared/domain/pain/painRules'
import type { Limitation } from '@shared/types/pain'

function lim(p: Partial<Limitation>): Limitation {
  return {
    id: p.id ?? 'l1',
    kind: p.kind ?? 'douleur-lombaire',
    side: 'na',
    intensity: p.intensity ?? 5,
    chronic: p.chronic ?? false,
    painAtRest: p.painAtRest ?? false,
    painDuringMovement: true,
    active: p.active ?? true,
    redFlags: p.redFlags,
    createdAt: '',
    updatedAt: '',
    ...p,
  }
}

describe('computePainConstraints', () => {
  it('ne contraint rien sans limitation active', () => {
    const c = computePainConstraints([lim({ active: false })])
    expect(c.affectedAxes).toHaveLength(0)
    expect(c.systemicVolumeMultiplier).toBe(1)
  })

  it('abaisse le seuil lombaire quand la douleur est forte', () => {
    const c = computePainConstraints([lim({ kind: 'douleur-lombaire', intensity: 8 })])
    expect(c.maxRiskByAxis.lombaire).toBe(0)
    expect(c.affectedAxes).toContain('lombaire')
  })

  it('est plus prudent pour une discopathie que pour une douleur simple', () => {
    const douleur = computePainConstraints([lim({ kind: 'douleur-lombaire', intensity: 4 })])
    const disco = computePainConstraints([lim({ kind: 'discopathie-lombaire', intensity: 4 })])
    expect(disco.maxRiskByAxis.lombaire).toBeLessThan(douleur.maxRiskByAxis.lombaire!)
  })

  it('réduit le volume avec la fatigue systémique', () => {
    const c = computePainConstraints([lim({ kind: 'fatigue-generale', intensity: 9 })])
    expect(c.systemicVolumeMultiplier).toBeLessThan(1)
    expect(c.systemicVolumeMultiplier).toBeGreaterThanOrEqual(0.5)
  })
})

describe('detectRedFlags', () => {
  it('alerte sur irradiation et douleur aiguë', () => {
    const flags = detectRedFlags([
      lim({ intensity: 5, redFlags: { irradiation: true, douleurAigue: true } }),
    ])
    expect(flags.length).toBeGreaterThanOrEqual(2)
  })
})
