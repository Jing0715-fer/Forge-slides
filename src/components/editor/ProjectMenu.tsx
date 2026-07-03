"use client"

import React, { useRef, useState } from "react"
import { useEditor } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { FolderOpen, Download, Upload, FileJson, AlertTriangle, Bookmark, Wand2, Library, History } from "lucide-react"
import { toast } from "sonner"
import { downloadProjectFile, readProjectFile } from "@/lib/project-io"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function ProjectMenu({ onSaveTemplate, onOpenTemplates, onAiGenerate, onAiHistory }: { onSaveTemplate?: () => void; onOpenTemplates?: () => void; onAiGenerate?: () => void; onAiHistory?: () => void }) {
  const { slides, currentSlideId, masterElements, loadProject } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingProject, setPendingProject] = useState<{
    slides: ReturnType<typeof JSON.parse>
    currentSlideId: string
    masterElements: any[]
  } | null>(null)

  function handleExport() {
    downloadProjectFile(slides, currentSlideId || slides[0]?.id || "", masterElements)
    toast.success(`Exported ${slides.length} slide${slides.length === 1 ? "" : "s"} as JSON project file`)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await readProjectFile(file)
    e.target.value = ""
    if (!result.ok || !result.slides) {
      toast.error(result.error || "Failed to read project file")
      return
    }
    // Show confirmation dialog
    setPendingProject({
      slides: result.slides,
      currentSlideId: result.currentSlideId || result.slides[0].id,
      masterElements: result.masterElements || [],
    })
    setConfirmOpen(true)
  }

  function confirmLoad() {
    if (!pendingProject) return
    loadProject({ slides: pendingProject.slides, currentSlideId: pendingProject.currentSlideId })
    // Also load master elements
    useEditor.setState({ masterElements: pendingProject.masterElements })
    toast.success(`Loaded ${pendingProject.slides.length} slide${pendingProject.slides.length === 1 ? "" : "s"} from project file`)
    setConfirmOpen(false)
    setPendingProject(null)
  }

  const pendingSlideCount = pendingProject?.slides.length ?? 0
  const pendingHasNotes = pendingProject?.slides.some((s: any) => s.notes) ?? false
  const pendingHasMaster = (pendingProject?.masterElements.length ?? 0) > 0

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 px-2 2xl:px-3">
            <FileJson className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Project</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Project File</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExport} className="gap-2 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <div className="flex flex-col">
              <span>Export as JSON</span>
              <span className="text-[10px] text-muted-foreground">Backup or share project</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <div className="flex flex-col">
              <span>Import from JSON</span>
              <span className="text-[10px] text-muted-foreground">Replace current slides</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Templates & AI</DropdownMenuLabel>
          {onSaveTemplate && (
            <DropdownMenuItem onClick={onSaveTemplate} className="gap-2 cursor-pointer" disabled={slides.length === 0}>
              <Bookmark className="w-3.5 h-3.5" />
              <div className="flex flex-col">
                <span>Save as Template</span>
                <span className="text-[10px] text-muted-foreground">Analyze & store design style</span>
              </div>
            </DropdownMenuItem>
          )}
          {onOpenTemplates && (
            <DropdownMenuItem onClick={onOpenTemplates} className="gap-2 cursor-pointer">
              <Library className="w-3.5 h-3.5" />
              <div className="flex flex-col">
                <span>Template Library</span>
                <span className="text-[10px] text-muted-foreground">View & manage saved templates</span>
              </div>
            </DropdownMenuItem>
          )}
          {onAiGenerate && (
            <DropdownMenuItem onClick={onAiGenerate} className="gap-2 cursor-pointer">
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              <div className="flex flex-col">
                <span>Generate from Markdown</span>
                <span className="text-[10px] text-muted-foreground">AI creates slides from .md + template</span>
              </div>
            </DropdownMenuItem>
          )}
          {onAiHistory && (
            <DropdownMenuItem onClick={onAiHistory} className="gap-2 cursor-pointer">
              <History className="w-3.5 h-3.5 text-primary" />
              <div className="flex flex-col">
                <span>AI Generation History</span>
                <span className="text-[10px] text-muted-foreground">View & reload previous AI generations</span>
              </div>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
            Templates analyze your design tokens to generate matching AI slides.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Import Project File?
            </DialogTitle>
            <DialogDescription>
              This will <strong>replace all {slides.length} current slide{slides.length === 1 ? "" : "s"}</strong> with{" "}
              <strong>{pendingSlideCount} slide{pendingSlideCount === 1 ? "" : "s"}</strong> from the project file.
              {pendingHasNotes && " Speaker notes will be preserved."}
              {pendingHasMaster && ` ${pendingProject?.masterElements.length} master element(s) will be loaded.`}
              {" "}Your current work will be lost (use undo to recover).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmLoad} className="gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Import {pendingSlideCount} Slide{pendingSlideCount === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
