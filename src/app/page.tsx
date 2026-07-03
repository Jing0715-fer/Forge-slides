"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { LandingPage } from "@/components/editor/LandingPage"
import { loadFromLocalStorage, hasSavedSession as checkSavedSession } from "@/lib/persistence"
import { getRecentProjects, saveRecentProject, generateSlideThumbnail, loadRecentProjectData, type RecentProject } from "@/lib/recent-projects"
import type { Slide } from "@/types/editor"
import { useEditor } from "@/store/editor-store"
import { toast } from "sonner"

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
  const [hasSavedSession, setHasSavedSession] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [pendingImport, setPendingImport] = useState(false)
  const [pendingAiGenerate, setPendingAiGenerate] = useState(false)
  const [skipBanner, setSkipBanner] = useState(false)
  const { loadProject } = useEditor()

  useEffect(() => {
    try {
      // Quick synchronous check for saved session
      if (checkSavedSession()) {
        setHasSavedSession(true)
      }
      setRecentProjects(getRecentProjects())
    } catch (e) {
      console.error("Landing page init error:", e)
    }
  }, [])

  const handleStart = useCallback(() => {
    setView("editor")
  }, [])

  const handleImport = useCallback(() => {
    setPendingImport(true)
    setView("editor")
  }, [])

  const handleAiGenerate = useCallback(() => {
    setPendingAiGenerate(true)
    setView("editor")
  }, [])

  // Single import handoff for the landing page. The dialog (shared
  // with the editor toolbar via <ImportLauncher/>) parses the files
  // itself; here we just receive the parsed `Slide[]` and finalize:
  // load into the editor store, persist locally, save recent-project,
  // and switch to the editor view.
  //
  // All viewer / drag-drop / webkitdirectory logic lives in
  // ImportHtmlDialog now — keep this function as the *only* landing-
  // page-side completion step.
  const handleSlidesLoaded = useCallback(async (slides: Slide[]) => {
    if (slides.length === 0) {
      toast.error("No slides detected in the selected files")
      return
    }
    loadProject({
      slides,
      currentSlideId: slides[0]?.id || "",
    })
    try {
      const { saveToLocalStorage } = await import("@/lib/persistence")
      saveToLocalStorage(slides, slides[0]?.id || "", [])
    } catch {
      /* persistence is best-effort — toolbar restore still works */
    }
    try {
      const thumbnail = generateSlideThumbnail(slides)
      await saveRecentProject({
        name: "Imported HTML",
        slideCount: slides.length,
        thumbnail,
        slides,
        masterElements: [],
      })
    } catch {
      /* ignore — recent-projects is a nice-to-have */
    }
    setRecentProjects(getRecentProjects())
    setSkipBanner(true)
    setView("editor")
  }, [loadProject])

  const handleRestoreSession = useCallback(async () => {
    const saved = await loadFromLocalStorage()
    if (saved) {
      loadProject({
        slides: saved.slides,
        currentSlideId: saved.currentSlideId || saved.slides[0]?.id || "",
      })
      if (saved.masterElements) {
        useEditor.setState({ masterElements: saved.masterElements })
      }
    }
    setSkipBanner(true)
    setView("editor")
  }, [loadProject])

  const handleOpenRecent = useCallback(async (project: RecentProject) => {
    // Try loading the full project data from IndexedDB first
    if (project.hasFullData) {
      const data = await loadRecentProjectData(project.id)
      if (data && data.slides.length > 0) {
        loadProject({
          slides: data.slides,
          currentSlideId: data.slides[0]?.id || "",
        })
        if (data.masterElements) {
          useEditor.setState({ masterElements: data.masterElements })
        }
        setSkipBanner(true)
        toast.success(`Loaded ${data.slides.length} slide(s) from "${project.name}"`)
        setView("editor")
        return
      }
    }

    // Fallback: try localStorage slides (for small projects or legacy data)
    if (project.slides && project.slides.length > 0) {
      loadProject({
        slides: project.slides,
        currentSlideId: project.slides[0]?.id || "",
      })
      if (project.masterElements) {
        useEditor.setState({ masterElements: project.masterElements })
      }
      setSkipBanner(true)
      setView("editor")
      return
    }
    
    // Last resort: try the autosave session (may be a different project)
    const saved = await loadFromLocalStorage()
    if (saved && saved.slides.length > 0) {
      loadProject({
        slides: saved.slides,
        currentSlideId: saved.currentSlideId || saved.slides[0]?.id || "",
      })
      if (saved.masterElements) {
        useEditor.setState({ masterElements: saved.masterElements })
      }
      setSkipBanner(true)
      toast.success(`Loaded ${saved.slides.length} slide(s) from saved session`)
      setView("editor")
      return
    }
    
    toast.error("This project's data has expired. Please re-import the HTML file.")
  }, [loadProject])

  const handleBackToLanding = useCallback(() => {
    setView("landing")
    setSkipBanner(false)
    setRecentProjects(getRecentProjects())
  }, [])

  if (view === "landing") {
    return (
      <>
        <LandingPage
          onStart={handleStart}
          onImport={handleImport}
          onAiGenerate={handleAiGenerate}
          hasSavedSession={hasSavedSession}
          onRestoreSession={handleRestoreSession}
          recentProjects={recentProjects}
          onOpenRecent={handleOpenRecent}
          onSlidesLoaded={handleSlidesLoaded}
        />
      </>
    )
  }

  return <Editor initialImportOpen={pendingImport} initialAiGenerateOpen={pendingAiGenerate} onExit={handleBackToLanding} skipRestoreBanner={skipBanner} />
}
