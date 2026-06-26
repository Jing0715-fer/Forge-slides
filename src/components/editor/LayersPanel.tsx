"use client"

import React, { useState } from "react"
import { useEditor } from "@/store/editor-store"
import type { EditorElement } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Type, Square, Circle, Triangle, Minus, Image as ImageIcon, Box,
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function LayersPanel() {
  const { currentSlide, selectedIds, setSelected, updateElement, bringForward, sendBackward } = useEditor()
  const slide = currentSlide()
  const [query, setQuery] = useState("")
  const elements = slide.elements
    .slice()
    .sort((a, b) => b.zIndex - a.zIndex)
    .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="w-60 border-r bg-background flex flex-col h-full shrink-0">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Layers</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {elements.length === 0 && (
            <div className="text-xs text-muted-foreground p-3 text-center">No layers yet</div>
          )}
          {elements.map((el) => (
            <LayerRow
              key={el.id}
              element={el}
              selected={selectedIds.includes(el.id)}
              onSelect={() => setSelected([el.id])}
              onToggleVisible={() => updateElement(el.id, { visible: !el.visible })}
              onToggleLock={() => updateElement(el.id, { locked: !el.locked })}
              onBringForward={() => bringForward(el.id)}
              onSendBackward={() => sendBackward(el.id)}
            />
          ))}
        </div>
      </ScrollArea>
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
  onSelect: () => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onBringForward: () => void
  onSendBackward: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs",
        selected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted",
      )}
    >
      <ElementIcon type={element.type} />
      <span className="flex-1 truncate">{element.name}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
