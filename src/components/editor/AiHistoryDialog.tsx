"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEditor } from "@/store/editor-store"
import { getAiHistoryIndex, loadAiHistory, deleteAiHistory, type AiHistoryIndexEntry } from "@/lib/ai-history"
import { toast } from "sonner"
import { History, Trash2, Clock, FileText, Wand2, ChevronRight } from "lucide-react"
import type { Slide } from "@/types/editor"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiHistoryDialog({ open, onOpenChange }: Props) {
  const [history, setHistory] = useState<AiHistoryIndexEntry[]>([])
  const { loadProject } = useEditor()

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(getAiHistoryIndex())
    }
  }, [open])

  async function handleLoad(entry: AiHistoryIndexEntry) {
    const data = await loadAiHistory(entry.id)
    if (!data || !data.slides || data.slides.length === 0) {
      toast.error("History data not found. It may have expired.")
      return
    }
    loadProject({
      slides: data.slides as Slide[],
      currentSlideId: (data.slides[0] as Slide)?.id || "",
    })
    toast.success(`Loaded ${entry.slideCount} slide(s) from AI history`)
    onOpenChange(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteAiHistory(id)
    setHistory(getAiHistoryIndex())
    toast.success("History entry deleted")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            AI Generation History
          </DialogTitle>
          <DialogDescription>
            View and reload previously AI-generated slide decks. {history.length} generation{history.length === 1 ? "" : "s"} on record.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[400px] sf-layers-scroll">
          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Wand2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No AI generations yet.</p>
              <p className="text-xs mt-1">Use "AI Generate" to create slides from markdown, and they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleLoad(entry)}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shrink-0">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{entry.templateName}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {entry.slideCount} slides
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {entry.markdownPreview}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(entry.generatedAt).toLocaleString()}
                      </span>
                      <span>·</span>
                      <span>{entry.markdownLength} chars</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      onClick={(e) => handleDelete(entry.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
