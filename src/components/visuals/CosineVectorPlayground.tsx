import { useMemo } from 'react'
import { Coordinates, Mafs, Text, Vector, useMovablePoint, vec } from 'mafs'
import 'mafs/core.css'

type DocVector = {
  id: string
  label: string
  point: vec.Vector2
}

const DOCS: DocVector[] = [
  { id: 'answer', label: 'answer session', point: [1.55, 0.48] },
  { id: 'paraphrase', label: 'close paraphrase', point: [1.05, 1.28] },
  { id: 'unrelated', label: 'unrelated session', point: [-1.38, 1.12] },
]

const QUERY_MIN = 0.55
const QUERY_MAX = 2.25
const QUERY_COLOR = '#f4f6f7'
const DOC_COLOR = '#8a9499'
const NEAREST_COLOR = '#b9c2c7'

function cosineOf(a: vec.Vector2, b: vec.Vector2): number {
  const denom = vec.mag(a) * vec.mag(b)
  if (denom === 0) return 0
  return vec.dot(a, b) / denom
}

function clampQuery(point: vec.Vector2): vec.Vector2 {
  const mag = vec.mag(point)
  if (mag < 1e-6) return [QUERY_MIN, 0]
  if (mag < QUERY_MIN) return vec.withMag(point, QUERY_MIN)
  if (mag > QUERY_MAX) return vec.withMag(point, QUERY_MAX)
  return point
}

function scoreDocs(query: vec.Vector2) {
  return DOCS.map((doc) => ({
    ...doc,
    cosine: cosineOf(query, doc.point),
  })).sort((a, b) => b.cosine - a.cosine)
}

function CosineBody() {
  const query = useMovablePoint([1.42, 0.18], {
    color: QUERY_COLOR,
    constrain: clampQuery,
  })
  const scored = useMemo(() => scoreDocs(query.point), [query.point])
  const nearest = scored[0]
  if (!nearest) return null
  const nearestId = nearest.id

  return (
    <>
      <div className="cosine-mafs">
        <Mafs
          height={260}
          pan={false}
          zoom={false}
          viewBox={{ x: [-2.5, 2.5], y: [-1.15, 2.15], padding: 0.15 }}
        >
          <Coordinates.Cartesian
            subdivisions={false}
            xAxis={{ lines: 1, labels: false }}
            yAxis={{ lines: 1, labels: false }}
          />
          {DOCS.map((doc) => {
            const isNearest = doc.id === nearestId
            return (
              <Vector
                key={doc.id}
                tip={doc.point}
                color={isNearest ? NEAREST_COLOR : DOC_COLOR}
                weight={isNearest ? 3 : 2}
                style={isNearest ? 'solid' : 'dashed'}
              />
            )
          })}
          <Vector tip={query.point} color={QUERY_COLOR} weight={3} />
          <Text x={query.x} y={query.y} attach="e" attachDistance={14} color={QUERY_COLOR} size={13}>
            query
          </Text>
          {DOCS.map((doc) => (
            <Text
              key={`${doc.id}-label`}
              x={doc.point[0]}
              y={doc.point[1]}
              attach={doc.point[0] < 0 ? 'w' : 'e'}
              attachDistance={14}
              color={doc.id === nearestId ? NEAREST_COLOR : DOC_COLOR}
              size={13}
            >
              {doc.label}
            </Text>
          ))}
          {query.element}
        </Mafs>
      </div>
      <div className="mechanism-readout">
        <p className="mechanism-readout-lead mono">
          Nearest by cosine: {nearest.label} ({nearest.cosine.toFixed(2)})
        </p>
        <table className="mechanism-table">
          <caption className="visually-hidden">
            Cosine similarity of each session to the query
          </caption>
          <thead>
            <tr>
              <th scope="col">Session</th>
              <th scope="col">cos θ</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((row) => (
              <tr key={row.id} className={row.id === nearestId ? 'is-nearest' : undefined}>
                <th scope="row">{row.label}</th>
                <td className="mono tabular">{row.cosine.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function CosineVectorPlayground() {
  return (
    <div className="mechanism-card cosine-card">
      <h3 className="mechanism-card-title">How an embedding ranks</h3>
      <p className="mechanism-card-lead">
        Drag the query tip. Ranking follows the angle between vectors, not shared words. This
        plane is a schematic, not a real embedding.
      </p>
      <CosineBody />
      <p className="mechanism-caption">
        Solid candidate is the current nearest neighbor. Dashed candidates sit further away in
        angle. Keyboard: tab to the query point, then arrow keys.
      </p>
    </div>
  )
}
