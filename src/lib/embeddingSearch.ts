import type { Session } from './grepSearch'

export type ModelLoadStage =
  | { status: 'idle' }
  | { status: 'loading'; file: string; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string }

export interface EmbeddingHit {
  session_id: string
  score: number
  snippet: string
}

export interface EmbeddingResult {
  hits: EmbeddingHit[]
  elapsedMs: number
  topSessionId: string | null
}

// Model weights ship with the app under public/models so Playwright and
// locked-down networks are not blocked by Hugging Face CORS.
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

export function loadEmbeddingModel(onStage: (stage: ModelLoadStage) => void) {
  if (extractorPromise) return extractorPromise

  extractorPromise = (async () => {
    onStage({ status: 'loading', file: MODEL_ID, progress: 0 })
    const { pipeline, env } = await import('@xenova/transformers')
    env.allowLocalModels = true
    env.allowRemoteModels = false
    env.localModelPath = `${import.meta.env.BASE_URL}models/`

    try {
      const extractor = await pipeline('feature-extraction', MODEL_ID, {
        progress_callback: (data: { status: string; file?: string; progress?: number }) => {
          if (data.status === 'progress' && typeof data.progress === 'number') {
            onStage({ status: 'loading', file: data.file ?? MODEL_ID, progress: data.progress })
          }
        },
      })
      onStage({ status: 'ready' })
      return extractor as unknown as FeatureExtractionPipeline
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      onStage({ status: 'error', message })
      extractorPromise = null
      throw err
    }
  })()

  return extractorPromise
}

function cosineFromNormalized(a: Float32Array | number[], b: Float32Array | number[]) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function sessionText(session: Session) {
  return session.turns.map((t) => t.content).join(' ')
}

function previewSnippet(text: string, radius = 110) {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= radius) return trimmed
  const cut = trimmed.slice(0, radius)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : radius)}…`
}

// Session text doesn't change between searches, only which sessions are in
// play (the noise slider changes the distractor set). Caching by session_id
// avoids re-embedding the same oracle sessions on every slider move.
const embeddingCache = new Map<string, Float32Array | number[]>()

async function embedSession(extractor: FeatureExtractionPipeline, session: Session) {
  const cached = embeddingCache.get(session.session_id)
  if (cached) return cached
  const result = await extractor(sessionText(session), { pooling: 'mean', normalize: true })
  embeddingCache.set(session.session_id, result.data)
  return result.data
}

/**
 * Embeds the query and every session (mean-pooled, normalized), then ranks
 * sessions by cosine similarity. Timed the same way as grepSearch so the
 * two numbers are directly comparable in the UI.
 */
export async function embeddingSearch(
  extractor: FeatureExtractionPipeline,
  sessions: Session[],
  query: string,
): Promise<EmbeddingResult> {
  const t0 = performance.now()

  const queryEmbedding = await extractor(query, { pooling: 'mean', normalize: true })

  const hits: EmbeddingHit[] = []
  for (const session of sessions) {
    const embedding = await embedSession(extractor, session)
    const score = cosineFromNormalized(queryEmbedding.data, embedding)
    hits.push({
      session_id: session.session_id,
      score,
      snippet: previewSnippet(sessionText(session)),
    })
  }

  hits.sort((a, b) => b.score - a.score)
  const elapsedMs = performance.now() - t0
  return { hits, elapsedMs, topSessionId: hits[0]?.session_id ?? null }
}
