import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { LIMITATION_LABELS } from '@shared/types/pain'
import type { Limitation, LimitationKind, Side } from '@shared/types/pain'
import { detectRedFlags, MEDICAL_DISCLAIMER } from '@shared/domain/pain/painRules'

const KINDS = Object.keys(LIMITATION_LABELS) as LimitationKind[]

export function PainPage() {
  const [items, setItems] = useState<Limitation[]>([])

  const reload = () => window.api.listLimitations().then(setItems)
  useEffect(() => {
    void reload()
  }, [])

  const add = async (kind: LimitationKind) => {
    const now = new Date().toISOString()
    const l: Limitation = {
      id: '',
      kind,
      side: kind === 'coude' || kind === 'biceps' ? 'droite' : 'na',
      intensity: 3,
      chronic: false,
      painAtRest: false,
      painDuringMovement: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    await window.api.saveLimitation(l)
    await reload()
  }

  const update = async (l: Limitation) => {
    await window.api.saveLimitation(l)
    await reload()
  }
  const remove = async (id: string) => {
    await window.api.deleteLimitation(id)
    await reload()
  }

  const redFlags = detectRedFlags(items)

  return (
    <div>
      <PageHeader
        title="Douleurs & récupération"
        subtitle="Active une limitation pour qu’elle adapte automatiquement ton programme"
      />

      {redFlags.length > 0 && (
        <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-700/50 dark:bg-rose-900/20">
          <div className="mb-1 flex items-center gap-2 font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" /> Signal d’alerte
          </div>
          <ul className="list-inside list-disc text-sm text-rose-600 dark:text-rose-300">
            {redFlags.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k} onClick={() => add(k)} className="btn-ghost text-xs">
            <Plus className="h-3.5 w-3.5" /> {LIMITATION_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="card text-sm text-slate-500 dark:text-slate-400">
            Aucune limitation déclarée. Ajoute-en une ci-dessus si tu ressens une douleur.
          </div>
        )}
        {items.map((l) => (
          <div key={l.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={l.active}
                  onChange={(e) => update({ ...l, active: e.target.checked })}
                  title="Active aujourd’hui"
                />
                <span className="font-medium">{l.customLabel ?? LIMITATION_LABELS[l.kind]}</span>
                {l.active && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                    active
                  </span>
                )}
              </div>
              <button onClick={() => remove(l.id)} className="text-slate-400 hover:text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="label">Intensité : {l.intensity}/10</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={l.intensity}
                  onChange={(e) => update({ ...l, intensity: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="label">Côté</label>
                <select
                  className="input"
                  value={l.side}
                  onChange={(e) => update({ ...l, side: e.target.value as Side })}
                >
                  <option value="na">Non applicable</option>
                  <option value="gauche">Gauche</option>
                  <option value="droite">Droite</option>
                  <option value="bilateral">Bilatéral</option>
                </select>
              </div>
              <div className="flex items-end gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={l.chronic}
                    onChange={(e) => update({ ...l, chronic: e.target.checked })}
                  />
                  Chronique
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={l.painAtRest}
                    onChange={(e) => update({ ...l, painAtRest: e.target.checked })}
                  />
                  Au repos
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">{MEDICAL_DISCLAIMER}</p>
    </div>
  )
}
