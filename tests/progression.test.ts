import { describe, expect, it } from 'vitest'
import { estimate1RM, recommendProgression } from '@shared/domain/load/progression'
import type { SetLog } from '@shared/types/session'

function set(p: Partial<SetLog>): SetLog {
  return { id: '', setIndex: 0, done: true, ...p }
}

describe('recommendProgression (double progression)', () => {
  it('augmente la charge quand le sommet de fourchette est atteint avec marge', () => {
    const advice = recommendProgression({
      lastSets: [set({ reps: 12, rir: 2, loadKg: 40 }), set({ reps: 12, rir: 1, loadKg: 40 })],
      repRange: '8-12',
      stepKg: 2.5,
    })
    expect(advice.action).toBe('augmenter-charge')
    expect(advice.suggestedLoadKg).toBe(42.5)
  })

  it('progresse en répétitions à l’intérieur de la fourchette', () => {
    const advice = recommendProgression({
      lastSets: [set({ reps: 9, rir: 2, loadKg: 40 })],
      repRange: '8-12',
      stepKg: 2.5,
    })
    expect(advice.action).toBe('ajouter-repetition')
    expect(advice.suggestedLoadKg).toBe(40)
  })

  it('diminue la charge sous le bas de fourchette', () => {
    const advice = recommendProgression({
      lastSets: [set({ reps: 6, loadKg: 40 })],
      repRange: '8-12',
      stepKg: 2.5,
    })
    expect(advice.action).toBe('diminuer-charge')
  })

  it('ne progresse jamais en cas de douleur significative', () => {
    const advice = recommendProgression({
      lastSets: [set({ reps: 12, loadKg: 40, painDuring: 7 })],
      repRange: '8-12',
      stepKg: 2.5,
    })
    expect(advice.action).toBe('remplacer')
  })
})

describe('estimate1RM', () => {
  it('renvoie null hors zone fiable', () => {
    expect(estimate1RM(50, 20)).toBeNull()
  })
  it('estime un 1RM plausible', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.7, 1)
  })
})
