import { useCallback, useMemo } from 'react'
import * as Plot from '@observablehq/plot'
import categoriesData from '../../data/categories.json'
import { PlotFigure } from './PlotFigure'

const CATEGORY_KEYS = [
  'Knowledge-Update',
  'Multi-Session',
  'SS-Assistant',
  'SS-Preference',
  'SS-User',
  'Temporal-Reasoning',
] as const

// Model identity, not grep/vector. Uses the scoped cool-blue ramp from
// chart-tokens.css so this chart never borrows the teal (grep) or amber
// (vector) semantic poles used elsewhere on the page.
const MODEL_COLORS = [
  'var(--chart-cat-1)',
  'var(--chart-cat-2)',
  'var(--chart-cat-3)',
  'var(--chart-cat-4)',
  'var(--chart-cat-5)',
]

interface Row {
  model: string
  short: string
  category: string
  value: number
}

function shortModel(name: string) {
  return name.replace(/^Claude /, '').replace(/^Gemini /, '')
}

// Fixed left-to-right order for both the x axis and the color legend, so the
// legend reads in the same order the bars appear in each facet and each model
// keeps one color. Matches Plot's default ascending sort of the short names.
const MODEL_ORDER = [
  'Gemini 3.1 Flash-Lite',
  'Gemini 3.1 Pro',
  'GPT-5.4',
  'Claude Haiku 4.5',
  'Claude Opus 4.6',
]
const SHORT_ORDER = MODEL_ORDER.map(shortModel)

function buildRows(): Row[] {
  const rows: Row[] = []
  for (const r of categoriesData.rows) {
    for (const cat of CATEGORY_KEYS) {
      rows.push({
        model: r.model,
        short: shortModel(r.model),
        category: cat,
        value: (r as unknown as Record<string, number>)[cat],
      })
    }
  }
  return rows
}

export function CategoryBars() {
  const rows = useMemo(buildRows, [])

  const options = useCallback(
    (width: number) => {
      const stack = width < 640
      return {
        height: stack ? 1080 : 460,
        marginLeft: stack ? 36 : 48,
        marginBottom: stack ? 72 : 88,
        marginRight: 12,
        style: { background: 'transparent', color: 'var(--fg)', fontSize: stack ? '10px' : '11px' },
        x: { label: null, tickRotate: -40, domain: SHORT_ORDER },
        y: { label: null, domain: [0, 100], grid: true },
        fx: stack ? undefined : { label: null },
        fy: stack ? { label: null } : undefined,
        color: { domain: MODEL_ORDER, range: MODEL_COLORS, legend: true },
        facet: stack ? { data: rows, y: 'category' } : { data: rows, x: 'category' },
        marks: [
          Plot.barY(rows, {
            x: 'short',
            y: 'value',
            fill: 'model',
            stroke: 'var(--bg-page)',
            strokeWidth: 1,
          }),
          Plot.ruleY([0], { stroke: 'var(--line-strong)' }),
        ],
      } satisfies Plot.PlotOptions
    },
    [rows],
  )

  const tableView = (
    <table className="chart-table">
      <thead>
        <tr>
          <th>Model</th>
          {CATEGORY_KEYS.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categoriesData.rows.map((r) => (
          <tr key={r.model}>
            <td>{r.model}</td>
            {CATEGORY_KEYS.map((c) => (
              <td key={c} className="tabular">
                {(r as unknown as Record<string, number>)[c]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <PlotFigure
      options={options}
      ariaLabel="Grep accuracy by category and model"
      caption="Chronos harness, grep only, full haystack, by question category."
      tableView={tableView}
    />
  )
}
