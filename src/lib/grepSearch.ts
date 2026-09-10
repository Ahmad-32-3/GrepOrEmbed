export interface SessionTurn {
  role: 'user' | 'assistant'
  content: string
  has_answer?: boolean
}

export interface Session {
  session_id: string
  date: string
  category: string
  turns: SessionTurn[]
}

export interface GrepHit {
  session_id: string
  turnIndex: number
  snippet: string
  matchStart: number
  matchEnd: number
}

export interface GrepResult {
  hits: GrepHit[]
  elapsedMs: number
  topSessionId: string | null
}

function snapLeft(text: string, index: number) {
  let i = index
  while (i > 0 && !/\s/.test(text[i - 1])) i -= 1
  return i
}

function snapRight(text: string, index: number) {
  let i = index
  while (i < text.length && !/\s/.test(text[i])) i += 1
  return i
}

function buildSnippet(text: string, start: number, end: number, radius = 60) {
  const from = snapLeft(text, Math.max(0, start - radius))
  const to = snapRight(text, Math.min(text.length, end + radius))
  const prefix = from > 0 ? '…' : ''
  const suffix = to < text.length ? '…' : ''
  return {
    snippet: prefix + text.slice(from, to) + suffix,
    localStart: start - from + prefix.length,
    localEnd: end - from + prefix.length,
  }
}

/**
 * A real substring/regex scan over the given sessions, timed with
 * performance.now(). Case-insensitive by default, matching how the paper's
 * grep-based harnesses run their search.
 */
export function grepSearch(sessions: Session[], query: string): GrepResult {
  const t0 = performance.now()
  const hits: GrepHit[] = []

  if (query.trim().length === 0) {
    return { hits: [], elapsedMs: performance.now() - t0, topSessionId: null }
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const dangerous = query.length > 64 || /(\+|\*)\1/.test(query)
  let pattern: RegExp
  try {
    pattern = new RegExp(dangerous ? escaped : query, 'gi')
  } catch {
    pattern = new RegExp(escaped, 'gi')
  }

  outer: for (const session of sessions) {
    for (let i = 0; i < session.turns.length; i++) {
      const text = session.turns[i].content
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        const { snippet, localStart, localEnd } = buildSnippet(
          text,
          match.index,
          match.index + match[0].length,
        )
        hits.push({
          session_id: session.session_id,
          turnIndex: i,
          snippet,
          matchStart: localStart,
          matchEnd: localEnd,
        })
        if (hits.length >= 40) break outer
        if (match[0].length === 0) pattern.lastIndex++
      }
    }
  }

  // The scan finds hits per turn, so one session can match several times.
  // Rank by session, like the embedding column does: keep the first (earliest)
  // hit per session so the two result lists compare on the same unit and no
  // session id repeats.
  const seen = new Set<string>()
  const bySession = hits.filter((h) => {
    if (seen.has(h.session_id)) return false
    seen.add(h.session_id)
    return true
  })

  const elapsedMs = performance.now() - t0
  return { hits: bySession, elapsedMs, topSessionId: bySession[0]?.session_id ?? null }
}
