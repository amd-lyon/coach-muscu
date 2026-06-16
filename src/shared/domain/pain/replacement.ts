import type { Equipment } from '../../types/common'
import type { Exercise } from '../../types/exercise'
import type { PainConstraints, RiskAxis } from './painRules'

export interface AlternativeSuggestion {
  exercise: Exercise
  score: number
  advantages: string[]
  drawbacks: string[]
  /** Différences clés vs l'exercice d'origine. */
  differences: string[]
  /** true si compatible avec toutes les contraintes douleur actives. */
  safe: boolean
  reason: string
}

/** Un exercice respecte-t-il toutes les contraintes douleur ? */
export function satisfiesConstraints(ex: Exercise, constraints: PainConstraints): boolean {
  for (const [axis, max] of Object.entries(constraints.maxRiskByAxis)) {
    if (ex.risk[axis as RiskAxis] > (max as number)) return false
  }
  return true
}

/** L'exercice est-il réalisable avec l'équipement disponible ? */
export function isEquipmentAvailable(ex: Exercise, available: Equipment[]): boolean {
  if (available.length === 0) return true // aucun filtre
  return ex.equipment.some((e) => available.includes(e))
}

/** Risque total cumulé (pour préférer les options les plus douces). */
function totalRisk(ex: Exercise): number {
  const r = ex.risk
  return r.cervical + r.lombaire + r.coude + r.biceps + r.epaule + r.poignet + r.genou + r.hanche
}

/**
 * Classe des alternatives à un exercice, du plus pertinent au moins pertinent.
 * Utilisé à la fois par l'adaptation douleur et par le remplacement manuel.
 */
export function findAlternatives(
  origin: Exercise,
  catalog: Exercise[],
  options: {
    constraints?: PainConstraints
    availableEquipment?: Equipment[]
    level?: 1 | 2 | 3
    avoidIds?: Set<string>
    limit?: number
  } = {},
): AlternativeSuggestion[] {
  const { constraints, availableEquipment = [], level, avoidIds, limit = 5 } = options

  const candidates = catalog.filter(
    (ex) =>
      ex.id !== origin.id &&
      ex.primaryMuscle === origin.primaryMuscle &&
      !avoidIds?.has(ex.id) &&
      isEquipmentAvailable(ex, availableEquipment),
  )

  const suggestions = candidates.map((ex): AlternativeSuggestion => {
    const safe = constraints ? satisfiesConstraints(ex, constraints) : true
    const advantages: string[] = []
    const drawbacks: string[] = []
    const differences: string[] = []

    let score = 0

    // Sécurité vis-à-vis des douleurs actives = priorité n°1.
    if (constraints) {
      if (safe) {
        score += 40
        if (constraints.affectedAxes.length) advantages.push('Compatible avec les douleurs actives')
      } else {
        score -= 50
        drawbacks.push('Sollicite une zone douloureuse active')
      }
    }

    // Préférer un risque global plus faible.
    const riskDiff = totalRisk(origin) - totalRisk(ex)
    score += riskDiff * 3
    if (riskDiff > 0) advantages.push('Globalement plus doux pour les articulations')
    if (riskDiff < 0) drawbacks.push('Globalement plus exigeant articulairement')

    // Même type de mouvement = transfert proche.
    if (ex.movementType === origin.movementType) {
      score += 10
      advantages.push(`Même type de mouvement (${ex.movementType})`)
    } else {
      differences.push(`Type de mouvement différent (${ex.movementType} vs ${origin.movementType})`)
    }

    // Difficulté adaptée au niveau.
    if (level) {
      const gap = Math.abs(ex.difficulty - level)
      score += (2 - gap) * 5
      if (ex.difficulty > level) drawbacks.push('Plus technique que ton niveau actuel')
    }

    // Machine guidée = plus stable, souvent préférable en cas de douleur.
    if (ex.equipment.includes('machine-guidee') && constraints?.affectedAxes.length) {
      score += 8
      advantages.push('Machine guidée : trajectoire stable')
    }

    // Fatigue systémique moindre = bonus léger.
    score += (origin.risk.fatigueSystemique - ex.risk.fatigueSystemique) * 2

    if (ex.equipment.join() !== origin.equipment.join()) {
      differences.push(`Équipement : ${ex.equipment.join(', ')}`)
    }

    const reason = safe
      ? 'Même groupe musculaire, équipement disponible et compatible avec tes limitations.'
      : 'Même groupe musculaire mais à utiliser avec prudence selon tes douleurs.'

    return { exercise: ex, score, advantages, drawbacks, differences, safe, reason }
  })

  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit)
}
