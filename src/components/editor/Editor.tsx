"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useEditor, createTextElement, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import { Toolbar } from "./Toolbar"
import { Canvas } from "./Canvas"
import { PropertyPanel } from "./PropertyPanel"
import { LayersPanel } from "./LayersPanel"
import { SlidesPanel } from "./SlidesPanel"
import { ImportHtmlDialog, ExportDialog } from "./ImportHtmlDialog"
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog"
import { FindReplaceDialog } from "./FindReplaceDialog"
import { TemplatePickerDialog } from "./TemplatePickerDialog"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useAutosave } from "@/hooks/use-autosave"
import { exportSlidesToPrintableHtml } from "@/lib/pdf-export"
import { exportSlideAsPng, downloadDataUrl } from "@/lib/png-export"
import { Clock, RotateCcw, X } from "lucide-react"

export function Editor() {
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const {
    selectedIds, removeElements, duplicateElements, copy, paste,
    undo, redo, updateElements, currentSlide, slides, alignElements,
    distributeElements, matchSize, groupElements, ungroupElements,
  } = useEditor()

  const { lastSaved, pending, restoreData, acceptRestore, dismissRestore } = useAutosave()

  // Save shortcut
  const handleSave = useCallback(() => {
    // Autosave runs automatically; this just confirms to the user
    toast.success("Saved to browser storage")
  }, [])

  // PDF export
  const handlePdfExport = useCallback(() => {
    const html = exportSlidesToPrintableHtml(slides)
    const win = window.open("", "_blank")
    if (!win) {
      toast.error("Popup blocked. Please allow popups to export PDF.")
      return
    }
    win.document.write(html)
    win.document.close()
  }, [slides])

  // PNG export — current slide only
  const handlePngExport = useCallback(async () => {
    const slide = currentSlide()
    const toastId = toast.loading("Generating PNG…")
    try {
      const dataUrl = await exportSlideAsPng(slide, 2)
      downloadDataUrl(dataUrl, `${slide.name.replace(/\s+/g, "-").toLowerCase()}.png`)
      toast.success("PNG downloaded", { id: toastId })
    } catch (e) {
      toast.error("PNG export failed: " + (e as Error).message, { id: toastId })
    }
  }, [currentSlide])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const editing = useEditor.getState().editingId
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      if (editing || isTyping) {
        if (e.key === "Escape" && editing) {
          useEditor.getState().setEditing(null)
        }
        return
      }
      const meta = e.ctrlKey || e.metaKey
      const slide = useEditor.getState().currentSlide()

      // Save
      if (meta && e.key === "s") { e.preventDefault(); handleSave(); return }

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

      // Group / Ungroup
      if (meta && e.key === "g" && !e.shiftKey && selectedIds.length >= 2) {
        e.preventDefault()
        groupElements(selectedIds)
        toast.success(`Grouped ${selectedIds.length} elements`)
        return
      }
      if (meta && e.shiftKey && e.key === "G" && selectedIds.length > 0) {
        e.preventDefault()
        ungroupElements(selectedIds)
        toast.success("Ungrouped")
        return
      }

      // Shortcuts dialog
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      // Find & Replace
      if (meta && e.key === "h") {
        e.preventDefault()
        setFindReplaceOpen(true)
        return
      }

      // Find (just open find)
      if (meta && e.key === "f") {
        e.preventDefault()
        setFindReplaceOpen(true)
        return
      }

      // Alignment shortcuts (multi-select)
      if (meta && selectedIds.length >= 2) {
        const alignMap: Record<string, Parameters<typeof alignElements>[1]> = {
          l: "left", e: "centerH", r: "right",
          t: "top", m: "middle", b: "bottom",
        }
        // Ctrl+Shift+L/R/E for horizontal; Ctrl+Shift+T/M/B for vertical
        if (e.shiftKey && alignMap[e.key.toLowerCase()]) {
          e.preventDefault()
          alignElements(selectedIds, alignMap[e.key.toLowerCase()])
          return
        }
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

      // Size nudge with Alt
      if (selectedIds.length > 0 && e.altKey) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const updates = selectedIds.map((id) => {
            const el = slide.elements.find((x) => x.id === id)!
            const patch: Record<string, number> = {}
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
  }, [selectedIds, removeElements, duplicateElements, copy, paste, undo, redo, updateElements, alignElements, distributeElements, matchSize, groupElements, ungroupElements, handleSave])

  const lastSavedText = lastSaved
    ? new Date(lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <header className="h-10 border-b bg-background flex items-center px-4 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">S</div>
          <span className="font-semibold text-sm">SlideForge</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">PowerPoint-like HTML editor</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {pending ? (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3 animate-pulse" /> Saving…
            </span>
          ) : lastSavedText ? (
            <span className="text-xs text-muted-foreground hidden md:inline">
              Saved {lastSavedText}
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground hidden lg:block">
            Drag · Snap · Double-click to edit
          </span>
        </div>
      </header>
      <Toolbar
        onImportClick={() => setImportOpen(true)}
        onExportClick={() => setExportOpen(true)}
        onPdfExport={handlePdfExport}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onFindReplace={() => setFindReplaceOpen(true)}
        onPngExport={handlePngExport}
      />
      {restoreData && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-3 text-sm">
          <RotateCcw className="w-4 h-4 text-primary" />
          <span>
            Found a saved session from{" "}
            <strong>{new Date(restoreData.savedAt).toLocaleString()}</strong> with{" "}
            {restoreData.slides.length} slide(s). Restore it?
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="default" onClick={acceptRestore}>Restore</Button>
            <Button size="sm" variant="ghost" onClick={dismissRestore}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 flex min-h-0">
        <LayersPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <Canvas />
          <SlidesPanel onNewFromTemplate={() => setTemplateOpen(true)} />
        </div>
        <PropertyPanel />
      </div>
      <ImportHtmlDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <FindReplaceDialog open={findReplaceOpen} onOpenChange={setFindReplaceOpen} />
      <TemplatePickerDialog open={templateOpen} onOpenChange={setTemplateOpen} />
      <CanvasContextMenu />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
