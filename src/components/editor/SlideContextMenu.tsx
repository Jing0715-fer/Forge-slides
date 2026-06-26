"use client"

import React, { useEffect, useRef, useState } from "react"
import { useEditor } from "@/store/editor-store"
import {
  Copy, Trash2, ArrowLeft, ArrowRight, Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuState {
  x: number
  y: number
  slideId: string | null
  index: number
}

export function SlideContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    slides,
    duplicateSlide,
    removeSlide,
    addSlide,
    setCurrentSlide,
    reorderSlides,
  } = useEditor()

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement
      const slideThumb = target.closest("[data-slide-thumb]") as HTMLElement | null
      if (!slideThumb) return
      e.preventDefault()
      const slideId = slideThumb.getAttribute("data-slide-id")
      const index = parseInt(slideThumb.getAttribute("data-slide-index") || "0", 10)
      if (slideId) {
        setCurrentSlide(slideId)
        setMenu({ x: e.clientX, y: e.clientY, slideId, index })
      }
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
  }, [setCurrentSlide])

  if (!menu) return null

  const canDelete = slides.length > 1
  const canMoveLeft = menu.index > 0
  const canMoveRight = menu.index < slides.length - 1

  const items: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    disabled?: boolean
    divider?: boolean
  }[] = [
    {
      label: "Duplicate Slide",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: () => { if (menu.slideId) duplicateSlide(menu.slideId); setMenu(null) },
    },
    {
      label: "Delete Slide",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: () => { if (menu.slideId && canDelete) removeSlide(menu.slideId); setMenu(null) },
      disabled: !canDelete,
      divider: true,
    },
    {
      label: "Move Left",
      icon: <ArrowLeft className="w-3.5 h-3.5" />,
      onClick: () => { if (canMoveLeft) reorderSlides(menu.index, menu.index - 1); setMenu(null) },
      disabled: !canMoveLeft,
    },
    {
      label: "Move Right",
      icon: <ArrowRight className="w-3.5 h-3.5" />,
      onClick: () => { if (canMoveRight) reorderSlides(menu.index, menu.index + 1); setMenu(null) },
      disabled: !canMoveRight,
      divider: true,
    },
    {
      label: "New Slide After",
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: () => { addSlide(); setMenu(null) },
    },
  ]

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
