import { useEffect, useRef, useState, type CSSProperties } from 'react'

const SAMPLE = 'the user said the meeting moved to 3pm on thursday'
const NEEDLES = ['3pm', 'noon']
// One scan per play keeps the auto-animation well under 5s (WCAG 2.2.2 only
// requires a stop control past that). Replay alternates the needle, so the
// no-match case ("noon") is still shown on the next click.
const MAX_CYCLES = 1

type CharCell = { ch: string; index: number }
type WordToken = { letters: CharCell[]; space: CharCell | null }

function tokenize(sample: string): WordToken[] {
  const parts = sample.split(' ')
  let index = 0
  return parts.map((word, wi) => {
    const letters = word.split('').map((ch) => {
      const cell = { ch, index }
      index += 1
      return cell
    })
    const space = wi < parts.length - 1 ? { ch: ' ', index: index++ } : null
    return { letters, space }
  })
}

const WORDS = tokenize(SAMPLE)

function scanStyle(
  index: number,
  cursor: number,
  found: boolean,
  matchStart: number,
  matchEnd: number,
): CSSProperties {
  const inMatch = found && index >= matchStart && index < matchEnd
  const scanned = index < cursor
  return {
    color: inMatch ? 'var(--bg-page)' : scanned ? 'var(--fg-hi)' : 'var(--fg-low)',
    background: inMatch ? 'var(--chart-grep)' : 'transparent',
  }
}

export function GrepScanDemo() {
  const [cursor, setCursor] = useState(0)
  const [found, setFound] = useState(false)
  const [runId, setRunId] = useState(0)
  const [done, setDone] = useState(false)
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const needle = NEEDLES[runId % NEEDLES.length]
  const matchStart = SAMPLE.indexOf(needle)
  const willMatch = matchStart >= 0
  const matchEnd = willMatch ? matchStart + needle.length : SAMPLE.length

  useEffect(() => {
    if (reduced.current) {
      setCursor(matchEnd)
      setFound(willMatch)
      setDone(true)
      return
    }

    let timer = 0
    let i = 0
    let cycles = 0
    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms)
    }

    const step = () => {
      if (i >= matchEnd) {
        setFound(willMatch)
        setCursor(matchEnd)
        cycles += 1
        if (cycles >= MAX_CYCLES) {
          setDone(true)
          return
        }
        later(() => {
          i = 0
          setFound(false)
          setCursor(0)
          later(step, 200)
        }, 1600)
        return
      }
      i += 1
      setCursor(i)
      later(step, 28)
    }

    later(step, 200)
    return () => window.clearTimeout(timer)
  }, [runId, matchEnd, willMatch])

  function replay() {
    setCursor(0)
    setFound(false)
    setDone(false)
    setRunId((n) => n + 1)
  }

  let caption = 'Scanning left to right for an exact match.'
  if (found) caption = 'Match found. Grep stops here.'
  else if (done) caption = 'No match, nothing comes back.'

  return (
    <div className="mechanism-card">
      <h3 className="mechanism-card-title">How grep works</h3>
      <p className="mechanism-card-lead">
        Grep scans left to right and stops at an exact match. No match, nothing comes back.
      </p>
      <p className="mono grep-demo-line">
        {WORDS.map((word, wi) => (
          <span key={wi}>
            <span className="grep-demo-word">
              {word.letters.map((cell) => (
                <span
                  key={cell.index}
                  style={scanStyle(cell.index, cursor, found, matchStart, matchEnd)}
                >
                  {cell.ch}
                </span>
              ))}
            </span>
            {word.space ? (
              <span style={scanStyle(word.space.index, cursor, found, matchStart, matchEnd)}>
                {word.space.ch}
              </span>
            ) : null}
          </span>
        ))}
      </p>
      <div className="grep-demo-foot">
        <p className="mechanism-caption">
          Looking for “{needle}”. {caption}
        </p>
        {done && !reduced.current ? (
          <button type="button" className="grep-demo-replay" onClick={replay}>
            Replay
          </button>
        ) : null}
      </div>
    </div>
  )
}
