"use client"

import React, { useRef, useEffect, useState, useCallback } from "react"
import type { EditorElement, TextElement, ShapeElement, ImageElement, ContainerElement, GuideLine } from "@/types/editor"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import { snapMove, snapResize, type Box } from "@/lib/alignment"
import { cn } from "@/lib/utils"

type ResizeHandle =
  | "nw" | "n" | "ne"
  | "e"        | "w"
  | "sw" | "s" | "se"

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

interface DragState {
  mode: "move" | "resize" | "rotate"
  handle?: ResizeHandle
  startX: number
  startY: number
  originals: { id: string; x: number; y: number; width: number; height: number; rotation: number }[]
  others: Box[]
  // whether a history snapshot has been pushed for this drag
  snapshotted: boolean
}

interface Props {
  element: EditorElement
  selected: boolean
  editing: boolean
  overlay?: boolean
}

export function CanvasElementView({ element, selected, editing, overlay }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [snapGuides, setSnapGuides] = useState<GuideLine[]>([])
  const { setSelected, toggleSelected, updateElement, updateElements, setEditing, currentSlide } = useEditor()
  const slide = currentSlide()

  // Helper to get canvas-space pointer position
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = document.getElementById("editor-canvas")
    if (!canvas) return { x: 0, y: 0, zoom: 1 }
    const rect = canvas.getBoundingClientRect()
    const zoom = rect.width / CANVAS_WIDTH
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
      zoom,
    }
  }, [])

  // Single source of truth for pointer move during drag
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      e.preventDefault()
      const { x: cx, y: cy } = getCanvasPos(e.clientX, e.clientY)
      const dx = cx - drag.startX
      const dy = cy - drag.startY

      if (drag.mode === "move") {
        let newX = drag.originals[0].x + dx
        let newY = drag.originals[0].y + dy
        const movingBox: Box = {
          x: newX,
          y: newY,
          width: drag.originals[0].width,
          height: drag.originals[0].height,
        }
        const snap = snapMove(movingBox, drag.others)
        newX += snap.dx
        newY += snap.dy
        setSnapGuides(snap.guides)
        updateElement(element.id, { x: newX, y: newY })
      } else if (drag.mode === "resize") {
        const orig = drag.originals[0]
        let { x, y, width, height } = orig
        const handle = drag.handle!
        if (handle.includes("e")) width = Math.max(8, orig.width + dx)
        if (handle.includes("s")) height = Math.max(8, orig.height + dy)
        if (handle.includes("w")) {
          width = Math.max(8, orig.width - dx)
          x = orig.x + (orig.width - width)
        }
        if (handle.includes("n")) {
          height = Math.max(8, orig.height - dy)
          y = orig.y + (orig.height - height)
        }
        const resized: Box = { x, y, width, height }
        const edges: ("left" | "right" | "top" | "bottom")[] = []
        if (handle.includes("w")) edges.push("left")
        if (handle.includes("e")) edges.push("right")
        if (handle.includes("n")) edges.push("top")
        if (handle.includes("s")) edges.push("bottom")
        const allGuides: GuideLine[] = []
        for (const edge of edges) {
          const snap = snapResize(resized, drag.others, edge)
          if (snap.dx) {
            if (edge === "left") {
              const newX = x + snap.dx
              const newWidth = width - snap.dx
              if (newWidth >= 8) { x = newX; width = newWidth }
            } else if (edge === "right") {
              width = width + snap.dx
            }
          }
          if (snap.dy) {
            if (edge === "top") {
              const newY = y + snap.dy
              const newHeight = height - snap.dy
              if (newHeight >= 8) { y = newY; height = newHeight }
            } else if (edge === "bottom") {
              height = height + snap.dy
            }
          }
          allGuides.push(...snap.guides)
        }
        setSnapGuides(allGuides)
        updateElement(element.id, { x, y, width, height })
      } else if (drag.mode === "rotate") {
        const orig = drag.originals[0]
        const cxBox = orig.x + orig.width / 2
        const cyBox = orig.y + orig.height / 2
        const angle = Math.atan2(cy - cyBox, cx - cxBox) * (180 / Math.PI) + 90
        let finalAngle = angle
        if (e.shiftKey) finalAngle = Math.round(angle / 15) * 15
        updateElement(element.id, { rotation: finalAngle })
      }
    }
    function onUp() {
      if (dragRef.current) {
        dragRef.current = null
        setSnapGuides([])
      }
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    // We don't attach listeners here; we attach them on pointer down
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [element.id, getCanvasPos, updateElement])

  function startDrag(e: React.PointerEvent, mode: "move" | "resize" | "rotate", handle?: ResizeHandle) {
    if (element.locked) return
    if (mode === "move" && editing) return
    e.stopPropagation()
    if (e.button !== 0) return
    // selection
    if (!selected) {
      if (e.shiftKey) toggleSelected(element.id)
      else setSelected([element.id])
    }
    const { x: cx, y: cy } = getCanvasPos(e.clientX, e.clientY)
    // If the element is part of a group, collect all group siblings to move together
    const groupSiblings = element.groupId
      ? slide.elements.filter((el) => el.groupId === element.groupId)
      : [element]
    const groupIds = new Set(groupSiblings.map((el) => el.id))
    const slideEls = slide.elements.filter((el) => !groupIds.has(el.id) && el.visible)
    const others: Box[] = slideEls.map((el) => ({ x: el.x, y: el.y, width: el.width, height: el.height }))

    // Push a snapshot to history so undo rolls back the whole drag
    const state = useEditor.getState()
    const past = [...state.past, structuredClone(state.slides)].slice(-50)
    useEditor.setState({ past, future: [] })

    dragRef.current = {
      mode,
      handle,
      startX: cx,
      startY: cy,
      originals: groupSiblings.map((el) => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation })),
      others,
      snapshotted: true,
    }

    // Attach listeners
    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      ev.preventDefault()
      const { x: px, y: py } = getCanvasPos(ev.clientX, ev.clientY)
      const dx = px - drag.startX
      const dy = py - drag.startY
      if (drag.mode === "move") {
        let newX = drag.originals[0].x + dx
        let newY = drag.originals[0].y + dy
        const movingBox: Box = { x: newX, y: newY, width: drag.originals[0].width, height: drag.originals[0].height }
        const snap = snapMove(movingBox, drag.others)
        newX += snap.dx
        newY += snap.dy
        setSnapGuides(snap.guides)
        // Move all grouped elements by the same delta
        if (drag.originals.length > 1) {
          const baseDx = newX - drag.originals[0].x
          const baseDy = newY - drag.originals[0].y
          updateElements(
            drag.originals.map((o) => ({
              id: o.id,
              patch: { x: o.x + baseDx, y: o.y + baseDy },
            })),
          )
        } else {
          updateElement(element.id, { x: newX, y: newY })
        }
      } else if (drag.mode === "resize") {
        const orig = drag.originals[0]
        const handle = drag.handle!
        const isGroupResize = drag.originals.length > 1

        if (isGroupResize) {
          // --- Group resize: scale all members relative to group bounding box ---
          // Compute original group bbox
          const minX = Math.min(...drag.originals.map((o) => o.x))
          const minY = Math.min(...drag.originals.map((o) => o.y))
          const maxX = Math.max(...drag.originals.map((o) => o.x + o.width))
          const maxY = Math.max(...drag.originals.map((o) => o.y + o.height))
          let bx = minX, by = minY, bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY)
          const origBx = bx, origBy = by, origBw = bw, origBh = bh

          // Apply handle resize to the bounding box
          if (handle.includes("e")) bw = Math.max(16, origBw + dx)
          if (handle.includes("s")) bh = Math.max(16, origBh + dy)
          if (handle.includes("w")) {
            bw = Math.max(16, origBw - dx)
            bx = origBx + (origBw - bw)
          }
          if (handle.includes("n")) {
            bh = Math.max(16, origBh - dy)
            by = origBy + (origBh - bh)
          }

          // Shift = lock aspect ratio for corner handles
          const groupAspect = origBh > 0 ? origBw / origBh : 1
          if (ev.shiftKey && ["nw", "ne", "sw", "se"].includes(handle) && groupAspect > 0) {
            const newWFromH = bh * groupAspect
            const newHFromW = bw / groupAspect
            if (Math.abs(bw - origBw) > Math.abs(bh - origBh)) {
              bh = newHFromW
              if (handle.includes("n")) by = origBy + (origBh - bh)
            } else {
              bw = newWFromH
              if (handle.includes("w")) bx = origBx + (origBw - bw)
            }
          }

          // Snap the bounding box edges to other elements
          const resizedBox: Box = { x: bx, y: by, width: bw, height: bh }
          const edges: ("left" | "right" | "top" | "bottom")[] = []
          if (handle.includes("w")) edges.push("left")
          if (handle.includes("e")) edges.push("right")
          if (handle.includes("n")) edges.push("top")
          if (handle.includes("s")) edges.push("bottom")
          const allGuides: GuideLine[] = []
          if (!ev.shiftKey) {
            for (const edge of edges) {
              const snap = snapResize(resizedBox, drag.others, edge)
              if (snap.dx) {
                if (edge === "left") {
                  const newX = bx + snap.dx
                  const newWidth = bw - snap.dx
                  if (newWidth >= 16) { bx = newX; bw = newWidth }
                } else if (edge === "right") {
                  bw = bw + snap.dx
                }
              }
              if (snap.dy) {
                if (edge === "top") {
                  const newY = by + snap.dy
                  const newHeight = bh - snap.dy
                  if (newHeight >= 16) { by = newY; bh = newHeight }
                } else if (edge === "bottom") {
                  bh = bh + snap.dy
                }
              }
              allGuides.push(...snap.guides)
            }
          }
          setSnapGuides(allGuides)

          // Compute scale factors (guard against divide-by-zero)
          const scaleX = bw / origBw
          const scaleY = bh / origBh
          // For text properties, use geometric mean of scales for perceptual uniformity
          const fontScale = Math.sqrt(scaleX * scaleY)

          // Apply scaled transform to every group member
          // Need to look up live elements to read text properties
          const liveSlide = useEditor.getState().currentSlide()
          const updates = drag.originals.map((o) => {
            const relX = (o.x - origBx) / origBw
            const relY = (o.y - origBy) / origBh
            const newX = bx + relX * bw
            const newY = by + relY * bh
            const newW = Math.max(4, o.width * scaleX)
            const newH = Math.max(4, o.height * scaleY)
            const patch: Partial<EditorElement> & { fontSize?: number; letterSpacing?: number; padding?: number; strokeWidth?: number } = {
              x: newX,
              y: newY,
              width: newW,
              height: newH,
            }
            // Scale text properties
            const live = liveSlide?.elements.find((el) => el.id === o.id)
            if (live && live.type === "text") {
              const t = live as TextElement
              patch.fontSize = Math.max(6, Math.round(t.fontSize * fontScale))
              if (typeof t.letterSpacing === "number" && t.letterSpacing !== 0) {
                patch.letterSpacing = t.letterSpacing * scaleX
              }
              if (typeof t.padding === "number" && t.padding !== 0) {
                patch.padding = t.padding * fontScale
              }
            }
            // Scale stroke width for shapes
            if (live && (live.type === "rect" || live.type === "ellipse" || live.type === "triangle" || live.type === "line")) {
              const s = live as ShapeElement
              if (typeof s.strokeWidth === "number" && s.strokeWidth > 0) {
                patch.strokeWidth = Math.max(0.5, s.strokeWidth * fontScale)
              }
            }
            return { id: o.id, patch: patch as Partial<EditorElement> }
          })
          updateElements(updates)
        } else {
          // --- Single element resize (original logic) ---
          let { x, y, width, height } = orig
          const aspectRatio = orig.height > 0 ? orig.width / orig.height : 1
          if (handle.includes("e")) width = Math.max(8, orig.width + dx)
          if (handle.includes("s")) height = Math.max(8, orig.height + dy)
          if (handle.includes("w")) {
            width = Math.max(8, orig.width - dx)
            x = orig.x + (orig.width - width)
          }
          if (handle.includes("n")) {
            height = Math.max(8, orig.height - dy)
            y = orig.y + (orig.height - height)
          }
          // Shift = lock aspect ratio (corner handles only)
          if (ev.shiftKey && ["nw", "ne", "sw", "se"].includes(handle) && aspectRatio > 0) {
            const newWFromH = height * aspectRatio
            const newHFromW = width / aspectRatio
            if (Math.abs(width - orig.width) > Math.abs(height - orig.height)) {
              height = newHFromW
              if (handle.includes("n")) y = orig.y + (orig.height - height)
            } else {
              width = newWFromH
              if (handle.includes("w")) x = orig.x + (orig.width - width)
            }
          }
          const resized: Box = { x, y, width, height }
          const edges: ("left" | "right" | "top" | "bottom")[] = []
          if (handle.includes("w")) edges.push("left")
          if (handle.includes("e")) edges.push("right")
          if (handle.includes("n")) edges.push("top")
          if (handle.includes("s")) edges.push("bottom")
          const allGuides: GuideLine[] = []
          if (!ev.shiftKey) {
            for (const edge of edges) {
              const snap = snapResize(resized, drag.others, edge)
              if (snap.dx) {
                if (edge === "left") {
                  const newX = x + snap.dx
                  const newWidth = width - snap.dx
                  if (newWidth >= 8) { x = newX; width = newWidth }
                } else if (edge === "right") {
                  width = width + snap.dx
                }
              }
              if (snap.dy) {
                if (edge === "top") {
                  const newY = y + snap.dy
                  const newHeight = height - snap.dy
                  if (newHeight >= 8) { y = newY; height = newHeight }
                } else if (edge === "bottom") {
                  height = height + snap.dy
                }
              }
              allGuides.push(...snap.guides)
            }
          }
          setSnapGuides(allGuides)
          updateElement(element.id, { x, y, width, height })
        }
      } else if (drag.mode === "rotate") {
        const orig = drag.originals[0]
        const cxBox = orig.x + orig.width / 2
        const cyBox = orig.y + orig.height / 2
        const angle = Math.atan2(py - cyBox, px - cxBox) * (180 / Math.PI) + 90
        let finalAngle = angle
        if (ev.shiftKey) finalAngle = Math.round(angle / 15) * 15
        updateElement(element.id, { rotation: finalAngle })
      }
    }
    const onUp = () => {
      dragRef.current = null
      setSnapGuides([])
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    opacity: element.opacity,
    cursor: element.locked ? "default" : "move",
    zIndex: element.zIndex,
    pointerEvents: element.locked ? "none" : "auto",
    visibility: element.visible ? "visible" : "hidden",
  }

  return (
    <>
      <div
        ref={ref}
        data-element-id={element.id}
        className={cn("group/el", selected && !editing && "ring-2 ring-primary", element.groupId && "group-active")}
        style={wrapperStyle}
        onPointerDown={(e) => startDrag(e, "move")}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (element.type === "text") setEditing(element.id)
        }}
      >
        {renderElementContent(element, editing, overlay, (text) =>
          updateElement(element.id, { text } as Partial<TextElement>),
        )}
        {/* Selection ring overlay — dashed for grouped elements */}
        {selected && !editing && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none ring-2",
              element.groupId ? "ring-blue-500 ring-offset-1" : "ring-primary",
            )}
            style={element.groupId ? { outlineStyle: "dashed", outlineWidth: 2, outlineColor: "#3b82f6", outlineOffset: 1 } : undefined}
          />
        )}
        {/* Resize handles */}
        {selected && !editing && !element.locked && (
          <>
            {HANDLES.map((h) => (
              <ResizeHandleView key={h} handle={h} onPointerDown={(e) => startDrag(e, "resize", h)} />
            ))}
            {/* Rotation handle */}
            <div
              onPointerDown={(e) => startDrag(e, "rotate")}
              className="absolute -top-7 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow cursor-grab"
              title="Drag to rotate (Shift = snap to 15°)"
            />
            <div className="absolute -top-4 left-1/2 w-px h-4 bg-primary pointer-events-none" />
          </>
        )}
      </div>
      {/* Snap guide lines */}
      {snapGuides.length > 0 && <SnapGuidesView guides={snapGuides} />}
    </>
  )
}

function ResizeHandleView({ handle, onPointerDown }: { handle: ResizeHandle; onPointerDown: (e: React.PointerEvent) => void }) {
  const positions: Record<ResizeHandle, React.CSSProperties> = {
    nw: { left: -5, top: -5, cursor: "nwse-resize" },
    n: { left: "50%", top: -5, transform: "translateX(-50%)", cursor: "ns-resize" },
    ne: { right: -5, top: -5, cursor: "nesw-resize" },
    e: { right: -5, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
    se: { right: -5, bottom: -5, cursor: "nwse-resize" },
    s: { left: "50%", bottom: -5, transform: "translateX(-50%)", cursor: "ns-resize" },
    sw: { left: -5, bottom: -5, cursor: "nesw-resize" },
    w: { left: -5, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className="resize-handle absolute w-2.5 h-2.5 bg-white border border-primary rounded-sm shadow-sm z-10"
      style={positions[handle]}
    />
  )
}

function SnapGuidesView({ guides }: { guides: GuideLine[] }) {
  return (
    <>
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div
            key={i}
            className="absolute pointer-events-none snap-guide-x"
            style={{
              left: g.position - 0.5,
              top: g.start,
              width: 1,
              height: g.end - g.start,
              zIndex: 9999,
              background: "#ec4899",
              boxShadow: "0 0 4px rgba(236, 72, 153, 0.8)",
            }}
          />
        ) : (
          <div
            key={i}
            className="absolute pointer-events-none snap-guide-y"
            style={{
              top: g.position - 0.5,
              left: g.start,
              height: 1,
              width: g.end - g.start,
              zIndex: 9999,
              background: "#ec4899",
              boxShadow: "0 0 4px rgba(236, 72, 153, 0.8)",
            }}
          />
        ),
      )}
    </>
  )
}

function renderElementContent(
  element: EditorElement,
  editing: boolean,
  overlay: boolean | undefined,
  onTextChange: (text: string) => void,
): React.ReactNode {
  const shadowStyle: React.CSSProperties = element.shadow
    ? {
        boxShadow: `${element.shadowX || 0}px ${element.shadowY || 0}px ${element.shadowBlur || 24}px ${element.shadowColor || "rgba(15,23,42,0.15)"}`,
      }
    : {}

  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: overlay ? "transparent" : element.fill,
    border: overlay || (element.strokeWidth && element.stroke && element.stroke !== "transparent")
      ? "none"
      : `${element.strokeWidth}px solid ${element.stroke}`,
    borderRadius: element.borderRadius,
    ...shadowStyle,
    overflow: "visible",
  }

  switch (element.type) {
    case "text": {
      const t = element as TextElement
      const isList = t.listType && t.listType !== "none"
      const textStyle: React.CSSProperties = {
        ...baseStyle,
        fontSize: t.fontSize,
        fontFamily: t.fontFamily,
        fontWeight: t.fontWeight,
        fontStyle: t.fontStyle,
        textDecoration: t.textDecoration,
        textAlign: t.textAlign,
        color: overlay ? "transparent" : t.color,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
        padding: t.padding,
        display: "block",
        justifyContent:
          t.verticalAlign === "top"
            ? "flex-start"
            : t.verticalAlign === "bottom"
              ? "flex-end"
              : "center",
        background: overlay ? "transparent" : t.fill,
        border: "none",
        borderRadius: t.borderRadius,
        boxShadow: t.shadow ? shadowStyle.boxShadow : "none",
      }
      if (editing) {
        return (
          <textarea
            autoFocus
            // Controlled (not defaultValue): when the store updates text
            // (e.g. via Find/Replace, undo, or programmatic setText), the
            // textarea re-syncs immediately instead of ignoring the new
            // value. Without this, edits from external code paths silently
            // get clobbered on the next render.
            value={t.text}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={() => useEditor.getState().setEditing(null)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === "Escape") useEditor.getState().setEditing(null)
            }}
            style={{
              ...textStyle,
              resize: "none",
              background: "rgba(59,130,246,0.05)",
              outline: "2px solid #3b82f6",
              cursor: "text",
              border: "none",
              boxShadow: "none",
            }}
            className="w-full h-full"
          />
        )
      }
      // Render as list if listType is set
      if (isList) {
        const lines = t.text.split("\n").filter((l) => l.trim() !== "")
        const listStyleType = t.listType === "number"
          ? (t.listStyle === "lower-alpha" ? "lower-alpha" : t.listStyle === "upper-roman" ? "upper-roman" : "decimal")
          : (t.listStyle || "disc")
        const Tag = t.listType === "number" ? "ol" : "ul"
        return (
          <div style={{ ...textStyle, display: "block", overflow: "visible" }}>
            <Tag
              style={{
                listStyleType,
                margin: 0,
                paddingLeft: (t.listIndent || 0) + (t.fontSize || 16) * 1.2,
                textAlign: t.textAlign as React.CSSProperties["textAlign"],
              }}
              className="whitespace-pre-wrap break-words"
            >
              {lines.map((line, i) => (
                <li key={i} style={{ marginBottom: 0 }}>{line}</li>
              ))}
            </Tag>
          </div>
        )
      }
        // Wrapping behavior is driven by the `wrap` flag (auto-detected on import):
        //  - wrap === false → single-line text (headings, labels): use nowrap so the
        //    text never wraps even if the box is slightly narrower than the text.
        //    overflow: visible lets the text paint without being clipped.
        //  - wrap === true (default) → paragraphs / body text: use pre-wrap so the
        //    text wraps naturally inside the box AND preserves explicit \n newlines.
        //    word-break: break-word ensures CJK characters wrap correctly.
        const shouldWrap = t.wrap !== false
        return (
          <div style={{
            ...textStyle,
            whiteSpace: shouldWrap ? "pre-wrap" : "nowrap",
            wordBreak: shouldWrap ? "break-word" : "keep-all",
            overflowWrap: shouldWrap ? "anywhere" : undefined,
            overflow: "visible",
          }}>
            {t.text}
          </div>
        )
    }
    case "rect":
      return <div style={overlay ? { ...baseStyle, background: "transparent", border: "none", boxShadow: "none" } : baseStyle} />
    case "ellipse":
      return <div style={{ ...baseStyle, borderRadius: "50%", ...(overlay ? { background: "transparent", border: "none", boxShadow: "none" } : {}) }} />
    case "triangle": {
      const s = element as ShapeElement
      if (overlay) return null // triangles are decorative; hide in overlay mode
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${s.width} ${s.height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <polygon
            points={`${s.width / 2},0 ${s.width},${s.height} 0,${s.height}`}
            fill={s.fill || "#f59e0b"}
            stroke={s.stroke || "transparent"}
            strokeWidth={s.strokeWidth || 0}
          />
        </svg>
      )
    }
    case "line": {
      const s = element as ShapeElement
      if (overlay) return null
      return (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: s.height / 2 - (s.strokeWidth || 2) / 2,
            width: "100%",
            height: s.strokeWidth || 2,
            background: s.stroke || "#0f172a",
          }}
        />
      )
    }
    case "image": {
      const i = element as ImageElement
      if (overlay) return null // iframe shows the image
      // Guard: an image with empty/missing src is invalid and would trigger
      // React's "empty string passed to src" warning. Render nothing.
      if (!i.src || !i.src.trim()) return null
      return (
        <img
          src={i.src}
          alt={i.alt || ""}
          draggable={false}
          style={{
            ...baseStyle,
            objectFit: i.objectFit,
            background: "transparent",
            border: "none",
          }}
        />
      )
    }
    case "container": {
      const c = element as ContainerElement
      if (overlay) return null // iframe shows the container content
      return (
        <div style={{ ...baseStyle }} dangerouslySetInnerHTML={{ __html: c.html || "" }} />
      )
    }
  }
}
