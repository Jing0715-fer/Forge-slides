"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import {
  Sparkles, MousePointer2, RotateCcw, Code2, Layers, Presentation,
  Upload, Download, Play, ArrowRight, Zap, Crown, History,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  onStart: () => void
  onImport: () => void
  hasSavedSession: boolean
  onRestoreSession: () => void
}

export function LandingPage({ onStart, onImport, hasSavedSession, onRestoreSession }: Props) {
  const features = [
    {
      icon: MousePointer2,
      title: "Drag & Snap",
      desc: "Move elements with smart alignment guides that snap to edges, centers, and other elements — just like PowerPoint.",
      color: "from-rose-500 to-pink-600",
    },
    {
      icon: RotateCcw,
      title: "Resize & Rotate",
      desc: "Eight resize handles plus a rotation grip. Shift to lock aspect ratio or snap to 15° increments.",
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: Code2,
      title: "HTML Import",
      desc: "Paste HTML, upload files, or import an entire folder. Smart mode extracts editable elements automatically.",
      color: "from-emerald-500 to-teal-600",
    },
    {
      icon: Layers,
      title: "Layers & Groups",
      desc: "Full layer management with search, lock, visibility. Group elements and resize them proportionally.",
      color: "from-violet-500 to-purple-600",
    },
    {
      icon: History,
      title: "History Timeline",
      desc: "Visual undo/redo history with labeled actions and timestamps. Jump to any point in your edit history.",
      color: "from-cyan-500 to-blue-600",
    },
    {
      icon: Presentation,
      title: "Presentation Mode",
      desc: "Fullscreen slideshow with transitions, auto-play, speaker notes, and elapsed timer.",
      color: "from-fuchsia-500 to-pink-600",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/10 to-orange-600/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-600/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b bg-background/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-pink-500/30">
              S
            </div>
            <span className="font-bold text-base">SlideForge</span>
            <span className="text-xs text-muted-foreground hidden sm:inline ml-1">
              HTML Slide Editor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:inline px-2"
            >
              Docs
            </a>
            <ThemeToggle />
            <Button size="sm" onClick={onStart} className="gap-1.5 shadow-sm">
              Open Editor <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6 landing-animate-in">
            <Sparkles className="w-3 h-3" />
            Fine-tune AI-generated slides with precision
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 landing-animate-in" style={{ animationDelay: "100ms" }}>
            <span className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              SlideForge
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 landing-animate-in" style={{ animationDelay: "250ms" }}>
            A PowerPoint-like HTML editor for fine-tuning AI-generated slides.
            Drag, snap, resize, and export clean production-ready markup.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 landing-animate-in" style={{ animationDelay: "400ms" }}>
            <Button
              size="lg"
              onClick={onStart}
              className="gap-2 h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Play className="w-4 h-4" />
              Start Editing
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onImport}
              className="gap-2 h-12 px-8 text-base"
            >
              <Upload className="w-4 h-4" />
              Import HTML
            </Button>
          </div>

          {/* Restore session */}
          {hasSavedSession && (
            <button
              onClick={onRestoreSession}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 mb-8 landing-animate-in"
              style={{ animationDelay: "500ms" }}
            >
              <History className="w-3 h-3" />
              Restore your previous session
            </button>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground landing-animate-in" style={{ animationDelay: "600ms" }}>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>50-step undo</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-500" />
              <span>7 element types</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>HTML / PDF / PNG export</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 px-6 py-16 border-t bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything you need to craft slides</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful editing tools designed for speed and precision, with a familiar PowerPoint-like workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="group relative p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 landing-animate-in"
                  style={{ animationDelay: `${600 + idx * 80}ms` }}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-md mb-4 transition-transform group-hover:scale-110",
                    feature.color,
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-16 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">From AI to polished in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "1", icon: Code2, title: "Import HTML", desc: "Paste from ChatGPT, Claude, or upload files/folders" },
              { num: "2", icon: MousePointer2, title: "Edit visually", desc: "Drag, resize, restyle with live preview" },
              { num: "3", icon: Download, title: "Export anywhere", desc: "Clean HTML, print-ready PDF, or PNG image" },
            ].map((step, idx) => {
              const Icon = step.icon
              return (
                <div key={idx} className="relative">
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-border" />
                  )}
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {step.num}
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px]">{step.desc}</p>
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={onStart} className="gap-2 h-12 px-8 shadow-lg shadow-primary/25">
              <Play className="w-4 h-4" />
              Launch Editor
            </Button>
            <Button size="lg" variant="outline" onClick={onImport} className="gap-2 h-12 px-8">
              <Upload className="w-4 h-4" />
              Import Existing HTML
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
              S
            </div>
            <span>SlideForge — HTML Slide Editor</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Built with Next.js & TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
