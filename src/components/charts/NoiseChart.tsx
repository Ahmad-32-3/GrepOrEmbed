import { useCallback, useMemo } from 'react'
import * as Plot from '@observablehq/plot'
import noiseData from '../../data/noise-scaling.json'
import { PlotFigure } from './PlotFigure'

const SESSION_KEYS = ['s5', 's10', 's20', 's30', 'full'] as const
const SESSION_LABELS: Record<(typeof SESSION_KEYS)[number], string> = {
  s5: '5',
  s10: '10',
  s20: '20',
  s30: '30',
  full: 'full',
}

interface Row {
  pair: string
  model: string
  harness: string
  method: 'grep' | 'vector'
  session: string
  value: number
  col: string
  row: string
}

function pairKey(model: string, harness: string) {
  return `${model} / ${harness}`
}

function vectorDrop(r: (typeof noiseData.vector)[number]) {
  return r.s5 - r.full
}

function buildLayout() {
  const ranked = [...noiseData.vector].sort((a, b) => {
    const d = vectorDrop(b) - vectorDrop(a)
    if (d !== 0) return d
    return pairKey(a.model, a.harness).localeCompare(pairKey(b.model, b.harness))
  })
  const layout = new Map<string, { col: string; row: string }>()
  ranked.forEach((r, i) => {
    layout.set(pairKey(r.model, r.harness), {
      col: String(i % 3),
      row: String(Math.floor(i / 3)),
    })
  })
  return layout
}

function buildRows(layout: Map<string, { col: string; row: string }>): Row[] {
  const rows: Row[] = []
  const push = (
    source: typeof noiseData.grep,
    method: 'grep' | 'vector',
  ) => {
    for (const r of source) {
      const pair = pairKey(r.model, r.harness)
      const slot = layout.get(pair)
      if (!slot) continue
      for (const key of SESSION_KEYS) {
        rows.push({
          pair,
          model: r.model,
          harness: r.harness,
          method,
          session: SESSION_LABELS[key],
          value: (r as unknown as Record<string, number>)[key],
          col: slot.col,
          row: slot.row,
        })
      }
    }
  }
  push(noiseData.grep, 'grep')
  push(noiseData.vector, 'vector')
  return rows
}

export function NoiseChart() {
  const layout = useMemo(buildLayout, [])
  const rows = useMemo(() => buildRows(layout), [layout])
  const grepRows = useMemo(() => rows.filter((r) => r.method === 'grep'), [rows])
  const sessionOrder = SESSION_KEYS.map((k) => SESSION_LABELS[k])
  const titles = useMemo(() => {
    const seen = new Set<string>()
    const out: Row[] = []
    for (const r of grepRows) {
      if (r.session !== '5' || seen.has(r.pair)) continue
      seen.add(r.pair)
      out.push(r)
    }
    return out
  }, [grepRows])

  const options = useCallback(
    (width: number) => {
      const cols = width < 640 ? 1 : 3
      const pairOrder = [...titles]
        .sort((a, b) => Number(a.row) * 3 + Number(a.col) - (Number(b.row) * 3 + Number(b.col)))
        .map((t) => t.pair)
      const remap = (r: Row): Row => {
        const i = pairOrder.indexOf(r.pair)
        return {
          ...r,
          col: String(i % cols),
          row: String(Math.floor(i / cols)),
        }
      }
      const data = rows.map(remap)
      const titleData = titles.map(remap)
      return {
        height: cols === 1 ? 9 * 158 : 780,
        style: { background: 'transparent', color: 'var(--fg)', fontSize: cols === 1 ? '11px' : '10.5px' },
        x: { domain: sessionOrder, label: 'distractor sessions' },
        // Truncated at 40 (just below the true data min of 44) so the
        // grep-holds / vector-drops gap fills each panel and reads clearly. The
        // floor is disclosed in the caption so it can't be mistaken for a
        // deceptive zero-suppression.
        y: { label: null, domain: [40, 108], grid: true, ticks: [40, 60, 80, 100] },
        fx: { label: null, axis: null },
        fy: { label: null, axis: null },
        color: {
          domain: ['grep', 'vector'],
          range: ['var(--chart-grep)', 'var(--chart-vector)'],
          legend: false,
        },
        facet: { data, x: 'col', y: 'row' },
        marginLeft: cols === 1 ? 24 : 28,
        marginRight: 10,
        marginTop: 8,
        marks: [
          Plot.frame({ stroke: 'var(--line-hairline)' }),
          Plot.line(data, {
            filter: (d: Row) => d.method === 'grep',
            x: 'session',
            y: 'value',
            z: 'pair',
            fx: 'col',
            fy: 'row',
            stroke: 'method',
            strokeWidth: 2,
          }),
          Plot.line(data, {
            filter: (d: Row) => d.method === 'vector',
            x: 'session',
            y: 'value',
            z: 'pair',
            fx: 'col',
            fy: 'row',
            stroke: 'method',
            strokeWidth: 2,
            strokeDasharray: '6,4',
          }),
          Plot.dot(data, {
            filter: (d: Row) => d.method === 'grep',
            x: 'session',
            y: 'value',
            fx: 'col',
            fy: 'row',
            fill: 'method',
            symbol: 'circle',
            r: 2.5,
          }),
          Plot.dot(data, {
            filter: (d: Row) => d.method === 'vector',
            x: 'session',
            y: 'value',
            fx: 'col',
            fy: 'row',
            fill: 'method',
            symbol: 'square',
            r: 2.5,
          }),
          Plot.text(titleData, {
            x: () => '5',
            y: () => 106,
            fx: 'col',
            fy: 'row',
            text: 'model',
            fill: 'var(--fg-hi)',
            dx: 4,
            textAnchor: 'start',
            fontFamily: 'var(--font-mono)',
            fontSize: cols === 1 ? 11 : 10,
          }),
          Plot.text(titleData, {
            x: () => '5',
            y: () => 102,
            fx: 'col',
            fy: 'row',
            text: 'harness',
            fill: 'var(--fg-low)',
            dx: 4,
            textAnchor: 'start',
            fontFamily: 'var(--font-mono)',
            fontSize: cols === 1 ? 11 : 10,
          }),
        ],
      } satisfies Plot.PlotOptions
    },
    [rows, sessionOrder, titles],
  )

  const tableView = (
    <table className="chart-table">
      <thead>
        <tr>
          <th>Pair</th>
          <th>Method</th>
          {sessionOrder.map((s) => (
            <th key={s}>{s}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...noiseData.grep, ...noiseData.vector].map((r, i) => (
          <tr key={i}>
            <td>
              {r.model} / {r.harness}
            </td>
            <td>{i < noiseData.grep.length ? 'grep' : 'vector'}</td>
            {SESSION_KEYS.map((k) => (
              <td key={k} className="tabular">
                {(r as unknown as Record<string, number>)[k]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <>
      <p className="chart-legend mono">
        <span className="legend-line legend-line-grep" aria-hidden="true" />
        grep, solid
        <span className="legend-line legend-line-vector" aria-hidden="true" />
        vector, dashed
      </p>
      <PlotFigure
        options={options}
        ariaLabel="Accuracy by number of distractor sessions, grep versus vector. Nine panels, one harness pair each, ordered by how far vector falls from five sessions to the full haystack: 7.7, 6.0, 6.0, 5.2, 5.2, 1.8, 0.0, then two Gemini CLI pairs that rise."
        caption="Accuracy by session count, grep solid and vector dashed. The vertical axis starts at 40, not 0, so the gap between the two lines is legible. Panels ordered by vector's drop from five sessions to the full haystack, largest drop first."
        tableView={tableView}
      />
    </>
  )
}
