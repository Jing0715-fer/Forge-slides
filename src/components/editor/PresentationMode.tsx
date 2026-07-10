"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import type { EditorElement } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Expand, Minimize, Sparkles, Pause, Play, Clock, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"

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
    if (clamped !== index) {
      setDirection(dir)
      setAnimKey((k) => k + 1)
    }
    setIndex(clamped)
    if (slides[clamped]) {
      setCurrentSlide(slides[clamped].id)
    }
  }, [slides, setCurrentSlide, index])

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
                    <PresentationElement key={`master-${el.id}`} el={el} />
                  ))}
                </>
              )}
              {slideElements.map((el) => (
                <PresentationElement key={el.id} el={el} />
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
function PresentationElement({ el }: { el: EditorElement }) {
  return (
    <div
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        opacity: el.opacity,
        background: el.fill,
        borderRadius: el.borderRadius,
        border: el.strokeWidth && el.stroke && el.stroke !== "transparent"
          ? `${el.strokeWidth}px solid ${el.stroke}`
          : "none",
        boxShadow: el.shadow
          ? `${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur || 24}px ${el.shadowColor || "rgba(15,23,42,0.15)"}`
          : "none",
        overflow: "hidden",
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
  )
}
