import { useState } from 'react'
import type { Session } from '../../lib/grepSearch'
import { grepSearch, type GrepResult } from '../../lib/grepSearch'
import { embeddingSearch, type EmbeddingResult } from '../../lib/embeddingSearch'
import { ModelLoader } from './ModelLoader'
import { ResultColumn } from './ResultColumn'

const PLACEHOLDER = `Paste text or code here. Split it into chunks with a blank line between each one, for example:

The invoice service retries failed webhook deliveries up to five times with exponential backoff.

Customer support escalations page the on-call engineer after two failed retries within an hour.

The nightly reconciliation job compares Stripe payouts against internal ledger entries.`

function chunksToSessions(raw: string): Session[] {
  return raw
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, i) => ({
      session_id: `chunk-${i + 1}`,
      date: '',
      category: 'custom',
      turns: [{ role: 'user' as const, content: chunk }],
    }))
}

export function ByoMode({
  modelReady,
  onModelReady,
}: {
  modelReady: boolean
  onModelReady: () => void
}) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [grepResult, setGrepResult] = useState<GrepResult | null>(null)
  const [vectorResult, setVectorResult] = useState<EmbeddingResult | null>(null)
  const [running, setRunning] = useState(false)

  const sessions = chunksToSessions(text)

  const run = async () => {
    if (sessions.length === 0 || query.trim().length === 0) return
    setRunning(true)
    const grep = grepSearch(sessions, query)
    setGrepResult(grep)

    if (modelReady) {
      const { loadEmbeddingModel } = await import('../../lib/embeddingSearch')
      const extractor = await loadEmbeddingModel(() => {})
      const vector = await embeddingSearch(extractor, sessions, query)
      setVectorResult(vector)
    }
    setRunning(false)
  }

  return (
    <div className="playground-panel">
      <p className="chart-caption" style={{ marginBottom: 'var(--space-4)' }}>
        Paste any text or code. Grep it for an exact string, then search it by meaning. Nothing
        leaves your browser.
      </p>
      <div className="playground-controls">
        <label className="playground-field">
          <span className="mono playground-label">Your text, one chunk per blank-line-separated block</span>
          <textarea
            className="byo-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
          />
        </label>
        <p className="chart-caption mono">{sessions.length} chunk(s) detected.</p>

        <label className="playground-field">
          <span className="mono playground-label">Search query</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. retry backoff"
          />
        </label>

        {!modelReady && <ModelLoader onReady={onModelReady} />}
        {modelReady && <p className="chart-caption">Embedding model ready.</p>}

        <button
          type="button"
          className={modelReady ? 'playground-btn playground-btn-primary' : 'playground-btn'}
          onClick={run}
          disabled={running || sessions.length === 0 || query.trim().length === 0}
        >
          {running ? 'Running…' : modelReady ? 'Run grep and vector' : 'Run grep only'}
        </button>
        {!modelReady && (
          <p className="chart-caption">
            Vector search stays empty until you load the embedding model above.
          </p>
        )}
      </div>

      <div className="playground-columns">
        <ResultColumn
          title="grep"
          accentVar="--chart-grep"
          elapsedMs={grepResult?.elapsedMs ?? null}
          items={
            grepResult?.hits.map((h) => ({
              session_id: h.session_id,
              label: h.session_id,
              detail: h.snippet,
              highlight: { start: h.matchStart, end: h.matchEnd },
            })) ?? []
          }
          sessions={sessions}
          answerSessionIds={null}
          emptyLabel="Paste text, then search."
        />
        <ResultColumn
          title="vector"
          accentVar="--chart-vector"
          elapsedMs={vectorResult?.elapsedMs ?? null}
          items={
            vectorResult?.hits.map((h) => ({
              session_id: h.session_id,
              label: h.session_id,
              detail: `${h.snippet} · cosine ${h.score.toFixed(3)}`,
            })) ?? []
          }
          sessions={sessions}
          answerSessionIds={null}
          emptyLabel={modelReady ? 'No results yet.' : 'Load the embedding model to compare.'}
        />
      </div>
    </div>
  )
}
