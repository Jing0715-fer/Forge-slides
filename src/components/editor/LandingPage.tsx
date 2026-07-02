"use client"

import React, { useState, useEffect, type RefObject } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { toast } from "sonner"
import {
  Sparkles, MousePointer2, RotateCcw, Code2, Layers, Presentation,
  Upload, Download, Play, ArrowRight, Zap, Crown, History, Clock, FileText,
  Star, Check, ChevronRight, Wand2, Target, Gauge, FolderUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecentProject } from "@/lib/recent-projects"
import { getAiHistoryIndex, loadAiHistory, type AiHistoryIndexEntry } from "@/lib/ai-history"
import type { Slide } from "@/types/editor"
import { useEditor } from "@/store/editor-store"

interface Props {
  onStart: () => void
  onImport: () => void
  hasSavedSession: boolean
  onRestoreSession: () => void
  recentProjects?: RecentProject[]
  onOpenRecent?: (project: RecentProject) => void
  onFileImport?: (files: FileList) => void
  fileInputRef?: RefObject<HTMLInputElement | null>
  onFolderImport?: (files: FileList) => void
  folderInputRef?: RefObject<HTMLInputElement | null>
  onAiGenerate?: () => void
}

export function LandingPage({ onStart, onImport, hasSavedSession, onRestoreSession, recentProjects = [], onOpenRecent, onFileImport, fileInputRef, onFolderImport, folderInputRef, onAiGenerate }: Props) {
  const [aiHistory, setAiHistory] = useState<AiHistoryIndexEntry[]>([])
  const { loadProject } = useEditor()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    onStart()
  }
  const features = [
    {
      icon: MousePointer2,
      title: "Drag & Snap",
      desc: "Move elements with smart alignment guides that snap to edges, centers, and other elements — just like PowerPoint.",
      color: "from-pink-500 to-rose-600",
    },
    {
      icon: RotateCcw,
      title: "Resize & Rotate",
      desc: "Eight resize handles plus a rotation grip. Shift to lock aspect ratio or snap to 15° increments.",
      color: "from-purple-500 to-violet-600",
    },
    {
      icon: Code2,
      title: "HTML Import",
      desc: "Paste HTML, upload files, or import an entire folder. Smart mode extracts editable elements automatically.",
      color: "from-fuchsia-500 to-purple-600",
    },
    {
      icon: Layers,
      title: "Layers & Groups",
      desc: "Full layer management with search, lock, visibility. Group elements and resize them proportionally.",
      color: "from-indigo-500 to-purple-600",
    },
    {
      icon: History,
      title: "History Timeline",
      desc: "Visual undo/redo history with labeled actions and timestamps. Jump to any point in your edit history.",
      color: "from-pink-500 to-fuchsia-600",
    },
    {
      icon: Presentation,
      title: "Presentation Mode",
      desc: "Fullscreen slideshow with transitions, auto-play, speaker notes, and elapsed timer.",
      color: "from-violet-500 to-indigo-600",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Background — sophisticated layered gradient + mesh */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow — top right, warm */}
        <div className="absolute -top-48 -right-48 w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-purple-600/10 blur-[120px] animate-pulse-slow" />
        {/* Secondary glow — bottom left, cool */}
        <div className="absolute -bottom-48 -left-48 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-violet-600/12 via-indigo-500/8 to-fuchsia-600/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: "3s" }} />
        {/* Accent glow — center, subtle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-fuchsia-400/6 to-rose-400/6 blur-[100px]" />
        {/* Fine dot grid texture — very subtle */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.035]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }} />
        {/* Top fade — creates depth at the top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/40 ring-1 ring-white/20">
              S
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
      <section className="relative z-10 flex-1 flex items-center justify-center px-6 pt-16 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border border-pink-500/30 text-xs font-semibold text-pink-600 dark:text-pink-400 mb-7 landing-animate-in shadow-md shadow-pink-500/10 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500"></span>
            </span>
            Powered by AI, refined by you
          </div>

          {/* Title — two-line with mixed treatment for sophistication */}
          <h1 className="text-5xl sm:text-6xl md:text-[5.5rem] font-bold tracking-tight mb-4 leading-[1.05] landing-animate-in" style={{ animationDelay: "100ms" }}>
            <span className="block text-foreground">Forge slides</span>
            <span className="block bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              with surgical precision
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-foreground/70 font-medium max-w-2xl mx-auto mb-2 landing-animate-in leading-relaxed" style={{ animationDelay: "250ms" }}>
            Fine-tune AI-generated slides with a PowerPoint-like editor
          </p>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8 landing-animate-in leading-relaxed" style={{ animationDelay: "350ms" }}>
            Drag, snap, resize, and export clean production-ready markup. No code required.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 landing-animate-in" style={{ animationDelay: "450ms" }}>
            <Button
              size="lg"
              onClick={onStart}
              className="group gap-2 h-12 px-8 text-base bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-all border-0 hover:scale-[1.02] active:scale-[0.98] rounded-xl"
            >
              <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
              Start Editing
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            {onAiGenerate && (
              <Button
                size="lg"
                onClick={onAiGenerate}
                className="group gap-2 h-12 px-8 text-base bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 transition-all border-0 hover:scale-[1.02] active:scale-[0.98] rounded-xl"
              >
                <Wand2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                AI Generate
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => { if (onFolderImport && folderInputRef) { folderInputRef.current?.click() } else if (onFileImport && fileInputRef) { fileInputRef.current?.click() } else { onImport() } }}
              className="group gap-2 h-12 px-8 text-base border-2 hover:bg-muted/40 hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl"
              title="Select a folder containing HTML slides (supports multi-file decks with index.html viewers)"
            >
              <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              Import HTML
            </Button>
            {onFolderImport && folderInputRef && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
                className="group gap-2 h-12 px-8 text-base border-2 hover:bg-muted/40 hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                title="Import a folder of HTML files (one slide per file)"
              >
                <FolderUp className="w-4 h-4 transition-transform group-hover:scale-110" />
                Import Folder
              </Button>
            )}
          </div>

          {/* Folder drag-and-drop — visible on the entire landing hero */}
          {onFolderImport && folderInputRef && (
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error — webkitdirectory is a non-standard but widely supported attribute
              webkitdirectory=""
              directory=""
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFolderImport(e.target.files)
                }
                e.target.value = ""
              }}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
          )}

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
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground landing-animate-in" style={{ animationDelay: "650ms" }}>
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
              <div className="absolute -inset-8 bg-gradient-to-r from-rose-500/20 via-fuchsia-500/15 to-purple-500/20 blur-[80px] rounded-[2rem] animate-pulse-slow" />
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
                    <div className="text-[10px] text-muted-foreground/80 font-mono bg-background/60 px-3 py-0.5 rounded-md border border-border/40">slideforge.app — Welcome Slide</div>
                  </div>
                </div>
                {/* Slide content */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-6 sm:p-8 overflow-hidden">
                  {/* Decorative grid */}
                  <div className="absolute inset-0 opacity-[0.15]" style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }} />
                  {/* Decorative circle */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full border border-white/20" />
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full border border-white/10" />
                  {/* Badge */}
                  <div className="relative inline-block mb-3">
                    <div className="text-[9px] font-bold text-white/90 uppercase tracking-widest bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                      Q3 Report
                    </div>
                  </div>
                  {/* Title */}
                  <div className="relative text-white font-bold text-xl sm:text-3xl mb-1.5 leading-tight tracking-tight">
                    Revenue Growth
                  </div>
                  {/* Subtitle */}
                  <div className="relative text-white/75 text-xs sm:text-sm mb-5 sm:mb-6 max-w-[70%]">
                    Quarterly performance analysis & projections
                  </div>
                  {/* Three cards */}
                  <div className="relative flex gap-2 sm:gap-2.5">
                    <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-2.5 shadow-xl hover:scale-105 hover:-translate-y-0.5 transition-transform">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br from-pink-400 to-rose-500 mb-1.5 shadow-sm" />
                      <div className="h-1.5 w-10 bg-slate-800 rounded mb-1" />
                      <div className="h-1 w-14 bg-slate-300 rounded" />
                    </div>
                    <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-2.5 shadow-xl hover:scale-105 hover:-translate-y-0.5 transition-transform" style={{ transitionDelay: "50ms" }}>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br from-purple-400 to-violet-500 mb-1.5 shadow-sm" />
                      <div className="h-1.5 w-10 bg-slate-800 rounded mb-1" />
                      <div className="h-1 w-14 bg-slate-300 rounded" />
                    </div>
                    <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-2.5 shadow-xl hover:scale-105 hover:-translate-y-0.5 transition-transform" style={{ transitionDelay: "100ms" }}>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br from-indigo-400 to-blue-500 mb-1.5 shadow-sm" />
                      <div className="h-1.5 w-10 bg-slate-800 rounded mb-1" />
                      <div className="h-1 w-14 bg-slate-300 rounded" />
                    </div>
                  </div>
                  {/* Selection handles on first card */}
                  <div className="absolute top-[62%] left-[7%] w-2.5 h-2.5 bg-white border-2 border-pink-400 rounded-sm shadow-md" />
                  <div className="absolute top-[62%] right-[77%] w-2.5 h-2.5 bg-white border-2 border-pink-400 rounded-sm shadow-md" />
                  {/* Alignment guide line */}
                  <div className="absolute top-[58%] left-[7%] right-[23%] h-px bg-pink-400/50" />
                </div>
              </div>
              {/* Floating annotation badges */}
              <div className="absolute -left-3 top-1/3 bg-card border border-border/60 rounded-lg shadow-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-medium animate-pulse-slow hidden sm:flex" style={{ animationDelay: "1s" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Drag & Snap</span>
              </div>
              <div className="absolute -right-3 top-2/3 bg-card border border-border/60 rounded-lg shadow-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-medium animate-pulse-slow hidden sm:flex" style={{ animationDelay: "2s" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
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
                  className="group text-left rounded-lg border bg-card hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden"
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
                  className="group text-left rounded-lg border bg-card hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shrink-0">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="group relative p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Gradient sheen on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  {/* Top accent line on hover */}
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    feature.color,
                  )} />
                  <div className={cn(
                    "relative w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg mb-4 transition-transform group-hover:scale-110 group-hover:-rotate-3",
                    feature.color,
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="relative font-semibold text-base mb-1.5 tracking-tight">{feature.title}</h3>
                  <p className="relative text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 px-6 py-20 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
              <Zap className="w-3 h-3" />
              Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">From AI to polished in 3 steps</h2>
            <p className="text-muted-foreground">No learning curve — if you've used PowerPoint, you know SlideForge.</p>
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
                    <div className={cn(
                      "relative w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg transition-transform group-hover:scale-110 group-hover:-rotate-3",
                      step.color,
                    )}>
                      <Icon className="w-6 h-6 text-white" />
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
      <section className="relative z-10 px-6 py-20 border-t bg-gradient-to-b from-transparent to-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-600 dark:text-amber-400 mb-6">
            <Crown className="w-3 h-3" />
            Free & open workflow
          </div>
          <h2 className="text-3xl font-bold mb-4">Ready to forge your slides?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
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
            <Button size="lg" onClick={onStart} className="gap-2 h-12 px-8 shadow-lg shadow-primary/25 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 hover:scale-[1.03] active:scale-[0.98] transition-all">
              <Play className="w-4 h-4 fill-white" />
              Launch Editor
            </Button>
            <Button size="lg" variant="outline" onClick={onImport} className="gap-2 h-12 px-8 border-2 hover:bg-muted/50 hover:border-primary/30 transition-all hover:scale-[1.03] active:scale-[0.98]">
              <Upload className="w-4 h-4" />
              Import Existing HTML
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t px-6 py-8 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                S
              </div>
              <span className="font-medium">SlideForge — HTML Slide Editor</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                All systems operational
              </span>
              <span>Built with Next.js & TypeScript</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
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
