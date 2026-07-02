"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { LandingPage } from "@/components/editor/LandingPage"
import { loadFromLocalStorage, hasSavedSession as checkSavedSession } from "@/lib/persistence"
import { getRecentProjects, saveRecentProject, generateSlideThumbnail, loadRecentProjectData, type RecentProject } from "@/lib/recent-projects"
import { parseHtmlToRawSlides, loadFontsFromHtml, detectViewerSlideReferences, expandViewerReferences, isLikelyViewerFile, type ParsedFile } from "@/lib/html-io"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

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

  // Direct file import from landing page. The "viewer detection" logic
  // lives in expandForViewerReferences below — when the user uploads a
  // folder containing both an `index.html` viewer and the sibling slide
  // files it references (e.g. `processed/slide_NN.html`), we drop the
  // viewer from the import list and load the slides it points at.
  const handleFileImport = useCallback(async (files: FileList) => {
    const htmlFiles = Array.from(files).filter(f => /\.(html?|xhtml)$/i.test(f.name) || f.type === "text/html")
    if (htmlFiles.length === 0) {
      toast.error("No HTML files found")
      return
    }

    const parsedFiles: ParsedFile[] = []
    for (const file of htmlFiles) {
      const text = await file.text()
      // webkitRelativePath is populated by Chromium when the user selects
      // files via a folder input. For single-file picks it stays empty.
      const relativePath = (file as any).webkitRelativePath || ""
      parsedFiles.push({
        name: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        relativePath: typeof relativePath === "string" ? relativePath : "",
        content: text,
        size: file.size,
      })
    }
    // Sort by relativePath so a viewer and its sibling slides stay
    // grouped; then by filename for a stable order.
    parsedFiles.sort((a, b) => {
      const ap = a.relativePath || a.filename
      const bp = b.relativePath || b.filename
      return ap.localeCompare(bp, undefined, { numeric: true, sensitivity: "base" })
    })

    // If one of the uploaded files is a "viewer" (e.g. an `index.html`
    // that loads sibling slides via JS / iframe), resolve the references
    // and import only the actual slide files.
    let filesToImport = parsedFiles
    const viewer = parsedFiles.find(isLikelyViewerFile)
    if (viewer) {
      const refs = detectViewerSlideReferences(viewer.content)
      if (refs.length > 0) {
        const result = expandViewerReferences(parsedFiles, viewer, refs)
        if (result.slides.length > 0) {
          filesToImport = result.slides
          toast.success(
            `Auto-loaded ${result.slides.length} slide${result.slides.length === 1 ? "" : "s"} ` +
            `referenced by ${result.viewerFilename}`,
          )
        }
      }
    }

    // Load custom fonts from the HTML files
    for (const file of filesToImport) {
      loadFontsFromHtml(file.content)
    }

    // Use Exact mode (iframe rendering) for 100% visual fidelity
    const allSlides: Slide[] = []
    for (const file of filesToImport) {
      const parsed = parseHtmlToRawSlides(file.content)
      allSlides.push(...parsed)
    }
    const slides = allSlides
    if (slides.length === 0) {
      toast.error("No slides detected in the HTML files")
      return
    }

    loadProject({
      slides,
      currentSlideId: slides[0]?.id || "",
    })

    const { saveToLocalStorage } = await import("@/lib/persistence")
    saveToLocalStorage(slides, slides[0]?.id || "", [])

    try {
      const thumbnail = generateSlideThumbnail(slides)
      await saveRecentProject({
        name: parsedFiles[0]?.name || "Imported HTML",
        slideCount: slides.length,
        thumbnail,
        slides,
        masterElements: [],
      })
    } catch { /* ignore */ }

    setRecentProjects(getRecentProjects())
    setSkipBanner(true)
    toast.success(`Imported ${slides.length} slide(s) from ${parsedFiles.length} file(s)`)
    setView("editor")
  }, [loadProject])

  // Folder import from the landing page — Chromium's webkitdirectory attribute
  // exposes the chosen folder's files via FileList with non-standard
  // `webkitRelativePath` properties. The downstream handler (handleFileImport)
  // already filters by extension and content-type, so we just hand the
  // FileList over verbatim.
  //
  // IMPORTANT: declared AFTER handleFileImport so the closure dependency is
  // forward-resolved; otherwise Turbopack's hoister can mangle the two
  // useCallback hooks into a temporal-dead-zone order during SSR pre-render.
  const handleFolderImport = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      handleFileImport(files)
    }
  }, [handleFileImport])

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
          onFileImport={handleFileImport}
          fileInputRef={fileInputRef}
          onFolderImport={handleFolderImport}
          folderInputRef={folderInputRef}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,.xhtml,text/html"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileImport(e.target.files)
            }
            e.target.value = ""
          }}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFolderImport(e.target.files)
            }
            e.target.value = ""
          }}
          // @ts-expect-error — webkitdirectory is a non-standard but widely supported attribute
          webkitdirectory=""
          directory=""
          className="hidden"
        />
      </>
    )
  }

  return <Editor initialImportOpen={pendingImport} initialAiGenerateOpen={pendingAiGenerate} onExit={handleBackToLanding} skipRestoreBanner={skipBanner} />
}
