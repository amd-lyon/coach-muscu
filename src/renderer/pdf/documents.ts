/* eslint-disable @typescript-eslint/no-explicit-any */
// Générateurs de documents PDF. Chaque fonction renvoie une "docDefinition"
// pdfmake. Thème clair, lisible et adapté à l'impression.
import { MUSCLE_LABELS, OBJECTIVE_LABELS } from '@shared/types/common'
import type { MuscleGroup } from '@shared/types/common'
import { LIMITATION_LABELS } from '@shared/types/pain'
import type { Limitation } from '@shared/types/pain'
import type { Exercise } from '@shared/types/exercise'
import type { PlannedSession, Program } from '@shared/types/program'
import type { Profile } from '@shared/types/profile'
import type { BodyMeasure, DailyState, SessionLog } from '@shared/types/session'
import {
  bodyWeightSeries,
  computeKpis,
  loadProgression,
  painFrequency,
  volumePerMuscle,
  exercisesWithHistory,
} from '@shared/domain/stats/analytics'

const BRAND = '#244fd1'
const MUTED = '#64748b'
const DISCLAIMER =
  "Document généré par Coach Muscu. Adaptations indicatives, ne remplaçant pas un avis médical. Ne jamais forcer à travers une douleur aiguë."

type Cat = Map<string, Exercise>
const exName = (c: Cat, id: string) => c.get(id)?.nameFr ?? id

/** Petite case à cocher dessinée (fiable quelle que soit la police). */
function checkbox(size = 10) {
  return { canvas: [{ type: 'rect', x: 0, y: 0, w: size, h: size, lineWidth: 0.8, lineColor: MUTED }] }
}

function prescription(rpe?: number, rir?: number): string {
  const parts: string[] = []
  if (rpe != null) parts.push(`RPE ${rpe}`)
  if (rir != null) parts.push(`RIR ${rir}`)
  return parts.join(' · ') || '—'
}

const baseStyles = {
  h1: { fontSize: 22, bold: true, color: BRAND },
  h2: { fontSize: 15, bold: true, color: BRAND, margin: [0, 12, 0, 6] as [number, number, number, number] },
  h3: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] as [number, number, number, number] },
  muted: { fontSize: 9, color: MUTED },
  th: { bold: true, fontSize: 9, color: '#fff', fillColor: BRAND },
}

function footer(currentPage: number, pageCount: number) {
  return {
    columns: [
      { text: DISCLAIMER, style: 'muted', margin: [40, 0, 0, 0] },
      { text: `${currentPage} / ${pageCount}`, alignment: 'right', style: 'muted', margin: [0, 0, 40, 0] },
    ],
    margin: [0, 8, 0, 0],
  }
}

export interface PdfOptions {
  orientation: 'portrait' | 'landscape'
  weekFrom: number
  weekTo: number
  compact: boolean
}

/** Dictionnaire d'images pdfmake : id d'exercice -> data-URL PNG. */
export type ImageMap = Record<string, string>

/** Cellule "nom d'exercice" avec vignette optionnelle (référence le dico images). */
function nameCell(name: string, id: string, images: ImageMap, size = 40) {
  if (!images[id]) return { text: name, fontSize: 9 }
  return {
    columns: [
      { image: id, fit: [size, size], width: size },
      { text: name, fontSize: 9, margin: [4, size / 2 - 6, 0, 0] },
    ],
    columnGap: 0,
  }
}

// ---------------- 1. PROGRAMME COMPLET ----------------
export function buildProgramDoc(
  program: Program,
  profile: Profile | null,
  limitations: Limitation[],
  catalog: Cat,
  opts: PdfOptions,
  images: ImageMap = {},
): any {
  const weeks = program.weeks.filter((w) => w.index >= opts.weekFrom && w.index <= opts.weekTo)

  const cover = [
    { text: 'Programme de musculation', style: 'h1', margin: [0, 120, 0, 4] },
    { text: program.name, fontSize: 16, margin: [0, 0, 0, 2] },
    {
      text: `Objectif : ${OBJECTIVE_LABELS[program.config.primaryObjective]} · Split ${program.split} · ${program.config.sessionsPerWeek} séances/sem · ${program.config.weeks} semaines`,
      style: 'muted',
    },
    { text: `Semaines ${opts.weekFrom + 1} à ${opts.weekTo + 1}`, style: 'muted', margin: [0, 2, 0, 0] },
    { text: '', pageBreak: 'after' },
  ]

  const profileBlock = profile
    ? [
        { text: 'Profil', style: 'h2' },
        {
          columns: [
            kv('Nom', profile.name),
            kv('Niveau', profile.level),
            kv('Taille', profile.heightCm ? `${profile.heightCm} cm` : '—'),
            kv('Poids', profile.weightKg ? `${profile.weightKg} kg` : '—'),
          ],
        },
      ]
    : []

  const activeLims = limitations.filter((l) => l.active)
  const limitationsBlock =
    activeLims.length > 0
      ? [
          { text: 'Limitations prises en compte', style: 'h2' },
          {
            ul: activeLims.map(
              (l) => `${l.customLabel ?? LIMITATION_LABELS[l.kind]} — intensité ${l.intensity}/10${l.chronic ? ' (chronique)' : ''}`,
            ),
            fontSize: 10,
          },
        ]
      : []

  const weekBlocks = weeks.flatMap((week) => {
    const sessions = program.sessions.filter((s) => s.weekIndex === week.index)
    return [
      { text: week.label, style: 'h2' },
      { text: week.note, style: 'muted', margin: [0, 0, 0, 6] },
      ...sessions.flatMap((s) => sessionTable(s, catalog, opts.compact, images)),
    ]
  })

  return {
    pageSize: 'A4',
    pageOrientation: opts.orientation,
    pageMargins: [40, 40, 40, 40],
    info: { title: `Programme - ${program.name}` },
    images,
    content: [...cover, ...profileBlock, ...limitationsBlock, ...weekBlocks],
    styles: baseStyles,
    defaultStyle: { fontSize: 10, color: '#1e293b' },
    footer,
  }
}

function kv(label: string, value: string) {
  return { stack: [{ text: label, style: 'muted' }, { text: value, fontSize: 11 }] }
}

function sessionTable(s: PlannedSession, catalog: Cat, compact: boolean, images: ImageMap = {}): any[] {
  const body = [
    [
      { text: 'Exercice', style: 'th' },
      { text: 'Séries', style: 'th', alignment: 'center' },
      { text: 'Reps', style: 'th', alignment: 'center' },
      { text: 'RPE/RIR', style: 'th', alignment: 'center' },
      { text: 'Repos', style: 'th', alignment: 'center' },
    ],
    ...s.exercises.map((pe) => [
      nameCell(
        exName(catalog, pe.exerciseId) +
          (pe.isCardio ? ' (cardio)' : pe.isFinisher ? ' (finisher)' : ''),
        pe.exerciseId,
        images,
      ),
      { text: String(pe.sets), alignment: 'center', fontSize: 9 },
      { text: pe.prescribedSet.reps, alignment: 'center', fontSize: 9 },
      { text: prescription(pe.prescribedSet.targetRpe, pe.prescribedSet.targetRir), alignment: 'center', fontSize: 9 },
      { text: pe.restSec ? `${pe.restSec}s` : '—', alignment: 'center', fontSize: 9 },
    ]),
  ]
  const out: any[] = [
    { text: `${s.name}  ·  ≈ ${s.estimatedMinutes} min`, style: 'h3' },
    {
      table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 6],
    },
  ]
  if (!compact) {
    out.push({ text: `Échauffement : ${s.warmup.join(' · ')}`, style: 'muted', margin: [0, 0, 0, 2] })
    out.push({ text: `Retour au calme : ${s.cooldown.join(' · ')}`, style: 'muted', margin: [0, 0, 0, 8] })
  }
  return out
}

// ---------------- 2. FORMAT TÉLÉPHONE (une séance par page) ----------------
export function buildPhoneDoc(
  program: Program,
  catalog: Cat,
  opts: PdfOptions,
  images: ImageMap = {},
): any {
  const sessions = program.sessions.filter(
    (s) => s.weekIndex >= opts.weekFrom && s.weekIndex <= opts.weekTo,
  )

  const content = sessions.flatMap((s, idx) => {
    const rows = s.exercises.map((pe) => {
      const hasImg = !!images[pe.exerciseId]
      const infoStack = {
        stack: [
          { text: exName(catalog, pe.exerciseId), bold: true, fontSize: 13 },
          {
            text: `${pe.sets} séries × ${pe.prescribedSet.reps} reps   ·   ${prescription(pe.prescribedSet.targetRpe, pe.prescribedSet.targetRir)}   ·   repos ${pe.restSec || '—'}s`,
            fontSize: 11,
            color: MUTED,
            margin: [0, 2, 0, 0],
          },
        ],
      }
      const cells = hasImg
        ? [checkbox(12), { image: pe.exerciseId, fit: [54, 54], width: 54 }, infoStack]
        : [checkbox(12), infoStack]
      return {
        margin: [0, 0, 0, 10],
        table: { widths: hasImg ? [16, 56, '*'] : [16, '*'], body: [cells] },
        layout: 'noBorders',
      }
    })

    return [
      { text: s.name, style: 'h1', fontSize: 18, margin: [0, 0, 0, 2] },
      { text: `Semaine ${s.weekIndex + 1} · ≈ ${s.estimatedMinutes} min`, style: 'muted', margin: [0, 0, 0, 12] },
      ...rows,
      idx < sessions.length - 1 ? { text: '', pageBreak: 'after' } : {},
    ]
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [36, 36, 36, 36],
    info: { title: `Séances (téléphone) - ${program.name}` },
    images,
    content,
    styles: baseStyles,
    defaultStyle: { fontSize: 12, color: '#1e293b' },
  }
}

// ---------------- 3. FICHE DE SÉANCE IMPRIMABLE (à remplir) ----------------
export function buildSessionSheetDoc(session: PlannedSession, catalog: Cat, images: ImageMap = {}): any {
  const header = [
    { text: 'Fiche de séance', style: 'h1', fontSize: 18 },
    { text: session.name, fontSize: 13, margin: [0, 2, 0, 0] },
    { text: 'Date : _______________      Durée : ________      Forme du jour : ____ / 10', margin: [0, 6, 0, 12] },
  ]

  const body = [
    [
      { text: 'Exercice', style: 'th' },
      { text: 'Sér.', style: 'th', alignment: 'center' },
      { text: 'Cible', style: 'th', alignment: 'center' },
      { text: 'Charge', style: 'th', alignment: 'center' },
      { text: 'Reps', style: 'th', alignment: 'center' },
      { text: 'RPE', style: 'th', alignment: 'center' },
      { text: 'Douleur', style: 'th', alignment: 'center' },
      { text: 'Fait', style: 'th', alignment: 'center' },
    ],
    ...session.exercises.map((pe) => [
      nameCell(exName(catalog, pe.exerciseId), pe.exerciseId, images, 34),
      { text: String(pe.sets), alignment: 'center', fontSize: 10 },
      { text: pe.prescribedSet.reps, alignment: 'center', fontSize: 9, color: MUTED },
      { text: '', margin: [0, 8, 0, 8] },
      { text: '' },
      { text: '' },
      { text: '' },
      { ...checkbox(11), alignment: 'center', margin: [0, 4, 0, 0] },
    ]),
  ]

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    info: { title: `Fiche - ${session.name}` },
    images,
    content: [
      ...header,
      {
        table: { headerRows: 1, widths: ['*', 24, 36, 50, 40, 32, 44, 28], body },
        layout: 'grid',
      },
      { text: 'Sensations / douleurs :', style: 'h3', margin: [0, 14, 0, 4] },
      lines(2),
      { text: 'Commentaires :', style: 'h3', margin: [0, 10, 0, 4] },
      lines(2),
    ],
    styles: baseStyles,
    defaultStyle: { fontSize: 10, color: '#1e293b' },
    footer,
  }
}

function lines(n: number) {
  return {
    stack: Array.from({ length: n }, () => ({
      canvas: [{ type: 'line', x1: 0, y1: 8, x2: 515, y2: 8, lineWidth: 0.5, lineColor: '#cbd5e1' }],
      margin: [0, 0, 0, 6],
    })),
  }
}

// ---------------- 4. RAPPORT DE PROGRESSION ----------------
export function buildReportDoc(
  program: Program | null,
  sessions: SessionLog[],
  measures: BodyMeasure[],
  states: DailyState[],
  catalog: Cat,
): any {
  const kpis = computeKpis(sessions, program?.sessions.length ?? 0)
  const exos = exercisesWithHistory(sessions, catalog)
  const muscleRows = volumePerMuscle(sessions, catalog)
  const pains = painFrequency(states, sessions)
  const weight = bodyWeightSeries(measures)

  // Records & évolution par exercice.
  const records = exos.map((e) => {
    const series = loadProgression(sessions, e.id)
    const maxLoad = Math.max(0, ...series.map((s) => s.maxLoad))
    const best1RM = Math.max(0, ...series.map((s) => s.est1RM ?? 0))
    const first = series[0]?.maxLoad ?? 0
    const last = series[series.length - 1]?.maxLoad ?? 0
    return { name: e.name, maxLoad, best1RM, delta: Math.round((last - first) * 4) / 4 }
  })

  const kpiTable = {
    columns: [
      kv('Séances réalisées', String(kpis.doneSessions)),
      kv('Assiduité', `${kpis.adherencePct}%`),
      kv('Volume total', `${kpis.totalVolume.toLocaleString('fr-FR')} kg`),
      kv('Durée moyenne', `${kpis.avgDurationMin} min`),
    ],
    margin: [0, 0, 0, 8],
  }

  const content: any[] = [
    { text: 'Rapport de progression', style: 'h1' },
    { text: program ? program.name : 'Toutes séances', style: 'muted', margin: [0, 0, 0, 10] },
    kpiTable,
  ]

  if (records.length) {
    content.push({ text: 'Records & évolution des charges', style: 'h2' })
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Exercice', style: 'th' },
            { text: 'Charge max', style: 'th', alignment: 'center' },
            { text: '1RM estimé', style: 'th', alignment: 'center' },
            { text: 'Évolution', style: 'th', alignment: 'center' },
          ],
          ...records.map((r) => [
            { text: r.name, fontSize: 9 },
            { text: `${r.maxLoad} kg`, alignment: 'center', fontSize: 9 },
            { text: r.best1RM ? `${r.best1RM} kg` : '—', alignment: 'center', fontSize: 9 },
            {
              text: `${r.delta > 0 ? '+' : ''}${r.delta} kg`,
              alignment: 'center',
              fontSize: 9,
              color: r.delta > 0 ? '#16a34a' : r.delta < 0 ? '#dc2626' : MUTED,
            },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    })
  }

  if (muscleRows.length) {
    content.push({ text: 'Répartition du volume par muscle', style: 'h2' })
    content.push({
      ul: muscleRows.map(
        (m) => `${MUSCLE_LABELS[m.muscle as MuscleGroup] ?? m.muscle} : ${m.sets} séries (${m.volume.toLocaleString('fr-FR')} kg)`,
      ),
      fontSize: 10,
    })
  }

  if (weight.length >= 2) {
    const first = weight[0]
    const last = weight[weight.length - 1]
    const d = Math.round((last.weight - first.weight) * 10) / 10
    content.push({ text: 'Poids corporel', style: 'h2' })
    content.push({
      text: `De ${first.weight} kg (${first.date}) à ${last.weight} kg (${last.date}) — ${d > 0 ? '+' : ''}${d} kg.`,
      fontSize: 10,
    })
  }

  if (pains.length) {
    content.push({ text: 'Fréquence des douleurs', style: 'h2' })
    content.push({ ul: pains.map((p) => `${p.label} : ${p.count} fois`), fontSize: 10 })
  }

  content.push({ text: 'Bilan', style: 'h2' })
  content.push({
    text:
      kpis.doneSessions === 0
        ? 'Aucune séance enregistrée sur la période.'
        : `Sur ${kpis.doneSessions} séances, ${kpis.totalSets} séries effectuées pour un volume de ${kpis.totalVolume.toLocaleString('fr-FR')} kg. ${
            records.some((r) => r.delta > 0) ? 'Progression visible sur plusieurs exercices.' : 'Stabilité globale des charges.'
          } Continue en respectant la récupération et les signaux de douleur.`,
    fontSize: 10,
  })

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    info: { title: 'Rapport de progression' },
    content,
    styles: baseStyles,
    defaultStyle: { fontSize: 10, color: '#1e293b' },
    footer,
  }
}
