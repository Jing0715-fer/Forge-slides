"use client"

import React, { useState, useEffect } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { ImageDown, X, CheckCircle2, AlertCircle, Loader2, FileArchive, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import JSZip from "jszip"

/**
 * BatchPngExportDialog — export every slide as a separate PNG file.
 *
 * Strategy: for each slide, render it to an off-screen iframe at native
 * resolution, wait for load, then use html2canvas-style SVG foreignObject
 * capture. For rawHtml slides (the common imported-HTML case), we render
 * the iframe content directly to a canvas via drawImage.
 *
 * To avoid memory pressure with many large iframes, we process slides
 * sequentially (one at a time) and clean up between each.
 *
 * Download: triggers N individual downloads (browser may prompt for
 * "allow multiple downloads"). Alternatively we could ZIP them, but
 * that requires a zip library — keeping it dependency-free for now.
 */
export function BatchPngExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { slides } = useEditor()
  const [exporting, setExporting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [done, setDone] = useState<number[]>([])
  const [failed, setFailed] = useState<number[]>([])
  const [scale, setScale] = useState(1)
  const [zipMode, setZipMode] = useState(true)
  const [zipping, setZipping] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExporting(false)
      setCurrentIndex(0)
      setDone([])
      setFailed([])
      setZipping(false)
    }
  }, [open])

  async function captureSlide(slide: typeof slides[0]): Promise<string> {
    const slideW = slide.width || CANVAS_WIDTH
    const slideH = slide.height || CANVAS_HEIGHT
    // Create an off-screen iframe, load the slide's HTML, wait for render,
    // then capture via SVG foreignObject → canvas.
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.left = "-99999px"
      iframe.style.top = "0"
      iframe.style.width = `${slideW}px`
      iframe.style.height = `${slideH}px`
      iframe.style.border = "none"
      iframe.style.background = slide.background || "#ffffff"
      iframe.setAttribute("sandbox", "allow-same-origin allow-scripts")
      document.body.appendChild(iframe)

      const cleanup = () => {
        try { document.body.removeChild(iframe) } catch { /* ignore */ }
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error("Slide render timed out"))
      }, 15000)

      iframe.onload = async () => {
        try {
          // Give fonts/layout a moment to settle
          await new Promise((r) => setTimeout(r, 300))
          const doc = iframe.contentDocument
          if (!doc) throw new Error("No document")
          const html = doc.documentElement.outerHTML
          // SVG foreignObject capture
          const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${slideW}" height="${slideH}" viewBox="0 0 ${slideW} ${slideH}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${slideW}px;height:${slideH}px;overflow:hidden;background:${slide.background || "#fff"};">
      ${html}
    </div>
  </foreignObject>
</svg>`
          const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = slideW * scale
            canvas.height = slideH * scale
            const ctx = canvas.getContext("2d")!
            ctx.scale(scale, scale)
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, slideW, slideH)
            ctx.drawImage(img, 0, 0)
            try {
              const dataUrl = canvas.toDataURL("image/png")
              clearTimeout(timeout)
              cleanup()
              resolve(dataUrl)
            } catch (e) {
              clearTimeout(timeout)
              cleanup()
              reject(new Error("Canvas tainted (cross-origin content)"))
            }
          }
          img.onerror = () => {
            clearTimeout(timeout)
            cleanup()
            reject(new Error("Image render failed"))
          }
          img.src = svgDataUrl
        } catch (e) {
          clearTimeout(timeout)
          cleanup()
          reject(e)
        }
      }
      // For rawHtml slides, use srcDoc; for native slides, build minimal HTML
      if (slide.rawHtml) {
        iframe.srcdoc = slide.rawHtml
      } else {
        // Build a minimal HTML doc with the slide's elements positioned
        const els = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)
        const elHtml = els.map((el) => {
          const base = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity};transform:rotate(${el.rotation}deg);background:${el.fill || "transparent"};border-radius:${el.borderRadius || 0}px;`
          if (el.type === "text") {
            const t = el as any
            return `<div style="${base}font-size:${t.fontSize}px;color:${t.color};font-family:${t.fontFamily};font-weight:${t.fontWeight};display:flex;align-items:center;justify-content:${t.textAlign === "center" ? "center" : t.textAlign === "right" ? "flex-end" : "flex-start"};padding:${t.padding || 0}px;white-space:pre-wrap;">${(t.text || "").replace(/</g, "&lt;")}</div>`
          }
          if (el.type === "image" && (el as any).src) {
            return `<img src="${(el as any).src}" style="${base}object-fit:${(el as any).objectFit};" />`
          }
          return `<div style="${base}"></div>`
        }).join("")
        iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{width:${slideW}px;height:${slideH}px;overflow:hidden;background:${slide.background || "#fff"};}</style></head><body>${elHtml}</body></html>`
      }
    })
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleExportAll() {
    setExporting(true)
    setDone([])
    setFailed([])
    const captured: { index: number; name: string; dataUrl: string }[] = []
    for (let i = 0; i < slides.length; i++) {
      setCurrentIndex(i)
      try {
        const dataUrl = await captureSlide(slides[i])
        const name = slides[i].name.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "") || `slide-${i + 1}`
        const filename = `${String(i + 1).padStart(2, "0")}-${name}.png`
        if (zipMode) {
          captured.push({ index: i, name: filename, dataUrl })
        } else {
          downloadDataUrl(dataUrl, filename)
        }
        setDone((d) => [...d, i])
      } catch (e) {
        console.error(`Slide ${i + 1} export failed:`, e)
        setFailed((f) => [...f, i])
      }
      // Small delay between captures
      await new Promise((r) => setTimeout(r, zipMode ? 100 : 250))
    }
    setExporting(false)

    // If ZIP mode, bundle all captured PNGs into a single .zip download
    if (zipMode && captured.length > 0) {
      setZipping(true)
      try {
        const zip = new JSZip()
        for (const c of captured) {
          // Convert data URL to binary — strip the "data:image/png;base64," prefix
          const base64 = c.dataUrl.split(",")[1] || ""
          zip.file(c.name, base64, { base64: true })
        }
        const blob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const deckName = (slides[0]?.name || "slides").replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30)
        a.download = `${deckName || "slides"}-png-export.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Exported ${captured.length} slides as ZIP`)
      } catch (e) {
        console.error("ZIP creation failed:", e)
        toast.error("ZIP creation failed — try individual download mode")
      } finally {
        setZipping(false)
      }
    } else if (!zipMode) {
      toast.success(`Exported ${done.length} of ${slides.length} slides as PNG`)
    }
  }

  const progress = slides.length > 0 ? Math.round(((done.length + failed.length) / slides.length) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageDown className="w-4 h-4 text-blue-500" />
            Batch PNG Export
          </DialogTitle>
          <DialogDescription>
            Export all {slides.length} slide{slides.length === 1 ? "" : "s"} as individual PNG images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download mode selector: ZIP vs individual files */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Download as:</span>
            <div className="flex gap-1">
              <button
                disabled={exporting || zipping}
                onClick={() => setZipMode(true)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium border transition-all flex items-center gap-1",
                  zipMode
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                  (exporting || zipping) && "opacity-50 cursor-not-allowed",
                )}
              >
                <FileArchive className="w-3 h-3" />
                ZIP (single file)
              </button>
              <button
                disabled={exporting || zipping}
                onClick={() => setZipMode(false)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium border transition-all flex items-center gap-1",
                  !zipMode
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                  (exporting || zipping) && "opacity-50 cursor-not-allowed",
                )}
              >
                <Download className="w-3 h-3" />
                Separate files
              </button>
            </div>
          </div>

          {/* Scale selector */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Resolution:</span>
            <div className="flex gap-1">
              {[
                { v: 1, label: "1× (fast)" },
                { v: 2, label: "2× (HD)" },
                { v: 3, label: "3× (print)" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  disabled={exporting || zipping}
                  onClick={() => setScale(opt.v)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium border transition-all",
                    scale === opt.v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                    (exporting || zipping) && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  {zipMode ? "Capturing" : "Exporting"} slide {currentIndex + 1} of {slides.length}…
                </span>
                <span className="font-mono text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                {zipMode
                  ? "Slides are being captured. They'll be bundled into a single ZIP file when done."
                  : "Each slide downloads separately. If your browser asks to allow multiple downloads, click \"Allow\"."}
              </p>
            </div>
          )}

          {/* Zipping progress */}
          {zipping && !exporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                <span>Compressing {done.length} slides into ZIP…</span>
              </div>
            </div>
          )}

          {/* Results summary */}
          {(done.length > 0 || failed.length > 0) && !exporting && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{done.length} slide{done.length === 1 ? "" : "s"} exported successfully</span>
              </div>
              {failed.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{failed.length} failed (slides: {failed.map((f) => f + 1).join(", ")})</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground pt-1">
                Failed slides usually contain cross-origin images or external
                resources that taint the canvas. Try exporting them individually.
              </p>
            </div>
          )}

          {/* Per-slide status grid */}
          {(done.length > 0 || failed.length > 0 || exporting) && (
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
              {slides.map((_, i) => {
                const isDone = done.includes(i)
                const isFailed = failed.includes(i)
                const isCurrent = exporting && i === currentIndex
                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded text-[9px] font-mono flex items-center justify-center border transition-colors",
                      isDone && "bg-green-100 border-green-300 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-400",
                      isFailed && "bg-red-100 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
                      isCurrent && "bg-blue-100 border-blue-400 text-blue-700 animate-pulse dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
                      !isDone && !isFailed && !isCurrent && "bg-muted/40 border-border text-muted-foreground",
                    )}
                    title={`Slide ${i + 1}`}
                  >
                    {isDone ? "✓" : isFailed ? "✕" : i + 1}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting || zipping}>
            {exporting || zipping ? "Close" : "Cancel"}
          </Button>
          <Button
            onClick={handleExportAll}
            disabled={exporting || zipping || slides.length === 0}
            className="gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-0"
          >
            {exporting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {zipMode ? "Capturing…" : "Exporting…"}</>
            ) : zipping ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Zipping…</>
            ) : zipMode ? (
              <><FileArchive className="w-3.5 h-3.5" /> Export ZIP ({slides.length})</>
            ) : (
              <><ImageDown className="w-3.5 h-3.5" /> Export {slides.length} PNG{slides.length === 1 ? "" : "s"}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
