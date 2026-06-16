import type { ProgramWeek, WeekBlock } from '../../types/program'

/**
 * Construit la périodisation par défaut sur N semaines (12 par défaut).
 * Modèle ondulatoire avec semaines de délestage régulières :
 *  - 1-3  prise en main / montée progressive
 *  - 4    délestage léger
 *  - 5-7  progression principale
 *  - 8    délestage
 *  - 9-11 consolidation / surcharge
 *  - 12   bilan, tests prudents
 * Pour des durées différentes, on insère un délestage toutes les 4 semaines.
 */
export function buildPeriodization(weeks = 12): ProgramWeek[] {
  const result: ProgramWeek[] = []
  for (let i = 0; i < weeks; i++) {
    const weekNo = i + 1
    let block: WeekBlock = 'progression'
    let label = `Semaine ${weekNo}`
    let volumeMultiplier = 1
    let intensityMultiplier = 1
    let note = ''

    const isDeload = weekNo % 4 === 0 && weekNo !== weeks
    const isLast = weekNo === weeks

    if (weekNo <= 3) {
      block = 'prise-en-main'
      label = `Semaine ${weekNo} — Prise en main`
      // Montée progressive : 80% -> 90% -> 100% du volume cible.
      volumeMultiplier = 0.8 + (weekNo - 1) * 0.1
      intensityMultiplier = 0.9 + (weekNo - 1) * 0.05
      note = 'Calibrage des charges, apprentissage technique, montée progressive.'
    } else if (isDeload) {
      block = 'delestage'
      label = `Semaine ${weekNo} — Délestage`
      volumeMultiplier = 0.6
      intensityMultiplier = 0.85
      note = 'Réduction du volume et de l’intensité pour récupérer et assimiler.'
    } else if (isLast) {
      block = 'bilan'
      label = `Semaine ${weekNo} — Bilan`
      volumeMultiplier = 0.75
      intensityMultiplier = 0.95
      note = 'Bilan du cycle, tests prudents, préparation du prochain bloc.'
    } else if (weekNo <= 7) {
      block = 'progression'
      label = `Semaine ${weekNo} — Progression`
      volumeMultiplier = 1 + (weekNo - 5) * 0.05
      intensityMultiplier = 1 + (weekNo - 5) * 0.03
      note = 'Surcharge progressive en volume et en charge.'
    } else {
      block = 'consolidation'
      label = `Semaine ${weekNo} — Consolidation`
      volumeMultiplier = 1.05 + (weekNo - 9) * 0.05
      intensityMultiplier = 1.05 + (weekNo - 9) * 0.03
      note = 'Consolidation et surcharge progressive plus marquée.'
    }

    result.push({
      index: i,
      block,
      label,
      volumeMultiplier: Math.round(volumeMultiplier * 100) / 100,
      intensityMultiplier: Math.round(intensityMultiplier * 100) / 100,
      note,
    })
  }
  return result
}
