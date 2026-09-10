import { useId, useMemo } from 'react'
import resultsData from '../../data/results.json'

const grepColor = '#22a58f'
const vectorColor = '#e2703a'
const pageColor = '#08090a'

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  const r = lerpChannel(A.r, B.r, t)
  const g = lerpChannel(A.g, B.g, t)
  const bl = lerpChannel(A.b, B.b, t)
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

const grepFloor = mix(pageColor, grepColor, 0.42)
const vectorFloor = mix(pageColor, vectorColor, 0.42)

function deltaColor(delta: number, maxAbs: number) {
  const t = Math.min(Math.abs(delta) / maxAbs, 1)
  return delta >= 0 ? mix(grepFloor, grepColor, t) : mix(vectorFloor, vectorColor, t)
}

function channelLin(c: number) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(color: string) {
  const { r, g, b } = hexToRgb(color)
  return 0.2126 * channelLin(r) + 0.7152 * channelLin(g) + 0.0722 * channelLin(b)
}

function contrastRatio(fg: string, bg: string) {
  const L1 = relativeLuminance(fg)
  const L2 = relativeLuminance(bg)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}

function cellTextFill(delta: number, maxAbs: number) {
  const bg = deltaColor(delta, maxAbs)
  const dark = '#08090a'
  const light = '#f4f6f7'
  const lightC = contrastRatio(light, bg)
  const darkC = contrastRatio(dark, bg)
  if (lightC >= 4.5 && lightC >= darkC) return light
  if (darkC >= 4.5) return dark
  return darkC >= lightC ? dark : light
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

interface PairRow {
  pair: string
  model: string
  harness: string
  inline: number
  file: number
}

function HeatmapRamp({
  maxAbs,
  minDelta,
  maxDelta,
}: {
  maxAbs: number
  minDelta: number
  maxDelta: number
}) {
  const gid = useId().replace(/:/g, '')
  // Endpoints are the colors of the actual extreme cells, not the abstract
  // scale poles, so the key never shows an amber (or teal) darker than any cell
  // that renders. Cells still share one symmetric magnitude scale (maxAbs); the
  // key just samples the range the data actually occupies.
  return (
    <div className="heatmap-ramp mono" aria-hidden="true">
      <svg viewBox="0 0 280 36" width="280" height="36">
        <defs>
          {/* Meets at the same vector/grep floors the cells use (mix 0.42),
              not pure page color. The step at 0.5 mirrors the real
              discontinuity at delta 0: a cell just below zero is vectorFloor,
              just above is grepFloor. */}
          <linearGradient id={gid} x1="0" x2="1">
            <stop offset="0" stopColor={deltaColor(minDelta, maxAbs)} />
            <stop offset="0.5" stopColor={vectorFloor} />
            <stop offset="0.5" stopColor={grepFloor} />
            <stop offset="1" stopColor={deltaColor(maxDelta, maxAbs)} />
          </linearGradient>
        </defs>
        <rect x="0" y="2" width="280" height="10" fill={`url(#${gid})`} />
        <text x="0" y="30" fill="var(--fg-low)" fontSize="10">
          {minDelta.toFixed(1)} vector
        </text>
        <text x="140" y="30" fill="var(--fg-low)" fontSize="10" textAnchor="middle">
          0
        </text>
        <text x="280" y="30" fill="var(--fg-low)" fontSize="10" textAnchor="end">
          +{maxDelta.toFixed(1)} grep
        </text>
      </svg>
    </div>
  )
}

function Cell({ delta, maxAbs }: { delta: number; maxAbs: number }) {
  const bg = deltaColor(delta, maxAbs)
  const fg = cellTextFill(delta, maxAbs)
  const label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
  return (
    <td className="heatmap-cell tabular" style={{ background: bg, color: fg }}>
      {label}
    </td>
  )
}

export function Heatmap() {
  const rows = useMemo<PairRow[]>(() => {
    return resultsData.rows.map((r) => ({
      pair: `${r.model} / ${r.harness}`,
      model: r.model,
      harness: r.harness,
      inline: round1(r.grep_inline - r.vector_inline),
      file: round1(r.grep_file - r.vector_file),
    }))
  }, [])

  const { maxAbs, minDelta, maxDelta } = useMemo(() => {
    const all = rows.flatMap((r) => [r.inline, r.file])
    const maxDelta = Math.max(...all)
    const minDelta = Math.min(...all)
    // Cells share one symmetric magnitude scale so equal magnitudes read equal.
    const maxAbs = Math.max(Math.abs(maxDelta), Math.abs(minDelta), 1)
    return { maxAbs, minDelta, maxDelta }
  }, [rows])

  return (
    <div className="heatmap-wrap">
      <HeatmapRamp maxAbs={maxAbs} minDelta={minDelta} maxDelta={maxDelta} />
      <figure className="chart-figure" role="group" aria-label="Grep minus vector accuracy, inline and file delivery">
        <div className="heatmap-table-wrap">
          <table className="heatmap">
            <thead>
              <tr>
                <th scope="col">Harness pair</th>
                <th scope="col">Inline</th>
                <th scope="col">File</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pair}>
                  <th scope="row">
                    <span className="heatmap-model">{r.model}</span>
                    <span className="heatmap-harness">{r.harness}</span>
                  </th>
                  <Cell delta={r.inline} maxAbs={maxAbs} />
                  <Cell delta={r.file} maxAbs={maxAbs} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <figcaption className="chart-caption">
          Each cell is grep accuracy minus vector accuracy, in points, on one shared color
          scale. Left column is inline delivery. Right column is file delivery.
        </figcaption>
      </figure>
    </div>
  )
}
