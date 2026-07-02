"use client"

import React, { useState, useRef } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Copy, Trash2, LayoutTemplate, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface SlidesPanelProps {
  onNewFromTemplate?: () => void
}

export function SlidesPanel({ onNewFromTemplate }: SlidesPanelProps) {
  const {
    slides,
    currentSlideId,
    setCurrentSlide,
    addSlide,
    duplicateSlide,
    removeSlide,
    reorderSlides,
  } = useEditor()

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [overPosition, setOverPosition] = useState<"before" | "after">("before")
  const dragSourceId = useRef<string | null>(null)

  function handleDragStart(e: React.DragEvent, index: number, slideId: string) {
    dragSourceId.current = slideId
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Set a transparent image so the default ghost doesn't show
    try {
      e.dataTransfer.setData("text/plain", slideId)
    } catch {
      // Some browsers throw if dataTransfer is restricted
    }
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midpoint = rect.left + rect.width / 2
    const position: "before" | "after" = e.clientX < midpoint ? "before" : "after"
    setOverIndex(index)
    setOverPosition(position)
  }

  function handleDragLeave() {
    // Only clear if leaving the container entirely
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex === null) return
    let targetIndex = index
    if (overPosition === "after") targetIndex = index + 1
    // Adjust if moving forward (the source is removed first)
    let from = dragIndex
    let to = targetIndex
    if (to > from) to -= 1
    if (from !== to) {
      reorderSlides(from, to)
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

  return (
    <div className="h-28 border-t border-border/40 flex flex-col shrink-0" style={{ background: "linear-gradient(to bottom, rgba(245,243,255,0.8), rgba(255,255,255,0.6), rgba(253,242,248,0.7))" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40" style={{ background: "linear-gradient(to right, rgba(245,243,255,0.9), rgba(253,242,248,0.7))" }}>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
          Slides
          <span className="text-[10px] font-normal text-muted-foreground/70 normal-case tracking-normal">
            · drag to reorder
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs hover:bg-background"
                  onClick={() => onNewFromTemplate ? onNewFromTemplate() : addSlide()}
                >
                  <LayoutTemplate className="w-3 h-3" /> Template
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">New from template</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs hover:bg-background" onClick={addSlide}>
                  <Plus className="w-3 h-3" /> Blank
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">New blank slide</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden sf-layers-scroll">
        <div className="flex gap-2 p-2 h-full" onDragLeave={handleDragLeave}>
          {slides.map((slide, idx) => {
            const isDragging = dragIndex === idx
            const showBeforeIndicator = overIndex === idx && overPosition === "before" && dragIndex !== null && dragIndex !== idx
            const showAfterIndicator = overIndex === idx && overPosition === "after" && dragIndex !== null && dragIndex !== idx && dragIndex !== idx + 1
            return (
              <React.Fragment key={slide.id}>
                {showBeforeIndicator && (
                  <div className="self-stretch w-0.5 bg-primary rounded-full shrink-0 animate-in fade-in slide-thumb-drop-indicator" />
                )}
                <div
                  data-slide-thumb
                  data-slide-id={slide.id}
                  data-slide-index={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx, slide.id)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setCurrentSlide(slide.id)}
                  className={cn(
                    "slide-thumb group relative w-32 h-[72px] rounded-md border-2 cursor-pointer shrink-0 overflow-hidden transition-all hover:shadow-md",
                    currentSlideId === slide.id ? "border-primary active shadow-sm shadow-primary/30" : "border-border hover:border-muted-foreground/40",
                    isDragging && "opacity-40 scale-95",
                    overIndex === idx && dragIndex !== null && dragIndex !== idx && "ring-2 ring-primary/40",
                  )}
                  style={{ background: slide.background }}
                >
                  {/* Drag handle (visible on hover) */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 left-0.5 z-20 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded p-0.5 text-white transition-opacity"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-2.5 h-2.5" />
                  </div>
                  {/* Mini preview */}
                  <div
                    className="absolute inset-0 origin-top-left pointer-events-none"
                    style={{
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                      transform: `scale(${128 / CANVAS_WIDTH})`,
                    }}
                  >
                    {slide.rawHtml ? (
                      <iframe
                        className="absolute top-0 left-0 border-none"
                        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, pointerEvents: "none" }}
                        srcDoc={slide.rawHtml}
                        sandbox="allow-same-origin"
                        title={`Slide ${idx + 1} preview`}
                      />
                    ) : slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                      <div
                        key={el.id}
                        className="absolute"
                        style={{
                          left: el.x,
                          top: el.y,
                          width: el.width,
                          height: el.height,
                          background: el.fill && el.fill !== "transparent" ? el.fill : undefined,
                          borderRadius: el.borderRadius,
                          opacity: el.opacity,
                          transform: `rotate(${el.rotation}deg)`,
                          border: el.strokeWidth && el.stroke ? `${el.strokeWidth}px solid ${el.stroke}` : undefined,
                        }}
                      >
                        {el.type === "text" && (
                          <div
                            style={{
                              fontSize: (el as any).fontSize,
                              color: (el as any).color,
                              fontWeight: (el as any).fontWeight,
                              width: "100%",
                              height: "100%",
                              overflow: "hidden",
                            }}
                          >
                            {(el as any).text?.slice(0, 30)}
                          </div>
                        )}
                        {el.type === "image" && (
                          <img src={(el as any).src} alt="" className="w-full h-full" style={{ objectFit: (el as any).objectFit }} />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Slide number */}
                  <div className="absolute top-1 left-1 text-[10px] font-mono font-medium bg-black/50 backdrop-blur-sm text-white rounded px-1.5 py-0.5">
                    {idx + 1}
                  </div>
                  {/* Hover controls */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-5 w-5 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white border-none"
                      onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id) }}
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </Button>
                    {slides.length > 1 && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-5 w-5 bg-black/50 backdrop-blur-sm hover:bg-red-600 text-white border-none"
                        onClick={(e) => { e.stopPropagation(); removeSlide(slide.id) }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {showAfterIndicator && (
                  <div className="self-stretch w-0.5 bg-primary rounded-full shrink-0 animate-in fade-in slide-thumb-drop-indicator" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
