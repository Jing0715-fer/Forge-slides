"use client"

import React, { useEffect, useRef, useState } from "react"
import { useEditor } from "@/store/editor-store"
import {
  Copy, Trash2, BringToFront, SendToBack, Lock, Unlock,
  Group, Ungroup, ClipboardPaste,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuState {
  x: number
  y: number
  elementId: string | null
}

export function CanvasContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    selectedIds, setSelected, removeElements, duplicateElements,
    bringToFront, sendToBack, copy, paste, groupElements, ungroupElements,
    currentSlide, updateElement,
  } = useEditor()

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Check if we right-clicked on or inside a canvas element
      const canvasEl = target.closest("[data-element-id]") as HTMLElement | null
      const canvas = target.closest("#editor-canvas")
      if (!canvas) return
      e.preventDefault()
      const elementId = canvasEl?.getAttribute("data-element-id") || null
      if (elementId && !selectedIds.includes(elementId)) {
        setSelected([elementId])
      }
      setMenu({ x: e.clientX, y: e.clientY, elementId })
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setMenu(null)
      }
    }
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("mousedown", onClick)
    }
  }, [selectedIds, setSelected])

  if (!menu) return null

  const slide = currentSlide()
  const selected = slide.elements.filter((e) => selectedIds.includes(e.id))
  const hasSelection = selected.length > 0
  const hasMulti = selected.length >= 2
  const hasGroup = selected.some((e) => e.groupId)
  const allLocked = selected.length > 0 && selected.every((e) => e.locked)

  const items: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    disabled?: boolean
    divider?: boolean
  }[] = [
    {
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: () => { duplicateElements(selectedIds); setMenu(null) },
      disabled: !hasSelection,
    },
    {
      label: "Copy",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: () => { copy(selectedIds); setMenu(null) },
      disabled: !hasSelection,
    },
    {
      label: "Paste",
      icon: <ClipboardPaste className="w-3.5 h-3.5" />,
      onClick: () => { paste(); setMenu(null) },
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: () => { removeElements(selectedIds); setMenu(null) },
      disabled: !hasSelection,
      divider: true,
    },
    {
      label: "Bring to Front",
      icon: <BringToFront className="w-3.5 h-3.5" />,
      onClick: () => { selectedIds.forEach(bringToFront); setMenu(null) },
      disabled: !hasSelection,
    },
    {
      label: "Send to Back",
      icon: <SendToBack className="w-3.5 h-3.5" />,
      onClick: () => { selectedIds.forEach(sendToBack); setMenu(null) },
      disabled: !hasSelection,
      divider: true,
    },
    {
      label: "Group",
      icon: <Group className="w-3.5 h-3.5" />,
      onClick: () => { groupElements(selectedIds); setMenu(null) },
      disabled: !hasMulti,
    },
    {
      label: "Ungroup",
      icon: <Ungroup className="w-3.5 h-3.5" />,
      onClick: () => { ungroupElements(selectedIds); setMenu(null) },
      disabled: !hasGroup,
      divider: true,
    },
    {
      label: allLocked ? "Unlock" : "Lock",
      icon: allLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />,
      onClick: () => {
        selected.forEach((el) => updateElement(el.id, { locked: !allLocked }))
        setMenu(null)
      },
      disabled: !hasSelection,
    },
  ]

  // Clamp menu position to viewport
  const x = Math.min(menu.x, window.innerWidth - 220)
  const y = Math.min(menu.y, window.innerHeight - items.length * 32 - 16)

  return (
    <div
      ref={menuRef}
      className="fixed z-[10000] min-w-[200px] bg-popover border border-border rounded-md shadow-lg py-1 text-sm"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <button
            disabled={item.disabled}
            onClick={item.onClick}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent transition-colors",
            )}
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span>{item.label}</span>
          </button>
          {item.divider && <div className="h-px bg-border my-1" />}
        </React.Fragment>
      ))}
    </div>
  )
}
