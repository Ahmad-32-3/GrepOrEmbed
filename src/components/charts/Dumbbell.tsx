import { useCallback, useMemo } from 'react'
import * as Plot from '@observablehq/plot'
import resultsData from '../../data/results.json'
import { PlotFigure } from './PlotFigure'

interface ModelSwing {
  model: string
  harnessSwing: number
  retrieverSwing: number
}

interface SwingRow {
  model: string
  kind: 'Harness swing' | 'Retriever swing'
  value: number
}

function computeSwings(): ModelSwing[] {
  const byModel = new Map<string, typeof resultsData.rows>()
  for (const row of resultsData.rows) {
    const list = byModel.get(row.model) ?? []
    list.push(row)
    byModel.set(row.model, list)
  }
  const swings: ModelSwing[] = []
  for (const [model, rows] of byModel) {
    if (rows.length < 2) continue
    const grepValues = rows.map((r) => r.grep_inline)
    const harnessSwing = Math.round((Math.max(...grepValues) - Math.min(...grepValues)) * 10) / 10
    const retrieverSwing = Math.round(
      Math.max(...rows.map((r) => Math.abs(r.grep_inline - r.vector_inline))) * 10,
    ) / 10
    swings.push({ model, harnessSwing, retrieverSwing })
  }
  return swings.sort((a, b) => b.harnessSwing - a.harnessSwing)
}

export function Dumbbell() {
  const swings = useMemo(computeSwings, [])

  const options = useCallback((width: number) => {
    const short = width < 640
    const shorten = (m: string) => m.replace(/^Claude /, '').replace(/^Gemini /, '')
    const swingsD = swings.map((s) => ({ ...s, model: short ? shorten(s.model) : s.model }))
    const modelDomain = swingsD.map((s) => s.model)
    // Two endpoints per model, colored by kind — this is what draws the legend
    // and the two dots of each dumbbell.
    const dots: SwingRow[] = swingsD.flatMap((s) => [
      { model: s.model, kind: 'Harness swing', value: s.harnessSwing },
      { model: s.model, kind: 'Retriever swing', value: s.retrieverSwing },
    ])
    const maxVal = Math.max(...swings.flatMap((s) => [s.harnessSwing, s.retrieverSwing]))
    const domainMax = maxVal * 1.14
    const marginLeft = short ? 108 : 188
    const marginRight = short ? 36 : 64
    return {
      height: 360,
      marginLeft,
      marginRight,
      marginBottom: 40,
      style: { background: 'transparent', color: 'var(--fg)', fontSize: '11px' },
      x: { label: 'points of accuracy →', labelAnchor: 'center', grid: true, domain: [0, domainMax] },
      y: { label: null, domain: modelDomain, padding: 0.5 },
      color: {
        domain: ['Harness swing', 'Retriever swing'],
        range: ['var(--fg-hi)', 'var(--fg-low)'],
        legend: true,
      },
      marks: [
        Plot.ruleX([0], { stroke: 'var(--line-hairline)' }),
        // The dumbbell bar: one connector per model from retriever to harness swing.
        Plot.link(swingsD, {
          x1: 'retrieverSwing',
          x2: 'harnessSwing',
          y1: 'model',
          y2: 'model',
          stroke: 'var(--fg-low)',
          strokeWidth: 2,
        }),
        Plot.dot(dots, {
          x: 'value',
          y: 'model',
          fill: 'kind',
          r: 5,
          stroke: 'var(--bg-page)',
          strokeWidth: 1,
        }),
        Plot.text(
          dots.filter((d) => d.kind === 'Harness swing'),
          {
            x: 'value',
            y: 'model',
            text: (d: SwingRow) => d.value.toFixed(1),
            dy: -12,
            textAnchor: 'middle',
            fill: 'var(--fg-hi)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          },
        ),
        Plot.text(
          dots.filter((d) => d.kind === 'Retriever swing'),
          {
            x: 'value',
            y: 'model',
            text: (d: SwingRow) => d.value.toFixed(1),
            dy: 13,
            textAnchor: 'middle',
            fill: 'var(--fg-hi)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          },
        ),
      ],
    } satisfies Plot.PlotOptions
  }, [swings])

  const tableView = (
    <table className="chart-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Harness swing</th>
          <th>Retriever swing</th>
        </tr>
      </thead>
      <tbody>
        {swings.map((s) => (
          <tr key={s.model}>
            <td>{s.model}</td>
            <td className="tabular">{s.harnessSwing.toFixed(1)}</td>
            <td className="tabular">{s.retrieverSwing.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <PlotFigure
      options={options}
      ariaLabel="Harness swing versus retriever swing by model, same scale"
      caption="Accuracy points. The bright dot is harness swing, the gap in inline grep accuracy between a model's two wrappers. The dim dot is retriever swing, that model's largest inline gap between grep and vector. The bar links the two."
      tableView={tableView}
    />
  )
}
