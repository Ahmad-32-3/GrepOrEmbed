export type HillPeak = {
  id: string
  label: string
  x: number
  z: number
  height: number
  sigma: number
  /** Distractor count at which this peak is fully visible. Answer is 0. */
  appearAt: number
}

export const HILL_EXTENT = 3.2
export const HILL_MAX_DISTRACTORS = 4

export const HILL_PEAKS: HillPeak[] = [
  {
    id: 'answer',
    label: 'answer session',
    x: -1.45,
    z: -1.15,
    height: 1,
    sigma: 0.72,
    appearAt: 0,
  },
  {
    id: 'weak',
    label: 'weak distractor',
    x: 1.85,
    z: -1.55,
    height: 0.52,
    sigma: 0.68,
    appearAt: 1,
  },
  {
    id: 'medium',
    label: 'medium distractor',
    x: -1.9,
    z: 1.7,
    height: 0.68,
    sigma: 0.7,
    appearAt: 2,
  },
  {
    id: 'strong',
    label: 'strong distractor',
    x: 1.65,
    z: 1.45,
    height: 0.84,
    sigma: 0.7,
    appearAt: 3,
  },
  {
    id: 'near',
    label: 'near match',
    x: -0.35,
    z: -0.2,
    height: 1.08,
    sigma: 0.74,
    appearAt: 4,
  },
]

export function clampDistractors(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(HILL_MAX_DISTRACTORS, Math.round(n)))
}

export function peakWeight(peak: HillPeak, distractors: number): number {
  if (peak.appearAt === 0) return 1
  if (clampDistractors(distractors) < peak.appearAt) return 0
  return 1
}

export function gaussian2d(
  x: number,
  z: number,
  cx: number,
  cz: number,
  sigma: number,
): number {
  const dx = x - cx
  const dz = z - cz
  return Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma))
}

export function heightAt(x: number, z: number, distractors: number): number {
  const n = clampDistractors(distractors)
  let h = 0
  for (const peak of HILL_PEAKS) {
    const w = peakWeight(peak, n)
    if (w === 0) continue
    h += w * peak.height * gaussian2d(x, z, peak.x, peak.z, peak.sigma)
  }
  return h
}

export function visiblePeaks(distractors: number): HillPeak[] {
  const n = clampDistractors(distractors)
  return HILL_PEAKS.filter((peak) => peakWeight(peak, n) > 0)
}

export type RankedPeak = {
  id: string
  label: string
  height: number
  isAnswer: boolean
  visible: boolean
}

export function rankPeaks(distractors: number): RankedPeak[] {
  const n = clampDistractors(distractors)
  return HILL_PEAKS.map((peak) => {
    const visible = peakWeight(peak, n) > 0
    return {
      id: peak.id,
      label: peak.label,
      height: visible ? peak.height : 0,
      isAnswer: peak.id === 'answer',
      visible,
    }
  })
    .filter((row) => row.visible)
    .sort((a, b) => b.height - a.height)
}

export function tallestPeak(distractors: number): RankedPeak | null {
  const ranked = rankPeaks(distractors)
  return ranked[0] ?? null
}
