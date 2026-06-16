import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'

export interface RestTimerHandle {
  /** Démarre (ou redémarre) le minuteur de repos pour `seconds` secondes. */
  start: (seconds: number) => void
}

/** Joue une tonalité courte via la Web Audio API (sans fichier externe). */
function tone(freq: number, duration: number, peak: number) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(peak, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    /* audio indisponible : on ignore */
  }
}

/** Tic discret du décompte (10 dernières secondes). */
const tick = () => tone(523, 0.09, 0.12)
/** Bip de fin de repos, plus marqué. */
const beep = () => tone(1046, 0.55, 0.22)

function notify() {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Repos terminé', { body: 'Série suivante !', silent: false })
    }
  } catch {
    /* notifications indisponibles : on ignore */
  }
}

/**
 * Minuteur de repos collant en bas d'écran. Contrôlé par l'extérieur via une
 * ref impérative : `timerRef.current?.start(90)` après une série.
 */
export const RestTimer = forwardRef<RestTimerHandle>(function RestTimer(_props, ref) {
  const [duration, setDuration] = useState(90)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useImperativeHandle(ref, () => ({
    start: (seconds: number) => {
      setDuration(seconds)
      setRemaining(seconds)
      setRunning(true)
      setVisible(true)
    },
  }))

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          beep()
          notify()
          setRunning(false)
          return 0
        }
        const next = r - 1
        // Décompte sonore sur les 10 dernières secondes.
        if (next <= 10) tick()
        return next
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  if (!visible) return null

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const pct = duration > 0 ? (remaining / duration) * 100 : 0
  const done = remaining === 0

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92%,520px)] -translate-x-1/2">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-surface-dark-2/95">
        <div className="flex items-center gap-3">
          <Timer className={done ? 'h-5 w-5 text-green-500' : 'h-5 w-5 text-brand-500'} />
          <span className="font-mono text-2xl tabular-nums">
            {mm}:{ss}
          </span>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={done ? 'h-full bg-green-500' : 'h-full bg-brand-500'}
                style={{ width: `${pct}%`, transition: 'width 1s linear' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[30, 60, 90, 120].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setDuration(s)
                  setRemaining(s)
                  setRunning(true)
                }}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              >
                {s}s
              </button>
            ))}
            <button
              onClick={() => setRunning((r) => !r)}
              className="btn-ghost px-2 py-1"
              title={running ? 'Pause' : 'Reprendre'}
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                setRemaining(duration)
                setRunning(true)
              }}
              className="btn-ghost px-2 py-1"
              title="Relancer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => setVisible(false)} className="btn-ghost px-2 py-1" title="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
