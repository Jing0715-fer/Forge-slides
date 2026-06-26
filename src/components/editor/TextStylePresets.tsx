"use client"

import React from "react"
import { useEditor } from "@/store/editor-store"
import type { TextElement } from "@/types/editor"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Heading1, Heading2, Heading3, Pilcrow, Type } from "lucide-react"

interface Preset {
  id: string
  label: string
  icon: React.ReactNode
  patch: Partial<TextElement>
}

const PRESETS: Preset[] = [
  {
    id: "h1",
    label: "Heading 1",
    icon: <Heading1 className="w-3.5 h-3.5" />,
    patch: { fontSize: 56, fontWeight: "700", color: "#0f172a", lineHeight: 1.1, letterSpacing: -1 },
  },
  {
    id: "h2",
    label: "Heading 2",
    icon: <Heading2 className="w-3.5 h-3.5" />,
    patch: { fontSize: 40, fontWeight: "700", color: "#0f172a", lineHeight: 1.2, letterSpacing: -0.5 },
  },
  {
    id: "h3",
    label: "Heading 3",
    icon: <Heading3 className="w-3.5 h-3.5" />,
    patch: { fontSize: 28, fontWeight: "600", color: "#1e293b", lineHeight: 1.3, letterSpacing: 0 },
  },
  {
    id: "body",
    label: "Body Text",
    icon: <Pilcrow className="w-3.5 h-3.5" />,
    patch: { fontSize: 18, fontWeight: "400", color: "#334155", lineHeight: 1.6, letterSpacing: 0 },
  },
  {
    id: "caption",
    label: "Caption",
    icon: <Type className="w-3.5 h-3.5" />,
    patch: { fontSize: 14, fontWeight: "400", color: "#64748b", lineHeight: 1.4, letterSpacing: 0.3 },
  },
  {
    id: "quote",
    label: "Quote",
    icon: <Type className="w-3.5 h-3.5" />,
    patch: { fontSize: 22, fontWeight: "300", color: "#475569", lineHeight: 1.5, fontStyle: "italic" as const, letterSpacing: 0 },
  },
  {
    id: "button",
    label: "Button Label",
    icon: <Type className="w-3.5 h-3.5" />,
    patch: { fontSize: 16, fontWeight: "600", color: "#ffffff", lineHeight: 1.2, letterSpacing: 0.5, textAlign: "center" as const },
  },
  {
    id: "code",
    label: "Code",
    icon: <Type className="w-3.5 h-3.5" />,
    patch: { fontSize: 16, fontWeight: "400", color: "#0f172a", lineHeight: 1.5, fontFamily: "'Courier New', monospace", letterSpacing: 0 },
  },
]

export function TextStylePresets() {
  const { selectedIds, currentSlide, updateElements, updateElement } = useEditor()
  const slide = currentSlide()
  const selected = slide.elements.filter((e) => selectedIds.includes(e.id))
  const hasText = selected.some((e) => e.type === "text")

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const updates = selected
      .filter((e) => e.type === "text")
      .map((e) => ({ id: e.id, patch: preset.patch as any }))
    if (updates.length > 0) {
      updateElements(updates)
    }
  }

  if (!hasText) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase text-muted-foreground tracking-wider hidden lg:inline">Style</span>
      <Select onValueChange={applyPreset}>
        <SelectTrigger className="h-7 w-40 text-xs gap-1.5">
          <Type className="w-3 h-3" />
          <SelectValue placeholder="Text preset..." />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              <div className="flex items-center gap-2">
                {p.icon}
                <span>{p.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
