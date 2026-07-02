"use client"

import React, { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useEditor } from "@/store/editor-store"
import { saveTemplate } from "@/lib/template-store"
import { analyzeTemplate } from "@/lib/template-analyzer"
import { toast } from "sonner"
import { Bookmark, Loader2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function SaveTemplateDialog({ open, onOpenChange, onSaved }: Props) {
  const { slides } = useEditor()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Please enter a template name")
      return
    }
    if (slides.length === 0) {
      toast.error("No slides to save as a template")
      return
    }
    setSaving(true)
    try {
      // Analyze the template to extract design tokens
      const analysis = analyzeTemplate(slides)
      await saveTemplate({
        name: name.trim(),
        description: description.trim(),
        slideCount: slides.length,
        slides,
        analysis,
      })
      toast.success(`Template "${name.trim()}" saved`)
      onSaved?.()
      onOpenChange(false)
      setName("")
      setDescription("")
    } catch (e) {
      toast.error("Failed to save template: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save the current slides as a reusable template. The design style (colors, fonts, layout) will be analyzed and used to generate AI slides that match this template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Template Name</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Claude Warm Report"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-desc">Description (optional)</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Warm white background with brick-red accents, suitable for data reports"
              className="min-h-[60px] text-sm"
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span>Slides to save:</span>
              <span className="font-medium text-foreground">{slides.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Analysis:</span>
              <span className="font-medium text-foreground">Auto-extract design tokens</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
