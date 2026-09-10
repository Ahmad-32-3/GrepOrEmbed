import { useMemo, useState } from 'react'
import corpus from '../../data/playground-corpus.json'
import { grepSearch, type GrepResult, type Session } from '../../lib/grepSearch'
import { embeddingSearch, type EmbeddingResult } from '../../lib/embeddingSearch'
import { ModelLoader } from './ModelLoader'
import { ResultColumn } from './ResultColumn'

const SESSIONS = corpus.sessions as unknown as Session[]
const QUESTIONS = corpus.questions
const PINNED_NEAR_MISS = 'sess-09'

interface Props {
  modelReady: boolean
  onModelReady: () => void
}

export function QuestionMode({ modelReady, onModelReady }: Props) {
  const [questionId, setQuestionId] = useState(QUESTIONS[0].question_id)
  const [noiseLevel, setNoiseLevel] = useState(2)
  const [grepQuery, setGrepQuery] = useState(QUESTIONS[0].grep_query)
  const [grepResult, setGrepResult] = useState<GrepResult | null>(null)
  const [vectorResult, setVectorResult] = useState<EmbeddingResult | null>(null)
  const [running, setRunning] = useState(false)
  const [skippedVector, setSkippedVector] = useState(false)

  const question = QUESTIONS.find((q) => q.question_id === questionId) ?? QUESTIONS[0]

  const { activeSessions, maxNoise } = useMemo(() => {
    const distractorPool = SESSIONS.filter(
      (s) => !question.answer_session_ids.includes(s.session_id),
    )
    const pinned = distractorPool.filter((s) => s.session_id === PINNED_NEAR_MISS)
    const rest = distractorPool.filter((s) => s.session_id !== PINNED_NEAR_MISS)
    const ordered =
      question.grep_query === 'Wildbrook' && pinned.length > 0 ? [...pinned, ...rest] : distractorPool
    const clamped = Math.min(noiseLevel, ordered.length)
    const distractorIds = new Set(ordered.slice(0, clamped).map((s) => s.session_id))
    return {
      activeSessions: SESSIONS.filter(
        (s) =>
          question.answer_session_ids.includes(s.session_id) || distractorIds.has(s.session_id),
      ),
      maxNoise: ordered.length,
    }
  }, [question, noiseLevel])

  const run = async () => {
    setRunning(true)
    const grep = grepSearch(activeSessions, grepQuery)
    setGrepResult(grep)

    if (modelReady) {
      setSkippedVector(false)
      const { loadEmbeddingModel } = await import('../../lib/embeddingSearch')
      const extractor = await loadEmbeddingModel(() => {})
      const vector = await embeddingSearch(extractor, activeSessions, question.question)
      setVectorResult(vector)
    } else {
      setSkippedVector(true)
      setVectorResult(null)
    }
    setRunning(false)
  }

  return (
    <div className="playground-panel">
      <div className="playground-controls">
        <label className="playground-field">
          <span className="mono playground-label">Question</span>
          <select
            value={questionId}
            onChange={(e) => {
              const next = QUESTIONS.find((q) => q.question_id === e.target.value) ?? QUESTIONS[0]
              setQuestionId(next.question_id)
              setGrepQuery(next.grep_query)
              setGrepResult(null)
              setVectorResult(null)
              setSkippedVector(false)
            }}
          >
            {QUESTIONS.map((q) => (
              <option key={q.question_id} value={q.question_id}>
                {q.question}
              </option>
            ))}
          </select>
        </label>

        <label className="playground-field">
          <span className="mono playground-label">
            Grep query, what a harness would actually search for
          </span>
          <input type="text" value={grepQuery} onChange={(e) => setGrepQuery(e.target.value)} />
        </label>
        <p className="chart-caption">
          Vector search gets the full question above. Grep gets the short query here, the way a
          harness turns a question into a search term instead of regexing the sentence itself.
          Edit it and see what changes.
        </p>

        <label className="playground-field">
          <span className="mono playground-label">
            Distractor sessions mixed in: {noiseLevel} of {maxNoise}
          </span>
          <input
            type="range"
            min={0}
            max={maxNoise}
            value={Math.min(noiseLevel, maxNoise)}
            onChange={(e) => {
              setNoiseLevel(Number(e.target.value))
              setGrepResult(null)
              setVectorResult(null)
              setSkippedVector(false)
            }}
          />
        </label>

        <p className="chart-caption">
          Corpus for this run: {activeSessions.length} sessions ({question.answer_session_ids.length}{' '}
          oracle, {activeSessions.length - question.answer_session_ids.length} distractor).
        </p>

        {!modelReady && <ModelLoader onReady={onModelReady} />}
        {modelReady && <p className="chart-caption">Embedding model ready.</p>}

        <button
          type="button"
          className={modelReady ? 'playground-btn playground-btn-primary' : 'playground-btn'}
          onClick={run}
          disabled={running}
        >
          {running ? 'Running…' : modelReady ? 'Run grep and vector' : 'Run grep only'}
        </button>
        {!modelReady && (
          <p className="chart-caption">
            Vector search stays empty until you load the embedding model above.
          </p>
        )}
        {skippedVector && (
          <p className="chart-caption">Grep ran. Vector did not, because the model is not loaded.</p>
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
          sessions={activeSessions}
          answerSessionIds={grepResult ? question.answer_session_ids : null}
          emptyLabel="No matches yet. Run a search."
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
          sessions={activeSessions}
          answerSessionIds={vectorResult ? question.answer_session_ids : null}
          emptyLabel={
            modelReady
              ? 'No results yet. Run a search.'
              : 'Load the embedding model to compare.'
          }
        />
      </div>
    </div>
  )
}
