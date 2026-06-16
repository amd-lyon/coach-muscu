import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '@shared/data/exercises.seed'
import { MUSCLE_GROUPS } from '@shared/types/common'

describe('catalogue d’exercices', () => {
  const ids = new Set(SEED_EXERCISES.map((e) => e.id))

  it('contient au moins 100 exercices', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(100)
  })

  it('a des identifiants uniques', () => {
    expect(ids.size).toBe(SEED_EXERCISES.length)
  })

  it('ne référence que des alternatives existantes', () => {
    for (const ex of SEED_EXERCISES) {
      for (const altId of ex.alternativeIds) {
        expect(ids.has(altId), `${ex.id} → alternative inconnue ${altId}`).toBe(true)
      }
    }
  })

  it('a au moins un équipement et un profil de risque valide par exercice', () => {
    for (const ex of SEED_EXERCISES) {
      expect(ex.equipment.length, ex.id).toBeGreaterThan(0)
      for (const v of Object.values(ex.risk)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(3)
      }
    }
  })

  it('couvre tous les groupes musculaires entraînables', () => {
    const covered = new Set(SEED_EXERCISES.map((e) => e.primaryMuscle))
    for (const m of MUSCLE_GROUPS) {
      if (m === 'gainage' || m === 'cardio' || m === 'mobilite') continue
      expect(covered.has(m), `aucun exercice pour ${m}`).toBe(true)
    }
  })
})
