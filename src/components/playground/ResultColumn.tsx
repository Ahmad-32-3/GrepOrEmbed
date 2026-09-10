import type { Session } from '../../lib/grepSearch'

interface RankedItem {
  session_id: string
  label: string
  detail?: string
  highlight?: { start: number; end: number }
}

interface Props {
  title: string
  accentVar: '--chart-grep' | '--chart-vector'
  elapsedMs: number | null
  items: RankedItem[]
  sessions: Session[]
  answerSessionIds: string[] | null
  emptyLabel: string
}

function Snippet({ text, highlight }: { text: string; highlight?: { start: number; end: number } }) {
  if (!highlight || highlight.start < 0 || highlight.end > text.length || highlight.end <= highlight.start) {
    return <p className="result-snippet">{text}</p>
  }
  return (
    <p className="result-snippet">
      {text.slice(0, highlight.start)}
      <mark className="result-match">{text.slice(highlight.start, highlight.end)}</mark>
      {text.slice(highlight.end)}
    </p>
  )
}

export function ResultColumn({
  title,
  accentVar,
  elapsedMs,
  items,
  sessions,
  answerSessionIds,
  emptyLabel,
}: Props) {
  const sessionById = new Map(sessions.map((s) => [s.session_id, s]))
  const top = items[0]
  const topCorrect = answerSessionIds && top ? answerSessionIds.includes(top.session_id) : null

  return (
    <div className="result-column" aria-live="polite">
      <div className="result-column-head">
        <h3 style={{ color: `var(${accentVar})` }}>{title}</h3>
        {elapsedMs !== null && <span className="mono result-time">{elapsedMs.toFixed(1)} ms</span>}
      </div>

      {answerSessionIds && elapsedMs !== null && (
        <p className={`result-verdict mono ${topCorrect ? 'is-correct' : 'is-incorrect'}`}>
          {topCorrect ? 'Found the right session first' : 'Missed it. No hit on an evidence session.'}
        </p>
      )}

      {items.length === 0 ? (
        <p className="chart-caption">
          {elapsedMs === null ? emptyLabel : 'No matches in this corpus.'}
        </p>
      ) : (
        <ol className="result-list">
          {items.slice(0, 5).map((item, i) => {
            const session = sessionById.get(item.session_id)
            const isAnswer = answerSessionIds?.includes(item.session_id) ?? false
            return (
              <li
                key={`${item.session_id}-${i}`}
                className={`result-item ${isAnswer ? 'result-item-answer' : ''}`}
              >
                <div className="result-item-head">
                  <span className="mono result-rank">{i + 1}</span>
                  <span className="result-session-id mono">{item.session_id}</span>
                  {session && <span className="result-category mono">{session.category}</span>}
                  {isAnswer && <span className="result-answer-tag mono">evidence session</span>}
                </div>
                {item.detail && <Snippet text={item.detail} highlight={item.highlight} />}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
