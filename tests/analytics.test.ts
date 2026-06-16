import { describe, expect, it } from 'vitest'
import {
  computeKpis,
  isoWeekKey,
  loadProgression,
  volumePerMuscle,
} from '@shared/domain/stats/analytics'
import type { SessionLog } from '@shared/types/session'
import type { Exercise } from '@shared/types/exercise'
import { ZERO_RISK } from '@shared/types/common'

function session(date: string, exerciseId: string, sets: { load: number; reps: number }[]): SessionLog {
  return {
    id: date,
    programId: 'p',
    date,
    status: 'terminee',
    durationMin: 60,
    exercises: [
      {
        id: 'e',
        exerciseId,
        completed: true,
        replaced: false,
        sets: sets.map((s, i) => ({ id: `s${i}`, setIndex: i, loadKg: s.load, reps: s.reps, done: true })),
      },
    ],
    createdAt: '',
    updatedAt: '',
  }
}

const ex: Exercise = {
  id: 'pec',
  nameFr: 'Développé',
  nameEn: 'Press',
  category: 'pectoraux',
  primaryMuscle: 'pectoraux',
  secondaryMuscles: [],
  equipment: ['barre'],
  difficulty: 2,
  movementType: 'polyarticulaire',
  risk: ZERO_RISK,
  startPosition: '',
  execution: '',
  breathing: '',
  rangeOfMotion: '',
  commonMistakes: [],
  safetyTips: [],
  variantIds: [],
  alternativeIds: [],
  contraindications: [],
  custom: false,
}

describe('analytics', () => {
  const sessions = [
    session('2026-01-05', 'pec', [{ load: 40, reps: 10 }, { load: 40, reps: 10 }]),
    session('2026-01-12', 'pec', [{ load: 42.5, reps: 8 }]),
  ]

  it('calcule les KPIs (volume, assiduité)', () => {
    const k = computeKpis(sessions, 8)
    expect(k.doneSessions).toBe(2)
    expect(k.totalVolume).toBe(40 * 10 + 40 * 10 + 42.5 * 8) // 1140
    expect(k.adherencePct).toBe(25)
    expect(k.totalSets).toBe(3)
  })

  it('trace la progression de charge dans le temps', () => {
    const series = loadProgression(sessions, 'pec')
    expect(series.map((s) => s.maxLoad)).toEqual([40, 42.5])
    expect(series[0].est1RM).toBeGreaterThan(40)
  })

  it('agrège le volume par muscle', () => {
    const perMuscle = volumePerMuscle(sessions, new Map([['pec', ex]]))
    expect(perMuscle[0].muscle).toBe('pectoraux')
    expect(perMuscle[0].sets).toBe(3)
  })

  it('regroupe par semaine ISO', () => {
    expect(isoWeekKey('2026-01-05')).toBe('2026-S02')
  })
})
