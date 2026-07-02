"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react"

interface Props {
  open: boolean
  progress: "exporting" | "done" | "error" | "idle"
  downloadUrl: string | null
  downloadSize: number
  slideCount: number
  onClose: () => void
}

export function ExportProgressDialog({ open, progress, downloadUrl, downloadSize, slideCount, onClose }: Props) {
  const sizeStr = downloadSize > 1024 * 1024
    ? (downloadSize / 1024 / 1024).toFixed(1) + " MB"
    : (downloadSize / 1024).toFixed(0) + " KB"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress === "exporting" && <Loader2 className="w-4 h-4 animate-spin" />}
            {progress === "done" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {progress === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
            Export HTML
          </DialogTitle>
          <DialogDescription>
            {progress === "exporting" && `Generating HTML for ${slideCount} slide(s)...`}
            {progress === "done" && `Export complete — ${sizeStr}`}
            {progress === "error" && "Export failed. Please try again."}
          </DialogDescription>
        </DialogHeader>

        {progress === "exporting" && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
            <p className="text-xs text-muted-foreground">Processing slides...</p>
          </div>
        )}

        {progress === "done" && (
          <div className="py-4 flex flex-col items-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-sm text-center text-muted-foreground">
              {slideCount} slide(s) exported successfully<br />
              File size: {sizeStr}
            </p>
            <div className="flex gap-2 w-full">
              <a
                href={downloadUrl || "#"}
                download="slides.html"
                className="flex-1"
              >
                <Button className="w-full gap-2">
                  <Download className="w-4 h-4" /> Download
                </Button>
              </a>
              <Button variant="outline" onClick={onClose} className="px-3">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {progress === "error" && (
          <div className="py-4 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
