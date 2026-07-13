"use client"

import React, { useState } from "react"
import { useEditor } from "@/store/editor-store"
import type { EntranceAnimation } from "@/types/editor"
import {
  Wand2, ChevronDown, ChevronRight, Zap, Sparkles, Circle,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Maximize2, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/**
 * Animation presets — apply a coordinated sequence of entrance animations
 * to multiple elements on the current slide at once.
 *
 * Each preset defines an animation type + a stagger pattern. When applied:
 *   1. All native (non-sf-) elements on the slide are collected, sorted by
 *      their visual position (top-to-bottom, left-to-right).
 *   2. Each element gets the preset's animation type.
 *   3. Delays are staggered so elements animate in sequence (creating a
 *      "build" effect like PowerPoint's "Animate In" presets).
 *   4. The slide's animationOrder is updated to match the stagger order.
 */

interface Preset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  anim: EntranceAnimation
  stagger: number // ms between each element
  duration: number // ms per element
}

const PRESETS: Preset[] = [
  {
    id: "fade-in-sequence",
    name: "Fade In Sequence",
    description: "Elements fade in one by one, top to bottom",
    icon: <Circle className="w-4 h-4" />,
    anim: "fade",
    stagger: 200,
    duration: 500,
  },
  {
    id: "slide-up-cascade",
    name: "Slide Up Cascade",
    description: "Elements slide up from below in sequence",
    icon: <ArrowUp className="w-4 h-4" />,
    anim: "slide-up",
    stagger: 150,
    duration: 500,
  },
  {
    id: "zoom-in-together",
    name: "Zoom In Together",
    description: "All elements zoom in simultaneously",
    icon: <Maximize2 className="w-4 h-4" />,
    anim: "zoom",
    stagger: 0,
    duration: 600,
  },
  {
    id: "slide-right-sequence",
    name: "Slide Right Sequence",
    description: "Elements slide in from the left, one by one",
    icon: <ArrowRight className="w-4 h-4" />,
    anim: "slide-right",
    stagger: 180,
    duration: 500,
  },
  {
    id: "bounce-playful",
    name: "Bounce Playful",
    description: "Elements bounce in with a playful overshoot",
    icon: <Zap className="w-4 h-4" />,
    anim: "bounce",
    stagger: 250,
    duration: 700,
  },
  {
    id: "spin-energetic",
    name: "Spin Energetic",
    description: "Elements spin into view with energy",
    icon: <RefreshCw className="w-4 h-4" />,
    anim: "spin",
    stagger: 300,
    duration: 600,
  },
]

export function AnimationPresets() {
  const { slides, currentSlideId, setElementAnimation } = useEditor()
  const [expanded, setExpanded] = useState(false)

  const slide = slides.find((s) => s.id === currentSlideId)
  if (!slide) return null

  // Native elements only (not Exact-mode overlay elements)
  const nativeElements = slide.elements.filter((el) => !el.id.startsWith("sf-") && el.visible)

  function applyPreset(preset: Preset) {
    if (nativeElements.length === 0) {
      toast.info("No native elements to animate on this slide")
      return
    }
    // Sort by visual position: top-to-bottom, then left-to-right
    const sorted = [...nativeElements].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) return a.y - b.y
      return a.x - b.x
    })
    sorted.forEach((el, idx) => {
      setElementAnimation(
        el.id,
        preset.anim,
        preset.duration,
        idx * preset.stagger,
      )
    })
    toast.success(`Applied "${preset.name}" to ${sorted.length} element${sorted.length === 1 ? "" : "s"}`)
  }

  function clearAll() {
    nativeElements.forEach((el) => {
      if (el.entrance && el.entrance !== "none") {
        setElementAnimation(el.id, "none")
      }
    })
    toast.success("Cleared all animations")
  }

  const hasAnimations = nativeElements.some((el) => el.entrance && el.entrance !== "none")

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
        <Wand2 className="w-3 h-3 text-fuchsia-500" />
        <h4 className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          ANIMATION PRESETS
        </h4>
        {hasAnimations && (
          <span className="ml-auto text-[9px] font-medium bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 rounded-full px-1.5 py-0.5">
            {nativeElements.filter((e) => e.entrance && e.entrance !== "none").length} animated
          </span>
        )}
      </button>

      {expanded && (
        <>
          <p className="text-[10px] text-muted-foreground mb-2.5">
            Apply a coordinated animation sequence to all {nativeElements.length} element{nativeElements.length === 1 ? "" : "s"} on this slide.
          </p>

          {/* Preset grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                title={preset.description}
                className="flex flex-col items-start gap-1 p-2 rounded-md border border-border hover:border-fuchsia-400/50 hover:bg-fuchsia-50/50 dark:hover:bg-fuchsia-950/20 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-fuchsia-500 group-hover:scale-110 transition-transform">{preset.icon}</span>
                  <span className="text-[10px] font-semibold">{preset.name}</span>
                </div>
                <span className="text-[9px] text-muted-foreground leading-tight">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>

          {/* Clear all */}
          {hasAnimations && (
            <button
              onClick={clearAll}
              className="w-full text-[10px] text-muted-foreground hover:text-red-500 transition-colors py-1"
            >
              Clear all animations on this slide
            </button>
          )}
        </>
      )}
    </div>
  )
}
