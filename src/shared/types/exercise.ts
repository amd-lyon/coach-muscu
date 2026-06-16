import type {
  Equipment,
  ExerciseCategory,
  MovementType,
  MuscleGroup,
  RiskProfile,
} from './common'

/** Source/licence d'une image, conservée pour le respect des droits. */
export interface ImageSource {
  /** URL d'origine (source libre). Absente si l'image a été importée localement. */
  url?: string
  /** Nom de fichier dans le cache local (`userData/images`). */
  localPath?: string
  author?: string
  license?: string
  source?: string
}

/**
 * Fiche d'exercice du catalogue.
 * Contient toutes les métadonnées sportives + le profil de risque
 * utilisé par le moteur d'adaptation aux douleurs.
 */
export interface Exercise {
  id: string
  nameFr: string
  nameEn: string
  category: ExerciseCategory
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  /** Équipements possibles pour réaliser l'exercice (au moins un requis). */
  equipment: Equipment[]
  difficulty: 1 | 2 | 3 // 1 débutant, 2 intermédiaire, 3 confirmé
  movementType: MovementType
  /** Niveau de risque par zone (0-3). */
  risk: RiskProfile

  // Consignes pédagogiques
  startPosition: string
  execution: string
  breathing: string
  rangeOfMotion: string
  commonMistakes: string[]
  safetyTips: string[]

  // Relations
  /** ids d'exercices considérés comme variantes proches. */
  variantIds: string[]
  /** ids d'alternatives recommandées (souvent plus tolérantes). */
  alternativeIds: string[]
  contraindications: string[]

  // Média
  machineImage?: ImageSource
  movementImage?: ImageSource
  videoUrl?: string

  notes?: string
  /** true si l'exercice a été créé/modifié manuellement par l'utilisateur. */
  custom: boolean
}

/** Notation personnelle d'un exercice (bibliothèque). */
export interface ExerciseRating {
  exerciseId: string
  confort: number // 0-5
  efficacite: number
  plaisir: number
  difficulte: number
  douleur: number // 0-5, plus haut = douloureux
  disponibilite: number
  favori: boolean
  evite: boolean
  updatedAt: string
}
