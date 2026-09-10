import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as Plot from '@observablehq/plot'

interface PlotFigureProps {
  options: (width: number) => Plot.PlotOptions
  caption?: string
  tableView: ReactNode
  ariaLabel: string
}

/**
 * Every chart on this page ships a table-view toggle (dataviz skill requirement).
 * This wrapper renders an Observable Plot figure and a hidden-by-default table,
 * switchable by the visitor, with the SVG always accompanied by a text caption
 * so the chart never relies on color alone. Width tracks the container so a
 * phone is not asked to scroll a 960 px plot to read the argument.
 */
export function PlotFigure({ options, caption, tableView, ariaLabel }: PlotFigureProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showTable, setShowTable] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el || showTable) return
    const measure = () => {
      const next = Math.floor(el.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showTable])

  useEffect(() => {
    const el = containerRef.current
    if (!el || showTable || width < 160) return
    const plot = Plot.plot({ ...options(width), width })
    el.replaceChildren(plot)
    el.classList.toggle('is-scrollable', el.scrollWidth > el.clientWidth + 2)
    return () => plot.remove()
  }, [options, width, showTable])

  return (
    <figure className="chart-figure" role="group" aria-label={ariaLabel}>
      <div className="chart-toolbar">
        <button
          type="button"
          className="chart-toggle mono"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {showTable ? (
        <div className="chart-table-wrap">{tableView}</div>
      ) : (
        <div ref={containerRef} className="chart-plot" />
      )}
      {caption ? <figcaption className="chart-caption">{caption}</figcaption> : null}
    </figure>
  )
}
