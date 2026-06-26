"use client"

import React, { useState, useRef, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useEditor, createContainerElement, createTextElement, createShapeElement, createImageElement } from "@/store/editor-store"
import { parseHtmlToSlides, parseMultipleHtmlToSlides, type ParsedFile } from "@/lib/html-io"
import { toast } from "sonner"
import {
  ClipboardPaste, FileUp, FolderUp, FileText, X, FileCheck2, AlertCircle, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SAMPLE_HTML = `<section class="slide" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
  <h1 style="position:absolute; top:60px; left:80px; color:white; font-size:64px; font-weight:bold;">
    AI-Generated Title
  </h1>
  <p style="position:absolute; top:160px; left:80px; color:rgba(255,255,255,0.85); font-size:24px; width:700px;">
    Subtitle text from your favorite AI tool. Edit me freely in the canvas.
  </p>
  <div style="position:absolute; top:300px; left:80px; width:340px; height:240px; background:white; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2);">
    <p style="position:absolute; top:30px; left:30px; font-size:22px; font-weight:600; color:#1e293b;">Feature One</p>
    <p style="position:absolute; top:70px; left:30px; font-size:16px; color:#64748b; width:280px;">Description text for the first card.</p>
  </div>
  <div style="position:absolute; top:300px; left:460px; width:340px; height:240px; background:white; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2);">
    <p style="position:absolute; top:30px; left:30px; font-size:22px; font-weight:600; color:#1e293b;">Feature Two</p>
    <p style="position:absolute; top:70px; left:30px; font-size:16px; color:#64748b; width:280px;">Description text for the second card.</p>
  </div>
</section>`

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportTab = "paste" | "file" | "folder"
type ParseMode = "smart" | "raw"

export function ImportHtmlDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<ImportTab>("paste")
  const [html, setHtml] = useState(SAMPLE_HTML)
  const [mode, setMode] = useState<ParseMode>("smart")
  const [pendingFiles, setPendingFiles] = useState<ParsedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const { replaceSlides, addElement } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setPendingFiles([])
    setHtml(SAMPLE_HTML)
    setMode("smart")
    setTab("paste")
    setIsDragging(false)
  }, [])

  function handleClose(open: boolean) {
    if (!open) resetState()
    onOpenChange(open)
  }

  // Read a single File object into a ParsedFile
  async function readFile(file: File): Promise<ParsedFile> {
    const text = await file.text()
    return {
      name: file.name.replace(/\.[^.]+$/, ""),
      filename: file.name,
      content: text,
      size: file.size,
    }
  }

  // Filter to only .html/.htm files
  function isHtmlFile(file: File): boolean {
    return /\.(html?|xhtml)$/i.test(file.name) || file.type === "text/html"
  }

  async function handleFilesSelected(files: FileList | File[]) {
    const allFiles = Array.from(files).filter(isHtmlFile)
    if (allFiles.length === 0) {
      toast.error("No HTML files found. Select .html or .htm files.")
      return
    }
    setIsParsing(true)
    try {
      const parsed: ParsedFile[] = []
      for (const file of allFiles) {
        parsed.push(await readFile(file))
      }
      // Sort by filename for predictable ordering
      parsed.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: "base" }))
      setPendingFiles(parsed)
      toast.success(`Loaded ${parsed.length} HTML file${parsed.length === 1 ? "" : "s"}`)
    } catch (e) {
      toast.error("Failed to read files: " + (e as Error).message)
    } finally {
      setIsParsing(false)
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files)
    }
    e.target.value = ""
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // Drag-and-drop handlers for the file/folder drop zones
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFilesSelected(files)
    }
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true)
    }
  }
  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  async function handleImport() {
    setIsParsing(true)
    try {
      if (tab === "paste") {
        // Paste mode: use the textarea content
        if (mode === "smart") {
          const parsed = parseHtmlToSlides(html)
          if (parsed.length === 0) {
            toast.error("No slides detected. Check your HTML.")
            setIsParsing(false)
            return
          }
          replaceSlides(parsed)
          toast.success(`Imported ${parsed.length} slide(s).`)
        } else {
          addElement(
            createContainerElement(html, {
              x: 60,
              y: 60,
              width: 1160,
              height: 600,
              name: "Imported HTML",
            }),
          )
          toast.success("Inserted as HTML container on current slide.")
        }
      } else {
        // File or folder mode: use pendingFiles
        if (pendingFiles.length === 0) {
          toast.error("No files loaded. Select HTML files first.")
          setIsParsing(false)
          return
        }
        if (mode === "smart") {
          const parsed = parseMultipleHtmlToSlides(pendingFiles)
          if (parsed.length === 0) {
            toast.error("No slides detected in the selected files.")
            setIsParsing(false)
            return
          }
          replaceSlides(parsed)
          toast.success(`Imported ${parsed.length} slide(s) from ${pendingFiles.length} file(s).`)
        } else {
          // Raw mode: each file becomes a container element on a new slide
          // For multiple files, we create multiple slides
          if (pendingFiles.length === 1) {
            addElement(
              createContainerElement(pendingFiles[0].content, {
                x: 60,
                y: 60,
                width: 1160,
                height: 600,
                name: pendingFiles[0].name,
              }),
            )
            toast.success("Inserted as HTML container on current slide.")
          } else {
            // Multiple files in raw mode — create one slide per file
            const { loadProject } = useEditor.getState()
            const newSlides = pendingFiles.map((file, idx) => ({
              id: Math.random().toString(36).slice(2),
              name: file.name,
              background: "#ffffff",
              elements: [
                createContainerElement(file.content, {
                  x: 60,
                  y: 60,
                  width: 1160,
                  height: 600,
                  name: file.name,
                  zIndex: 0,
                }),
              ],
              notes: undefined,
              transition: "inherit" as const,
            }))
            loadProject({ slides: newSlides, currentSlideId: newSlides[0]?.id })
            toast.success(`Imported ${newSlides.length} slide(s) as raw containers.`)
          }
        }
      }
      handleClose(false)
    } catch (e) {
      console.error(e)
      toast.error("Failed to parse HTML: " + (e as Error).message)
    } finally {
      setIsParsing(false)
    }
  }

  const totalSize = pendingFiles.reduce((sum, f) => sum + f.size, 0)
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Import AI-Generated HTML
          </DialogTitle>
          <DialogDescription>
            Import HTML from ChatGPT, Claude, or any AI tool. Paste directly, upload a single file, or upload a folder of HTML files (one slide per file). Smart mode extracts editable elements; Raw mode keeps HTML as-is in a container.
          </DialogDescription>
        </DialogHeader>

        {/* Source tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as ImportTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="paste" className="gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-1.5">
              <FileUp className="w-3.5 h-3.5" /> File
            </TabsTrigger>
            <TabsTrigger value="folder" className="gap-1.5">
              <FolderUp className="w-3.5 h-3.5" /> Folder
            </TabsTrigger>
          </TabsList>

          {/* Paste tab */}
          <TabsContent value="paste" className="flex-1 min-h-0 mt-3 flex flex-col">
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="flex-1 min-h-[300px] font-mono text-xs"
              placeholder="<section class='slide'>...</section>"
            />
          </TabsContent>

          {/* File upload tab */}
          <TabsContent value="file" className="flex-1 min-h-0 mt-3 flex flex-col">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.xhtml,text/html"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            {pendingFiles.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors min-h-[300px]",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  <FileUp className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragging ? "Drop HTML files here" : "Click to select HTML files"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or drag and drop .html / .htm files
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Multiple files = multiple slides
                </Badge>
              </div>
            ) : (
              <PendingFilesList
                files={pendingFiles}
                onRemove={removePendingFile}
                onAddMore={() => fileInputRef.current?.click()}
                totalSize={formatSize(totalSize)}
              />
            )}
          </TabsContent>

          {/* Folder upload tab */}
          <TabsContent value="folder" className="flex-1 min-h-0 mt-3 flex flex-col">
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error — webkitdirectory is a non-standard but widely supported attribute
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            {pendingFiles.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => folderInputRef.current?.click()}
                className={cn(
                  "flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors min-h-[300px]",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  <FolderUp className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragging ? "Drop folder here" : "Click to select a folder"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All .html files in the folder become slides (sorted by name)
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <FileText className="w-3 h-3" />
                  One slide per HTML file
                </Badge>
              </div>
            ) : (
              <PendingFilesList
                files={pendingFiles}
                onRemove={removePendingFile}
                onAddMore={() => folderInputRef.current?.click()}
                totalSize={formatSize(totalSize)}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Parse mode toggle */}
        <div className="flex items-center gap-2 py-2 border-t">
          <span className="text-xs font-medium text-muted-foreground">Mode:</span>
          <div className="flex gap-1 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setMode("smart")}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                mode === "smart" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Smart (Parse Elements)
            </button>
            <button
              onClick={() => setMode("raw")}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                mode === "raw" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Raw (HTML Container)
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground/70 ml-1">
            {mode === "smart"
              ? "Extracts positioned text, shapes, and images as editable elements."
              : "Keeps HTML intact inside a container you can move/resize."}
          </span>
        </div>

        <DialogFooter>
          {tab === "paste" && (
            <Button variant="outline" onClick={() => setHtml(SAMPLE_HTML)}>Load Sample</Button>
          )}
          <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={isParsing || (tab !== "paste" && pendingFiles.length === 0)}>
            {isParsing ? "Parsing…" : `Import${tab !== "paste" && pendingFiles.length > 0 ? ` ${pendingFiles.length} slide${pendingFiles.length === 1 ? "" : "s"}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Pending Files List ----------
function PendingFilesList({
  files,
  onRemove,
  onAddMore,
  totalSize,
}: {
  files: ParsedFile[]
  onRemove: (idx: number) => void
  onAddMore: () => void
  totalSize: string
}) {
  return (
    <div className="flex-1 flex flex-col min-h-[300px] border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">
            {files.length} HTML file{files.length === 1 ? "" : "s"} ready
          </span>
          <Badge variant="outline" className="text-[10px] font-mono">{totalSize}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddMore}>
          <FileUp className="w-3 h-3" /> Add more
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="divide-y">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors group">
              <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  {idx === 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">first</Badge>
                  )}
                  {idx === files.length - 1 && files.length > 1 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">last</Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono truncate block">
                  {file.filename} · {file.content.length.toLocaleString()} chars
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60 font-mono">
                #{idx + 1}
              </div>
              <button
                onClick={() => onRemove(idx)}
                className="w-6 h-6 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center gap-2 text-[11px] text-muted-foreground">
        <AlertCircle className="w-3 h-3" />
        Files will be imported as slides in alphabetical order. Use smart mode to extract editable elements.
      </div>
    </div>
  )
}

// ---------- Export Dialog ----------
export function ExportDialog({ open, onOpenChange }: Props) {
  const { slides, masterElements } = useEditor()
  const html = React.useMemo(() => {
    if (!open) return ""
    return exportSlidesToHtml(slides, masterElements)
  }, [slides, masterElements, open])

  function handleCopy() {
    navigator.clipboard.writeText(html)
    toast.success("HTML copied to clipboard!")
  }
  function handleDownload() {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "slides.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export HTML</DialogTitle>
          <DialogDescription>
            Clean, self-contained HTML. Copy or download for use anywhere.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 border rounded">
          <pre className="text-xs font-mono p-4 whitespace-pre-wrap break-all">{html}</pre>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>Copy to Clipboard</Button>
          <Button onClick={handleDownload}>Download .html</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Import at bottom to avoid circular dependency issues
import { exportSlidesToHtml } from "@/lib/html-io"
