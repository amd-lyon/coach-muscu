import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Smartphone, ClipboardList, LineChart, Download } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import pdfMake from '../pdf/pdfmake'
import {
  buildPhoneDoc,
  buildProgramDoc,
  buildReportDoc,
  buildSessionSheetDoc,
  PdfOptions,
} from '../pdf/documents'
import type { Exercise } from '@shared/types/exercise'
import type { Limitation } from '@shared/types/pain'
import type { Profile } from '@shared/types/profile'
import type { Program } from '@shared/types/program'
import type { BodyMeasure, DailyState, SessionLog } from '@shared/types/session'

type DocType = 'programme' | 'telephone' | 'fiche' | 'rapport'

const DOC_TYPES: { key: DocType; label: string; desc: string; icon: React.ReactNode; needsProgram: boolean }[] = [
  { key: 'programme', label: 'Programme complet', desc: 'Couverture, profil, limitations, calendrier et détail des séances.', icon: <FileText className="h-5 w-5" />, needsProgram: true },
  { key: 'telephone', label: 'Format téléphone', desc: 'Une séance par page, gros texte, cases à cocher — pour la salle.', icon: <Smartphone className="h-5 w-5" />, needsProgram: true },
  { key: 'fiche', label: 'Fiche imprimable', desc: 'Une séance à remplir à la main (charge, reps, sensations).', icon: <ClipboardList className="h-5 w-5" />, needsProgram: true },
  { key: 'rapport', label: 'Rapport de progression', desc: 'Records, évolution des charges, volume, assiduité, douleurs.', icon: <LineChart className="h-5 w-5" />, needsProgram: false },
]

/**
 * Convertit une data-URL en PNG borné. pdfmake n'accepte que PNG/JPEG : cette
 * conversion via canvas gère aussi les GIF (1re image) et limite la taille.
 */
function imageToPng(dataUrl: string, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Nécessaire en version web pour dessiner une image distante (Wikimedia)
    // sur le canvas sans le « tainter » (sans effet en Electron / data-URL).
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max))
      const w = Math.max(1, Math.round((img.naturalWidth || max) * scale))
      const h = Math.max(1, Math.round((img.naturalHeight || max) * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
}

/** ids d'exercices présents dans la plage de semaines choisie. */
function weekExerciseIds(program: Program, opts: PdfOptions): string[] {
  return program.sessions
    .filter((s) => s.weekIndex >= opts.weekFrom && s.weekIndex <= opts.weekTo)
    .flatMap((s) => s.exercises.map((e) => e.exerciseId))
}

export function PdfExportPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [limitations, setLimitations] = useState<Limitation[]>([])
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [sessions, setSessions] = useState<SessionLog[]>([])
  const [measures, setMeasures] = useState<BodyMeasure[]>([])
  const [states, setStates] = useState<DailyState[]>([])

  const [docType, setDocType] = useState<DocType>('telephone')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [compact, setCompact] = useState(false)
  const [weekFrom, setWeekFrom] = useState(0)
  const [weekTo, setWeekTo] = useState(0)
  const [sheetSessionId, setSheetSessionId] = useState('')
  const [withImages, setWithImages] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const programs = await window.api.listPrograms()
      const active = programs.find((p) => p.status === 'actif') ?? programs[0] ?? null
      setProgram(active)
      setProfile(await window.api.getProfile())
      setLimitations(await window.api.listLimitations())
      setSessions(await window.api.listSessions())
      setMeasures(await window.api.listMeasures())
      setStates(await window.api.listDailyStates())
      const ex = await window.api.listExercises()
      setCatalog(new Map(ex.map((e) => [e.id, e])))
      if (active) {
        setWeekTo(Math.min(0, active.weeks.length - 1))
        setSheetSessionId(active.sessions[0]?.id ?? '')
      }
    })()
  }, [])

  const weekOptions = useMemo(
    () => (program ? program.weeks.map((w) => ({ value: w.index, label: `S${w.index + 1}` })) : []),
    [program],
  )
  const sheetSessions = useMemo(() => program?.sessions ?? [], [program])

  /** Résout les images des exercices en PNG (data-URL) pour pdfmake. */
  async function resolveImages(ids: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    for (const id of [...new Set(ids)]) {
      const ex = catalog.get(id)
      const spec = ex?.machineImage ?? ex?.movementImage
      if (!spec) continue
      const r = await window.api.resolveImage({ url: spec.url, localPath: spec.localPath })
      if (!r) continue
      try {
        out[id] = await imageToPng(r.dataUrl)
      } catch {
        /* image illisible : ignorée dans le PDF */
      }
    }
    return out
  }

  async function generate() {
    if (busy) return
    setBusy(true)
    try {
      const opts: PdfOptions = { orientation, weekFrom, weekTo: Math.max(weekFrom, weekTo), compact }
      let doc: unknown
      let filename = 'coach-muscu.pdf'

      if (docType === 'programme' && program) {
        const imgs = withImages ? await resolveImages(weekExerciseIds(program, opts)) : {}
        doc = buildProgramDoc(program, profile, limitations, catalog, opts, imgs)
        filename = 'coach-muscu-programme.pdf'
      } else if (docType === 'telephone' && program) {
        const imgs = withImages ? await resolveImages(weekExerciseIds(program, opts)) : {}
        doc = buildPhoneDoc(program, catalog, opts, imgs)
        filename = 'coach-muscu-seances-telephone.pdf'
      } else if (docType === 'fiche' && program) {
        const session = program.sessions.find((s) => s.id === sheetSessionId) ?? program.sessions[0]
        if (!session) return
        const imgs = withImages ? await resolveImages(session.exercises.map((e) => e.exerciseId)) : {}
        doc = buildSessionSheetDoc(session, catalog, imgs)
        filename = 'coach-muscu-fiche-seance.pdf'
      } else if (docType === 'rapport') {
        doc = buildReportDoc(program, sessions, measures, states, catalog)
        filename = 'coach-muscu-rapport.pdf'
      }
      if (!doc) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(pdfMake as any).createPdf(doc).download(filename)
    } finally {
      setTimeout(() => setBusy(false), 600)
    }
  }

  const current = DOC_TYPES.find((d) => d.key === docType)!
  const blockedNoProgram = current.needsProgram && !program

  return (
    <div>
      <PageHeader title="Exports PDF" subtitle="Programme, séances format téléphone, fiches et rapports" />

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        {DOC_TYPES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDocType(d.key)}
            className={
              'flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ' +
              (docType === d.key
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30')
            }
          >
            <div className="rounded-xl bg-brand-500/10 p-2 text-brand-500">{d.icon}</div>
            <div>
              <div className="font-medium">{d.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Options</h2>

        {blockedNoProgram ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ce document nécessite un programme.{' '}
            <Link to="/creer" className="text-brand-500">
              Crée un programme
            </Link>{' '}
            d’abord.
          </p>
        ) : (
          <>
            {(docType === 'programme' || docType === 'telephone') && program && (
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="label">De la semaine</label>
                  <select className="input w-24" value={weekFrom} onChange={(e) => setWeekFrom(Number(e.target.value))}>
                    {weekOptions.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">À la semaine</label>
                  <select className="input w-24" value={weekTo} onChange={(e) => setWeekTo(Number(e.target.value))}>
                    {weekOptions.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {docType === 'programme' && (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="label">Orientation</label>
                  <select
                    className="input w-36"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Paysage</option>
                  </select>
                </div>
                <label className="mt-5 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
                  Version compacte (sans échauffement détaillé)
                </label>
              </div>
            )}

            {docType === 'fiche' && program && (
              <div>
                <label className="label">Séance à imprimer</label>
                <select
                  className="input max-w-md"
                  value={sheetSessionId}
                  onChange={(e) => setSheetSessionId(e.target.value)}
                >
                  {sheetSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      S{s.weekIndex + 1} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {docType === 'rapport' && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Le rapport synthétise tes {sessions.filter((s) => s.status === 'terminee').length} séance(s)
                terminée(s), tes mesures et tes douleurs enregistrées.
              </p>
            )}

            {docType !== 'rapport' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} />
                Inclure les illustrations des exercices (quand disponibles)
              </label>
            )}

            <button className="btn-primary" onClick={generate} disabled={busy}>
              <Download className="h-4 w-4" /> {busy ? 'Génération…' : 'Générer le PDF'}
            </button>
            <p className="text-xs text-slate-400">
              Le PDF est enregistré dans ton dossier Téléchargements. Tu peux ensuite l’envoyer sur ton
              iPhone (AirDrop, Fichiers…).
            </p>
          </>
        )}
      </div>
    </div>
  )
}
