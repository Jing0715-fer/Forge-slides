"use client"

import React from "react"
import { useEditor } from "@/store/editor-store"
import { Magnet, Grid3x3, Layers, Square, MousePointer2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatusBar() {
  const {
    slides,
    currentSlideId,
    selectedIds,
    zoom,
    showGrid,
    showGuides,
    currentSlide,
  } = useEditor()

  const slideIdx = slides.findIndex((s) => s.id === currentSlideId)
  const slide = currentSlide()
  const elementCount = slide?.elements.length ?? 0
  const visibleCount = slide?.elements.filter((e) => e.visible).length ?? 0
  const lockedCount = slide?.elements.filter((e) => e.locked).length ?? 0
  const groupCount = new Set(
    slide?.elements.filter((e) => e.groupId).map((e) => e.groupId) ?? [],
  ).size

  return (
    <div className="h-6 border-t bg-background flex items-center px-3 text-[11px] text-muted-foreground gap-3 shrink-0 select-none">
      {/* Left: slide info */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono tabular-nums">
          Slide {slideIdx + 1}/{slides.length}
        </span>
      </div>

      <span className="text-border">·</span>

      {/* Element count */}
      <div className="flex items-center gap-1" title="Total elements on this slide">
        <Layers className="w-3 h-3" />
        <span className="tabular-nums">{elementCount}</span>
      </div>

      {visibleCount !== elementCount && (
        <div className="flex items-center gap-1" title="Visible elements">
          <MousePointer2 className="w-3 h-3" />
          <span className="tabular-nums">{visibleCount}</span>
        </div>
      )}

      {lockedCount > 0 && (
        <div className="flex items-center gap-1" title="Locked elements">
          <span className="tabular-nums">{lockedCount} locked</span>
        </div>
      )}

      {groupCount > 0 && (
        <div className="flex items-center gap-1" title="Groups on this slide">
          <Square className="w-3 h-3" />
          <span className="tabular-nums">{groupCount} group{groupCount === 1 ? "" : "s"}</span>
        </div>
      )}

      {selectedIds.length > 0 && (
        <>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-foreground font-medium">
              {selectedIds.length} selected
            </span>
          </div>
        </>
      )}

      {/* Right: view settings */}
      <div className="ml-auto flex items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-1 transition-colors",
            showGuides ? "text-primary" : "text-muted-foreground/60",
          )}
          title="Smart guides"
        >
          <Magnet className="w-3 h-3" />
          <span>Snap</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 transition-colors",
            showGrid ? "text-primary" : "text-muted-foreground/60",
          )}
          title="Grid"
        >
          <Grid3x3 className="w-3 h-3" />
          <span>Grid</span>
        </div>
        <span className="text-border">·</span>
        <span className="font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  )
}
