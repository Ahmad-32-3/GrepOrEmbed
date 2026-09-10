import { useEffect, useRef, useState } from 'react'

const STATS = [
  { value: '76.7', label: 'Claude Code' },
  { value: '93.1', label: 'Chronos' },
] as const

const INTERVAL_MS = 2200
const MAX_CYCLES = 4

export function Hero() {
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [emphasis, setEmphasis] = useState<0 | 1>(0)
  const [playing, setPlaying] = useState(() => !reduced.current)
  const [finished, setFinished] = useState(() => reduced.current)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    if (reduced.current || !playing || finished) return
    const id = window.setInterval(() => {
      setEmphasis((i) => (i === 0 ? 1 : 0))
      setTicks((t) => t + 1)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [playing, finished])

  useEffect(() => {
    if (ticks >= MAX_CYCLES && playing) {
      setPlaying(false)
      setFinished(true)
    }
  }, [ticks, playing])

  const equal = reduced.current || finished
  const showControl = !reduced.current

  function onToggle() {
    if (finished) {
      setFinished(false)
      setTicks(0)
      setEmphasis(0)
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }

  return (
    <header className="hero">
      <p className="hero-kicker mono">arXiv:2605.15184 · PwC US · May 2026</p>
      <h1>Is grep all you need?</h1>
      <div className="hero-stats">
        {STATS.map((stat, i) => {
          const on = equal || emphasis === i
          return (
            <div className="hero-stat-pair" key={stat.label}>
              <p className={`hero-stat tabular mono${on ? ' is-on' : ''}`}>
                {stat.value}
                <span className="hero-stat-unit">%</span>
              </p>
              <p className="hero-stat-label mono">{stat.label}</p>
            </div>
          )
        })}
      </div>
      {showControl ? (
        <button type="button" className="hero-pause" onClick={onToggle}>
          {playing ? 'Pause' : 'Play'}
        </button>
      ) : null}
      <p className="hero-sub">
        Same model, same question. The accuracy moves this much depending only on which harness
        wraps the retriever.
      </p>
    </header>
  )
}
