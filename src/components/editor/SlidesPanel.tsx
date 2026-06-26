"use client"

import React from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Copy, Trash2, LayoutTemplate } from "lucide-react"
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
  } = useEditor()

  return (
    <div className="h-28 border-t bg-background flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Slides</h3>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => onNewFromTemplate ? onNewFromTemplate() : addSlide()}
                >
                  <LayoutTemplate className="w-3 h-3" /> Template
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">New from template</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addSlide}>
                  <Plus className="w-3 h-3" /> Blank
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">New blank slide</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex gap-2 p-2 overflow-x-auto">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => setCurrentSlide(slide.id)}
              className={cn(
                "group relative w-32 h-[72px] rounded border-2 cursor-pointer shrink-0 overflow-hidden",
                currentSlideId === slide.id ? "border-primary" : "border-border hover:border-muted-foreground/40",
              )}
              style={{ background: slide.background }}
            >
              {/* Mini preview */}
              <div
                className="absolute inset-0 origin-top-left pointer-events-none"
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${128 / CANVAS_WIDTH})`,
                }}
              >
                {slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex).map((el) => (
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
              <div className="absolute top-1 left-1 text-[10px] font-mono bg-black/40 text-white rounded px-1">
                {idx + 1}
              </div>
              {/* Hover controls */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id) }}
                >
                  <Copy className="w-2.5 h-2.5" />
                </Button>
                {slides.length > 1 && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id) }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
