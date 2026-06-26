"use client"

import React, { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEditor, createContainerElement, createTextElement, createShapeElement, createImageElement } from "@/store/editor-store"
import { parseHtmlToSlides, exportSlidesToHtml } from "@/lib/html-io"
import { toast } from "sonner"

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

export function ImportHtmlDialog({ open, onOpenChange }: Props) {
  const [html, setHtml] = useState(SAMPLE_HTML)
  const [mode, setMode] = useState<"smart" | "raw">("smart")
  const { replaceSlides, addElement, currentSlideId, slides } = useEditor()

  function handleImport() {
    try {
      if (mode === "smart") {
        const parsed = parseHtmlToSlides(html)
        if (parsed.length === 0) {
          toast.error("No slides detected. Check your HTML.")
          return
        }
        replaceSlides(parsed)
        toast.success(`Imported ${parsed.length} slide(s).`)
      } else {
        // Raw mode: insert as a single container element on current slide
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
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error("Failed to parse HTML: " + (e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import AI-Generated HTML</DialogTitle>
          <DialogDescription>
            Paste HTML from ChatGPT, Claude, or any AI tool. Smart mode extracts text, shapes and images as editable elements. Raw mode inserts the HTML as-is inside a container you can position freely.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "smart" | "raw")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="smart">Smart (Parse Elements)</TabsTrigger>
            <TabsTrigger value="raw">Raw (HTML Container)</TabsTrigger>
          </TabsList>
          <TabsContent value="smart" className="flex-1 min-h-0 mt-2">
            <p className="text-xs text-muted-foreground mb-2">
              Parses absolutely-positioned elements from your HTML into individual editable elements on the canvas. Best for slide-style HTML with explicit positions.
            </p>
          </TabsContent>
          <TabsContent value="raw" className="flex-1 min-h-0 mt-2">
            <p className="text-xs text-muted-foreground mb-2">
              Inserts the entire HTML as a single container. Good for complex layouts that don't follow absolute positioning. You can still move and resize the container, and edit the HTML below.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex-1 min-h-0">
          <Textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="h-full min-h-[300px] font-mono text-xs"
            placeholder="<section class='slide'>...</section>"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setHtml(SAMPLE_HTML)}>Load Sample</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Export Dialog ----------
export function ExportDialog({ open, onOpenChange }: Props) {
  const { slides } = useEditor()
  const html = React.useMemo(() => {
    if (!open) return ""
    return exportSlidesToHtml(slides)
  }, [slides, open])

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
