import { ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  PlusCircle,
  Dumbbell,
  CalendarDays,
  Play,
  Library,
  History,
  LineChart,
  HeartPulse,
  Ruler,
  FileDown,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '../store/useTheme'

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/profil', label: 'Mon profil', icon: User },
  { to: '/creer', label: 'Créer un programme', icon: PlusCircle },
  { to: '/programme', label: 'Programme actuel', icon: Dumbbell },
  { to: '/calendrier', label: '12 semaines', icon: CalendarDays },
  { to: '/seance', label: 'Séance du jour', icon: Play },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: Library },
  { to: '/historique', label: 'Historique', icon: History },
  { to: '/progression', label: 'Progression', icon: LineChart },
  { to: '/douleurs', label: 'Douleurs & récupération', icon: HeartPulse },
  { to: '/mesures', label: 'Mesures', icon: Ruler },
  { to: '/exports', label: 'Exports PDF', icon: FileDown },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => clsx('nav-link', isActive && 'nav-link-active')}
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function ThemeButton() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="btn-ghost titlebar-no-drag">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
    </button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex h-full">
      {/* Sidebar — visible sur grand écran (bureau) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700/60 dark:bg-surface-dark-2 md:flex">
        <div className="titlebar-drag flex h-14 items-center gap-2 px-5 pt-2">
          <Dumbbell className="ml-12 h-5 w-5 text-brand-500" />
          <span className="font-semibold tracking-tight">Coach Muscu</span>
        </div>
        <NavList />
        <div className="m-3">
          <ThemeButton />
        </div>
      </aside>

      {/* Tiroir mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-700/60 dark:bg-surface-dark-2">
            <div className="flex h-14 items-center gap-2 px-4">
              <Dumbbell className="h-5 w-5 text-brand-500" />
              <span className="font-semibold">Coach Muscu</span>
              <button className="ml-auto p-2" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="m-3">
              <ThemeButton />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-700/60 dark:bg-surface-dark-2 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>
          <Dumbbell className="h-5 w-5 text-brand-500" />
          <span className="font-semibold">Coach Muscu</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </header>
  )
}
