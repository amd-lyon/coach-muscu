import { randomUUID } from 'node:crypto'
import { generateProgram } from '@shared/domain/generator/generateProgram'
import type { ProgramConfig } from '@shared/types/program'
import type { Profile } from '@shared/types/profile'
import type { SessionLog } from '@shared/types/session'
import { exerciseRepo, limitationRepo, profileRepo, programRepo, sessionRepo } from '../repositories'

/**
 * Crée des données de démonstration : profil fictif, programme 12 semaines,
 * quelques séances réalisées avec charges et une douleur ponctuelle.
 */
export function seedDemoData(): void {
  const now = new Date().toISOString()

  const profile: Profile = {
    id: 'me',
    name: 'Démo',
    age: 32,
    sex: 'homme',
    heightCm: 182,
    weightKg: 73,
    targetWeightKg: 74,
    level: 'intermediaire',
    practiceMonths: 36,
    weeklyFrequency: 4,
    dailySteps: 8000,
    job: 'moderement-active',
    sleepHours: 7,
    habitualFatigue: 4,
    recoveryQuality: 6,
    maxSessionMinutes: 75,
    gymName: 'Salle de démo',
    availableEquipment: [
      'machine-guidee',
      'poulie',
      'halteres',
      'barre',
      'banc',
      'presse-cuisses',
      'hack-squat',
      'tapis',
      'velo',
    ],
    updatedAt: now,
  }
  profileRepo.save(profile)

  // Une limitation chronique modérée au coude droit (illustration).
  limitationRepo.save({
    id: randomUUID(),
    kind: 'coude',
    side: 'droite',
    intensity: 4,
    chronic: true,
    painAtRest: false,
    painDuringMovement: true,
    triggerMovements: 'Curls lourds, prise serrée',
    active: true,
    createdAt: now,
    updatedAt: now,
  })

  const config: ProgramConfig = {
    name: 'Programme de démonstration',
    primaryObjective: 'recomposition',
    secondaryObjectives: ['hypertrophie'],
    weeks: 12,
    sessionsPerWeek: 4,
    trainingDays: [1, 2, 4, 5],
    maxSessionMinutes: 75,
    restBetweenSetsSec: 90,
    maxExercisesPerSession: 6,
    location: 'salle',
    availableEquipment: profile.availableEquipment,
    musclePriorities: { dos: 'elevee', pectoraux: 'normale', epaules: 'elevee' },
    cardio: {
      enabled: true,
      modes: ['velo'],
      placement: 'apres',
      frequencyPerWeek: 2,
      durationMin: 15,
      intensity: 'leger',
      prioritizeRecovery: true,
    },
    finishers: ['gainage-frontal', 'dead-bug'],
  }

  const program = generateProgram({
    config,
    level: profile.level,
    catalog: exerciseRepo.list(),
    limitations: limitationRepo.list(),
    makeId: () => randomUUID(),
    now,
  })
  program.status = 'actif'
  programRepo.save(program)

  // Trois premières séances "réalisées" avec des charges plausibles.
  const firstSessions = program.sessions.filter((s) => s.weekIndex === 0).slice(0, 3)
  firstSessions.forEach((ps, idx) => {
    const date = new Date(Date.now() - (3 - idx) * 86400000).toISOString().slice(0, 10)
    const log: SessionLog = {
      id: randomUUID(),
      programId: program.id,
      plannedSessionId: ps.id,
      date,
      status: 'terminee',
      durationMin: 68,
      exercises: ps.exercises
        .filter((e) => !e.isCardio && !e.isFinisher)
        .map((pe) => ({
          id: randomUUID(),
          plannedExerciseId: pe.id,
          exerciseId: pe.exerciseId,
          completed: true,
          replaced: false,
          sets: Array.from({ length: pe.sets }, (_, i) => ({
            id: randomUUID(),
            setIndex: i,
            loadKg: 30 + idx * 2.5,
            reps: 10,
            rpe: 8,
            rir: 2,
            done: true,
          })),
        })),
      createdAt: now,
      updatedAt: now,
    }
    sessionRepo.save(log)
  })
}
