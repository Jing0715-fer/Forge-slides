"use client"

import React from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS: { category: string; items: { keys: string; desc: string }[] }[] = [
  {
    category: "General",
    items: [
      { keys: "Ctrl + Z", desc: "Undo" },
      { keys: "Ctrl + Shift + Z / Ctrl + Y", desc: "Redo" },
      { keys: "Ctrl + A", desc: "Select all elements" },
      { keys: "Ctrl + S", desc: "Save to browser (autosave)" },
      { keys: "?", desc: "Show this dialog" },
      { keys: "Esc", desc: "Cancel text edit / close dialog" },
    ],
  },
  {
    category: "Editing",
    items: [
      { keys: "T", desc: "Add text element" },
      { keys: "Delete / Backspace", desc: "Delete selected" },
      { keys: "Ctrl + D", desc: "Duplicate selected" },
      { keys: "Ctrl + C", desc: "Copy selected" },
      { keys: "Ctrl + V", desc: "Paste from clipboard" },
      { keys: "Ctrl + G", desc: "Group selected (2+ elements)" },
      { keys: "Ctrl + Shift + G", desc: "Ungroup selected" },
      { keys: "Double-click text", desc: "Edit text in place" },
      { keys: "Right-click", desc: "Context menu" },
      { keys: "Drag image file", desc: "Drop image onto canvas" },
    ],
  },
  {
    category: "Moving & Resizing",
    items: [
      { keys: "Drag element", desc: "Move (snaps to guides)" },
      { keys: "Drag grouped element", desc: "Moves entire group" },
      { keys: "Arrow keys", desc: "Nudge 1px" },
      { keys: "Shift + Arrow", desc: "Nudge 10px" },
      { keys: "Alt + Arrow", desc: "Resize by 1px" },
      { keys: "Alt + Shift + Arrow", desc: "Resize by 10px" },
      { keys: "Drag resize handle", desc: "Resize (snaps edges)" },
      { keys: "Shift + Drag corner", desc: "Lock aspect ratio" },
      { keys: "Drag rotation grip", desc: "Rotate" },
      { keys: "Shift + Rotate", desc: "Snap to 15° increments" },
    ],
  },
  {
    category: "Selection",
    items: [
      { keys: "Click element", desc: "Select" },
      { keys: "Shift + Click", desc: "Add to / remove from selection" },
      { keys: "Click empty canvas", desc: "Clear selection" },
      { keys: "Drag on empty canvas", desc: "Marquee (box) select" },
    ],
  },
  {
    category: "Alignment (multi-select)",
    items: [
      { keys: "Ctrl + Shift + L", desc: "Align left" },
      { keys: "Ctrl + Shift + E", desc: "Align center horizontal" },
      { keys: "Ctrl + Shift + R", desc: "Align right" },
      { keys: "Ctrl + Shift + T", desc: "Align top" },
      { keys: "Ctrl + Shift + M", desc: "Align middle vertical" },
      { keys: "Ctrl + Shift + B", desc: "Align bottom" },
    ],
  },
]

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold mb-2 text-primary">{group.category}</h3>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{item.desc}</span>
                    <kbd className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border whitespace-nowrap">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
