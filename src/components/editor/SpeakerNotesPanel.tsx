"use client"

import React, { useState, useEffect, useRef } from "react"
import { useEditor } from "@/store/editor-store"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { StickyNote, ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  /** Compact mode for embedding in the property panel */
  compact?: boolean
}

export function SpeakerNotesPanel({ compact = true }: Props) {
  const { currentSlide, setSlideNotes } = useEditor()
  const slide = currentSlide()
  const [notes, setNotes] = useState(slide?.notes || "")
  const [expanded, setExpanded] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when slide changes
  const slideId = slide?.id
  const slideNotes = slide?.notes || ""
  const [prevSlideId, setPrevSlideId] = useState<string | undefined>(slideId)
  if (slideId !== prevSlideId) {
    setPrevSlideId(slideId)
    setNotes(slideNotes)
  }

  function handleChange(value: string) {
    setNotes(value)
    // Debounce the store update to avoid pushing history on every keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (slideId) setSlideNotes(slideId, value)
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!slide) return null

  const charCount = notes.length
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0
  // Rough estimate: ~130 words per minute speaking pace
  const estimatedSeconds = wordCount > 0 ? Math.round((wordCount / 130) * 60) : 0

  return (
    <div className={cn("border-t", compact ? "bg-background" : "bg-muted/30")}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <StickyNote className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Speaker Notes
        </span>
        {notes && (
          <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono">
            {wordCount}w · {formatDuration(estimatedSeconds)}
          </span>
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3">
          <Textarea
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Add speaker notes for this slide…&#10;&#10;These notes appear in presenter view but not on the exported slide."
            className={cn(
              "min-h-[100px] resize-y text-xs leading-relaxed",
              "focus-visible:ring-amber-400/40 focus-visible:border-amber-400/40",
            )}
          />
          {notes && (
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <span>{charCount} chars</span>
              <span>{wordCount} words</span>
              <span className="flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                ~{formatDuration(estimatedSeconds)} speak time
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}
