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
import { PresentationMode } from "./PresentationMode"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { SlideContextMenu } from "./SlideContextMenu"
import { StatusBar } from "./StatusBar"
import { SaveTemplateDialog } from "./SaveTemplateDialog"
import { TemplateManagerDialog } from "./TemplateManagerDialog"
import { AiGenerateDialog } from "./AiGenerateDialog"
import { AiHistoryDialog } from "./AiHistoryDialog"
import { SlideSorter } from "./SlideSorter"
import { BatchPngExportDialog } from "./BatchPngExportDialog"
import { MasterSlideEditor } from "./MasterSlideEditor"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useAutosave } from "@/hooks/use-autosave"
import { exportSlidesToPrintableHtml } from "@/lib/pdf-export"
import { exportSlideAsPng, downloadDataUrl } from "@/lib/png-export"
import { Clock, RotateCcw, X, ArrowLeft } from "lucide-react"

interface EditorProps {
  initialImportOpen?: boolean
  initialAiGenerateOpen?: boolean
  onExit?: () => void
  /** Skip the restore session banner (used when data is already loaded from landing page) */
  skipRestoreBanner?: boolean
}

export function Editor({ initialImportOpen, initialAiGenerateOpen, onExit, skipRestoreBanner }: EditorProps = {}) {
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [presentationOpen, setPresentationOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false)
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false)
  const [aiHistoryOpen, setAiHistoryOpen] = useState(false)
  const [sorterOpen, setSorterOpen] = useState(false)
  const [batchPngOpen, setBatchPngOpen] = useState(false)
  const [masterEditorOpen, setMasterEditorOpen] = useState(false)

  // Open import dialog if requested from landing page
  const [prevInitialImport, setPrevInitialImport] = useState(false)
  if (initialImportOpen && !prevInitialImport) {
    setPrevInitialImport(true)
    setImportOpen(true)
  }

  // Open AI generate dialog if requested from landing page
  const [prevInitialAi, setPrevInitialAi] = useState(false)
  if (initialAiGenerateOpen && !prevInitialAi) {
    setPrevInitialAi(true)
    setAiGenerateOpen(true)
  }

  const {
    selectedIds, removeElements, duplicateElements, copy, paste,
    undo, redo, updateElements, currentSlide, slides, alignElements,
    distributeElements, matchSize, groupElements, ungroupElements,
    copyFormat, pasteFormat, formatClipboard,
    copyElementAnimation, pasteElementAnimation, animationClipboard,
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
      if (meta && e.key === "c" && !e.shiftKey && selectedIds.length > 0) { e.preventDefault(); copy(selectedIds); return }
      if (meta && e.key === "v" && !e.shiftKey) { e.preventDefault(); paste(); return }
      // Format painter: Ctrl+Shift+C = copy format, Ctrl+Shift+V = paste format
      if (meta && e.shiftKey && e.key === "C" && selectedIds.length === 1) {
        e.preventDefault()
        copyFormat(selectedIds[0])
        toast.success("Format copied — press Ctrl+Shift+V on another element to apply")
        return
      }
      if (meta && e.shiftKey && e.key === "V" && formatClipboard && selectedIds.length > 0) {
        e.preventDefault()
        pasteFormat(selectedIds)
        toast.success(`Format applied to ${selectedIds.length} element${selectedIds.length === 1 ? "" : "s"}`)
        return
      }
      // Animation painter: Alt+Shift+C = copy animation, Alt+Shift+V = paste animation
      // (avoids clashing with Ctrl+Shift+C/V which is format painter)
      if (e.altKey && e.shiftKey && (e.key === "C" || e.key === "c") && selectedIds.length === 1) {
        e.preventDefault()
        copyElementAnimation(selectedIds[0])
        toast.success("Animation copied — select another element and press Alt+Shift+V")
        return
      }
      if (e.altKey && e.shiftKey && (e.key === "V" || e.key === "v") && animationClipboard && selectedIds.length > 0) {
        e.preventDefault()
        pasteElementAnimation(selectedIds)
        toast.success(`Animation applied to ${selectedIds.length} element${selectedIds.length === 1 ? "" : "s"}`)
        return
      }
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

      // Slide Sorter — Ctrl+Shift+S (avoids clash with Ctrl+S save)
      if (meta && e.shiftKey && e.key === "S") {
        e.preventDefault()
        setSorterOpen(true)
        return
      }

      // F5 / Shift+F5 to start presentation
      if (e.key === "F5") {
        e.preventDefault()
        setPresentationOpen(true)
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
  }, [selectedIds, removeElements, duplicateElements, copy, paste, undo, redo, updateElements, alignElements, distributeElements, matchSize, groupElements, ungroupElements, handleSave, copyFormat, pasteFormat, formatClipboard])

  const lastSavedText = lastSaved
    ? new Date(lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #fef5f3 30%, #f5f3ff 65%, #eff6ff 100%)" }}>
      {/* Subtle top gradient strip for depth */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none z-50" />
      <header className="h-11 border-b border-border/40 backdrop-blur-xl flex items-center px-4 gap-2 shrink-0" style={{ background: "linear-gradient(to right, rgba(253,242,248,0.85), rgba(255,255,255,0.65), rgba(245,243,255,0.85))" }}>
        {onExit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs px-2 -ml-1 hover:bg-muted"
            onClick={onExit}
            title="Back to home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm shadow-purple-500/30">S</div>
          <span className="font-semibold text-sm tracking-tight">SlideForge</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">PowerPoint-like HTML editor</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {pending ? (
            <span className="text-xs text-amber-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Saving…</span>
            </span>
          ) : lastSavedText ? (
            <span className="text-xs text-muted-foreground hidden md:inline flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Saved {lastSavedText}</span>
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground/70 hidden lg:block">
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
        onBatchPngExport={() => setBatchPngOpen(true)}
        onPresent={() => setPresentationOpen(true)}
        onSaveTemplate={() => setSaveTemplateOpen(true)}
        onOpenTemplates={() => setTemplateManagerOpen(true)}
        onAiGenerate={() => setAiGenerateOpen(true)}
        onAiHistory={() => setAiHistoryOpen(true)}
        onOpenSorter={() => setSorterOpen(true)}
        onOpenMasterEditor={() => setMasterEditorOpen(true)}
      />
      {restoreData && !skipRestoreBanner && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-4 py-2.5 flex items-center gap-3 text-sm">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
          </div>
          <span>
            Found a saved session from{" "}
            <strong>{new Date(restoreData.savedAt).toLocaleString()}</strong> with{" "}
            {restoreData.slides.length} slide(s). Restore it?
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="default" onClick={acceptRestore} className="shadow-sm">Restore</Button>
            <Button size="sm" variant="ghost" onClick={dismissRestore} className="h-8 w-8 p-0">
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
      <StatusBar />
      <ImportHtmlDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <FindReplaceDialog open={findReplaceOpen} onOpenChange={setFindReplaceOpen} />
      <TemplatePickerDialog open={templateOpen} onOpenChange={setTemplateOpen} />
      <PresentationMode open={presentationOpen} onOpenChange={setPresentationOpen} />
      <SlideSorter open={sorterOpen} onOpenChange={setSorterOpen} />
      <BatchPngExportDialog open={batchPngOpen} onOpenChange={setBatchPngOpen} />
      <MasterSlideEditor open={masterEditorOpen} onOpenChange={setMasterEditorOpen} />
      <SaveTemplateDialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen} />
      <TemplateManagerDialog open={templateManagerOpen} onOpenChange={setTemplateManagerOpen} />
      <AiGenerateDialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen} />
      <AiHistoryDialog open={aiHistoryOpen} onOpenChange={setAiHistoryOpen} />
      <CanvasContextMenu />
      <SlideContextMenu />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
