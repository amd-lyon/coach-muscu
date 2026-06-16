// Modèle des douleurs, pathologies et limitations physiques.

/** Zones/limitations gérées. Les "drapeaux" non articulaires sont systémiques. */
export type LimitationKind =
  | 'discopathie-cervicale'
  | 'douleur-cervicale'
  | 'raideur-cervicale'
  | 'discopathie-lombaire'
  | 'douleur-lombaire'
  | 'coude'
  | 'biceps'
  | 'epaule'
  | 'poignet'
  | 'genou'
  | 'hanche'
  | 'fatigue-generale'
  | 'mauvaise-recuperation'
  | 'manque-sommeil'
  | 'courbatures'
  | 'stress'
  | 'autre'

export type Side = 'gauche' | 'droite' | 'bilateral' | 'na'

export const LIMITATION_LABELS: Record<LimitationKind, string> = {
  'discopathie-cervicale': 'Discopathie cervicale',
  'douleur-cervicale': 'Douleur cervicale',
  'raideur-cervicale': 'Raideur cervicale',
  'discopathie-lombaire': 'Discopathie lombaire',
  'douleur-lombaire': 'Douleur lombaire',
  coude: 'Douleur au coude',
  biceps: 'Douleur au biceps',
  epaule: 'Douleur à l’épaule',
  poignet: 'Douleur au poignet',
  genou: 'Douleur au genou',
  hanche: 'Douleur à la hanche',
  'fatigue-generale': 'Fatigue générale',
  'mauvaise-recuperation': 'Mauvaise récupération',
  'manque-sommeil': 'Manque de sommeil',
  courbatures: 'Courbatures importantes',
  stress: 'Stress élevé',
  autre: 'Autre limitation',
}

/**
 * Une limitation déclarée par l'utilisateur.
 * `active` permet de l'activer/désactiver avant une séance sans la supprimer.
 */
export interface Limitation {
  id: string
  kind: LimitationKind
  customLabel?: string // si kind === 'autre'
  side: Side
  intensity: number // 0-10
  chronic: boolean // true = chronique, false = apparition récente
  painAtRest: boolean
  painDuringMovement: boolean
  triggerMovements?: string
  notes?: string
  active: boolean
  /** Drapeaux rouges signalés explicitement (déclenchent une alerte forte). */
  redFlags?: {
    irradiation?: boolean
    fourmillements?: boolean
    faiblesse?: boolean
    douleurAigue?: boolean
  }
  createdAt: string
  updatedAt: string
}
