import dci from '../../data/dci-summary.json'

function formatStat(stat: (typeof dci.stats)[number]) {
  if ('dci_delta_percent' in stat && stat.dci_delta_percent !== undefined) {
    return { value: `${stat.dci_delta_percent}%`, compare: 'vs. retrieval-agent cost' }
  }
  const baseline =
    'baseline' in stat
      ? stat.baseline
      : 'baseline_low' in stat
        ? `${stat.baseline_low}–${stat.baseline_high}`
        : null
  return { value: `${stat.dci}%`, compare: baseline !== null && baseline !== undefined ? `vs. ${baseline}%` : null }
}

export function DciTiles() {
  return (
    <div className="stat-tile-row">
      {dci.stats.map((stat) => {
        const { value, compare } = formatStat(stat)
        return (
          <div className="stat-tile" key={stat.label}>
            <p className="stat-tile-label mono">{stat.label}</p>
            <p className="stat-tile-value tabular mono">{value}</p>
            {compare ? <p className="stat-tile-compare mono">{compare}</p> : null}
          </div>
        )
      })}
    </div>
  )
}
