"use client"

import React from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { useEditor } from "@/store/editor-store"
import { TEMPLATES } from "@/lib/templates"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplatePickerDialog({ open, onOpenChange }: Props) {
  const { addSlide, slides } = useEditor()

  function handlePick(templateId: string) {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const slide = template.build()
    slide.name = `Slide ${slides.length + 1}`
    // Add via store - we need to replicate addSlide but with our slide
    useEditor.setState((s) => {
      const past = [...s.past, structuredClone(s.slides)]
      return {
        slides: [...s.slides, slide],
        currentSlideId: slide.id,
        selectedIds: [],
        past: past.slice(-50),
        future: [],
      }
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Pick a starting layout. You can fully customize everything afterwards.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handlePick(tpl.id)}
                className="template-card group text-left rounded-lg border-2 border-border hover:border-primary overflow-hidden bg-card"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-[16/9] overflow-hidden"
                  style={{ background: tpl.thumbnail.bg }}
                >
                  {tpl.thumbnail.elements.map((el, i) => {
                    if (el.type === "text") {
                      return (
                        <div
                          key={i}
                          className="absolute rounded"
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            background: el.color,
                            opacity: 0.8,
                          }}
                        />
                      )
                    }
                    return (
                      <div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.w}%`,
                          height: `${el.h}%`,
                          background: el.color,
                          borderRadius: el.type === "circle" ? "50%" : 4,
                        }}
                      />
                    )
                  })}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
                {/* Label */}
                <div className="p-3">
                  <div className="font-medium text-sm">{tpl.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
