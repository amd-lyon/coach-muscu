import { useEffect, useState } from 'react'
import { PageHeader } from '../components/Layout'
import { EQUIPMENT, EQUIPMENT_LABELS, EXPERIENCE_LABELS } from '@shared/types/common'
import type { Equipment, ExperienceLevel } from '@shared/types/common'
import type { Profile } from '@shared/types/profile'

/** Profil par défaut prérempli avec les données fournies. */
const DEFAULT_PROFILE: Profile = {
  id: 'me',
  name: 'Anthony',
  age: undefined,
  sex: 'homme',
  heightCm: 182,
  weightKg: 73,
  targetWeightKg: undefined,
  level: 'intermediaire',
  practiceMonths: undefined,
  weeklyFrequency: 4,
  dailySteps: undefined,
  job: 'moderement-active',
  sleepHours: 7,
  habitualFatigue: 4,
  recoveryQuality: 6,
  maxSessionMinutes: 75,
  gymName: '',
  availableEquipment: ['machine-guidee', 'poulie', 'halteres', 'barre', 'banc', 'presse-cuisses'],
  updatedAt: new Date().toISOString(),
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.api.getProfile().then((p) => p && setProfile(p))
  }, [])

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  const toggleEquip = (e: Equipment) =>
    set(
      'availableEquipment',
      profile.availableEquipment.includes(e)
        ? profile.availableEquipment.filter((x) => x !== e)
        : [...profile.availableEquipment, e],
    )

  const save = async () => {
    const updated = await window.api.saveProfile(profile)
    setProfile(updated)
    setSaved(true)
  }

  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Tes informations physiques et sportives" />

      <div className="card space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Prénom / pseudonyme">
            <input className="input" value={profile.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Âge">
            <input
              type="number"
              className="input"
              value={profile.age ?? ''}
              onChange={(e) => set('age', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <Field label="Niveau">
            <select
              className="input"
              value={profile.level}
              onChange={(e) => set('level', e.target.value as ExperienceLevel)}
            >
              {Object.entries(EXPERIENCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Taille (cm)">
            <NumberInput value={profile.heightCm} onChange={(v) => set('heightCm', v)} />
          </Field>
          <Field label="Poids actuel (kg)">
            <NumberInput value={profile.weightKg} onChange={(v) => set('weightKg', v)} />
          </Field>
          <Field label="Poids cible (kg)">
            <NumberInput value={profile.targetWeightKg} onChange={(v) => set('targetWeightKg', v)} />
          </Field>
          <Field label="Fréquence (séances/sem)">
            <NumberInput value={profile.weeklyFrequency} onChange={(v) => set('weeklyFrequency', v)} />
          </Field>
          <Field label="Sommeil (h/nuit)">
            <NumberInput value={profile.sleepHours} onChange={(v) => set('sleepHours', v)} />
          </Field>
          <Field label="Temps max / séance (min)">
            <NumberInput value={profile.maxSessionMinutes} onChange={(v) => set('maxSessionMinutes', v)} />
          </Field>
          <Field label="Pas / jour (moyenne)">
            <NumberInput value={profile.dailySteps} onChange={(v) => set('dailySteps', v)} />
          </Field>
          <Field label="Salle fréquentée">
            <input className="input" value={profile.gymName ?? ''} onChange={(e) => set('gymName', e.target.value)} />
          </Field>
          <Field label="Activité professionnelle">
            <select className="input" value={profile.job} onChange={(e) => set('job', e.target.value as Profile['job'])}>
              <option value="sedentaire">Sédentaire</option>
              <option value="moderement-active">Modérément active</option>
              <option value="physique">Physique</option>
            </select>
          </Field>
        </div>

        <div>
          <p className="label">Équipements disponibles</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => {
              const on = profile.availableEquipment.includes(e)
              return (
                <button
                  key={e}
                  onClick={() => toggleEquip(e)}
                  className={
                    on
                      ? 'rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white'
                      : 'rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300'
                  }
                >
                  {EQUIPMENT_LABELS[e]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>
            Enregistrer
          </button>
          {saved && <span className="text-sm text-green-500">Profil enregistré ✓</span>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange }: { value?: number; onChange: (v?: number) => void }) {
  return (
    <input
      type="number"
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
    />
  )
}
