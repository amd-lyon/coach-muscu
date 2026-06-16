import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('theme', theme)
}

const initial = (localStorage.getItem('theme') as Theme) ?? 'dark'
apply(initial)

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    apply(next)
    set({ theme: next })
  },
  set: (t) => {
    apply(t)
    set({ theme: t })
  },
}))
