import { useRef, useState, type KeyboardEvent } from 'react'
import { QuestionMode } from './QuestionMode'
import { ByoMode } from './ByoMode'

export function Playground() {
  const [mode, setMode] = useState<'question' | 'byo'>('question')
  const [modelReady, setModelReady] = useState(false)
  const questionTabRef = useRef<HTMLButtonElement>(null)
  const byoTabRef = useRef<HTMLButtonElement>(null)

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = mode === 'question' ? 'byo' : 'question'
    setMode(next)
    // Roving tabindex: move real DOM focus to the newly selected tab, or focus
    // is stranded on the old tab once it becomes tabindex=-1 (WCAG APG tablist).
    ;(next === 'question' ? questionTabRef : byoTabRef).current?.focus()
  }

  return (
    <div className="playground">
      <div
        className="playground-tabs"
        role="tablist"
        aria-label="Playground mode"
        onKeyDown={onTabKey}
      >
        <button
          type="button"
          id="tab-question"
          ref={questionTabRef}
          role="tab"
          aria-selected={mode === 'question'}
          aria-controls="panel-question"
          tabIndex={mode === 'question' ? 0 : -1}
          className={`playground-tab ${mode === 'question' ? 'is-active' : ''}`}
          onClick={() => setMode('question')}
        >
          Paper-style questions
        </button>
        <button
          type="button"
          id="tab-byo"
          ref={byoTabRef}
          role="tab"
          aria-selected={mode === 'byo'}
          aria-controls="panel-byo"
          tabIndex={mode === 'byo' ? 0 : -1}
          className={`playground-tab ${mode === 'byo' ? 'is-active' : ''}`}
          onClick={() => setMode('byo')}
        >
          Bring your own
        </button>
      </div>

      <div
        role="tabpanel"
        id="panel-question"
        aria-labelledby="tab-question"
        hidden={mode !== 'question'}
      >
        <QuestionMode modelReady={modelReady} onModelReady={() => setModelReady(true)} />
        <p className="chart-caption playground-footnote">
          The five questions and ten sessions here are written for this demo, matching the
          LongMemEval shape. The dataset host used by the paper was unreachable when this corpus
          was assembled.
        </p>
      </div>

      <div role="tabpanel" id="panel-byo" aria-labelledby="tab-byo" hidden={mode !== 'byo'}>
        <ByoMode modelReady={modelReady} onModelReady={() => setModelReady(true)} />
        <p className="chart-caption playground-footnote">
          Whatever you paste stays in this tab. Nothing is uploaded.
        </p>
      </div>
    </div>
  )
}
