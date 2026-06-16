import { describe, expect, it } from 'vitest'
import { generateProgram } from '@shared/domain/generator/generateProgram'
import { adaptPlannedExercise } from '@shared/domain/pain/adaptExercise'
import { SEED_EXERCISES } from '@shared/data/exercises.seed'
import type { ProgramConfig } from '@shared/types/program'
import type { Limitation } from '@shared/types/pain'

const baseConfig: ProgramConfig = {
  name: 'Test',
  primaryObjective: 'hypertrophie',
  secondaryObjectives: [],
  weeks: 12,
  sessionsPerWeek: 4,
  trainingDays: [1, 2, 4, 5],
  maxSessionMinutes: 75,
  restBetweenSetsSec: 90,
  maxExercisesPerSession: 6,
  location: 'salle',
  availableEquipment: ['machine-guidee', 'poulie', 'halteres', 'barre', 'banc', 'presse-cuisses', 'velo'],
  musclePriorities: { dos: 'elevee' },
  cardio: {
    enabled: false,
    modes: [],
    placement: 'apres',
    frequencyPerWeek: 0,
    durationMin: 0,
    intensity: 'leger',
    prioritizeRecovery: true,
  },
  finishers: ['gainage-frontal'],
}

describe('generateProgram', () => {
  it('génère 12 semaines avec 4 séances chacune', () => {
    const program = generateProgram({
      config: baseConfig,
      level: 'intermediaire',
      catalog: SEED_EXERCISES,
      limitations: [],
    })
    expect(program.weeks).toHaveLength(12)
    expect(program.sessions).toHaveLength(12 * 4)
    expect(program.sessions.every((s) => s.exercises.length > 0)).toBe(true)
  })

  it('est déterministe (mêmes entrées -> même structure)', () => {
    const a = generateProgram({ config: baseConfig, level: 'intermediaire', catalog: SEED_EXERCISES, limitations: [] })
    const b = generateProgram({ config: baseConfig, level: 'intermediaire', catalog: SEED_EXERCISES, limitations: [] })
    expect(a.sessions.map((s) => s.exercises.map((e) => e.exerciseId))).toEqual(
      b.sessions.map((s) => s.exercises.map((e) => e.exerciseId)),
    )
  })

  it('applique des semaines de délestage', () => {
    const program = generateProgram({ config: baseConfig, level: 'intermediaire', catalog: SEED_EXERCISES, limitations: [] })
    expect(program.weeks.some((w) => w.block === 'delestage')).toBe(true)
  })

  it('priorise le volume du dos (priorité élevée)', () => {
    const program = generateProgram({ config: baseConfig, level: 'intermediaire', catalog: SEED_EXERCISES, limitations: [] })
    expect(program.rationale.join(' ')).toContain('Dos')
  })
})

describe('adaptPlannedExercise', () => {
  const lombalgie: Limitation = {
    id: 'l',
    kind: 'discopathie-lombaire',
    side: 'na',
    intensity: 7,
    chronic: true,
    painAtRest: false,
    painDuringMovement: true,
    active: true,
    createdAt: '',
    updatedAt: '',
  }

  it('remplace ou retire un squat barre en cas de lombalgie sévère', () => {
    const squat = SEED_EXERCISES.find((e) => e.id === 'quad-squat-barre')!
    const planned = {
      id: 'pe',
      exerciseId: squat.id,
      order: 0,
      sets: 4,
      prescribedSet: { reps: '8-12' },
      restSec: 120,
      locked: false,
      alternativeIds: [],
    }
    const decision = adaptPlannedExercise(
      planned,
      squat,
      SEED_EXERCISES,
      [lombalgie],
      ['machine-guidee', 'presse-cuisses'],
    )
    expect(['replace', 'remove']).toContain(decision.action)
    if (decision.action === 'replace') {
      const repl = SEED_EXERCISES.find((e) => e.id === decision.replacementId)!
      expect(repl.risk.lombaire).toBeLessThanOrEqual(0)
    }
  })

  it('ne touche pas un exercice sans risque pour la zone douloureuse', () => {
    const legExt = SEED_EXERCISES.find((e) => e.id === 'quad-extension')!
    const planned = {
      id: 'pe',
      exerciseId: legExt.id,
      order: 0,
      sets: 3,
      prescribedSet: { reps: '10-15' },
      restSec: 90,
      locked: false,
      alternativeIds: [],
    }
    const decision = adaptPlannedExercise(planned, legExt, SEED_EXERCISES, [lombalgie], ['machine-guidee'])
    expect(decision.action).toBe('keep')
  })
})
