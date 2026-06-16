import { useEffect, useMemo, useState } from 'react'
import { Search, ExternalLink, ImageOff, Upload, Link2, Pencil, X } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '@shared/types/common'
import type { Exercise, ImageSource } from '@shared/types/exercise'

export function LibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Exercise | null>(null)

  useEffect(() => {
    void window.api.listExercises().then(setExercises)
  }, [])

  // Met à jour la liste et la sélection après modification d'un exercice.
  const handleSaved = (updated: Exercise) => {
    setExercises((list) => list.map((e) => (e.id === updated.id ? updated : e)))
    setSelected(updated)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? exercises.filter(
          (e) =>
            e.nameFr.toLowerCase().includes(q) ||
            e.nameEn.toLowerCase().includes(q) ||
            MUSCLE_LABELS[e.primaryMuscle].toLowerCase().includes(q),
        )
      : exercises
    return [...list].sort((a, b) => a.nameFr.localeCompare(b.nameFr))
  }, [exercises, query])

  return (
    <div>
      <PageHeader
        title="Bibliothèque d’exercices"
        subtitle={`${exercises.length} exercices — noms français et anglais, profils de risque articulaire`}
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-surface-dark-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="w-full bg-transparent py-2 text-sm outline-none"
          placeholder="Rechercher un exercice ou un muscle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className={
                'w-full rounded-xl border p-3 text-left transition-colors ' +
                (selected?.id === ex.id
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30')
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{ex.nameFr}</span>
                <span className="text-xs text-slate-400">{MUSCLE_LABELS[ex.primaryMuscle]}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {ex.movementType} · {ex.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')}
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <ExerciseDetail ex={selected} onSaved={handleSaved} />
        ) : (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            Sélectionne un exercice pour voir sa fiche détaillée.
          </div>
        )}
      </div>
    </div>
  )
}

function ExerciseDetail({ ex, onSaved }: { ex: Exercise; onSaved: (ex: Exercise) => void }) {
  const risks = Object.entries(ex.risk).filter(([, v]) => v > 0)
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{ex.nameFr}</h2>
        <p className="text-sm text-slate-400">{ex.nameEn}</p>
      </div>

      <ExerciseImages ex={ex} onSaved={onSaved} />

      <DetailBlock title="Position de départ">{ex.startPosition}</DetailBlock>
      <DetailBlock title="Exécution">{ex.execution}</DetailBlock>
      <DetailBlock title="Respiration">{ex.breathing}</DetailBlock>
      <DetailBlock title="Amplitude">{ex.rangeOfMotion}</DetailBlock>

      <div>
        <p className="label">Erreurs fréquentes</p>
        <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
          {ex.commonMistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>

      {risks.length > 0 && (
        <div>
          <p className="label">Profil de risque (0–3)</p>
          <div className="flex flex-wrap gap-2">
            {risks.map(([axis, v]) => (
              <span
                key={axis}
                className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                {axis} : {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {ex.contraindications.length > 0 && (
        <div>
          <p className="label">Précautions</p>
          <ul className="list-inside list-disc text-sm text-rose-500">
            {ex.contraindications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {ex.videoUrl && (
        <button className="btn-ghost" onClick={() => window.api.openExternal(ex.videoUrl!)}>
          <ExternalLink className="h-4 w-4" /> Voir une vidéo
        </button>
      )}
    </div>
  )
}

type Slot = 'machineImage' | 'movementImage'
const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'machineImage', label: 'Position de départ' },
  { slot: 'movementImage', label: 'Mouvement' },
]

/** Affiche les illustrations (départ + mouvement), avec attribution + édition. */
function ExerciseImages({ ex, onSaved }: { ex: Exercise; onSaved: (ex: Exercise) => void }) {
  // string = data-URL prête ; null = échec de résolution ; absent = en cours.
  const [urls, setUrls] = useState<Partial<Record<Slot, string | null>>>({})
  const [editing, setEditing] = useState(false)

  // Résout chaque image en data-URL local (télécharge si nécessaire).
  useEffect(() => {
    let alive = true
    setUrls({})
    for (const { slot } of SLOTS) {
      const img = ex[slot]
      if (!img) continue
      void window.api.resolveImage({ url: img.url, localPath: img.localPath }).then((r) => {
        if (alive) setUrls((u) => ({ ...u, [slot]: r ? r.dataUrl : null }))
      })
    }
    return () => {
      alive = false
    }
  }, [ex])

  const present = SLOTS.filter(({ slot }) => ex[slot])
  const credits = [
    ...new Map(present.map(({ slot }) => ex[slot]!).map((c) => [`${c.author}|${c.license}|${c.source}`, c])).values(),
  ]

  async function setImage(slot: Slot, img: ImageSource | undefined) {
    const updated: Exercise = { ...ex, [slot]: img, custom: true }
    const saved = await window.api.saveExercise(updated)
    onSaved(saved)
  }

  return (
    <div className="space-y-2">
      {present.length > 0 ? (
        <div className={'grid gap-3 ' + (present.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {present.map(({ slot, label }) => (
            <figure key={slot} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex h-44 items-center justify-center bg-white p-2">
                {urls[slot] ? (
                  <img src={urls[slot] as string} alt={label} className="max-h-full max-w-full object-contain" />
                ) : urls[slot] === null ? (
                  <span className="text-xs text-slate-400">Image indisponible</span>
                ) : (
                  <span className="text-xs text-slate-400">Chargement…</span>
                )}
              </div>
              <figcaption className="bg-slate-50 px-2 py-1 text-center text-xs text-slate-500 dark:bg-slate-700/30 dark:text-slate-400">
                {label}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400 dark:border-slate-600">
          <ImageOff className="h-4 w-4" /> Pas encore d’illustration pour cet exercice.
        </div>
      )}

      {credits.map((c, i) => (
        <p key={i} className="text-[11px] text-slate-400">
          Illustration : {c.author ?? 'source inconnue'}
          {c.license ? ` — ${c.license}` : ''}
          {c.source && (
            <>
              {' · '}
              <button onClick={() => window.api.openExternal(c.source!)} className="underline hover:text-brand-500">
                source
              </button>
            </>
          )}
        </p>
      ))}

      <button onClick={() => setEditing((e) => !e)} className="text-xs text-brand-500 hover:underline">
        <Pencil className="mr-1 inline h-3 w-3" />
        {editing ? 'Fermer l’édition' : 'Gérer les images'}
      </button>

      {editing && (
        <div className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-2">
          {SLOTS.map(({ slot, label }) => (
            <SlotEditor
              key={slot}
              label={label}
              current={ex[slot]}
              onImport={async () => {
                const r = await window.api.importImage()
                if (r) await setImage(slot, { localPath: r.localPath, author: 'Import personnel' })
              }}
              onUrl={async (url, author, license, source) => {
                const r = await window.api.resolveImage({ url })
                if (r) await setImage(slot, { url, localPath: r.localPath, author, license, source })
              }}
              onRemove={() => setImage(slot, undefined)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Éditeur d'un emplacement d'image (import fichier ou URL + crédit). */
function SlotEditor({
  label,
  current,
  onImport,
  onUrl,
  onRemove,
}: {
  label: string
  current?: ImageSource
  onImport: () => void
  onUrl: (url: string, author?: string, license?: string, source?: string) => void
  onRemove: () => void
}) {
  const [url, setUrl] = useState('')
  const [author, setAuthor] = useState('')
  const [license, setLicense] = useState('')
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {current && (
          <button onClick={onRemove} className="text-slate-400 hover:text-rose-500" title="Retirer">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <button onClick={onImport} className="btn-ghost w-full px-2 py-1 text-xs">
        <Upload className="h-3.5 w-3.5" /> Importer un fichier
      </button>
      <input className="input py-1 text-xs" placeholder="…ou coller une URL d’image" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="grid grid-cols-2 gap-1.5">
        <input className="input py-1 text-xs" placeholder="Auteur" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <input className="input py-1 text-xs" placeholder="Licence" value={license} onChange={(e) => setLicense(e.target.value)} />
      </div>
      <button
        disabled={!url.trim()}
        onClick={() => onUrl(url.trim(), author || undefined, license || undefined, url.trim())}
        className="btn-primary w-full px-2 py-1 text-xs"
      >
        <Link2 className="h-3.5 w-3.5" /> Charger depuis l’URL
      </button>
    </div>
  )
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{title}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  )
}
