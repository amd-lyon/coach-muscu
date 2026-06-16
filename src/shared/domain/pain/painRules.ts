import type { RiskProfile } from '../../types/common'
import type { Limitation, LimitationKind } from '../../types/pain'

/** Axes de risque correspondant à un profil d'exercice. */
export type RiskAxis = keyof RiskProfile

/** Limitations purement systémiques (fatigue) : agissent sur le volume global. */
const SYSTEMIC: LimitationKind[] = [
  'fatigue-generale',
  'mauvaise-recuperation',
  'manque-sommeil',
  'courbatures',
  'stress',
]

/** Associe une limitation articulaire à l'axe de risque concerné. */
const KIND_TO_AXIS: Partial<Record<LimitationKind, RiskAxis>> = {
  'discopathie-cervicale': 'cervical',
  'douleur-cervicale': 'cervical',
  'raideur-cervicale': 'cervical',
  'discopathie-lombaire': 'lombaire',
  'douleur-lombaire': 'lombaire',
  coude: 'coude',
  biceps: 'biceps',
  epaule: 'epaule',
  poignet: 'poignet',
  genou: 'genou',
  hanche: 'hanche',
}

export function isSystemic(kind: LimitationKind): boolean {
  return SYSTEMIC.includes(kind)
}

/**
 * Risque maximal toléré sur un axe en fonction de l'intensité de la douleur (0-10).
 * Plus la douleur est forte, plus le seuil est bas (donc plus exigeant).
 *  - 0-2  -> 3 (on tolère tout, simple vigilance)
 *  - 3-4  -> 2
 *  - 5-6  -> 1
 *  - 7-10 -> 0 (on évite toute sollicitation notable de la zone)
 */
function thresholdForIntensity(intensity: number): number {
  if (intensity >= 7) return 0
  if (intensity >= 5) return 1
  if (intensity >= 3) return 2
  return 3
}

export interface PainConstraints {
  /** Risque max toléré par axe (0-3). Un axe absent = aucune contrainte. */
  maxRiskByAxis: Partial<Record<RiskAxis, number>>
  /** Multiplicateur de volume global lié à la fatigue systémique (0.5 à 1). */
  systemicVolumeMultiplier: number
  /** Axes concernés par au moins une limitation active (pour les messages). */
  affectedAxes: RiskAxis[]
}

/**
 * Calcule les contraintes globales à partir des limitations actives.
 * Le seuil retenu pour un axe est le plus prudent (le plus bas) parmi
 * toutes les limitations le concernant. Une discopathie est traitée d'un
 * cran plus prudemment qu'une douleur simple de même intensité.
 */
export function computePainConstraints(limitations: Limitation[]): PainConstraints {
  const active = limitations.filter((l) => l.active)
  const maxRiskByAxis: Partial<Record<RiskAxis, number>> = {}
  const affected = new Set<RiskAxis>()

  let systemicPenalty = 0

  for (const lim of active) {
    if (isSystemic(lim.kind)) {
      // Chaque limitation systémique modérée à forte réduit le volume.
      systemicPenalty += Math.max(0, lim.intensity - 3) / 10
      continue
    }
    const axis = KIND_TO_AXIS[lim.kind]
    if (!axis) continue

    let threshold = thresholdForIntensity(lim.intensity)
    // Pathologie structurelle (discopathie) : un cran plus prudent.
    if (lim.kind.startsWith('discopathie')) threshold = Math.max(0, threshold - 1)
    // Douleur au repos : également plus prudent.
    if (lim.painAtRest) threshold = Math.max(0, threshold - 1)

    const current = maxRiskByAxis[axis]
    maxRiskByAxis[axis] = current === undefined ? threshold : Math.min(current, threshold)
    affected.add(axis)
  }

  const systemicVolumeMultiplier = Math.max(0.5, 1 - Math.min(0.5, systemicPenalty))

  return {
    maxRiskByAxis,
    systemicVolumeMultiplier,
    affectedAxes: [...affected],
  }
}

/**
 * Détecte les drapeaux rouges parmi les limitations actives.
 * Renvoie des messages d'alerte forts recommandant l'arrêt et l'avis médical.
 */
export function detectRedFlags(limitations: Limitation[]): string[] {
  const messages: string[] = []
  for (const lim of limitations.filter((l) => l.active)) {
    const f = lim.redFlags
    if (lim.intensity >= 8) {
      messages.push(
        `Douleur très élevée signalée (${lim.intensity}/10). Ne pas forcer ; envisager le repos et un avis professionnel.`,
      )
    }
    if (f?.irradiation)
      messages.push('Douleur irradiante signalée : interrompre l’exercice et consulter un professionnel de santé.')
    if (f?.fourmillements)
      messages.push('Fourmillements/engourdissements signalés : arrêter et consulter un professionnel de santé.')
    if (f?.faiblesse)
      messages.push('Faiblesse inhabituelle signalée : arrêter et consulter un professionnel de santé.')
    if (f?.douleurAigue)
      messages.push('Douleur aiguë signalée : ne jamais forcer à travers une douleur aiguë. Interrompre l’exercice.')
  }
  return [...new Set(messages)]
}

export const MEDICAL_DISCLAIMER =
  "Ces adaptations sont automatiques et indicatives. Elles ne constituent pas un diagnostic ni un avis médical, et ne remplacent pas l'avis d'un médecin ou d'un kinésithérapeute."
