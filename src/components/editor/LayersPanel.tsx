"use client"

import React, { useState } from "react"
import { useEditor } from "@/store/editor-store"
import type { EditorElement } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Type, Square, Circle, Triangle, Minus, Image as ImageIcon, Box,
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { HistoryPanel } from "./HistoryPanel"

export function LayersPanel() {
  const { currentSlide, selectedIds, setSelected, updateElement, bringForward, sendBackward } = useEditor()
  const slide = currentSlide()
  const [query, setQuery] = useState("")
  if (!slide) {
    return (
      <div className="w-60 border-r border-border/40 flex flex-col h-full shrink-0 overflow-hidden" style={{ background: "linear-gradient(to bottom, rgba(253,242,248,0.9), rgba(255,255,255,0.7), rgba(245,243,255,0.85))" }}>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-4 text-center">
          No slide loaded
        </div>
      </div>
    )
  }
  const elements = slide.elements
    .slice()
    .sort((a, b) => b.zIndex - a.zIndex)
    .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="w-60 border-r border-border/40 flex flex-col h-full shrink-0 overflow-hidden" style={{ background: "linear-gradient(to bottom, rgba(253,242,248,0.9), rgba(255,255,255,0.7), rgba(245,243,255,0.85))" }}>
      <div className="p-3 border-b border-border/40 shrink-0" style={{ background: "linear-gradient(to right, rgba(253,242,248,0.95), rgba(245,243,255,0.7))" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</h3>
          {elements.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">{elements.length}</span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers..."
            className="h-7 pl-7 pr-2 text-xs bg-background/60 border-border/40"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden sf-layers-scroll">
        <div className="p-2 space-y-0.5">
          {slide.rawHtml && (
            <div className="text-xs text-muted-foreground p-3 text-center border-b mb-2">
              <p className="font-medium text-foreground mb-1">Exact Mode</p>
              <p>Edit text directly on the slide by clicking it.</p>
            </div>
          )}
          {elements.length === 0 && !slide.rawHtml && (
            <div className="text-xs text-muted-foreground p-3 text-center">No layers yet</div>
          )}
          {elements.map((el) => (
            <LayerRow
              key={el.id}
              element={el}
              selected={selectedIds.includes(el.id)}
              onSelect={(e) => {
                if (e && (e.shiftKey || e.metaKey || e.ctrlKey) && selectedIds.includes(el.id)) {
                  // Toggle off with shift/meta+click
                  setSelected(selectedIds.filter(id => id !== el.id))
                } else if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
                  // Add to selection with shift/meta+click
                  setSelected([...selectedIds, el.id])
                } else {
                  setSelected([el.id])
                }
              }}
              onToggleVisible={() => updateElement(el.id, { visible: !el.visible })}
              onToggleLock={() => updateElement(el.id, { locked: !el.locked })}
              onBringForward={() => bringForward(el.id)}
              onSendBackward={() => sendBackward(el.id)}
            />
          ))}
        </div>
      </div>
      <HistoryPanel />
    </div>
  )
}

function LayerRow({
  element,
  selected,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onBringForward,
  onSendBackward,
}: {
  element: EditorElement
  selected: boolean
  onSelect: (e: React.MouseEvent) => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onBringForward: () => void
  onSendBackward: () => void
}) {
  return (
    <div
      onClick={(e) => onSelect(e)}
      className={cn(
        "layer-row group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs w-full min-w-0 overflow-hidden",
        selected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted",
      )}
    >
      <ElementIcon type={element.type} />
      <span className="flex-1 min-w-0 truncate text-xs" title={element.type === "text" && element.text ? element.text.replace(/\n/g, " ").trim() : element.name}>
        {element.type === "text" && element.text
          ? element.text.replace(/\n/g, " ").trim() || element.name
          : element.name}
      </span>
      <div className="hidden items-center gap-0.5 group-hover:flex shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onBringForward() }}
          title="Bring forward"
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onSendBackward() }}
          title="Send backward"
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={(e) => { e.stopPropagation(); onToggleLock() }}
      >
        {element.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 opacity-50" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={(e) => { e.stopPropagation(); onToggleVisible() }}
      >
        {element.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
      </Button>
    </div>
  )
}

function ElementIcon({ type }: { type: EditorElement["type"] }) {
  const cls = "w-3.5 h-3.5 text-muted-foreground shrink-0"
  switch (type) {
    case "text": return <Type className={cls} />
    case "rect": return <Square className={cls} />
    case "ellipse": return <Circle className={cls} />
    case "triangle": return <Triangle className={cls} />
    case "line": return <Minus className={cls} />
    case "image": return <ImageIcon className={cls} />
    case "container": return <Box className={cls} />
    default: return <Square className={cls} />
  }
}
