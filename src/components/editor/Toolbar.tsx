"use client"

import React from "react"
import { useEditor, createTextElement, createShapeElement, createImageElement } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Type, Square, Circle, Triangle, Minus, Image as ImageIcon,
  Undo2, Redo2, Copy, Trash2, BringToFront, SendToBack,
  ZoomIn, ZoomOut, Grid3x3, Magnet, Download, Upload, FileText,
} from "lucide-react"
import { exportSlidesToHtml } from "@/lib/html-io"

interface Props {
  onImportClick: () => void
  onExportClick: () => void
}

export function Toolbar({ onImportClick, onExportClick }: Props) {
  const {
    addElement, selectedIds, removeElements, duplicateElements,
    bringToFront, sendToBack, undo, redo, past, future,
    zoom, setZoom, showGrid, toggleGrid, showGuides, toggleGuides,
    slides,
  } = useEditor()

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
    const url = window.prompt("Image URL", "https://images.unsplash.com/photo-1557683316-973673baf926?w=800")
    if (url) addElement(createImageElement(url, { x: 200, y: 200 }))
  }
  function handleExport() {
    const html = exportSlidesToHtml(slides)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "slides.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-14 border-b bg-background flex items-center gap-1 px-3 shrink-0">
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1">
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
          <TooltipBtn label="Image" onClick={handleAddImage}>
            <ImageIcon className="w-4 h-4" />
          </TooltipBtn>
        </div>

        <Separator orientation="vertical" className="mx-2 h-7" />

        <div className="flex items-center gap-1">
          <TooltipBtn label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 className="w-4 h-4" />
          </TooltipBtn>
          <TooltipBtn label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
            <Redo2 className="w-4 h-4" />
          </TooltipBtn>
        </div>

        <Separator orientation="vertical" className="mx-2 h-7" />

        <div className="flex items-center gap-1">
          <TooltipBtn label="Duplicate (Ctrl+D)" onClick={() => duplicateElements(selectedIds)} disabled={!hasSelection}>
            <Copy className="w-4 h-4" />
          </TooltipBtn>
          <TooltipBtn label="Bring to Front" onClick={() => selectedIds.forEach(bringToFront)} disabled={!hasSelection}>
            <BringToFront className="w-4 h-4" />
          </TooltipBtn>
          <TooltipBtn label="Send to Back" onClick={() => selectedIds.forEach(sendToBack)} disabled={!hasSelection}>
            <SendToBack className="w-4 h-4" />
          </TooltipBtn>
          <TooltipBtn label="Delete (Del)" onClick={() => removeElements(selectedIds)} disabled={!hasSelection}>
            <Trash2 className="w-4 h-4" />
          </TooltipBtn>
        </div>

        <Separator orientation="vertical" className="mx-2 h-7" />

        <div className="flex items-center gap-1">
          <TooltipBtn label="Zoom Out" onClick={() => setZoom(zoom - 0.1)}>
            <ZoomOut className="w-4 h-4" />
          </TooltipBtn>
          <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <TooltipBtn label="Zoom In" onClick={() => setZoom(zoom + 0.1)}>
            <ZoomIn className="w-4 h-4" />
          </TooltipBtn>
          <TooltipBtn label="Toggle Grid" onClick={toggleGrid} active={showGrid}>
            <Grid3x3 className="w-4 h-4" />
          </TooltipBtn>
          <TooltipBtn label="Toggle Smart Guides" onClick={toggleGuides} active={showGuides}>
            <Magnet className="w-4 h-4" />
          </TooltipBtn>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onImportClick} className="gap-2">
            <Upload className="w-4 h-4" /> Import HTML
          </Button>
          <Button variant="outline" size="sm" onClick={onExportClick} className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" onClick={handleExport} className="gap-2">
            <FileText className="w-4 h-4" /> Download HTML
          </Button>
        </div>
      </TooltipProvider>
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
          className="h-9 w-9"
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
