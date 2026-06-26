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
}

export function CanvasElementView({ element, selected, editing }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [snapGuides, setSnapGuides] = useState<GuideLine[]>([])
  const { setSelected, toggleSelected, updateElement, setEditing, currentSlide } = useEditor()
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
    const slideEls = slide.elements.filter((el) => el.id !== element.id && el.visible)
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
      originals: [{ id: element.id, x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation }],
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
        className={cn("group/el", selected && !editing && "ring-2 ring-primary")}
        style={wrapperStyle}
        onPointerDown={(e) => startDrag(e, "move")}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (element.type === "text") setEditing(element.id)
        }}
      >
        {renderElementContent(element, editing, (text) =>
          updateElement(element.id, { text } as Partial<TextElement>),
        )}
        {/* Selection ring overlay */}
        {selected && !editing && (
          <div className="absolute inset-0 pointer-events-none ring-2 ring-primary" />
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
      className="absolute w-2.5 h-2.5 bg-white border border-primary rounded-sm shadow-sm z-10 hover:scale-125 transition-transform"
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
            className="absolute bg-pink-500 pointer-events-none"
            style={{
              left: g.position - 0.5,
              top: g.start,
              width: 1,
              height: g.end - g.start,
              zIndex: 9999,
            }}
          />
        ) : (
          <div
            key={i}
            className="absolute bg-pink-500 pointer-events-none"
            style={{
              top: g.position - 0.5,
              left: g.start,
              height: 1,
              width: g.end - g.start,
              zIndex: 9999,
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
    background: element.fill,
    border: element.strokeWidth && element.stroke && element.stroke !== "transparent"
      ? `${element.strokeWidth}px solid ${element.stroke}`
      : "none",
    borderRadius: element.borderRadius,
    ...shadowStyle,
    overflow: "hidden",
  }

  switch (element.type) {
    case "text": {
      const t = element as TextElement
      const textStyle: React.CSSProperties = {
        ...baseStyle,
        fontSize: t.fontSize,
        fontFamily: t.fontFamily,
        fontWeight: t.fontWeight,
        fontStyle: t.fontStyle,
        textDecoration: t.textDecoration,
        textAlign: t.textAlign,
        color: t.color,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
        padding: t.padding,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          t.verticalAlign === "top"
            ? "flex-start"
            : t.verticalAlign === "bottom"
              ? "flex-end"
              : "center",
        background: t.fill,
        border: "none",
        borderRadius: t.borderRadius,
        boxShadow: t.shadow ? shadowStyle.boxShadow : "none",
      }
      if (editing) {
        return (
          <textarea
            autoFocus
            defaultValue={t.text}
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
      return (
        <div style={textStyle} className="whitespace-pre-wrap break-words">
          {t.text}
        </div>
      )
    }
    case "rect":
      return <div style={baseStyle} />
    case "ellipse":
      return <div style={{ ...baseStyle, borderRadius: "50%" }} />
    case "triangle": {
      const s = element as ShapeElement
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
      return (
        <div style={{ ...baseStyle }} dangerouslySetInnerHTML={{ __html: c.html || "" }} />
      )
    }
  }
}
