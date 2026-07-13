"use client"

import React, { useState } from "react"
import { useEditor } from "@/store/editor-store"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Crown, Eye, EyeOff, Trash2, Layers, ChevronRight, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/**
 * MasterSlideEditor — dedicated view for managing master elements.
 *
 * Master elements appear on ALL slides (behind regular elements), like
 * PowerPoint's Slide Master. This dialog provides a focused interface to:
 *   - View all master elements with their type, name, visibility
 *   - Toggle visibility per element
 *   - Delete master elements (demotes them back to the current slide)
 *   - Toggle global master visibility
 *   - Jump to the element on the canvas (selects it)
 *
 * Master elements are created by right-clicking an element → "Promote to Master".
 */
export function MasterSlideEditor({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const {
    masterElements, masterVisible, toggleMasterVisible,
    demoteFromMaster, setSelected, updateMasterElement,
  } = useEditor()

  const masterCount = masterElements.length

  function handleToggleVisibility(id: string, currentVisible: boolean) {
    updateMasterElement(id, { visible: !currentVisible })
  }

  function handleDemote(id: string) {
    demoteFromMaster([id])
    toast.success("Element demoted to current slide")
  }

  function handleSelect(id: string) {
    setSelected([id])
    onOpenChange(false)
  }

  const typeIcons: Record<string, string> = {
    text: "T",
    rect: "▭",
    ellipse: "○",
    triangle: "△",
    line: "─",
    image: "🖼",
    container: "⚙",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            Master Slide Editor
          </DialogTitle>
          <DialogDescription>
            Master elements appear on ALL slides (behind regular elements), like
            PowerPoint&apos;s Slide Master. Create one by right-clicking an element → &quot;Promote to Master&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Global visibility toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Master Elements Visibility</p>
                <p className="text-[10px] text-muted-foreground">
                  {masterVisible ? "Showing on all slides" : "Hidden on all slides"}
                </p>
              </div>
            </div>
            <Button
              variant={masterVisible ? "default" : "outline"}
              size="sm"
              className="gap-1.5 h-8"
              onClick={toggleMasterVisible}
            >
              {masterVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {masterVisible ? "Visible" : "Hidden"}
            </Button>
          </div>

          {/* Master elements list */}
          {masterCount === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
              <Crown className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No master elements yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                Right-click any element on the canvas and select &quot;Promote to Master&quot;
                to make it appear on all slides.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto sf-layers-scroll pr-1">
              {masterElements.slice().sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                <div
                  key={el.id}
                  className={cn(
                    "group flex items-center gap-2 p-2.5 rounded-md border transition-all",
                    el.visible === false
                      ? "border-border/40 bg-muted/20 opacity-60"
                      : "border-border/60 hover:border-amber-300/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/10",
                  )}
                >
                  {/* Type icon */}
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-semibold shrink-0">
                    {typeIcons[el.type] || "?"}
                  </div>

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{el.name || `${el.type} element`}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {el.type} · {Math.round(el.width)}×{Math.round(el.height)}
                      {el.fill && el.fill !== "transparent" && (
                        <span className="ml-1.5 inline-flex items-center gap-1">
                          · <span className="inline-block w-2 h-2 rounded-full border" style={{ background: el.fill }} />
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
                      onClick={() => handleSelect(el.id)}
                      title="Select on canvas"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
                      onClick={() => handleToggleVisibility(el.id, el.visible !== false)}
                      title={el.visible === false ? "Show" : "Hide"}
                    >
                      {el.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      onClick={() => handleDemote(el.id)}
                      title="Demote to current slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {masterCount > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>{masterCount} master element{masterCount === 1 ? "" : "s"}</span>
              <span>{masterElements.filter((e) => e.visible !== false).length} visible</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
