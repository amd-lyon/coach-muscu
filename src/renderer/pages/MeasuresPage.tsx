import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { useTheme } from '../store/useTheme'
import type { BodyMeasure } from '@shared/types/session'

const uuid = () => crypto.randomUUID()
const today = () => new Date().toISOString().slice(0, 10)

/** Champs numériques mesurables (clé, libellé, unité). */
const FIELDS: { key: keyof BodyMeasure; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Poids', unit: 'kg' },
  { key: 'waistCm', label: 'Tour de taille', unit: 'cm' },
  { key: 'chestCm', label: 'Tour de poitrine', unit: 'cm' },
  { key: 'armCm', label: 'Tour de bras', unit: 'cm' },
  { key: 'thighCm', label: 'Tour de cuisse', unit: 'cm' },
  { key: 'hipCm', label: 'Tour de hanches', unit: 'cm' },
  { key: 'bodyFatPct', label: '% masse grasse', unit: '%' },
]

const FREQ_KEY = 'measureFrequency'

export function MeasuresPage() {
  const { theme } = useTheme()
  const [measures, setMeasures] = useState<BodyMeasure[]>([])
  const [draft, setDraft] = useState<BodyMeasure>({ id: '', date: today() })
  const [frequency, setFrequency] = useState<string>(() => localStorage.getItem(FREQ_KEY) ?? 'hebdomadaire')

  const reload = () => window.api.listMeasures().then(setMeasures)
  useEffect(() => {
    void reload()
  }, [])

  const setField = (key: keyof BodyMeasure, value: string) =>
    setDraft((d) => ({ ...d, [key]: value === '' ? undefined : Number(value) }))

  const save = async () => {
    await window.api.saveMeasure({ ...draft, id: draft.id || uuid() })
    setDraft({ id: '', date: today() })
    await reload()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette mesure ?')) return
    await window.api.deleteMeasure(id)
    await reload()
  }

  const setFreq = (v: string) => {
    setFrequency(v)
    localStorage.setItem(FREQ_KEY, v)
  }

  // Données triées par date croissante pour les courbes.
  const sorted = useMemo(() => [...measures].sort((a, b) => a.date.localeCompare(b.date)), [measures])
  const desc = useMemo(() => [...measures].sort((a, b) => b.date.localeCompare(a.date)), [measures])

  // Variation depuis la mesure précédente (poids).
  const weightDelta = useMemo(() => {
    const w = sorted.filter((m) => m.weightKg != null)
    if (w.length < 2) return null
    return (w[w.length - 1].weightKg as number) - (w[w.length - 2].weightKg as number)
  }, [sorted])

  const axis = theme === 'dark' ? '#94a3b8' : '#64748b'
  const grid = theme === 'dark' ? '#334155' : '#e2e8f0'
  const tooltipStyle = {
    background: theme === 'dark' ? '#1e2128' : '#fff',
    border: `1px solid ${grid}`,
    borderRadius: 12,
    fontSize: 12,
  }

  return (
    <div>
      <PageHeader title="Mesures corporelles" subtitle="Suis l’évolution de ton corps dans le temps" />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-700/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <p className="text-slate-600 dark:text-slate-300">
          Les variations quotidiennes de poids (eau, digestion, sel…) sont normales : ne tire de
          conclusion que sur les <strong>tendances</strong> de plusieurs semaines. Mesure-toi de
          préférence le matin, à jeun, dans les mêmes conditions.
        </p>
      </div>

      {/* Saisie */}
      <div className="card mb-5 space-y-4">
        <h2 className="font-semibold">Nouvelle mesure</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">
                {f.label} ({f.unit})
              </label>
              <input
                type="number"
                inputMode="decimal"
                className="input"
                value={(draft[f.key] as number | undefined) ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div>
          <label className="label">Notes</label>
          <input
            className="input"
            placeholder="Ressenti, conditions de mesure…"
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))}
          />
        </div>
        <button className="btn-primary" onClick={save}>
          <Plus className="h-4 w-4" /> Enregistrer la mesure
        </button>
      </div>

      {/* Fréquence */}
      <div className="card mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Fréquence de mesure souhaitée :</span>
        {['hebdomadaire', 'bimensuelle', 'mensuelle'].map((v) => (
          <button
            key={v}
            onClick={() => setFreq(v)}
            className={
              'rounded-full px-3 py-1 text-xs capitalize ' +
              (frequency === v ? 'bg-brand-500 text-white' : 'border border-slate-300 dark:border-slate-600')
            }
          >
            {v}
          </button>
        ))}
        <span className="text-xs text-slate-400">Repère personnel (rappel non automatique).</span>
      </div>

      {/* Courbe poids + taille */}
      {sorted.length >= 2 && (
        <div className="card mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Évolution poids & tour de taille</h3>
            {weightDelta != null && (
              <span
                className={
                  'text-xs font-medium ' + (weightDelta <= 0 ? 'text-green-500' : 'text-amber-500')
                }
              >
                {weightDelta > 0 ? '+' : ''}
                {weightDelta.toFixed(1)} kg depuis la dernière
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sorted} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="weightKg" name="Poids (kg)" stroke="#3667e8" strokeWidth={2} dot connectNulls />
              <Line type="monotone" dataKey="waistCm" name="Taille (cm)" stroke="#f59e0b" strokeWidth={1.5} dot connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historique */}
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Historique ({measures.length})</h3>
        {desc.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune mesure enregistrée pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Date</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="pb-2 pr-4">
                      {f.label}
                    </th>
                  ))}
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {desc.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-700/40">
                    <td className="py-2 pr-4 font-medium">{m.date}</td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="py-2 pr-4 tabular-nums">
                        {(m[f.key] as number | undefined) ?? '—'}
                      </td>
                    ))}
                    <td className="py-2 text-right">
                      <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Les photos de progression seront ajoutées prochainement (import local sécurisé, conservées
        uniquement sur ton Mac).
      </p>
    </div>
  )
}
