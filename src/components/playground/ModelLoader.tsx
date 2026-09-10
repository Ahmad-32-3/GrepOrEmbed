import { useState } from 'react'
import { loadEmbeddingModel, type ModelLoadStage } from '../../lib/embeddingSearch'

interface Props {
  onReady: () => void
}

export function ModelLoader({ onReady }: Props) {
  const [stage, setStage] = useState<ModelLoadStage>({ status: 'idle' })

  const start = () => {
    loadEmbeddingModel((s) => {
      setStage(s)
      if (s.status === 'ready') onReady()
    }).catch(() => {
      /* error state already captured via onStage */
    })
  }

  if (stage.status === 'idle') {
    return (
      <button type="button" className="playground-btn playground-btn-primary" onClick={start}>
        Load embedding model (~23 MB, downloads once, runs in your browser)
      </button>
    )
  }

  if (stage.status === 'loading') {
    const pct = Math.round(stage.progress)
    return (
      <div className="model-loader">
        <div className="model-loader-bar">
          <div className="model-loader-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="mono chart-caption">Downloading Xenova/all-MiniLM-L6-v2, {pct}%</p>
      </div>
    )
  }

  if (stage.status === 'error') {
    return (
      <div className="honesty-note">
        Model failed to load: {stage.message}. The ~23 MB embedding weights ship with this
        page and load in your browser, with no external calls, so this is usually a transient
        fetch or a low-memory hiccup. A fresh reload and one more try often clears it.
      </div>
    )
  }

  return <p className="mono chart-caption">Model ready.</p>
}
