"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Copy, Trash2, X, LayoutGrid, Sparkles, GripVertical, Plus,
  ChevronLeft, ChevronRight, Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/**
 * Slide Sorter — full-deck grid overview.
 *
 * PowerPoint-style "Slide Sorter" view: every slide rendered as a
 * medium-sized card in a responsive grid. Supports:
 *   - Click to jump to a slide (and closes the dialog)
 *   - Drag to reorder (drop indicator before/after)
 *   - Per-card actions: duplicate, delete, set transition
 *   - A live "N slides · M with transitions" summary
 *
 * The thumbnails reuse the same iframe-with-srcdoc approach as the bottom
 * SlidesPanel so visual fidelity is 100%, but at a larger size so the user
 * can actually tell slides apart in a 14+ deck.
 */
export function SlideSorter({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const {
    slides, currentSlideId, setCurrentSlide,
    reorderSlides, duplicateSlide, removeSlide,
    setSlideTransition, addSlide,
  } = useEditor()

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [overPosition, setOverPosition] = useState<"before" | "after">("before")
  const [transitionPickerFor, setTransitionPickerFor] = useState<string | null>(null)
  const dragSourceId = useRef<string | null>(null)

  // Reset drag state whenever the dialog closes (avoids stale indicators
  // when reopened). The empty dependency array on the cleanup means this
  // only fires on unmount/close, which is exactly when we want to clear.
  useEffect(() => {
    if (!open) {
      setDragIndex(null)
      setOverIndex(null)
      setTransitionPickerFor(null)
    }
  }, [open])

  const handleDragStart = useCallback((e: React.DragEvent, index: number, slideId: string) => {
    dragSourceId.current = slideId
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    try { e.dataTransfer.setData("text/plain", slideId) } catch { /* ignore */ }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // For grid layout, use horizontal midpoint within the card.
    const midpoint = rect.left + rect.width / 2
    const position: "before" | "after" = e.clientX < midpoint ? "before" : "after"
    setOverIndex(index)
    setOverPosition(position)
  }, [dragIndex])

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null) return
    let targetIndex = index
    if (overPosition === "after") targetIndex = index + 1
    let from = dragIndex
    let to = targetIndex
    if (to > from) to -= 1
    if (from !== to) {
      reorderSlides(from, to)
      toast.success(`Moved slide ${from + 1} → ${to + 1}`)
    }
    setDragIndex(null)
    setOverIndex(null)
    dragSourceId.current = null
  }, [dragIndex, overPosition, reorderSlides])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
    dragSourceId.current = null
  }, [])

  const handleJumpTo = useCallback((slideId: string) => {
    setCurrentSlide(slideId)
    onOpenChange(false)
  }, [setCurrentSlide, onOpenChange])

  const transitions = [
    { value: "inherit", label: "Inherit", icon: "↩", desc: "Use global setting" },
    { value: "none", label: "None", icon: "✕", desc: "No transition" },
    { value: "fade", label: "Fade", icon: "◐", desc: "Cross-fade between slides" },
    { value: "slide", label: "Slide", icon: "→", desc: "Slide in from the right" },
    { value: "zoom", label: "Zoom", icon: "⊕", desc: "Zoom in/out" },
  ] as const

  const slidesWithTransitions = slides.filter(s => s.transition && s.transition !== "inherit").length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-7xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden"
        aria-describedby={undefined}
      >
        {/* Header — sticky, with summary + actions */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-violet-50/60 via-pink-50/40 to-amber-50/50 dark:from-violet-950/20 dark:via-pink-950/10 dark:to-amber-950/20 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <LayoutGrid className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold truncate">
                  Slide Sorter
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{slides.length} slide{slides.length === 1 ? "" : "s"}</span>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {slidesWithTransitions} with transition{slidesWithTransitions === 1 ? "" : "s"}
                  </span>
                  <span className="text-border">·</span>
                  <span>drag to reorder · click to edit</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => {
                  addSlide()
                  toast.success("Blank slide added")
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Slide</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Grid body — scrollable */}
        <div className="flex-1 overflow-y-auto sf-layers-scroll p-6">
          {slides.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <LayoutGrid className="w-12 h-12 opacity-30" />
              <p className="text-sm">No slides yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {slides.map((slide, idx) => {
                const isDragging = dragIndex === idx
                const showBefore = overIndex === idx && overPosition === "before" && dragIndex !== null && dragIndex !== idx
                const showAfter = overIndex === idx && overPosition === "after" && dragIndex !== null && dragIndex !== idx && dragIndex !== idx + 1
                const isActive = currentSlideId === slide.id
                const showTransitionPicker = transitionPickerFor === slide.id
                const slideW = slide.width || CANVAS_WIDTH
                const slideH = slide.height || CANVAS_HEIGHT
                // Scale the slide down to fit a ~200px wide card.
                const cardW = 200
                const cardH = Math.round((cardW * slideH) / slideW)

                return (
                  <React.Fragment key={slide.id}>
                    {showBefore && (
                      <div className="col-span-1 h-full min-h-[120px] flex items-center justify-center">
                        <div className="w-1 self-stretch bg-primary rounded-full animate-in fade-in" />
                      </div>
                    )}
                    <div
                      data-slide-card
                      data-slide-id={slide.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx, slide.id)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleJumpTo(slide.id)}
                      className={cn(
                        "group relative rounded-lg border-2 cursor-pointer transition-all bg-card overflow-hidden",
                        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50",
                        isActive ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border",
                        isDragging && "opacity-40 scale-95",
                        overIndex === idx && dragIndex !== null && dragIndex !== idx && "ring-2 ring-primary/40",
                      )}
                    >
                      {/* Slide number badge */}
                      <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                        <span className="text-[11px] font-mono font-semibold bg-black/65 backdrop-blur-sm text-white rounded px-1.5 py-0.5">
                          {idx + 1}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-medium bg-primary text-primary-foreground rounded px-1 py-0.5 uppercase tracking-wide">
                            Current
                          </span>
                        )}
                      </div>

                      {/* Transition badge */}
                      {slide.transition && slide.transition !== "inherit" && (
                        <div className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-medium rounded px-1.5 py-0.5 shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" />
                          {slide.transition}
                        </div>
                      )}

                      {/* Drag handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 left-1 z-20 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded p-1 text-white transition-opacity"
                        title="Drag to reorder"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-3 h-3" />
                      </div>

                      {/* Thumbnail */}
                      <div
                        className="relative bg-muted overflow-hidden"
                        style={{ height: cardH }}
                      >
                        <div
                          className="absolute top-1/2 left-1/2 origin-top-left pointer-events-none"
                          style={{
                            width: slideW,
                            height: slideH,
                            transform: `translate(-50%, -50%) scale(${cardW / slideW})`,
                          }}
                        >
                          {slide.rawHtml ? (
                            <iframe
                              className="absolute top-0 left-0 border-none"
                              style={{ width: slideW, height: slideH, pointerEvents: "none" }}
                              srcDoc={slide.rawHtml}
                              sandbox="allow-same-origin allow-scripts"
                              title={`Slide ${idx + 1} preview`}
                            />
                          ) : (
                            <div
                              className="absolute inset-0"
                              style={{
                                background: slide.background,
                                backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              {slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex).map(el => (
                                <div
                                  key={el.id}
                                  className="absolute"
                                  style={{
                                    left: el.x, top: el.y, width: el.width, height: el.height,
                                    background: el.fill && el.fill !== "transparent" ? el.fill : undefined,
                                    opacity: el.opacity,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer — name + actions */}
                      <div className="px-2 py-1.5 bg-card border-t flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium truncate flex-1" title={slide.name}>
                          {slide.name}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider delayDuration={400}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-6 w-6 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                  onClick={(e) => { e.stopPropagation(); setTransitionPickerFor(showTransitionPicker ? null : slide.id) }}
                                >
                                  <Wand2 className="w-3 h-3 text-violet-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">Set transition</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-6 w-6 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                  onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id); toast.success("Slide duplicated") }}
                                >
                                  <Copy className="w-3 h-3 text-blue-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">Duplicate</TooltipContent>
                            </Tooltip>
                            {slides.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); toast.success("Slide deleted") }}
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">Delete</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Transition picker popover */}
                      {showTransitionPicker && (
                        <div
                          className="absolute z-30 bottom-full mb-1 left-1/2 -translate-x-1/2 w-44 bg-popover border rounded-lg shadow-xl p-1 animate-in fade-in zoom-in-95"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">
                            Transition
                          </p>
                          {transitions.map(t => (
                            <button
                              key={t.value}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSlideTransition(slide.id, t.value)
                                setTransitionPickerFor(null)
                                toast.success(`Transition set: ${t.label}`)
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors text-left",
                                (slide.transition || "inherit") === t.value && "bg-accent font-medium",
                              )}
                            >
                              <span className="w-4 text-center text-sm">{t.icon}</span>
                              <span className="flex-1">{t.label}</span>
                              {(slide.transition || "inherit") === t.value && (
                                <span className="text-[10px] text-primary">●</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {showAfter && (
                      <div className="col-span-1 h-full min-h-[120px] flex items-center justify-center">
                        <div className="w-1 self-stretch bg-primary rounded-full animate-in fade-in" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer — quick nav */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            Tip: drag cards to reorder · hover for actions · click to edit
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={slides.findIndex(s => s.id === currentSlideId) <= 0}
              onClick={() => {
                const i = slides.findIndex(s => s.id === currentSlideId)
                if (i > 0) handleJumpTo(slides[i - 1].id)
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>
            <span className="text-xs font-mono text-muted-foreground px-2">
              {slides.findIndex(s => s.id === currentSlideId) + 1} / {slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={slides.findIndex(s => s.id === currentSlideId) >= slides.length - 1}
              onClick={() => {
                const i = slides.findIndex(s => s.id === currentSlideId)
                if (i < slides.length - 1) handleJumpTo(slides[i + 1].id)
              }}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
