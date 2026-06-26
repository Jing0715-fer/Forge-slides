"use client"

import React, { useEffect, useRef, useState } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT, createTextElement, createShapeElement, createImageElement, createContainerElement } from "@/store/editor-store"
import { CanvasElementView } from "./CanvasElement"
import type { EditorElement } from "@/types/editor"
import { cn } from "@/lib/utils"

export function Canvas() {
  const {
    currentSlide,
    selectedIds,
    editingId,
    clearSelection,
    setSelected,
    addElement,
    zoom,
    showGrid,
    showGuides,
  } = useEditor()
  const slide = currentSlide()
  const containerRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Handle image drag-and-drop onto canvas
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const imgFile = files.find((f) => f.type.startsWith("image/"))
    if (!imgFile) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const { x, y } = clientToCanvas(e.clientX, e.clientY)
        const maxW = 600
        const maxH = 450
        let w = img.naturalWidth
        let h = img.naturalHeight
        const ratio = Math.min(maxW / w, maxH / h, 1)
        w = w * ratio
        h = h * ratio
        addElement(createImageElement(dataUrl, {
          x: x - w / 2,
          y: y - h / 2,
          width: w,
          height: h,
          name: imgFile.name.replace(/\.[^.]+$/, ""),
        }))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(imgFile)
  }

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault()
      setDragOver(true)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target) setDragOver(false)
  }

  // Convert client coords to canvas coords
  function clientToCanvas(clientX: number, clientY: number) {
    const canvas = document.getElementById("editor-canvas")
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const z = rect.width / CANVAS_WIDTH
    return { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z }
  }

  // Background pointer down: start marquee selection or clear
  function onCanvasPointerDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).id !== "editor-canvas-inner") {
      return
    }
    if (e.button !== 0) return
    clearSelection()
    const start = clientToCanvas(e.clientX, e.clientY)
    setMarquee({ x1: start.x, y1: start.y, x2: start.x, y2: start.y })

    const onMove = (ev: PointerEvent) => {
      const cur = clientToCanvas(ev.clientX, ev.clientY)
      setMarquee((m) => (m ? { ...m, x2: cur.x, y2: cur.y } : m))
    }
    const onUp = () => {
      setMarquee((m) => {
        if (m) {
          const x1 = Math.min(m.x1, m.x2)
          const y1 = Math.min(m.y1, m.y2)
          const x2 = Math.max(m.x1, m.x2)
          const y2 = Math.max(m.y1, m.y2)
          if (Math.abs(x2 - x1) > 4 && Math.abs(y2 - y1) > 4) {
            const ids = slide.elements
              .filter((el) => el.visible && el.x < x2 && el.x + el.width > x1 && el.y < y2 && el.y + el.height > y1)
              .map((el) => el.id)
            if (ids.length > 0) setSelected(ids)
          }
        }
        return null
      })
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // Render
  const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div
      className="canvas-scroll flex-1 relative overflow-auto bg-slate-100 dark:bg-slate-900"
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-primary font-semibold text-lg">Drop image to add to slide</p>
        </div>
      )}
      <div className="min-w-full min-h-full flex items-center justify-center p-12">
        <div
          id="editor-canvas"
          onPointerDown={onCanvasPointerDown}
          className="relative shadow-2xl bg-white"
          style={{
            width: CANVAS_WIDTH * zoom,
            height: CANVAS_HEIGHT * zoom,
            background: slide.background,
            backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Inner canvas at native resolution */}
          <div
            id="editor-canvas-inner"
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${zoom})`,
            }}
          >
            {/* Grid */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            )}
            {/* Center cross hair */}
            {showGuides && (
              <>
                <div className="absolute top-0 left-1/2 w-px h-full bg-slate-200/60 pointer-events-none" />
                <div className="absolute left-0 top-1/2 w-full h-px bg-slate-200/60 pointer-events-none" />
              </>
            )}
            {/* Elements */}
            {elements.map((el) => (
              <CanvasElementView
                key={el.id}
                element={el}
                selected={selectedIds.includes(el.id)}
                editing={editingId === el.id}
              />
            ))}
            {/* Marquee selection */}
            {marquee && (
              <div
                className="absolute pointer-events-none border border-primary bg-primary/10"
                style={{
                  left: Math.min(marquee.x1, marquee.x2),
                  top: Math.min(marquee.y1, marquee.y2),
                  width: Math.abs(marquee.x2 - marquee.x1),
                  height: Math.abs(marquee.y2 - marquee.y1),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
