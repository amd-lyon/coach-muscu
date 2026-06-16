import { useState } from 'react'
import { Database, Download, Upload, RotateCcw, FlaskConical } from 'lucide-react'
import { PageHeader } from '../components/Layout'

export function SettingsPage() {
  const [msg, setMsg] = useState('')

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      setMsg(ok)
    } catch (e) {
      setMsg('Erreur : ' + String(e))
    }
  }

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Données locales, sauvegardes et démonstration" />

      <div className="space-y-4">
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Database className="h-4 w-4" /> Sauvegardes
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Toutes tes données restent sur ton Mac. Exporte une archive JSON pour les conserver ou
            les transférer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              onClick={() => run(() => window.api.exportBackup(), 'Sauvegarde exportée.')}
            >
              <Download className="h-4 w-4" /> Exporter
            </button>
            <button
              className="btn-ghost"
              onClick={() => run(() => window.api.importBackup(), 'Sauvegarde importée.')}
            >
              <Upload className="h-4 w-4" /> Importer
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <FlaskConical className="h-4 w-4" /> Démonstration
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Charge un profil fictif, un programme 12 semaines et quelques séances réalisées pour
            explorer l’application.
          </p>
          <button
            className="btn-ghost"
            onClick={() => run(() => window.api.seedDemo(), 'Données de démonstration créées. Recharge les pages.')}
          >
            Charger la démo
          </button>
        </section>

        <section className="card border-rose-300/50">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-rose-500">
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Efface profil, programmes, séances et mesures (les exercices du catalogue sont
            conservés). Action irréversible.
          </p>
          <button
            className="btn bg-rose-500 text-white hover:bg-rose-600"
            onClick={() => {
              if (confirm('Confirmer la réinitialisation des données personnelles ?'))
                void run(() => window.api.resetApp(), 'Données réinitialisées.')
            }}
          >
            Réinitialiser les données
          </button>
        </section>

        {msg && <p className="text-sm text-brand-500">{msg}</p>}
      </div>
    </div>
  )
}
