import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  HILL_EXTENT,
  HILL_MAX_DISTRACTORS,
  HILL_PEAKS,
  heightAt,
  peakWeight,
  rankPeaks,
} from '../lib/similarityHills'

const GRID = 80
const FLOOR = 0.04
const FLOOR_COL = new THREE.Color(0x2a1a14)
const VECTOR = new THREE.Color(0xe2703a)
const ANSWER_HEX = 0xf4f6f7
const DISTRACTOR_HEX = 0xe2703a

function canWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function disposeObject3D(obj: THREE.Object3D) {
  if (!(obj instanceof THREE.Mesh)) return
  obj.geometry.dispose()
  const material = obj.material
  if (Array.isArray(material)) material.forEach((m) => m.dispose())
  else material.dispose()
}

function HillsHeatmap({ noise }: { noise: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.clientWidth || 640
    const h = canvas.clientHeight || 320
    canvas.width = w
    canvas.height = h

    let maxH = 0.2
    for (let py = 0; py < h; py += 2) {
      const z = HILL_EXTENT - (py / Math.max(h - 1, 1)) * HILL_EXTENT * 2
      for (let px = 0; px < w; px += 2) {
        const x = -HILL_EXTENT + (px / Math.max(w - 1, 1)) * HILL_EXTENT * 2
        maxH = Math.max(maxH, heightAt(x, z, noise))
      }
    }

    const image = ctx.createImageData(w, h)
    const data = image.data
    for (let py = 0; py < h; py++) {
      const z = HILL_EXTENT - (py / Math.max(h - 1, 1)) * HILL_EXTENT * 2
      for (let px = 0; px < w; px++) {
        const x = -HILL_EXTENT + (px / Math.max(w - 1, 1)) * HILL_EXTENT * 2
        const t = Math.min(heightAt(x, z, noise) / maxH, 1) ** 0.72
        const i = (py * w + px) * 4
        data[i] = Math.round(8 + (226 - 8) * t)
        data[i + 1] = Math.round(9 + (112 - 9) * t)
        data[i + 2] = Math.round(10 + (58 - 10) * t)
        data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)

    for (const peak of HILL_PEAKS) {
      if (peakWeight(peak, noise) === 0) continue
      const px = ((peak.x + HILL_EXTENT) / (HILL_EXTENT * 2)) * w
      const py = ((HILL_EXTENT - peak.z) / (HILL_EXTENT * 2)) * h
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = peak.id === 'answer' ? '#f4f6f7' : '#e2703a'
      ctx.fill()
    }
  }, [noise])

  return <canvas ref={canvasRef} className="hills-canvas" />
}

export function SimilarityHills() {
  const hostRef = useRef<HTMLDivElement>(null)
  const applyRef = useRef<(next: number) => void>(() => {})
  const [noise, setNoise] = useState(0)
  const [webgl, setWebgl] = useState(true)
  const ranked = useMemo(() => rankPeaks(noise), [noise])
  const winner = ranked[0]
  const answerStillWins = winner?.isAnswer ?? true

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!canWebGL()) {
      setWebgl(false)
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setWebgl(false)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x08090a, 1)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 48)
    camera.position.set(5.8, 4.6, 6.1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = false
    controls.autoRotate = false
    controls.minDistance = 4.4
    controls.maxDistance = 12
    controls.maxPolarAngle = Math.PI / 2.12
    controls.target.set(0, 0.55, 0)

    scene.add(new THREE.AmbientLight(0xb9c2c7, 0.82))
    const key = new THREE.DirectionalLight(0xf4f6f7, 1.15)
    key.position.set(4, 8, 3)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xb9c2c7, 0.45)
    fill.position.set(-3, 2, -2)
    scene.add(fill)

    const geo = new THREE.PlaneGeometry(HILL_EXTENT * 2, HILL_EXTENT * 2, GRID, GRID)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 28,
    })
    scene.add(new THREE.Mesh(geo, mat))
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xe2703a,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    scene.add(new THREE.Mesh(geo, wireMat))

    const markers = new THREE.Group()
    scene.add(markers)

    const pos = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const scratch = new THREE.Color()

    const render = () => renderer.render(scene, camera)

    const applyPeaks = (next: number) => {
      let maxH = 0.2
      for (let i = 0; i < pos.count; i++) {
        maxH = Math.max(maxH, heightAt(pos.getX(i), pos.getZ(i), next))
      }
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)
        const raw = heightAt(x, z, next)
        pos.setY(i, FLOOR + raw)
        const t = Math.min(raw / maxH, 1) ** 0.72
        scratch.copy(FLOOR_COL).lerp(VECTOR, t)
        colors[i * 3] = scratch.r
        colors[i * 3 + 1] = scratch.g
        colors[i * 3 + 2] = scratch.b
      }
      pos.needsUpdate = true
      geo.attributes.color.needsUpdate = true
      geo.computeVertexNormals()

      while (markers.children.length > 0) {
        const obj = markers.children[0]
        markers.remove(obj)
        disposeObject3D(obj)
      }

      const rankedNow = rankPeaks(next)
      const winnerId = rankedNow[0]?.id
      for (const p of HILL_PEAKS) {
        if (peakWeight(p, next) === 0) continue
        const isWinner = p.id === winnerId
        const isAnswer = p.id === 'answer'
        const color = isAnswer ? ANSWER_HEX : DISTRACTOR_HEX
        const radius = isWinner ? 0.11 : 0.06
        const y = FLOOR + heightAt(p.x, p.z, next) + 0.1
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 16, 12),
          new THREE.MeshBasicMaterial({ color }),
        )
        ball.position.set(p.x, y, p.z)
        markers.add(ball)
        if (isWinner) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(radius + 0.06, 0.012, 8, 28),
            new THREE.MeshBasicMaterial({ color }),
          )
          ring.rotation.x = Math.PI / 2
          ring.position.set(p.x, y, p.z)
          markers.add(ring)
        }
      }
      render()
    }

    applyRef.current = applyPeaks
    applyPeaks(0)

    const fit = () => {
      const w = host.clientWidth || 640
      const h = host.clientHeight || 360
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      render()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(host)

    controls.addEventListener('change', render)

    return () => {
      controls.removeEventListener('change', render)
      ro.disconnect()
      controls.dispose()
      geo.dispose()
      mat.dispose()
      wireMat.dispose()
      markers.traverse(disposeObject3D)
      renderer.dispose()
      renderer.domElement.remove()
      applyRef.current = () => {}
    }
  }, [])

  useEffect(() => {
    if (!webgl) return
    applyRef.current(noise)
  }, [noise, webgl])

  const verdict = answerStillWins
    ? 'Tallest hill: the answer.'
    : 'Tallest hill: a distractor. Vector search would return that session first.'

  return (
    <div className="hills-block">
      <div className="hills-head">
        <h3 className="category-heading">Similarity hills</h3>
        <p>
          Vector search picks the nearest point in embedding space. In this toy slice, height is
          that similarity. The white marker is the answer session. Amber markers are distractors.
          Add them and a near match can become the tallest hill.
        </p>
      </div>
      <div className="mechanism-card hills-card">
        {webgl ? (
          <div
            ref={hostRef}
            className="hills-canvas"
            role="img"
            aria-label={
              answerStillWins
                ? `Similarity surface with ${noise} distractor hills. The answer is still the tallest.`
                : `Similarity surface with ${noise} distractor hills. A distractor is now the tallest.`
            }
          />
        ) : null}
        {!webgl ? (
          <div
            className="hills-stage"
            role="img"
            aria-label={
              answerStillWins
                ? `Top-down similarity surface with ${noise} distractor hills. The answer is still the tallest.`
                : `Top-down similarity surface with ${noise} distractor hills. A distractor is now the tallest.`
            }
          >
            <HillsHeatmap noise={noise} />
          </div>
        ) : null}
        {webgl ? (
          <p className="mechanism-caption">Drag the surface to rotate. The slider adds distractor sessions.</p>
        ) : null}
        <label className="mechanism-caption cosine-slider">
          Distractor sessions on the surface: {noise} of {HILL_MAX_DISTRACTORS}
          <input
            type="range"
            min={0}
            max={HILL_MAX_DISTRACTORS}
            step={1}
            value={noise}
            onChange={(e) => setNoise(Number(e.target.value))}
            aria-valuetext={
              answerStillWins
                ? `${noise} of ${HILL_MAX_DISTRACTORS}, answer still tallest`
                : `${noise} of ${HILL_MAX_DISTRACTORS}, a distractor is tallest`
            }
          />
        </label>
        <p className="mechanism-caption mono" aria-live="polite">
          {verdict}
        </p>
        <table className="chart-table">
          <caption className="visually-hidden">
            Visible peak heights on the similarity surface, ranked tallest first
          </caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Peak</th>
              <th scope="col">Height</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => (
              <tr key={row.id}>
                <td className="mono tabular">{i + 1}</td>
                <th scope="row">
                  {row.label}
                  {i === 0 ? ' (tallest)' : ''}
                </th>
                <td className="mono tabular">{row.height.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="chart-caption">
        A schematic 2D slice, not a plot of the paper&rsquo;s numbers. The noise chart in section
        04 measures the same crowding on the real harness pairs.
      </p>
    </div>
  )
}
