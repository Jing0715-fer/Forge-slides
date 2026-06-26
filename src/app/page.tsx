"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { LandingPage } from "@/components/editor/LandingPage"
import { loadFromLocalStorage } from "@/lib/persistence"
import { useEditor } from "@/store/editor-store"

const Editor = dynamic(() => import("@/components/editor/Editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold animate-pulse">S</div>
        <p className="text-sm text-muted-foreground">Loading SlideForge…</p>
      </div>
    </div>
  ),
})

type View = "landing" | "editor"

export default function Home() {
  const [view, setView] = useState<View>("landing")
  // Check for saved session using lazy initializer (runs once on mount, no effect needed)
  const [hasSavedSession] = useState(() => {
    if (typeof window === "undefined") return false
    const saved = loadFromLocalStorage()
    return !!(saved && saved.slides.length > 0)
  })
  const [pendingImport, setPendingImport] = useState(false)
  const { loadProject } = useEditor()

  const handleStart = useCallback(() => {
    setView("editor")
  }, [])

  const handleImport = useCallback(() => {
    setPendingImport(true)
    setView("editor")
  }, [])

  const handleRestoreSession = useCallback(() => {
    const saved = loadFromLocalStorage()
    if (saved) {
      loadProject({
        slides: saved.slides,
        currentSlideId: saved.currentSlideId || saved.slides[0]?.id || "",
      })
      if (saved.masterElements) {
        useEditor.setState({ masterElements: saved.masterElements })
      }
    }
    setView("editor")
  }, [loadProject])

  const handleBackToLanding = useCallback(() => {
    setView("landing")
  }, [])

  if (view === "landing") {
    return (
      <LandingPage
        onStart={handleStart}
        onImport={handleImport}
        hasSavedSession={hasSavedSession}
        onRestoreSession={handleRestoreSession}
      />
    )
  }

  return <Editor initialImportOpen={pendingImport} onExit={handleBackToLanding} />
}
