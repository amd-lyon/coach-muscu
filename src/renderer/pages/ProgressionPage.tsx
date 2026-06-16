import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarCheck, Dumbbell, Flame, Timer } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { useTheme } from '../store/useTheme'
import { MUSCLE_LABELS } from '@shared/types/common'
import type { MuscleGroup } from '@shared/types/common'
import type { Exercise } from '@shared/types/exercise'
import type { Program } from '@shared/types/program'
import type { BodyMeasure, DailyState, SessionLog } from '@shared/types/session'
import {
  bodyWeightSeries,
  computeKpis,
  exercisesWithHistory,
  filterSince,
  loadProgression,
  painFrequency,
  readinessSeries,
  sessionsPerWeek,
  volumePerMuscle,
  volumePerSession,
} from '@shared/domain/stats/analytics'

const PERIODS = [
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
  { label: 'Tout', days: 0 },
]

export function ProgressionPage() {
  const { theme } = useTheme()
  const [sessions, setSessions] = useState<SessionLog[]>([])
  const [measures, setMeasures] = useState<BodyMeasure[]>([])
  const [states, setStates] = useState<DailyState[]>([])
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map())
  const [program, setProgram] = useState<Program | null>(null)
  const [period, setPeriod] = useState(90)
  const [exerciseId, setExerciseId] = useState('')

  useEffect(() => {
    void (async () => {
      const programs = await window.api.listPrograms()
      const active = programs.find((p) => p.status === 'actif') ?? programs[0] ?? null
      setProgram(active)
      setSessions(await window.api.listSessions())
      setMeasures(await window.api.listMeasures())
      setStates(await window.api.listDailyStates())
      const ex = await window.api.listExercises()
      setCatalog(new Map(ex.map((e) => [e.id, e])))
    })()
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const fSessions = useMemo(() => filterSince(sessions, period, today), [sessions, period, today])
  const fStates = useMemo(() => filterSince(states, period, today), [states, period, today])
  const fMeasures = useMemo(() => filterSince(measures, period, today), [measures, period, today])

  const kpis = useMemo(() => computeKpis(fSessions, program?.sessions.length ?? 0), [fSessions, program])
  const volSession = useMemo(() => volumePerSession(fSessions), [fSessions])
  const volMuscle = useMemo(() => volumePerMuscle(fSessions, catalog), [fSessions, catalog])
  const perWeek = useMemo(() => sessionsPerWeek(fSessions), [fSessions])
  const weight = useMemo(() => bodyWeightSeries(fMeasures), [fMeasures])
  const readiness = useMemo(() => readinessSeries(fStates), [fStates])
  const pains = useMemo(() => painFrequency(fStates, fSessions), [fStates, fSessions])
  const exOptions = useMemo(() => exercisesWithHistory(sessions, catalog), [sessions, catalog])

  const selectedExId = exerciseId || exOptions[0]?.id || ''
  const loadSeries = useMemo(
    () => (selectedExId ? loadProgression(fSessions, selectedExId) : []),
    [fSessions, selectedExId],
  )

  const axis = theme === 'dark' ? '#94a3b8' : '#64748b'
  const grid = theme === 'dark' ? '#334155' : '#e2e8f0'
  const tooltipStyle = {
    background: theme === 'dark' ? '#1e2128' : '#fff',
    border: `1px solid ${grid}`,
    borderRadius: 12,
    fontSize: 12,
  }
  const hasData = sessions.some((s) => s.status === 'terminee')

  return (
    <div>
      <PageHeader title="Progression" subtitle="Charges, volume, assiduité, forme et douleurs" />

      <div className="mb-5 flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={
              'rounded-lg px-3 py-1.5 text-sm ' +
              (period === p.days ? 'bg-brand-500 text-white' : 'border border-slate-300 dark:border-slate-600')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={<Dumbbell className="h-5 w-5" />} label="Séances" value={`${kpis.doneSessions}`} />
        <Kpi icon={<CalendarCheck className="h-5 w-5" />} label="Assiduité" value={`${kpis.adherencePct}%`} />
        <Kpi
          icon={<Flame className="h-5 w-5" />}
          label="Volume total"
          value={`${kpis.totalVolume.toLocaleString('fr-FR')} kg`}
        />
        <Kpi icon={<Timer className="h-5 w-5" />} label="Durée moy." value={`${kpis.avgDurationMin} min`} />
      </div>

      {!hasData && (
        <div className="card mb-5 text-sm text-slate-500 dark:text-slate-400">
          Pas encore de séance terminée. Réalise une séance (ou charge la démo dans Paramètres) pour
          voir tes courbes se remplir.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Charge par exercice */}
        <ChartCard
          title="Charge par exercice"
          right={
            <select
              className="input w-44 py-1 text-xs"
              value={selectedExId}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              {exOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={loadSeries} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="maxLoad" name="Charge max (kg)" stroke="#3667e8" strokeWidth={2} dot />
              <Line type="monotone" dataKey="est1RM" name="1RM estimé (kg)" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Volume par séance */}
        <ChartCard title="Volume par séance (kg soulevés)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={volSession} margin={{ left: -16, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3667e8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3667e8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="volume" name="Volume (kg)" stroke="#3667e8" fill="url(#vol)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Volume par groupe musculaire */}
        <ChartCard title="Répartition par groupe musculaire (séries)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volMuscle.map((v) => ({ ...v, label: MUSCLE_LABELS[v.muscle as MuscleGroup] ?? v.muscle }))} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={axis} fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke={axis} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sets" name="Séries" fill="#3667e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Assiduité par semaine */}
        <ChartCard title="Assiduité (séances / semaine)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perWeek} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke={axis} fontSize={11} />
              <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Séances" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Poids corporel */}
        <ChartCard title="Poids corporel (kg)">
          {weight.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weight} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="weight" name="Poids (kg)" stroke="#3667e8" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty hint="Ajoute des mesures dans la page Mesures." />
          )}
        </ChartCard>

        {/* Forme : fatigue / sommeil */}
        <ChartCard title="Forme (énergie, fatigue, sommeil)">
          {readiness.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={readiness} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axis} fontSize={11} />
                <YAxis stroke={axis} fontSize={11} domain={[0, 10]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="energie" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="fatigue" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="sommeil" stroke="#3667e8" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty hint="Remplis l’état du jour avant tes séances." />
          )}
        </ChartCard>

        {/* Fréquence des douleurs */}
        <ChartCard title="Fréquence des douleurs">
          {pains.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pains} layout="vertical" margin={{ left: 40, right: 8, top: 8 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={axis} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="label" stroke={axis} fontSize={10} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Occurrences" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty hint="Aucune douleur enregistrée sur la période — tant mieux !" />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card">
      <div className="mb-2 inline-flex rounded-lg bg-brand-500/10 p-2 text-brand-500">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

function ChartCard({
  title,
  right,
  children,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-center text-sm text-slate-400">{hint}</div>
  )
}
