"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getTemplateIndex, deleteTemplate, type TemplateIndexEntry } from "@/lib/template-store"
import { toast } from "sonner"
import { Bookmark, Trash2, FileText, Clock } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateManagerDialog({ open, onOpenChange }: Props) {
  const [templates, setTemplates] = useState<TemplateIndexEntry[]>(() => getTemplateIndex())

  // Refresh templates list when the dialog opens
  useEffect(() => {
    if (open) {
      setTemplates(getTemplateIndex())
    }
  }, [open])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return
    await deleteTemplate(id)
    setTemplates(getTemplateIndex())
    toast.success(`Template "${name}" deleted`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            Template Library
          </DialogTitle>
          <DialogDescription>
            Saved templates with analyzed design tokens. {templates.length} template{templates.length === 1 ? "" : "s"} available.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[400px] sf-layers-scroll">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No templates saved yet.</p>
              <p className="text-xs mt-1">Import HTML slides, then use "Save as Template" to create one.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-all"
                >
                  <div className="w-16 h-9 rounded border overflow-hidden bg-muted shrink-0">
                    {tpl.thumbnail ? (
                      <img src={tpl.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tpl.name}</p>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{tpl.slideCount} slides</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(tpl.savedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
