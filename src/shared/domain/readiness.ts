import type { DailyState, ReadinessResult } from '../types/session'

/**
 * Calcule le « feu de séance » à partir de l'état du jour.
 *  vert   : séance normale
 *  orange : séance adaptée (volume/intensité réduits)
 *  rouge  : récupération ou séance très légère recommandée
 * Chaque décision est justifiée (section 14).
 */
export function evaluateReadiness(state: DailyState): ReadinessResult {
  const reasons: string[] = []

  // Score 0-100 : moyenne pondérée des facteurs positifs et négatifs.
  // Facteurs positifs (haut = bon) : énergie, sommeil, motivation.
  // Facteurs négatifs (haut = mauvais) : fatigue, stress, courbatures.
  const positive = (state.energy + state.sleep + state.motivation) / 3 // 0-10
  const negative = (state.fatigue + state.stress + state.soreness) / 3 // 0-10
  let score = Math.round((positive - negative + 10) * 5) // -> 0-100 environ
  score = Math.max(0, Math.min(100, score))

  if (state.sleep <= 3) reasons.push('Sommeil insuffisant')
  if (state.fatigue >= 7) reasons.push('Fatigue élevée')
  if (state.soreness >= 7) reasons.push('Courbatures importantes')
  if (state.stress >= 7) reasons.push('Stress élevé')
  if (state.energy <= 3) reasons.push('Énergie basse')
  if (state.motivation <= 3) reasons.push('Motivation basse')

  // Douleur active forte = drapeau prioritaire.
  const maxPain = Math.max(0, ...state.activeLimitations.map((l) => l.intensity))
  if (maxPain >= 7) reasons.push(`Douleur active élevée (${maxPain}/10)`)

  let light: ReadinessResult['light']
  let recommendation: string
  let adjustments: ReadinessResult['adjustments']

  if (maxPain >= 8 || score < 35) {
    light = 'rouge'
    recommendation =
      'Récupération ou séance très légère recommandée. Privilégie mobilité, marche ou repos. Ne force pas sur une douleur.'
    adjustments = { volumeMultiplier: 0.4, intensityMultiplier: 0.7, dropToRecovery: true }
  } else if (maxPain >= 5 || score < 60 || reasons.length >= 2) {
    light = 'orange'
    recommendation =
      'Séance adaptée : volume et intensité réduits, prudence sur les zones sensibles, repos un peu plus longs.'
    adjustments = { volumeMultiplier: 0.75, intensityMultiplier: 0.9, dropToRecovery: false }
  } else {
    light = 'vert'
    recommendation = 'Bonne disposition : séance normale. Reste à l’écoute de tes sensations.'
    adjustments = { volumeMultiplier: 1, intensityMultiplier: 1, dropToRecovery: false }
    if (reasons.length === 0) reasons.push('Indicateurs au vert')
  }

  return { light, score, reasons, recommendation, adjustments }
}
