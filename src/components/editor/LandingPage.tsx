"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "./ThemeToggle"
import { toast } from "sonner"
import {
  Sparkles, MousePointer2, RotateCcw, Code2, Layers, Presentation,
  Upload, Download, Play, ArrowRight, Zap, Crown, History, Clock, FileText,
  Star, Check, ChevronRight, Wand2, Target, Gauge, FolderUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecentProject } from "@/lib/recent-projects"
import { ImportLauncher } from "./ImportLauncher"
import type { Slide } from "@/types/editor"
import type { ParsedFile } from "@/lib/html-io"
import { getAiHistoryIndex, loadAiHistory, type AiHistoryIndexEntry } from "@/lib/ai-history"
import { useEditor } from "@/store/editor-store"

interface Props {
  onStart?: () => void
  /** Toolbar/AI button triggers: caller decides what to do (typically
   *  `setView('editor')` + `setPendingAiGenerate(true)`). */
  onImport?: () => void
  hasSavedSession: boolean
  onRestoreSession: () => void
  recentProjects?: RecentProject[]
  onOpenRecent?: (project: RecentProject) => void
  /**
   * Single import handoff — used by the <ImportLauncher/> rendered
   * below and the drop-anywhere handler on the hero. By design, both
   * paths converge here so any change to import behavior touches one
   * callback, not two parallel handlers.
   */
  onSlidesLoaded: (slides: Slide[], pendingFiles: ParsedFile[]) => void
  onAiGenerate?: () => void
}

export function LandingPage({
  onStart,
  onImport,
  hasSavedSession,
  onRestoreSession,
  recentProjects = [],
  onOpenRecent,
  onSlidesLoaded,
  onAiGenerate,
}: Props) {
  const [aiHistory, setAiHistory] = useState<AiHistoryIndexEntry[]>([])
  const { loadProject } = useEditor()

  useEffect(() => {
    setAiHistory(getAiHistoryIndex())
  }, [])

  async function handleLoadAiHistory(entry: AiHistoryIndexEntry) {
    const data = await loadAiHistory(entry.id)
    if (!data || !data.slides || data.slides.length === 0) {
      toast.error("History data not found. It may have expired.")
      return
    }
    loadProject({
      slides: data.slides as Slide[],
      currentSlideId: (data.slides[0] as Slide)?.id || "",
    })
    toast.success(`Loaded ${entry.slideCount} slide(s) from AI history`)
    onStart?.()
  }

  // Mouse-tracking spotlight for feature cards — sets CSS custom
  // properties on the hovered card so the ::before pseudo-element
  // (see `.sf-spotlight-card` in globals.css) can render a radial
  // gradient that follows the cursor. Kept as a plain function so it
  // stays co-located with the cards that consume it.
  function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty(
      "--card-mouse-x",
      `${e.clientX - rect.left}px`,
    )
    e.currentTarget.style.setProperty(
      "--card-mouse-y",
      `${e.clientY - rect.top}px`,
    )
  }

  const features = [
    {
      icon: MousePointer2,
      title: "Drag & Snap",
      desc: "Move elements with smart alignment guides that snap to edges, centers, and other elements — just like PowerPoint.",
      color: "from-pink-500 to-rose-600",
      glow: "rgba(244, 63, 94, 0.16)",
    },
    {
      icon: RotateCcw,
      title: "Resize & Rotate",
      desc: "Eight resize handles plus a rotation grip. Shift to lock aspect ratio or snap to 15° increments.",
      color: "from-purple-500 to-violet-600",
      glow: "rgba(168, 85, 247, 0.16)",
    },
    {
      icon: Code2,
      title: "HTML Import",
      desc: "Paste HTML, upload files, or import an entire folder. Smart mode extracts editable elements automatically.",
      color: "from-fuchsia-500 to-purple-600",
      glow: "rgba(217, 70, 239, 0.16)",
    },
    {
      icon: Layers,
      title: "Layers & Groups",
      desc: "Full layer management with search, lock, visibility. Group elements and resize them proportionally.",
      color: "from-rose-500 to-fuchsia-600",
      glow: "rgba(225, 29, 72, 0.16)",
    },
    {
      icon: History,
      title: "History Timeline",
      desc: "Visual undo/redo history with labeled actions and timestamps. Jump to any point in your edit history.",
      color: "from-pink-500 to-fuchsia-600",
      glow: "rgba(236, 72, 153, 0.16)",
    },
    {
      icon: Presentation,
      title: "Presentation Mode",
      desc: "Fullscreen slideshow with transitions, auto-play, speaker notes, and elapsed timer.",
      color: "from-violet-500 to-purple-600",
      glow: "rgba(139, 92, 246, 0.16)",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Background — sophisticated layered gradient + mesh */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow — top right, warm */}
        <div className="absolute -top-48 -right-48 w-[44rem] h-[44rem] rounded-full bg-gradient-to-br from-rose-500/20 via-pink-500/12 to-purple-600/10 blur-[120px] animate-pulse-slow" />
        {/* Secondary glow — bottom left, cool */}
        <div
          className="absolute -bottom-48 -left-48 w-[44rem] h-[44rem] rounded-full bg-gradient-to-tr from-violet-600/14 via-fuchsia-500/8 to-rose-500/10 blur-[120px] animate-pulse-slow"
          style={{ animationDelay: "3s" }}
        />
        {/* Accent glow — center, subtle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-fuchsia-400/8 to-rose-400/8 blur-[100px]" />
        {/* Fine dot grid texture — very subtle */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Top fade — creates depth at the top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/40 ring-1 ring-white/20">
              S
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base tracking-tight">SlideForge</span>
              <span className="text-[11px] text-muted-foreground/70 hidden sm:inline font-medium uppercase tracking-wider">
                HTML Slide Editor
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline px-3 py-1.5 rounded-md hover:bg-muted/50"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline px-3 py-1.5 rounded-md hover:bg-muted/50"
            >
              How it works
            </a>
            <ThemeToggle />
            <Button size="sm" variant="outline" onClick={onStart} className="gap-1.5 ml-1 h-8">
              Open Editor <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative z-10 flex-1 flex items-center justify-center px-6 pt-20 pb-16 transition-colors">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border border-pink-500/30 text-xs font-semibold text-pink-600 dark:text-pink-400 mb-8 landing-animate-in shadow-md shadow-pink-500/10 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500"></span>
            </span>
            Powered by AI, refined by you
          </div>

          {/* Title — clearer, more direct value proposition. Two-line
              treatment keeps the gradient on the value-claim half so
              the eye lands on "powered by AI" first. */}
          <h1
            className="text-5xl sm:text-6xl md:text-[5rem] font-bold tracking-tight mb-6 leading-[1.05] landing-animate-in"
            style={{ animationDelay: "100ms" }}
          >
            <span className="block text-foreground">Precision slide editing,</span>
            <span className="block bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              powered by AI.
            </span>
          </h1>

          {/* Subtitle — stronger hierarchy: primary line (heavier) +
              supporting line (lighter) gives a clear two-tier read. */}
          <p
            className="text-lg sm:text-xl text-foreground/75 font-medium max-w-2xl mx-auto mb-2 landing-animate-in leading-relaxed"
            style={{ animationDelay: "250ms" }}
          >
            Fine-tune AI-generated slides with a PowerPoint-like editor
          </p>
          <p
            className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto mb-10 landing-animate-in leading-relaxed"
            style={{ animationDelay: "350ms" }}
          >
            Drag, snap, resize, and export clean production-ready markup. No code required.
          </p>

          {/* CTA buttons — 3-column equal-width row on ≥ sm. All three are
              flex-1 + sm:max-w-[220px] so they stay perfectly aligned even
              when AI Generate is hidden. The hero's accent palette is
              rose → pink → purple, so all three buttons share the same
              gradient family:
                • Start Editing — rose-500 → purple-600 (the primary CTA)
                • Import HTML   — rose-500 → pink-500     (mid-fill, warm)
                • AI Generate   — violet-500 → fuchsia-600  (cool, alt)
              The sf-shimmer-btn class adds a one-shot light sweep on
              hover for the two primary gradient buttons. */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-10 landing-animate-in"
            style={{ animationDelay: "450ms" }}
          >
            <Button
              size="lg"
              onClick={onStart}
              className="sf-shimmer-btn group gap-2 h-12 px-6 text-base bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-200 border-0 hover:scale-[1.02] active:scale-[0.98] rounded-xl w-full sm:flex-1 sm:max-w-[220px] justify-center"
            >
              <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
              Start Editing
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>

            {/* Import HTML — single entry into the unified <ImportHtmlDialog/>
                shared with the editor toolbar. Stays the only import path;
                file / folder / paste choice lives inside the dialog. */}
            <ImportLauncher
              onSlidesLoaded={onSlidesLoaded}
              variant="landing"
              label="Import HTML"
              icon="file"
              className="w-full sm:flex-1 sm:max-w-[220px] [&_button]:h-12 [&_button]:px-6 [&_button]:text-base [&_button]:rounded-xl [&_button]:gap-2"
            />

            {onAiGenerate && (
              <Button
                size="lg"
                onClick={onAiGenerate}
                className="sf-shimmer-btn group gap-2 h-12 px-6 text-base bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 transition-all duration-200 border-0 hover:scale-[1.02] active:scale-[0.98] rounded-xl w-full sm:flex-1 sm:max-w-[220px] justify-center"
              >
                <Wand2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                AI Generate
              </Button>
            )}
          </div>

          {/* Restore session */}
          {hasSavedSession && (
            <button
              onClick={onRestoreSession}
              className="group text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 mb-8 landing-animate-in px-3 py-1.5 rounded-full hover:bg-muted/50"
              style={{ animationDelay: "550ms" }}
            >
              <History className="w-3.5 h-3.5 transition-transform group-hover:-rotate-12" />
              Restore your previous session
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* Stats row — refined with better separators */}
          <div
            className="flex items-center justify-center gap-6 sm:gap-8 text-sm text-muted-foreground landing-animate-in"
            style={{ animationDelay: "650ms" }}
          >
            <div className="flex items-center gap-2 transition-colors hover:text-foreground">
              <Gauge className="w-4 h-4 text-rose-500" />
              <span className="font-medium">50-step undo</span>
            </div>
            <div className="w-px h-5 bg-border/60" />
            <div className="flex items-center gap-2 transition-colors hover:text-foreground">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="font-medium">7 element types</span>
            </div>
            <div className="w-px h-5 bg-border/60" />
            <div className="flex items-center gap-2 transition-colors hover:text-foreground">
              <Download className="w-4 h-4 text-fuchsia-500" />
              <span className="font-medium">HTML / PDF / PNG</span>
            </div>
          </div>

          {/* Slide preview mockup */}
          <div className="mt-16 landing-animate-in" style={{ animationDelay: "700ms" }}>
            <div className="relative max-w-2xl mx-auto">
              {/* Glow effect behind the card */}
              <div className="absolute -inset-8 bg-gradient-to-r from-rose-500/25 via-fuchsia-500/20 to-purple-500/25 blur-[80px] rounded-[2rem] animate-pulse-slow" />
              {/* The slide mockup */}
              <div className="relative rounded-2xl border border-border/60 bg-card shadow-2xl shadow-purple-900/10 overflow-hidden transition-transform hover:scale-[1.015] duration-500 ring-1 ring-white/5">
                {/* Window chrome */}
                <div className="h-10 bg-muted/50 backdrop-blur-sm border-b border-border/40 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70 hover:bg-red-400 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/70 hover:bg-amber-400 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-green-400/70 hover:bg-green-400 transition-colors" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="text-[10px] text-muted-foreground/80 font-mono bg-background/60 px-3 py-0.5 rounded-md border border-border/40">
                      slideforge.app — Welcome Slide
                    </div>
                  </div>
                </div>
                {/* Slide content */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-6 sm:p-8 overflow-hidden">
                  {/* Decorative dot grid */}
                  <div
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  {/* Decorative concentric circles */}
                  <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full border border-white/15" />
                  <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full border border-white/10" />
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm" />
                  {/* Badge */}
                  <div className="relative inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    <span className="text-[9px] font-bold text-white/95 uppercase tracking-widest">
                      Q3 Report
                    </span>
                  </div>
                  {/* Title */}
                  <div className="relative text-white font-bold text-2xl sm:text-4xl mb-2 leading-tight tracking-tight">
                    Revenue Growth
                  </div>
                  {/* Subtitle */}
                  <div className="relative text-white/70 text-xs sm:text-sm mb-5 sm:mb-6 max-w-[70%] font-medium">
                    Quarterly performance analysis &amp; projections
                  </div>
                  {/* Three metric cards — look like real slide content with
                      a value + label instead of placeholder bars. */}
                  <div className="relative flex gap-2 sm:gap-3">
                    {[
                      { color: "from-pink-400 to-rose-500", value: "+24%", label: "Revenue" },
                      { color: "from-purple-400 to-violet-500", value: "+18%", label: "Users" },
                      { color: "from-fuchsia-400 to-pink-500", value: "+31%", label: "Retention" },
                    ].map((card, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-white/95 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 shadow-xl hover:scale-105 hover:-translate-y-0.5 transition-transform"
                        style={{ transitionDelay: `${i * 60}ms` }}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-md bg-gradient-to-br mb-2 shadow-sm ring-1 ring-white/40",
                            card.color,
                          )}
                        />
                        <div className="text-slate-900 font-bold text-sm">{card.value}</div>
                        <div className="text-slate-500 text-[9px] uppercase tracking-wider font-medium">
                          {card.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Selection handles on first card */}
                  <div className="absolute top-[62%] left-[7%] w-2.5 h-2.5 bg-white border-2 border-pink-400 rounded-sm shadow-md" />
                  <div className="absolute top-[62%] right-[77%] w-2.5 h-2.5 bg-white border-2 border-pink-400 rounded-sm shadow-md" />
                  {/* Alignment guide line — soft glow */}
                  <div className="absolute top-[58%] left-[7%] right-[23%] h-px bg-pink-300/70 shadow-[0_0_4px_rgba(244,114,182,0.6)]" />
                </div>
              </div>
              {/* Floating annotation badges — gentle float animation */}
              <div
                className="absolute -left-4 top-1/3 bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-lg shadow-rose-500/10 px-3 py-2 flex items-center gap-2 text-[11px] font-medium animate-float-y hidden sm:flex"
                style={{ animationDelay: "1s" }}
              >
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 shadow-sm shadow-rose-500/50" />
                <span>Drag &amp; Snap</span>
              </div>
              <div
                className="absolute -right-4 top-2/3 bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-lg shadow-purple-500/10 px-3 py-2 flex items-center gap-2 text-[11px] font-medium animate-float-y hidden sm:flex"
                style={{ animationDelay: "2.5s" }}
              >
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500 shadow-sm shadow-purple-500/50" />
                <span>Live Preview</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <section className="relative z-10 px-6 py-12 border-t">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Recent Projects</h2>
              <span className="text-xs text-muted-foreground ml-1">
                {recentProjects.length} project{recentProjects.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentProjects.slice(0, 12).map((project) => (
                <button
                  key={project.id}
                  onClick={() => onOpenRecent?.(project)}
                  className="group text-left rounded-xl border bg-card hover:shadow-md hover:border-border transition-all hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                      {project.slideCount} slide{project.slideCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{project.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(project.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* AI Generation History */}
      {aiHistory.length > 0 && (
        <section className="relative z-10 px-6 py-12 border-t">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Wand2 className="w-4 h-4 text-violet-500" />
              <h2 className="text-lg font-semibold">AI Generation History</h2>
              <span className="text-xs text-muted-foreground ml-1">
                {aiHistory.length} generation{aiHistory.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {aiHistory.slice(0, 9).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleLoadAiHistory(entry)}
                  className="group text-left rounded-xl border bg-card hover:shadow-md hover:border-border transition-all hover:-translate-y-0.5 overflow-hidden p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shrink-0 ring-1 ring-white/20">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{entry.templateName}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.slideCount} slides · {new Date(entry.generatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{entry.markdownPreview}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features grid */}
      <section id="features" className="relative z-10 px-6 py-24 border-t bg-muted/15">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-5">
              <Wand2 className="w-3 h-3" />
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
                craft slides
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
              Powerful editing tools designed for speed and precision, with a familiar PowerPoint-like workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  onMouseMove={handleCardMouseMove}
                  style={{ "--card-glow": feature.glow } as React.CSSProperties}
                  className="sf-spotlight-card group relative p-7 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 hover:border-border transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Top accent line on hover */}
                  <div
                    className={cn(
                      "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      feature.color,
                    )}
                  />
                  <div
                    className={cn(
                      "relative w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ring-1 ring-white/20",
                      feature.color,
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {/* Inner glossy sheen */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                  </div>
                  <h3 className="relative font-semibold text-base mb-2 tracking-tight">{feature.title}</h3>
                  <p className="relative text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 px-6 py-24 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
              <Zap className="w-3 h-3" />
              Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">From AI to polished in 3 steps</h2>
            <p className="text-muted-foreground">No learning curve — if you&apos;ve used PowerPoint, you know SlideForge.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: "1", icon: Code2, title: "Import HTML", desc: "Paste from ChatGPT, Claude, or upload files/folders", color: "from-pink-500 to-rose-600" },
              { num: "2", icon: MousePointer2, title: "Edit visually", desc: "Drag, resize, restyle with live preview", color: "from-purple-500 to-violet-600" },
              { num: "3", icon: Download, title: "Export anywhere", desc: "Clean HTML, print-ready PDF, or PNG image", color: "from-fuchsia-500 to-purple-600" },
            ].map((step, idx) => {
              const Icon = step.icon
              return (
                <div key={idx} className="relative">
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
                  )}
                  <div className="relative flex flex-col items-center text-center group">
                    <div
                      className={cn(
                        "relative w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ring-1 ring-white/20",
                        step.color,
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                      {/* Inner glossy sheen */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-primary/20 text-primary text-xs font-bold flex items-center justify-center shadow-sm">
                        {step.num}
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1.5 text-base">{step.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feature highlights bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "Instant", value: "Real-time preview", color: "text-pink-500" },
              { icon: Layers, label: "Organized", value: "Layer management", color: "text-purple-500" },
              { icon: History, label: "Safe", value: "50-step undo", color: "text-fuchsia-500" },
              { icon: Presentation, label: "Present", value: "Fullscreen mode", color: "text-violet-500" },
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="flex items-center gap-3 p-4 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-md transition-all">
                  <div className={cn("w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0", item.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-semibold truncate">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-24 border-t bg-gradient-to-b from-transparent to-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-600 dark:text-amber-400 mb-6">
            <Crown className="w-3 h-3" />
            Free &amp; open workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Ready to forge your slides?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            No signup required. Your work auto-saves to your browser. Export clean HTML anytime.
          </p>

          {/* Checklist */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" /> No signup
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" /> Auto-saves locally
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" /> Export to HTML/PDF/PNG
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" /> 50-step undo
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={onStart}
              className="sf-shimmer-btn gap-2 h-12 px-8 shadow-lg shadow-primary/25 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 rounded-xl"
            >
              <Play className="w-4 h-4 fill-white" />
              Launch Editor
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onImport}
              className="gap-2 h-12 px-8 border-2 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] rounded-xl"
            >
              <Upload className="w-4 h-4" />
              Import Existing HTML
            </Button>
          </div>
        </div>
      </section>

      {/* Footer — three-column layout with brand, product, and resources */}
      <footer className="relative z-10 border-t border-border/60 px-6 py-10 bg-muted/20 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand column */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shadow-md shadow-purple-500/30 ring-1 ring-white/20">
                  S
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                </div>
                <span className="font-bold text-sm tracking-tight">SlideForge</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                The precision slide editor for AI-assisted decks. Fine-tune every pixel, then export clean markup.
              </p>
            </div>
            {/* Product column */}
            <div>
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
                </li>
                <li>
                  <button onClick={onStart} className="hover:text-foreground transition-colors">Open Editor</button>
                </li>
              </ul>
            </div>
            {/* Resources column */}
            <div>
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-3">Resources</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  All systems operational
                </li>
                <li>Built with Next.js &amp; TypeScript</li>
                <li>Auto-saves to your browser</li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground/70">
            <span>© 2026 SlideForge. Open workflow for AI-assisted slide design.</span>
            <div className="flex items-center gap-4">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
