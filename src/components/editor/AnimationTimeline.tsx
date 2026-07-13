"use client"

import React, { useState, useRef } from "react"
import { useEditor } from "@/store/editor-store"
import type { EditorElement, EntranceAnimation } from "@/types/editor"
import { Button } from "@/components/ui/button"
import {
  Play, ChevronDown, ChevronRight, Sparkles, GripVertical,
  ArrowUp, ArrowDown, Trash2, Clock, Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ANIM_LABELS: Record<EntranceAnimation, { label: string; icon: string }> = {
  "none": { label: "None", icon: "—" },
  "fade": { label: "Fade", icon: "◐" },
  "slide-up": { label: "↑", icon: "↑" },
  "slide-down": { label: "↓", icon: "↓" },
  "slide-left": { label: "←", icon: "←" },
  "slide-right": { label: "→", icon: "→" },
  "zoom": { label: "Zoom", icon: "⊕" },
  "bounce": { label: "Bounce", icon: "⚡" },
  "spin": { label: "Spin", icon: "↻" },
}

/**
 * AnimationTimeline — PPT-style animation sequence panel.
 *
 * Shows all elements on the current slide that have entrance animations,
 * in playback order. Features:
 *   - Drag to reorder (or use up/down buttons)
 *   - Visual timeline bar showing each element's duration + delay relative
 *     to the total sequence
 *   - Playback mode toggle: "Sequential" (one after another) vs "Together"
 *     (all at once)
 *   - Click an element to select it (scrolls the property panel into view)
 *   - "Preview All" button replays the full sequence on the canvas
 *   - Per-element remove button
 *
 * Empty state: a helpful message guiding the user to select an element and
 * add an entrance animation via the property panel.
 */
export function AnimationTimeline() {
  const {
    slides, currentSlideId, setCurrentSlide, selectedIds, setSelected,
    setElementAnimation, reorderAnimation, setAnimationPlayback,
    moveAnimationTo,
  } = useEditor()

  const [expanded, setExpanded] = useState(true)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const dragSourceId = useRef<string | null>(null)

  const slide = slides.find((s) => s.id === currentSlideId)
  if (!slide) return null

  const playback = slide.animationPlayback || "sequential"
  const order = slide.animationOrder || []
  // Animated elements (filter to only those that still exist + have an entrance)
  const animatedElements = order
    .map((id) => slide.elements.find((e) => e.id === id))
    .filter((e): e is EditorElement => !!e && !!e.entrance && e.entrance !== "none")

  // Compute total sequence duration for the timeline bar
  const totalDuration = playback === "together"
    ? Math.max(0, ...animatedElements.map((e) => (e.entranceDelay || 0) + (e.entranceDuration || 600)))
    : animatedElements.reduce((sum, e) => sum + (e.entranceDuration || 600) + (e.entranceDelay || 0), 0)

  function handleDragStart(e: React.DragEvent, index: number, id: string) {
    dragSourceId.current = id
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    try { e.dataTransfer.setData("text/plain", id) } catch { /* ignore */ }
  }
  function handleDragOver(e: React.DragEvent, index: number) {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setOverIndex(index)
  }
  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex === null) return
    if (dragIndex !== index) {
      reorderAnimation(dragIndex, index)
    }
    setDragIndex(null)
    setOverIndex(null)
    dragSourceId.current = null
  }
  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
    dragSourceId.current = null
  }

  function previewAll() {
    if (animatedElements.length === 0) {
      toast.info("No animated elements on this slide")
      return
    }
    setPreviewKey((k) => k + 1)
    // Replay each element's animation in sequence
    animatedElements.forEach((el, idx) => {
      const delay = playback === "sequential"
        ? animatedElements.slice(0, idx).reduce((s, e) => s + (e.entranceDuration || 600) + (e.entranceDelay || 0), 0) + (el.entranceDelay || 0)
        : (el.entranceDelay || 0)
      setTimeout(() => {
        const node = document.querySelector(`[data-element-id="${el.id}"]`) as HTMLElement | null
        if (!node) return
        node.classList.remove("el-entrance")
        void node.offsetWidth
        const kf = ENTRANCE_KEYFRAME_MAP[el.entrance!]
        if (kf) {
          node.style.setProperty("--el-anim-name", kf)
          node.style.setProperty("--el-anim-duration", `${el.entranceDuration || 600}ms`)
          node.style.setProperty("--el-anim-delay", "0ms")
          node.classList.add("el-entrance")
        }
      }, delay)
    })
    toast.success(`Previewing ${animatedElements.length} animation${animatedElements.length === 1 ? "" : "s"}`)
  }

  return (
    <div className="p-4 border-b">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 mb-2 group"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
        <Layers className="w-3 h-3 text-violet-500" />
        <h4 className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          ANIMATION TIMELINE
        </h4>
        {animatedElements.length > 0 && (
          <span className="ml-auto text-[9px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 rounded-full px-1.5 py-0.5">
            {animatedElements.length} effect{animatedElements.length === 1 ? "" : "s"}
          </span>
        )}
      </button>

      {expanded && (
        <>
          {animatedElements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No entrance animations yet.
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Select an element and add an animation from the property panel.
              </p>
            </div>
          ) : (
            <>
              {/* Playback mode toggle */}
              <div className="flex items-center gap-1 mb-3 p-0.5 rounded-md bg-muted/40 border border-border/40">
                <button
                  onClick={() => setAnimationPlayback("sequential")}
                  className={cn(
                    "flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all",
                    playback === "sequential"
                      ? "bg-background shadow-sm text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Sequential
                </button>
                <button
                  onClick={() => setAnimationPlayback("together")}
                  className={cn(
                    "flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all",
                    playback === "together"
                      ? "bg-background shadow-sm text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Together
                </button>
              </div>

              {/* Timeline list */}
              <div className="space-y-1 mb-3">
                {animatedElements.map((el, idx) => {
                  const isDragging = dragIndex === idx
                  const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx
                  const animInfo = ANIM_LABELS[el.entrance!]
                  const duration = el.entranceDuration || 600
                  const delay = el.entranceDelay || 0
                  const isSelected = selectedIds.includes(el.id)
                  return (
                    <div
                      key={el.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx, el.id)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelected([el.id])}
                      className={cn(
                        "group flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all",
                        isSelected
                          ? "border-violet-400 bg-violet-50 dark:bg-violet-950/20"
                          : "border-border/60 hover:border-violet-300/50 hover:bg-muted/40",
                        isDragging && "opacity-40",
                        isOver && "ring-2 ring-violet-400/40",
                      )}
                    >
                      {/* Drag handle + order number */}
                      <div className="flex items-center gap-1 shrink-0">
                        <GripVertical className="w-3 h-3 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground w-4 text-center">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Element info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none">{animInfo.icon}</span>
                          <span className="text-xs font-medium truncate">{el.name || "Element"}</span>
                          {el.animationTrigger && el.animationTrigger !== "with-slide" && (
                            <span
                              className="text-[8px] font-medium px-1 py-0.5 rounded shrink-0"
                              title={`Start: ${el.animationTrigger.replace("-", " ")}`}
                              style={{
                                background: el.animationTrigger === "on-click" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                                color: el.animationTrigger === "on-click" ? "rgb(220,38,38)" : "rgb(22,163,74)",
                              }}
                            >
                              {el.animationTrigger === "on-click" ? "click" : "prev"}
                            </span>
                          )}
                        </div>
                        {/* Mini timeline bar */}
                        <div className="mt-1 h-1.5 rounded-full bg-muted/60 overflow-hidden relative">
                          {playback === "sequential" ? (
                            <div
                              className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full"
                              style={{ width: `${((duration) / totalDuration) * 100}%` }}
                            />
                          ) : (
                            <>
                              <div
                                className="absolute h-full bg-muted-foreground/30"
                                style={{ left: `${(delay / totalDuration) * 100}%`, width: "2px" }}
                              />
                              <div
                                className="absolute h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full"
                                style={{
                                  left: `${(delay / totalDuration) * 100}%`,
                                  width: `${(duration / totalDuration) * 100}%`,
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Duration label */}
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0 tabular-nums">
                        {duration}ms
                        {delay > 0 && <span className="text-amber-500"> +{delay}</span>}
                      </span>

                      {/* Up/down + remove */}
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveAnimationTo(el.id, idx - 1) }}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-muted-foreground hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveAnimationTo(el.id, idx + 1) }}
                          disabled={idx === animatedElements.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-muted-foreground hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setElementAnimation(el.id, "none"); toast.success("Animation removed") }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Remove animation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total duration + preview */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono tabular-nums">{totalDuration}ms total</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 gap-1 text-[11px] hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700 dark:hover:bg-violet-950/30"
                  onClick={previewAll}
                >
                  <Play className="w-3 h-3" />
                  Preview All
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// Map entrance type → CSS keyframe name (must match PresentationMode)
const ENTRANCE_KEYFRAME_MAP: Record<string, string> = {
  "fade": "el-entrance-fade",
  "slide-up": "el-entrance-slide-up",
  "slide-down": "el-entrance-slide-down",
  "slide-left": "el-entrance-slide-left",
  "slide-right": "el-entrance-slide-right",
  "zoom": "el-entrance-zoom",
  "bounce": "el-entrance-bounce",
  "spin": "el-entrance-spin",
}
