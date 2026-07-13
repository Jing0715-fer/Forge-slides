"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import type { EditorElement } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronDown, X, Expand, Minimize, Sparkles, Pause, Play, Clock, StickyNote, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { playClickSound, playWhooshSound, playDingSound, playPopSound, playChimeSound, type SoundType, SOUND_OPTIONS } from "@/lib/sound-effects"

type TransitionType = "none" | "fade" | "slide" | "zoom"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PresentationMode({ open, onOpenChange }: Props) {
  const { slides, currentSlideId, setCurrentSlide, masterElements, masterVisible } = useEditor()
  const [index, setIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [transition, setTransition] = useState<TransitionType>("fade")
  const [direction, setDirection] = useState<"forward" | "backward">("forward")
  const [animKey, setAnimKey] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundType, setSoundType] = useState<SoundType>("whoosh")
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  // Exit phase: when true, the current slide's exit animations are playing
  // before switching to the next slide. Set when the user navigates away;
  // cleared after the exit animations finish (then the slide changes).
  const [exiting, setExiting] = useState(false)
  const pendingIndexRef = useRef<number | null>(null)
  const pendingDirRef = useRef<"forward" | "backward">("forward")
  // Live viewport size — drives the slide scale. Updates on resize and
  // fullscreen-toggle so the slide always fits the current window.
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }))
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track previous values to detect transitions (React-recommended "adjust state during render" pattern)
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevCurrentSlideId, setPrevCurrentSlideId] = useState<string | null>(null)

  // When opening or when the current slide changes externally, sync the index
  if (open && (!prevOpen || prevCurrentSlideId !== currentSlideId)) {
    setPrevOpen(true)
    setPrevCurrentSlideId(currentSlideId)
    const idx = slides.findIndex((s) => s.id === currentSlideId)
    const next = idx >= 0 ? idx : 0
    if (next !== index) {
      setIndex(next)
    }
    // Reset elapsed timer when (re)opening
    if (!prevOpen) {
      setElapsed(0)
    }
  }
  if (!open && prevOpen) {
    setPrevOpen(false)
  }

  const goToSlide = useCallback((newIndex: number, dir: "forward" | "backward" = "forward") => {
    const clamped = Math.max(0, Math.min(slides.length - 1, newIndex))
    if (clamped === index) return
    // Play transition sound based on user's selected sound type
    if (soundEnabled) {
      if (clamped === slides.length - 1 && dir === "forward") {
        // Always use ding for reaching the last slide (special cue)
        playDingSound()
      } else {
        // Use the user's selected sound type for normal transitions
        switch (soundType) {
          case "click": playClickSound(); break
          case "whoosh": playWhooshSound(); break
          case "ding": playDingSound(); break
          case "pop": playPopSound(); break
          case "chime": playChimeSound(); break
          case "none": break
        }
      }
    }
    // Check if the CURRENT slide has any exit animations. If so, play them
    // first, then switch after they complete. If not, switch immediately.
    const currentSlide = slides[index]
    const hasExitAnims = currentSlide && !currentSlide.rawHtml && currentSlide.elements.some(
      (el) => el.exit && el.exit !== "none" && !el.id.startsWith("sf-"),
    )
    if (hasExitAnims && !exiting) {
      // Enter exit phase: trigger exit animations, then switch after max duration
      pendingIndexRef.current = clamped
      pendingDirRef.current = dir
      setExiting(true)
      setAnimKey((k) => k + 1) // re-mount elements so exit animations restart
      // Compute the max exit animation end time (duration + delay)
      const maxExitTime = Math.max(
        ...currentSlide.elements
          .filter((el) => el.exit && el.exit !== "none")
          .map((el) => (el.exitDuration || 600) + (el.exitDelay || 0)),
      )
      setTimeout(() => {
        setExiting(false)
        setDirection(pendingDirRef.current)
        setAnimKey((k) => k + 1)
        setIndex(pendingIndexRef.current!)
        if (slides[pendingIndexRef.current!]) {
          setCurrentSlide(slides[pendingIndexRef.current!].id)
        }
        pendingIndexRef.current = null
      }, maxExitTime + 50)
      return
    }
    // No exit animations or already exiting — switch immediately
    if (!exiting) {
      setDirection(dir)
      setAnimKey((k) => k + 1)
      setIndex(clamped)
      if (slides[clamped]) {
        setCurrentSlide(slides[clamped].id)
      }
    }
  }, [slides, setCurrentSlide, index, exiting, soundEnabled, soundType])

  const next = useCallback(() => goToSlide(index + 1, "forward"), [goToSlide, index])
  const prev = useCallback(() => goToSlide(index - 1, "backward"), [goToSlide, index])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault()
        next()
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault()
        prev()
      } else if (e.key === "Escape") {
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          onOpenChange(false)
        }
      } else if (e.key === "Home") {
        e.preventDefault()
        goToSlide(0, "backward")
      } else if (e.key === "End") {
        e.preventDefault()
        goToSlide(slides.length - 1, "forward")
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        setAutoPlay((v) => !v)
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        setShowNotes((v) => !v)
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault()
        // Cycle through transitions
        setTransition((t) => t === "none" ? "fade" : t === "fade" ? "slide" : t === "slide" ? "zoom" : "none")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, next, prev, goToSlide, slides.length, onOpenChange, toggleFullscreen])

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  // Window resize listener — recomputes the slide scale factor so the
  // current slide always fits the visible window. rAF-throttled so a
  // window-drag doesn't fire dozens of state updates per second.
  useEffect(() => {
    if (!open) return
    let raf = 0
    const onResize = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setViewport({
          w: window.innerWidth,
          h: window.innerHeight,
        })
      })
    }
    window.addEventListener("resize", onResize)
    // Also sync once when presentation mode opens — the user may have
    // resized the editor window before going into Present.
    onResize()
    return () => {
      window.removeEventListener("resize", onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [open])

  // Auto-play timer
  useEffect(() => {
    if (!open || !autoPlay) return
    const interval = setInterval(() => {
      if (index < slides.length - 1) {
        next()
      } else {
        setAutoPlay(false)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [open, autoPlay, index, slides.length, next])

  // Elapsed timer (presentation stopwatch) — uses ref for start time so the interval doesn't reset
  const startRef = useRef<number>(0)
  useEffect(() => {
    if (!open) return
    startRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  // Auto-hide controls (like video players) — show on mouse move, hide after 3s
  useEffect(() => {
    if (!open) return
    function onMove() {
      setShowControls(true)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
    onMove() // initial
    window.addEventListener("mousemove", onMove)
    return () => {
      window.removeEventListener("mousemove", onMove)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [open])

  if (!open || slides.length === 0) return null

  const slide = slides[index]
  if (!slide) return null

  // Render slide content at native resolution, scaled to fit viewport.
  // CRITICAL: use the CURRENT slide's width/height (which the user can
  // override per-page via the SLIDE SIZE control in the PropertyPanel),
  // not a hard-coded 16:9 assumption. Without this, a 4:3 slide presented
  // in a 16:9 viewport letterboxes correctly but a 16:9 slide presented
  // in a 4:3 viewer overflows — and any non-default size (1080×1080,
  // 1280×800, etc.) gets visibly mis-scaled.
  const slideW = slide.width || CANVAS_WIDTH
  const slideH = slide.height || CANVAS_HEIGHT
  const vw = viewport.w
  const vh = viewport.h
  // Use both viewport and the slide area (line 194 below reserves space
  // for the nav bar at the bottom). Subtracting a few px for the bottom
  // nav prevents the slide from being clipped behind the controls.
  const stageW = vw
  const stageH = Math.max(120, vh - 64)
  const scaleFactor = Math.min(stageW / slideW, stageH / slideH)

  // Sorted copy used by the React-rendered path (smart / pure-React mode).
  // The rawHtml path doesn't use this — it renders an iframe directly.
  const slideElements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)

  const transitionClass =
    transition === "fade"
      ? direction === "forward" ? "preso-anim-fade-in" : "preso-anim-fade-in"
      : transition === "slide"
        ? direction === "forward" ? "preso-anim-slide-in-right" : "preso-anim-slide-in-left"
        : transition === "zoom"
          ? "preso-anim-zoom-in"
          : ""

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          key={animKey}
          className={cn("relative shadow-2xl", transitionClass)}
          style={{
            // The wrapper is sized to the SLIDE'S scaled dimensions, not
            // a 16:9 letterbox. This way:
            //   - 4:3 slides don't get stretched into 16:9
            //   - 1080×1080 square slides don't get letterboxed
            //   - Any per-page size (set via the SLIDE SIZE control in
            //     PropertyPanel) renders correctly
            // The inner content (iframe or React elements) is sized to the
            // slide's native dimensions and then scaled by `scaleFactor`,
            // so `width * scaleFactor` and `height * scaleFactor` equal the
            // wrapper's size — no overflow, no letterboxing.
            width: slideW * scaleFactor,
            height: slideH * scaleFactor,
            background: slide.background,
            backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {slide.rawHtml ? (
            // rawHtml mode: render the iframe at its native slide dimensions
            // and scale it to fit the wrapper. No duplicate React elements —
            // the iframe already shows everything (text, images, layout) from
            // the original imported HTML.
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: slideW,
                height: slideH,
                transform: `scale(${scaleFactor})`,
                transformOrigin: "top left",
              }}
            >
              <iframe
                srcDoc={slide.rawHtml}
                sandbox="allow-same-origin allow-scripts"
                title={`Slide ${index + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                  background: "transparent",
                }}
              />
            </div>
          ) : (
            // Smart / pure-React mode: render slide elements directly.
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: slideW,
                height: slideH,
                transform: `scale(${scaleFactor})`,
              }}
            >
              {/* Master elements (rendered first = behind) */}
              {masterVisible && masterElements.length > 0 && (
                <>
                  {masterElements.slice().sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                    <PresentationElement key={`master-${el.id}`} el={el} exiting={exiting} />
                  ))}
                </>
              )}
              {slideElements.map((el) => (
                <PresentationElement key={`${el.id}-${animKey}`} el={el} exiting={exiting} />
              ))}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          disabled={index === 0}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed",
            !showControls && "opacity-0 pointer-events-none",
          )}
          title="Previous (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={next}
          disabled={index === slides.length - 1}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed",
            !showControls && "opacity-0 pointer-events-none",
          )}
          title="Next (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Click zones for navigation (left/right halves) — but skip when controls are visible to avoid blocking */}
        {!showControls && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer" onClick={prev} title="Click for previous" />
            <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer" onClick={next} title="Click for next" />
          </>
        )}

        {/* Top-right: transition indicator badge (visible when controls visible) */}
        {showControls && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span className="capitalize">{transition === "none" ? "No transition" : transition}</span>
              <button
                onClick={() => setTransition((t) => t === "none" ? "fade" : t === "fade" ? "slide" : t === "slide" ? "zoom" : "none")}
                className="ml-1 hover:text-white text-white/60"
                title="Cycle transition (T)"
              >
                ⇄
              </button>
            </div>
            {slide.notes && (
              <button
                onClick={() => setShowNotes((v) => !v)}
                className={cn(
                  "bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs flex items-center gap-1.5 transition-colors",
                  showNotes ? "text-amber-300 bg-amber-500/20" : "text-white/80 hover:text-white",
                )}
                title="Toggle speaker notes (S)"
              >
                <StickyNote className="w-3 h-3" />
                Notes
              </button>
            )}
          </div>
        )}

        {/* Speaker notes overlay */}
        {showNotes && slide.notes && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-[90%] bg-amber-50 dark:bg-amber-950/80 backdrop-blur-md border border-amber-200 dark:border-amber-800 rounded-lg shadow-2xl p-4 max-h-[40%] overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-2 text-amber-700 dark:text-amber-300">
              <StickyNote className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Speaker Notes</span>
              <span className="ml-auto text-[10px] text-amber-600/70 font-mono">
                {slide.notes.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
              {slide.notes}
            </p>
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div className={cn(
        "h-12 bg-black/80 backdrop-blur-sm border-t border-white/10 flex items-center justify-between px-4 text-white transition-all duration-300",
        !showControls && "opacity-0 translate-y-full pointer-events-none",
      )}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums">
            {index + 1} / {slides.length}
          </span>
          <span className="text-xs text-white/60 truncate max-w-xs">{slide.name}</span>
          <span className="text-xs text-white/40 flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" />
            {formatTime(elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Transition selector */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5 mr-2">
            {(["none", "fade", "slide", "zoom"] as TransitionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTransition(t)}
                className={cn(
                  "px-2 py-1 text-[10px] uppercase rounded transition-colors",
                  transition === t ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80",
                )}
                title={`${t === "none" ? "No" : t.charAt(0).toUpperCase() + t.slice(1)} transition`}
              >
                {t === "none" ? "Off" : t}
              </button>
            ))}
          </div>
          {/* Auto-play toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5",
              autoPlay ? "text-primary bg-primary/10" : "text-white hover:bg-white/10",
            )}
            onClick={() => setAutoPlay((v) => !v)}
            title="Auto-play (P)"
          >
            {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoPlay ? "Pause" : "Auto"}
          </Button>
          {slide.notes && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5",
                showNotes ? "text-amber-300 bg-amber-500/15" : "text-white hover:bg-white/10",
              )}
              onClick={() => setShowNotes((v) => !v)}
              title="Toggle speaker notes (S)"
            >
              <StickyNote className="w-4 h-4" />
              Notes
            </Button>
          )}
          <div className="relative flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 gap-1.5 rounded-r-none"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? "Sound" : "Muted"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 rounded-l-none px-1.5 border-l border-white/20"
              onClick={() => setShowSoundPicker(!showSoundPicker)}
              title="Choose transition sound"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showSoundPicker && (
              <div className="absolute bottom-full mb-2 right-0 w-44 bg-popover border rounded-lg shadow-xl p-1 z-50 animate-in fade-in zoom-in-95">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">
                  Transition Sound
                </p>
                {SOUND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSoundType(opt.value)
                      setSoundEnabled(true)
                      setShowSoundPicker(false)
                      // Preview the sound
                      switch (opt.value) {
                        case "click": playClickSound(); break
                        case "whoosh": playWhooshSound(); break
                        case "ding": playDingSound(); break
                        case "pop": playPopSound(); break
                        case "chime": playChimeSound(); break
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors text-left",
                      soundType === opt.value && "bg-accent font-medium",
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-[9px] text-muted-foreground">{opt.desc}</span>
                    </div>
                    {soundType === opt.value && (
                      <span className="text-[10px] text-primary">●</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 gap-1.5"
            onClick={toggleFullscreen}
            title="Toggle fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 gap-1.5"
            onClick={() => onOpenChange(false)}
            title="Exit presentation (Esc)"
          >
            <X className="w-4 h-4" />
            Exit
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((index + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Auto-play progress indicator (thin bar that fills over 5s) */}
      {autoPlay && (
        <div className="h-0.5 bg-white/5 absolute bottom-0 left-0 right-0">
          <div
            key={index}
            className="h-full bg-primary/80"
            style={{ animation: "preso-autoplay-fill 5s linear forwards" }}
          />
        </div>
      )}
    </div>
  )
}

// ---------- Presentation Element renderer ----------
// Map entrance animation type → CSS keyframe name (see globals.css).
const ENTRANCE_KEYFRAMES: Record<string, string> = {
  "fade": "el-entrance-fade",
  "slide-up": "el-entrance-slide-up",
  "slide-down": "el-entrance-slide-down",
  "slide-left": "el-entrance-slide-left",
  "slide-right": "el-entrance-slide-right",
  "zoom": "el-entrance-zoom",
  "bounce": "el-entrance-bounce",
  "spin": "el-entrance-spin",
}
// Map exit animation type → CSS keyframe name.
const EXIT_KEYFRAMES: Record<string, string> = {
  "fade": "el-exit-fade",
  "slide-up": "el-exit-slide-up",
  "slide-down": "el-exit-slide-down",
  "slide-left": "el-exit-slide-left",
  "slide-right": "el-exit-slide-right",
  "zoom": "el-exit-zoom",
  "bounce": "el-exit-bounce",
  "spin": "el-exit-spin",
}
// Map emphasis animation type → CSS keyframe name.
const EMPHASIS_KEYFRAMES: Record<string, string> = {
  "pulse": "el-emphasis-pulse",
  "spin-continuous": "el-emphasis-spin-continuous",
  "wiggle": "el-emphasis-wiggle",
  "bounce-continuous": "el-emphasis-bounce-continuous",
  "glow": "el-emphasis-glow",
  "shake": "el-emphasis-shake",
  "flash": "el-emphasis-flash",
}

function PresentationElement({ el, exiting }: { el: EditorElement; exiting: boolean }) {
  const entrance = el.entrance && el.entrance !== "none" ? el.entrance : null
  const entranceDuration = el.entranceDuration ?? 600
  const entranceDelay = el.entranceDelay ?? 0
  const exitAnim = el.exit && el.exit !== "none" ? el.exit : null
  const exitDuration = el.exitDuration ?? 600
  const exitDelay = el.exitDelay ?? 0
  const emphasisAnim = el.emphasis && el.emphasis !== "none" && !exiting ? el.emphasis : null
  const emphasisDuration = el.emphasisDuration ?? 1000
  // When exiting, prefer the exit animation; otherwise use entrance.
  const activeAnim = exiting && exitAnim ? exitAnim : entrance
  const activeDuration = exiting && exitAnim ? exitDuration : entranceDuration
  const activeDelay = exiting && exitAnim ? exitDelay : entranceDelay
  const activeKeyframe = exiting && exitAnim
    ? EXIT_KEYFRAMES[exitAnim]
    : (entrance ? ENTRANCE_KEYFRAMES[entrance] : null)
  const activeClass = exiting && exitAnim ? "el-exit" : (entrance ? "el-entrance" : null)
  // The entrance animation uses CSS transform/opacity. To avoid clashing
  // with the element's own `transform: rotate(...)`, we wrap the element
  // in an outer div that carries the animation, and put the rotation on
  // the inner div. The outer div is positioned; the inner div is sized.
  const animationStyle = activeAnim && activeKeyframe
    ? ({
        "--el-anim-name": activeKeyframe,
        "--el-anim-duration": `${activeDuration}ms`,
        "--el-anim-delay": `${activeDelay}ms`,
      } as React.CSSProperties)
    : {}
  // Emphasis style — applied to the INNER div so it loops independently
  // of the entrance/exit animation on the outer div.
  const emphasisKeyframe = emphasisAnim ? EMPHASIS_KEYFRAMES[emphasisAnim] : null
  const emphasisStyle = emphasisAnim && emphasisKeyframe
    ? ({
        "--el-anim-name": emphasisKeyframe,
        "--el-anim-duration": `${emphasisDuration}ms`,
      } as React.CSSProperties)
    : {}
  return (
    <div
      className={activeClass || undefined}
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        ...animationStyle,
      }}
    >
    <div
      className={emphasisAnim ? "el-emphasis" : undefined}
      style={{
        width: "100%",
        height: "100%",
        transform: `rotate(${el.rotation}deg)`,
        background: el.fill,
        borderRadius: el.borderRadius,
        border: el.strokeWidth && el.stroke && el.stroke !== "transparent"
          ? `${el.strokeWidth}px solid ${el.stroke}`
          : "none",
        boxShadow: el.shadow
          ? `${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur || 24}px ${el.shadowColor || "rgba(15,23,42,0.15)"}`
          : "none",
        overflow: "hidden",
        ...emphasisStyle,
      }}
    >
      {el.type === "text" && (
        <div
          style={{
            width: "100%",
            height: "100%",
            fontSize: (el as any).fontSize,
            fontFamily: (el as any).fontFamily,
            fontWeight: (el as any).fontWeight,
            fontStyle: (el as any).fontStyle,
            textDecoration: (el as any).textDecoration,
            textAlign: (el as any).textAlign,
            color: (el as any).color,
            lineHeight: (el as any).lineHeight,
            letterSpacing: (el as any).letterSpacing,
            padding: (el as any).padding,
            display: "flex",
            flexDirection: "column",
            justifyContent: (el as any).verticalAlign === "top"
              ? "flex-start"
              : (el as any).verticalAlign === "bottom"
                ? "flex-end"
                : "center",
            background: "transparent",
            border: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {(el as any).text}
        </div>
      )}
      {el.type === "ellipse" && (
        <div style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
      )}
      {el.type === "image" && (el as any).src && (el as any).src.trim() && (
        <img
          src={(el as any).src}
          alt={(el as any).alt || ""}
          style={{ width: "100%", height: "100%", objectFit: (el as any).objectFit }}
        />
      )}
      {el.type === "triangle" && (
        <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <polygon
            points={`${el.width / 2},0 ${el.width},${el.height} 0,${el.height}`}
            fill={el.fill || "#f59e0b"}
            stroke={el.stroke || "transparent"}
            strokeWidth={el.strokeWidth || 0}
          />
        </svg>
      )}
      {el.type === "line" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: el.height / 2 - (el.strokeWidth || 2) / 2,
            width: "100%",
            height: el.strokeWidth || 2,
            background: el.stroke || "#0f172a",
          }}
        />
      )}
      {el.type === "container" && (
        <div
          style={{ width: "100%", height: "100%" }}
          dangerouslySetInnerHTML={{ __html: (el as any).html || "" }}
        />
      )}
    </div>
    </div>
  )
}
