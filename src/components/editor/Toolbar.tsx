"use client"

import React, { useRef, useState } from "react"
import { useEditor, createTextElement, createShapeElement, createImageElement } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Type, Square, Circle, Triangle, Minus, Image as ImageIcon, Upload,
  Undo2, Redo2, Copy, Trash2, BringToFront, SendToBack,
  ZoomIn, ZoomOut, Grid3x3, Magnet, Download, FileText, HelpCircle, Search, ImageDown, Play, Clipboard, Paintbrush, Maximize,
  Bookmark, Wand2, History,
} from "lucide-react"
import { AlignmentToolbar } from "./AlignmentToolbar"
import { TextStylePresets } from "./TextStylePresets"
import { ThemeToggle } from "./ThemeToggle"
import { ProjectMenu } from "./ProjectMenu"
import { toast } from "sonner"
import { ExportProgressDialog } from "./ExportProgressDialog"
import { cn } from "@/lib/utils"

interface Props {
  onImportClick: () => void
  onExportClick: () => void
  onPdfExport: () => void
  onShowShortcuts: () => void
  onFindReplace: () => void
  onPngExport: () => void
  onPresent: () => void
  onSaveTemplate: () => void
  onOpenTemplates: () => void
  onAiGenerate: () => void
  onAiHistory: () => void
}

export function Toolbar({ onImportClick, onExportClick, onPdfExport, onShowShortcuts, onFindReplace, onPngExport, onPresent, onSaveTemplate, onOpenTemplates, onAiGenerate, onAiHistory }: Props) {
  const {
    addElement, selectedIds, removeElements, duplicateElements,
    bringToFront, sendToBack, undo, redo, past, future,
    zoom, setZoom, showGrid, toggleGrid, showGuides, toggleGuides,
    slides, masterElements, copyFormat, pasteFormat, formatClipboard,
  } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportProgress, setExportProgress] = useState<"idle" | "exporting" | "done" | "error">("idle")
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadSize, setDownloadSize] = useState(0)

  const hasSelection = selectedIds.length > 0
  const canUndo = past.length > 0
  const canRedo = future.length > 0

  function handleAddText() {
    addElement(createTextElement({ x: 200, y: 200 }))
  }
  function handleAddRect() {
    addElement(createShapeElement("rect", { x: 200, y: 200 }))
  }
  function handleAddEllipse() {
    addElement(createShapeElement("ellipse", { x: 200, y: 200 }))
  }
  function handleAddTriangle() {
    addElement(createShapeElement("triangle", { x: 200, y: 200 }))
  }
  function handleAddLine() {
    addElement(createShapeElement("line", { x: 200, y: 200 }))
  }
  function handleAddImage() {
    fileInputRef.current?.click()
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Load image to get natural dimensions
      const img = new Image()
      img.onload = () => {
        const maxW = 600
        const maxH = 450
        let w = img.naturalWidth
        let h = img.naturalHeight
        const ratio = Math.min(maxW / w, maxH / h, 1)
        w = w * ratio
        h = h * ratio
        addElement(createImageElement(dataUrl, { x: 200, y: 200, width: w, height: h, name: file.name.replace(/\.[^.]+$/, "") }))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }
  function handleUrlImage() {
    const url = window.prompt("Image URL", "https://images.unsplash.com/photo-1557683316-973673baf926?w=800")
    if (url) addElement(createImageElement(url, { x: 200, y: 200 }))
  }
  function handleExport() {
    setExportProgress("exporting")
    // Use setTimeout to let the progress dialog render before the heavy export
    setTimeout(() => {
      try {
        const html = exportSlidesToHtml(slides, masterElements)
        const blob = new Blob([html], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        setExportProgress("done")
        setDownloadUrl(url)
        setDownloadSize(blob.size)
      } catch (e) {
        setExportProgress("error")
        toast.error("Export failed: " + (e as Error).message)
      }
    }, 100)
  }
  async function handleCopyHtml() {
    const html = exportSlidesToHtml(slides, masterElements)
    try {
      await navigator.clipboard.writeText(html)
      toast.success(`Copied ${slides.length} slide${slides.length === 1 ? "" : "s"} as HTML to clipboard`)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea")
      ta.value = html
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        toast.success("HTML copied to clipboard")
      } catch {
        toast.error("Failed to copy HTML to clipboard")
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <div className="border-b border-border/40 backdrop-blur-xl flex flex-col shrink-0" style={{ background: "linear-gradient(to right, rgba(253,242,248,0.75), rgba(255,255,255,0.55), rgba(245,243,255,0.75))" }}>
      {/* Row 1: main toolbar */}
      <div className="h-13 flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 overflow-x-auto toolbar-row-scroll">
        <TooltipProvider delayDuration={300}>
          {/* Insert group */}
          <ToolbarGroup label="Insert">
            <TooltipBtn label="Add Text (T)" onClick={handleAddText}>
              <Type className="w-4 h-4" />
            </TooltipBtn>
            <TooltipBtn label="Rectangle" onClick={handleAddRect}>
              <Square className="w-4 h-4" />
            </TooltipBtn>
            <TooltipBtn label="Ellipse" onClick={handleAddEllipse}>
              <Circle className="w-4 h-4" />
            </TooltipBtn>
            <TooltipBtn label="Triangle" onClick={handleAddTriangle}>
              <Triangle className="w-4 h-4" />
            </TooltipBtn>
            <TooltipBtn label="Line" onClick={handleAddLine}>
              <Minus className="w-4 h-4" />
            </TooltipBtn>
            <TooltipBtn label="Upload Image File" onClick={handleAddImage}>
              <ImageIcon className="w-4 h-4" />
            </TooltipBtn>
            <div className="hidden lg:contents">
              <TooltipBtn label="Image from URL" onClick={handleUrlImage}>
                <Upload className="w-4 h-4" />
              </TooltipBtn>
            </div>
          </ToolbarGroup>

          {/* History group */}
          <ToolbarGroup label="History">
            <TooltipBtn label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
              <Undo2 className="w-4 h-4" />
            </TooltipBtn>
            <TooltipBtn label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
              <Redo2 className="w-4 h-4" />
            </TooltipBtn>
          </ToolbarGroup>

          {/* Arrange group */}
          <ToolbarGroup label="Arrange">
            <TooltipBtn label="Duplicate (Ctrl+D)" onClick={() => duplicateElements(selectedIds)} disabled={!hasSelection}>
              <Copy className="w-4 h-4" />
            </TooltipBtn>
            <div className="hidden lg:contents">
              <TooltipBtn
                label={formatClipboard ? "Paste Format (click to apply)" : "Copy Format (select an element first)"}
                onClick={() => {
                  if (formatClipboard && selectedIds.length > 0) {
                    pasteFormat(selectedIds)
                    toast.success(`Format applied to ${selectedIds.length} element${selectedIds.length === 1 ? "" : "s"}`)
                  } else if (selectedIds.length === 1) {
                    copyFormat(selectedIds[0])
                    toast.success("Format copied — select another element and click again to apply")
                  } else {
                    toast.error("Select a single element to copy format from")
                  }
                }}
                active={!!formatClipboard}
              >
                <Paintbrush className="w-4 h-4" />
              </TooltipBtn>
              <TooltipBtn label="Bring to Front" onClick={() => selectedIds.forEach(bringToFront)} disabled={!hasSelection}>
                <BringToFront className="w-4 h-4" />
              </TooltipBtn>
              <TooltipBtn label="Send to Back" onClick={() => selectedIds.forEach(sendToBack)} disabled={!hasSelection}>
                <SendToBack className="w-4 h-4" />
              </TooltipBtn>
            </div>
            <TooltipBtn label="Delete (Del)" onClick={() => removeElements(selectedIds)} disabled={!hasSelection}>
              <Trash2 className="w-4 h-4" />
            </TooltipBtn>
          </ToolbarGroup>

          {/* View group */}
          <ToolbarGroup label="View">
            <TooltipBtn label="Zoom Out" onClick={() => setZoom(zoom - 0.1)}>
              <ZoomOut className="w-4 h-4" />
            </TooltipBtn>
            <button
              onClick={() => setZoom(0.62)}
              className="text-xs font-mono w-11 text-center hover:bg-background rounded px-1 py-1 transition-colors tabular-nums font-medium"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <TooltipBtn label="Zoom In" onClick={() => setZoom(zoom + 0.1)}>
              <ZoomIn className="w-4 h-4" />
            </TooltipBtn>
            <div className="hidden lg:contents">
              <TooltipBtn
                label="Fit to Screen"
                onClick={() => {
                  const canvasEl = document.getElementById("editor-canvas")
                  if (canvasEl) {
                    const container = canvasEl.parentElement?.parentElement
                    if (container) {
                      const containerW = container.clientWidth - 96
                      const containerH = container.clientHeight - 96
                      const fitZoom = Math.min(containerW / 1280, containerH / 720, 1)
                      setZoom(Math.max(0.1, Math.min(fitZoom, 2)))
                    }
                  }
                }}
              >
                <Maximize className="w-4 h-4" />
              </TooltipBtn>
              <TooltipBtn label="Toggle Grid" onClick={toggleGrid} active={showGrid}>
                <Grid3x3 className="w-4 h-4" />
              </TooltipBtn>
              <TooltipBtn label="Toggle Smart Guides" onClick={toggleGuides} active={showGuides}>
                <Magnet className="w-4 h-4" />
              </TooltipBtn>
            </div>
          </ToolbarGroup>

          {/* Right side: tools + export */}
          <div className="ml-auto flex items-center gap-1.5 lg:gap-2 shrink-0">
            <ToolbarGroup label="">
              <TooltipBtn label="Find & Replace (Ctrl+H)" onClick={onFindReplace}>
                <Search className="w-4 h-4" />
              </TooltipBtn>
              <ThemeToggle />
              <TooltipBtn label="Keyboard Shortcuts (?)" onClick={onShowShortcuts}>
                <HelpCircle className="w-4 h-4" />
              </TooltipBtn>
            </ToolbarGroup>

            <div className="flex items-center gap-1.5 pl-2 border-l border-border/40">
              <ProjectMenu onSaveTemplate={onSaveTemplate} onOpenTemplates={onOpenTemplates} onAiGenerate={onAiGenerate} onAiHistory={onAiHistory} />
              <Button variant="outline" size="sm" onClick={onImportClick} className="gap-1.5 h-8 hover:bg-muted/60 transition-colors text-xs px-2 2xl:px-3">
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline">Import</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-8 hover:bg-muted/60 transition-colors text-xs px-2 2xl:px-3">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline">Export</span>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onPdfExport} className="h-8 w-8 hover:bg-muted/60 transition-colors hidden xl:inline-flex" title="Export as PDF">
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Export as PDF (print-ready)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onPngExport} className="h-8 w-8 hover:bg-muted/60 transition-colors hidden xl:inline-flex" title="Export current slide as PNG">
                    <ImageDown className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Export current slide as PNG</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleCopyHtml} className="h-8 w-8 hover:bg-muted/60 transition-colors hidden xl:inline-flex" title="Copy HTML to clipboard">
                    <Clipboard className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Copy HTML to clipboard</TooltipContent>
              </Tooltip>
            </div>

            {/* Templates & AI group — visible buttons */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/40">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSaveTemplate}
                    disabled={slides.length === 0}
                    className="gap-1.5 h-8 hover:bg-muted/60 transition-colors text-xs px-2 2xl:px-3"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="hidden 2xl:inline">Save Template</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Save current slides as a reusable template</TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                onClick={onAiGenerate}
                className="gap-1.5 h-8 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0 shadow-sm hover:shadow-md transition-all text-xs px-2 2xl:px-3"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline">AI Generate</span>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAiHistory}
                    className="gap-1.5 h-8 hover:bg-muted/60 transition-colors text-xs px-2 2xl:px-3"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="hidden 2xl:inline">AI History</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">View AI generation history</TooltipContent>
              </Tooltip>
            </div>

            <Button size="sm" onClick={onPresent} className="shrink-0 gap-1.5 h-8 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 transition-all text-xs px-2 2xl:px-3 whitespace-nowrap">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span className="hidden 2xl:inline">Present</span>
            </Button>
          </div>
        </TooltipProvider>
      </div>

      {/* Row 2: contextual toolbar (alignment + text presets) */}
      {hasSelection && (
        <div className="h-10 border-t bg-muted/30 flex items-center px-3 gap-2 overflow-x-auto ctx-toolbar-anim">
          <TextStylePresets />
          <Separator orientation="vertical" className="h-6" />
          <AlignmentToolbar />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <ExportProgressDialog
        open={exportProgress !== "idle"}
        progress={exportProgress}
        downloadUrl={downloadUrl}
        downloadSize={downloadSize}
        slideCount={slides.length}
        onClose={() => {
          setExportProgress("idle")
          if (downloadUrl) URL.revokeObjectURL(downloadUrl)
          setDownloadUrl(null)
        }}
      />
    </div>
  )
}

function TooltipBtn({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "h-8 w-8 transition-all hover:bg-background hover:shadow-sm rounded-md",
            active && "ring-1 ring-primary/30 bg-primary/5 text-primary",
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** A visually-grouped set of toolbar buttons with a subtle pill background. */
function ToolbarGroup({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors relative">
          {children}
        </div>
      </TooltipTrigger>
      {label ? <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent> : null}
    </Tooltip>
  )
}

// Import at bottom to avoid circular dependency issues
import { exportSlidesToHtml } from "@/lib/html-io"
