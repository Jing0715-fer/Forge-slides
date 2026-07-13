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
      // Version check: if the stored data version is older than the current
      // code version, clear all cached data so the user gets a fresh import
      // with all CSS fixes (reveal override, display:block, etc.). This
      // prevents stale rawHtml from being loaded when the code has been
      // updated — old cached projects would otherwise show invisible
      // slides even after the fix shipped, because the iframe carries the
      // OLD rawHtml without the override CSS.
      const DATA_VERSION = "v16-overlay-fix"
      try {
        const storedVersion = localStorage.getItem("slideforge:data-version")
        if (storedVersion !== DATA_VERSION) {
          console.log("[SlideForge] Data version mismatch, clearing cache for fresh import")
          try {
            localStorage.removeItem("slideforge:recent-projects:v2")
            localStorage.removeItem("slideforge:autosave:v2")
            localStorage.removeItem("slideforge:autosave:ts:v2")
            localStorage.removeItem("slideforge:recent-projects:v1")
            localStorage.removeItem("slideforge:autosave:v1")
            localStorage.setItem("slideforge:data-version", DATA_VERSION)
          } catch { /* localStorage may be unavailable */ }
          // Async IndexedDB deletion — don't block
          try {
            if (typeof indexedDB !== "undefined") {
              indexedDB.deleteDatabase("slideforge")
            }
          } catch { /* ignore */ }
        }
      } catch { /* version check is best-effort */ }

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
      // PRIMARY PATH: load the EXACT project the user clicked, by ID, from
      // IndexedDB. This is the only correct source — localStorage autosave
      // holds whatever was last edited, which is almost always a DIFFERENT
      // project than the one the user clicked. Falling back to it (as the
      // old code did) is what caused "clicking any recent project opens the
      // most recent one".
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

      // SECONDARY PATH: some legacy / small projects keep their slides inline
      // in the localStorage metadata. This is the SAME project (matched by
      // the `project` reference the user clicked), so it's safe to use.
      if (project.slides && project.slides.length > 0) {
        loadProject({
          slides: project.slides,
          currentSlideId: project.slides[0]?.id || "",
        })
        if (project.masterElements) {
          useEditor.setState({ masterElements: project.masterElements })
        }
        setSkipBanner(true)
        toast.success(`Loaded ${project.slides.length} slide(s) from "${project.name}"`)
        setView("editor")
        return
      }

      // NO DATA FOUND — show a clear error instead of silently loading some
      // other project (which is what the old autosave fallback did). The
      // user can re-import the file from disk.
      toast.error(`Could not load "${project.name}". Please re-import the file.`)
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
