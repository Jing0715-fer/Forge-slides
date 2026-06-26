"use client"

import React, { useEffect, useState } from "react"
import { useEditor, createTextElement, createShapeElement, createImageElement, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import { Toolbar } from "./Toolbar"
import { Canvas } from "./Canvas"
import { PropertyPanel } from "./PropertyPanel"
import { LayersPanel } from "./LayersPanel"
import { SlidesPanel } from "./SlidesPanel"
import { ImportHtmlDialog, ExportDialog } from "./ImportHtmlDialog"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

export function Editor() {
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const {
    selectedIds, removeElements, duplicateElements, copy, paste,
    undo, redo, updateElement, updateElements, currentSlide,
  } = useEditor()

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if editing text
      const editing = useEditor.getState().editingId
      const target = e.target as HTMLElement
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (editing || isTyping) {
        if (e.key === "Escape" && editing) {
          useEditor.getState().setEditing(null)
        }
        return
      }
      const meta = e.ctrlKey || e.metaKey
      const slide = useEditor.getState().currentSlide()

      // Undo / Redo
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return }

      // Copy / Paste
      if (meta && e.key === "c" && selectedIds.length > 0) { e.preventDefault(); copy(selectedIds); return }
      if (meta && e.key === "v") { e.preventDefault(); paste(); return }
      if (meta && e.key === "d" && selectedIds.length > 0) {
        e.preventDefault()
        duplicateElements(selectedIds)
        return
      }

      // Delete
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault()
        removeElements(selectedIds)
        return
      }

      // Select all
      if (meta && e.key === "a") {
        e.preventDefault()
        useEditor.getState().setSelected(slide.elements.map((el) => el.id))
        return
      }

      // Add text with T
      if (!meta && e.key === "t") {
        useEditor.getState().addElement(createTextElement({ x: 200, y: 200 }))
        return
      }

      // Arrow nudge
      if (selectedIds.length > 0 && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
        const updates = selectedIds.map((id) => {
          const el = slide.elements.find((x) => x.id === id)!
          return { id, patch: { x: el.x + dx, y: el.y + dy } }
        })
        updateElements(updates)
        return
      }

      // Size nudge with Shift+Arrow
      if (selectedIds.length > 0 && (e.altKey)) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const updates = selectedIds.map((id) => {
            const el = slide.elements.find((x) => x.id === id)!
            const patch: any = {}
            if (e.key === "ArrowLeft") patch.width = Math.max(8, el.width - step)
            if (e.key === "ArrowRight") patch.width = Math.max(8, el.width + step)
            if (e.key === "ArrowUp") patch.height = Math.max(8, el.height - step)
            if (e.key === "ArrowDown") patch.height = Math.max(8, el.height + step)
            return { id, patch }
          })
          updateElements(updates)
          return
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedIds, removeElements, duplicateElements, copy, paste, undo, redo, updateElement, updateElements])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <header className="h-10 border-b bg-background flex items-center px-4 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">S</div>
          <span className="font-semibold text-sm">SlideForge</span>
          <span className="text-xs text-muted-foreground">PowerPoint-like HTML editor</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground hidden md:block">
          Drag to move · Snap to align · Double-click text to edit
        </div>
      </header>
      <Toolbar onImportClick={() => setImportOpen(true)} onExportClick={() => setExportOpen(true)} />
      <div className="flex-1 flex min-h-0">
        <LayersPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <Canvas />
          <SlidesPanel />
        </div>
        <PropertyPanel />
      </div>
      <ImportHtmlDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
