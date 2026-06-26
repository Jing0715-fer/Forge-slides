import type { EditorElement, GuideLine } from "@/types/editor"
import { CANVAS_WIDTH, CANVAS_HEIGHT, SNAP_THRESHOLD } from "@/store/editor-store"

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

// Returns the centers and edges of a box used for alignment
function boxAnchors(b: Box) {
  return {
    left: b.x,
    centerX: b.x + b.width / 2,
    right: b.x + b.width,
    top: b.y,
    centerY: b.y + b.height / 2,
    bottom: b.y + b.height,
  }
}

export interface SnapResult {
  dx: number
  dy: number
  guides: GuideLine[]
}

/**
 * Compute snapping for a moving box against other element boxes and the canvas.
 * Mirrors PowerPoint behaviour: snap left/center/right edges horizontally and
 * top/middle/bottom edges vertically. Returns the delta to add to the box and
 * the guide lines that should be drawn.
 */
export function snapMove(
  moving: Box,
  others: Box[],
  options: { snapToCanvas?: boolean; snapToElements?: boolean } = {},
): SnapResult {
  const { snapToCanvas = true, snapToElements = true } = options
  const m = boxAnchors(moving)
  const guides: GuideLine[] = []
  let dx = 0
  let dy = 0

  // Build candidate anchor positions on x and y axes
  type Candidate = {
    pos: number
    target: number
    kind: "left" | "centerX" | "right" | "top" | "centerY" | "bottom"
    // bounding range for the guide line on the perpendicular axis
    rangeStart: number
    rangeEnd: number
  }
  const candidates: Candidate[] = []

  if (snapToCanvas) {
    candidates.push(
      { pos: 0, target: m.left, kind: "left", rangeStart: 0, rangeEnd: CANVAS_HEIGHT },
      { pos: CANVAS_WIDTH / 2, target: m.centerX, kind: "centerX", rangeStart: 0, rangeEnd: CANVAS_HEIGHT },
      { pos: CANVAS_WIDTH, target: m.right, kind: "right", rangeStart: 0, rangeEnd: CANVAS_HEIGHT },
      { pos: 0, target: m.top, kind: "top", rangeStart: 0, rangeEnd: CANVAS_WIDTH },
      { pos: CANVAS_HEIGHT / 2, target: m.centerY, kind: "centerY", rangeStart: 0, rangeEnd: CANVAS_WIDTH },
      { pos: CANVAS_HEIGHT, target: m.bottom, kind: "bottom", rangeStart: 0, rangeEnd: CANVAS_WIDTH },
    )
  }
  if (snapToElements) {
    for (const o of others) {
      const a = boxAnchors(o)
      candidates.push(
        { pos: a.left, target: m.left, kind: "left", rangeStart: Math.min(moving.y, o.y), rangeEnd: Math.max(moving.y + moving.height, o.y + o.height) },
        { pos: a.centerX, target: m.centerX, kind: "centerX", rangeStart: Math.min(moving.y, o.y), rangeEnd: Math.max(moving.y + moving.height, o.y + o.height) },
        { pos: a.right, target: m.right, kind: "right", rangeStart: Math.min(moving.y, o.y), rangeEnd: Math.max(moving.y + moving.height, o.y + o.height) },
        { pos: a.top, target: m.top, kind: "top", rangeStart: Math.min(moving.x, o.x), rangeEnd: Math.max(moving.x + moving.width, o.x + o.width) },
        { pos: a.centerY, target: m.centerY, kind: "centerY", rangeStart: Math.min(moving.x, o.x), rangeEnd: Math.max(moving.x + moving.width, o.x + o.width) },
        { pos: a.bottom, target: m.bottom, kind: "bottom", rangeStart: Math.min(moving.x, o.x), rangeEnd: Math.max(moving.x + moving.width, o.x + o.width) },
      )
    }
  }

  // Find best x snap
  let bestX: { diff: number; pos: number; kind: Candidate["kind"]; rangeStart: number; rangeEnd: number } | null = null
  let bestY: { diff: number; pos: number; kind: Candidate["kind"]; rangeStart: number; rangeEnd: number } | null = null
  for (const c of candidates) {
    const diff = c.target - c.pos
    if (Math.abs(diff) > SNAP_THRESHOLD) continue
    if (c.kind === "left" || c.kind === "centerX" || c.kind === "right") {
      if (!bestX || Math.abs(diff) < Math.abs(bestX.diff)) {
        bestX = { diff, pos: c.pos, kind: c.kind, rangeStart: c.rangeStart, rangeEnd: c.rangeEnd }
      }
    } else {
      if (!bestY || Math.abs(diff) < Math.abs(bestY.diff)) {
        bestY = { diff, pos: c.pos, kind: c.kind, rangeStart: c.rangeStart, rangeEnd: c.rangeEnd }
      }
    }
  }

  if (bestX) {
    dx = -bestX.diff
    guides.push({
      axis: "x",
      position: bestX.pos,
      start: bestX.rangeStart,
      end: bestX.rangeEnd,
    })
  }
  if (bestY) {
    dy = -bestY.diff
    guides.push({
      axis: "y",
      position: bestY.pos,
      start: bestY.rangeStart,
      end: bestY.rangeEnd,
    })
  }

  return { dx, dy, guides }
}

/**
 * Compute snapping for a resizing box. We compare the edges of the resized box
 * against other elements' edges and centers and the canvas.
 */
export function snapResize(
  resized: Box,
  others: Box[],
  edge: "left" | "right" | "top" | "bottom",
): SnapResult {
  const m = boxAnchors(resized)
  const guides: GuideLine[] = []
  let delta = 0
  let axis: "x" | "y" = "x"

  type Candidate = {
    pos: number
    target: number
    rangeStart: number
    rangeEnd: number
  }
  const candidates: Candidate[] = []

  const verticalRange = { start: 0, end: CANVAS_HEIGHT }
  const horizontalRange = { start: 0, end: CANVAS_WIDTH }

  if (edge === "left" || edge === "right") {
    axis = "x"
    const target = edge === "left" ? m.left : m.right
    candidates.push(
      { pos: 0, target, ...verticalRange },
      { pos: CANVAS_WIDTH / 2, target, ...verticalRange },
      { pos: CANVAS_WIDTH, target, ...verticalRange },
    )
    for (const o of others) {
      const a = boxAnchors(o)
      candidates.push(
        { pos: a.left, target, rangeStart: Math.min(resized.y, o.y), rangeEnd: Math.max(resized.y + resized.height, o.y + o.height) },
        { pos: a.centerX, target, rangeStart: Math.min(resized.y, o.y), rangeEnd: Math.max(resized.y + resized.height, o.y + o.height) },
        { pos: a.right, target, rangeStart: Math.min(resized.y, o.y), rangeEnd: Math.max(resized.y + resized.height, o.y + o.height) },
      )
    }
  } else {
    axis = "y"
    const target = edge === "top" ? m.top : m.bottom
    candidates.push(
      { pos: 0, target, ...horizontalRange },
      { pos: CANVAS_HEIGHT / 2, target, ...horizontalRange },
      { pos: CANVAS_HEIGHT, target, ...horizontalRange },
    )
    for (const o of others) {
      const a = boxAnchors(o)
      candidates.push(
        { pos: a.top, target, rangeStart: Math.min(resized.x, o.x), rangeEnd: Math.max(resized.x + resized.width, o.x + o.width) },
        { pos: a.centerY, target, rangeStart: Math.min(resized.x, o.x), rangeEnd: Math.max(resized.x + resized.width, o.x + o.width) },
        { pos: a.bottom, target, rangeStart: Math.min(resized.x, o.x), rangeEnd: Math.max(resized.x + resized.width, o.x + o.width) },
      )
    }
  }

  let best: { diff: number; pos: number; rangeStart: number; rangeEnd: number } | null = null
  for (const c of candidates) {
    const diff = c.target - c.pos
    if (Math.abs(diff) > SNAP_THRESHOLD) continue
    if (!best || Math.abs(diff) < Math.abs(best.diff)) {
      best = { diff, pos: c.pos, rangeStart: c.rangeStart, rangeEnd: c.rangeEnd }
    }
  }
  if (best) {
    delta = -best.diff
    guides.push({
      axis,
      position: best.pos,
      start: best.rangeStart,
      end: best.rangeEnd,
    })
  }

  return axis === "x" ? { dx: delta, dy: 0, guides } : { dx: 0, dy: delta, guides }
}

// Convert a rotated point around a center
export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angle: number,
) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = px - cx
  const dy = py - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

// Get bounding box (axis-aligned) of a rotated element
export function rotatedBounds(el: EditorElement): Box {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const angle = (el.rotation * Math.PI) / 180
  const corners = [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ].map((p) => rotatePoint(p.x, p.y, cx, cy, angle))
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}
