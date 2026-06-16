import type { SetLog } from '../../types/session'

export type ProgressionAction =
  | 'augmenter-charge'
  | 'ajouter-repetition'
  | 'conserver'
  | 'diminuer-charge'
  | 'reduire-volume'
  | 'remplacer'

export interface ProgressionAdvice {
  action: ProgressionAction
  message: string
  suggestedLoadKg?: number
  suggestedReps?: string
  /** Données ayant motivé la décision (traçabilité). */
  trace: Record<string, unknown>
}

export interface ProgressionInput {
  lastSets: SetLog[]
  repRange: string // ex. "8-12"
  stepKg: number // pas d'augmentation
  targetRir?: number
}

function parseRange(range: string): { lo: number; hi: number } | null {
  const m = range.match(/(\d+)\s*-\s*(\d+)/)
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) }
  const single = range.match(/(\d+)/)
  if (single) return { lo: Number(single[1]), hi: Number(single[1]) }
  return null
}

/**
 * Recommandation de progression (double progression).
 * On progresse d'abord dans la fourchette de répétitions, puis on augmente
 * la charge en revenant au bas de la fourchette. La douleur prime sur tout.
 */
export function recommendProgression(input: ProgressionInput): ProgressionAdvice {
  const done = input.lastSets.filter((s) => s.done && s.reps != null)
  const range = parseRange(input.repRange)

  // Sécurité : douleur notable -> on ne progresse jamais.
  const maxPain = Math.max(0, ...input.lastSets.map((s) => s.painDuring ?? 0))
  if (maxPain >= 6) {
    return {
      action: 'remplacer',
      message: `Douleur significative pendant l'exercice (${maxPain}/10). Réduis la charge/amplitude ou remplace l'exercice. Ne force pas.`,
      trace: { maxPain },
    }
  }
  if (maxPain >= 3) {
    return {
      action: 'diminuer-charge',
      message: `Gêne signalée (${maxPain}/10). Conserve une charge prudente et surveille la zone avant de progresser.`,
      trace: { maxPain },
    }
  }

  if (done.length === 0 || !range) {
    return { action: 'conserver', message: 'Pas assez de données : conserve la charge et observe.', trace: {} }
  }

  const reps = done.map((s) => s.reps as number)
  const loads = done.map((s) => s.loadKg ?? 0)
  const minReps = Math.min(...reps)
  const lastLoad = Math.max(...loads)
  const minRir = Math.min(...done.map((s) => s.rir ?? input.targetRir ?? 2))

  // Toutes les séries au sommet de la fourchette ET marge (RIR) suffisante
  // -> on augmente la charge et on repart du bas de la fourchette.
  if (minReps >= range.hi && minRir >= 1) {
    const next = Math.round((lastLoad + input.stepKg) * 100) / 100
    return {
      action: 'augmenter-charge',
      message: `Toutes les séries au sommet de la fourchette (${range.hi}+) avec de la marge : augmente à ${next} kg et repars de ${range.lo} reps.`,
      suggestedLoadKg: next,
      suggestedReps: `${range.lo}-${range.hi}`,
      trace: { minReps, minRir, lastLoad, stepKg: input.stepKg },
    }
  }

  // En dessous du bas de fourchette -> charge trop lourde.
  if (minReps < range.lo) {
    const next = Math.round((lastLoad - input.stepKg) * 100) / 100
    return {
      action: 'diminuer-charge',
      message: `Bas de fourchette non atteint (${minReps} < ${range.lo}) : réduis à ${Math.max(0, next)} kg pour rester dans la zone cible.`,
      suggestedLoadKg: Math.max(0, next),
      trace: { minReps, range },
    }
  }

  // Dans la fourchette -> on progresse en répétitions à charge égale.
  return {
    action: 'ajouter-repetition',
    message: `Dans la fourchette (${minReps}/${range.hi}) : conserve ${lastLoad} kg et vise +1 répétition par série jusqu'à ${range.hi}.`,
    suggestedLoadKg: lastLoad,
    suggestedReps: `${Math.min(range.hi, minReps + 1)}-${range.hi}`,
    trace: { minReps, range },
  }
}

/**
 * Estimation prudente du 1RM (formule d'Epley), seulement si pertinent
 * (charge connue, reps <= 12, faible douleur). Renvoie null sinon.
 */
export function estimate1RM(loadKg: number, reps: number): number | null {
  if (loadKg <= 0 || reps <= 0 || reps > 12) return null
  return Math.round(loadKg * (1 + reps / 30) * 10) / 10
}
