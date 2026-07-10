"use client"

import { create } from "zustand"
import type {
  EditorElement,
  Slide,
  TextElement,
  ShapeElement,
  ImageElement,
  ContainerElement,
  ElementType,
} from "@/types/editor"
import { v4 as uuid } from "uuid"

// ---------- Canvas configuration ----------
export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720
export const SNAP_THRESHOLD = 6 // px (canvas space)

// ---------- Element factories ----------
function baseElement(
  type: ElementType,
  partial: Partial<EditorElement>,
): EditorElement {
  return {
    id: uuid(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    x: 100,
    y: 100,
    width: 240,
    height: 120,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 0,
    fill: "#ffffff",
    stroke: "#0f172a",
    strokeWidth: 0,
    borderRadius: 0,
    shadow: false,
    shadowColor: "rgba(15, 23, 42, 0.15)",
    shadowBlur: 24,
    shadowX: 0,
    shadowY: 8,
    ...partial,
  } as EditorElement
}

export function createTextElement(
  partial: Partial<TextElement> = {},
): TextElement {
  return {
    ...baseElement("text", {
      width: 420,
      height: 80,
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
    }),
    text: "Double click to edit text",
    fontSize: 28,
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: "400",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "left",
    color: "#0f172a",
    lineHeight: 1.4,
    letterSpacing: 0,
    verticalAlign: "middle",
    autoSize: false,
    padding: 8,
    listType: "none",
    listStyle: "disc",
    listIndent: 0,
    wrap: true,
    name: "Text",
    ...partial,
  } as TextElement
}

export function createShapeElement(
  shape: "rect" | "ellipse" | "triangle" | "line",
  partial: Partial<ShapeElement> = {},
): ShapeElement {
  const defaults: Record<string, Partial<ShapeElement>> = {
    rect: { width: 280, height: 180, fill: "#3b82f6", borderRadius: 12 },
    ellipse: { width: 220, height: 220, fill: "#10b981" },
    triangle: { width: 240, height: 220, fill: "#f59e0b" },
    line: {
      width: 280,
      height: 0,
      fill: "transparent",
      stroke: "#0f172a",
      strokeWidth: 3,
    },
  }
  return {
    ...(baseElement(shape, defaults[shape]) as ShapeElement),
    name: shape.charAt(0).toUpperCase() + shape.slice(1),
    ...partial,
  } as ShapeElement
}

export function createImageElement(
  src: string,
  partial: Partial<ImageElement> = {},
): ImageElement {
  return {
    ...(baseElement("image", {
      width: 360,
      height: 240,
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
    }) as ImageElement),
    src,
    alt: "Image",
    objectFit: "cover",
    name: "Image",
    ...partial,
  } as ImageElement
}

export function createContainerElement(
  html: string,
  partial: Partial<ContainerElement> = {},
): ContainerElement {
  return {
    ...(baseElement("container", {
      width: 480,
      height: 320,
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
    }) as ContainerElement),
    html,
    name: "HTML",
    ...partial,
  } as ContainerElement
}

// ---------- Default slide ----------
function defaultSlide(): Slide {
  const title = createTextElement({
    x: 90,
    y: 90,
    width: 1100,
    height: 96,
    text: "Welcome to SlideForge",
    fontSize: 64,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "left",
    verticalAlign: "middle",
    name: "Title",
  })
  const subtitle = createTextElement({
    x: 92,
    y: 200,
    width: 900,
    height: 56,
    text: "A PowerPoint-like HTML editor for fine-tuning AI-generated slides.",
    fontSize: 24,
    fontWeight: "400",
    color: "#475569",
    textAlign: "left",
    verticalAlign: "middle",
    name: "Subtitle",
  })
  const card1 = createShapeElement("rect", {
    x: 90,
    y: 320,
    width: 340,
    height: 240,
    fill: "#eef2ff",
    stroke: "#c7d2fe",
    strokeWidth: 1,
    borderRadius: 16,
    shadow: true,
    name: "Card A",
  })
  const card2 = createShapeElement("rect", {
    x: 470,
    y: 320,
    width: 340,
    height: 240,
    fill: "#ecfeff",
    stroke: "#a5f3fc",
    strokeWidth: 1,
    borderRadius: 16,
    shadow: true,
    name: "Card B",
  })
  const card3 = createShapeElement("rect", {
    x: 850,
    y: 320,
    width: 340,
    height: 240,
    fill: "#fef3c7",
    stroke: "#fde68a",
    strokeWidth: 1,
    borderRadius: 16,
    shadow: true,
    name: "Card C",
  })
  const label1 = createTextElement({
    x: 110,
    y: 360,
    width: 300,
    height: 40,
    text: "Drag & Snap",
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
    verticalAlign: "middle",
    name: "Label A",
  })
  const label2 = createTextElement({
    x: 490,
    y: 360,
    width: 300,
    height: 40,
    text: "Resize & Rotate",
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
    verticalAlign: "middle",
    name: "Label B",
  })
  const label3 = createTextElement({
    x: 870,
    y: 360,
    width: 300,
    height: 40,
    text: "Export HTML",
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
    verticalAlign: "middle",
    name: "Label C",
  })
  const body1 = createTextElement({
    x: 110,
    y: 420,
    width: 300,
    height: 110,
    text: "Move elements and they snap to alignment guides automatically — just like PowerPoint.",
    fontSize: 16,
    fontWeight: "400",
    color: "#475569",
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: 1.5,
    name: "Body A",
  })
  const body2 = createTextElement({
    x: 490,
    y: 420,
    width: 300,
    height: 110,
    text: "Eight resize handles plus a rotation grip let you fine-tune any object precisely.",
    fontSize: 16,
    fontWeight: "400",
    color: "#475569",
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: 1.5,
    name: "Body B",
  })
  const body3 = createTextElement({
    x: 870,
    y: 420,
    width: 300,
    height: 110,
    text: "Edit AI-generated HTML in place, then export clean production-ready markup.",
    fontSize: 16,
    fontWeight: "400",
    color: "#475569",
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: 1.5,
    name: "Body C",
  })
  const elements: EditorElement[] = [
    title,
    subtitle,
    card1,
    card2,
    card3,
    label1,
    label2,
    label3,
    body1,
    body2,
    body3,
  ].map((el, i) => ({ ...el, zIndex: i }))

  return {
    id: uuid(),
    name: "Slide 1",
    background: "#ffffff",
    elements,
  }
}

// ---------- Store types ----------

/** A single history entry with a descriptive label and timestamp */
export interface HistoryEntry {
  /** The slide state at this point in history */
  slides: Slide[]
  /** Human-readable description of the action that led to this state */
  label: string
  /** Timestamp when this entry was created */
  timestamp: number
  /** Icon name (lucide) to display in the history panel */
  icon: string
}

interface EditorState {
  slides: Slide[]
  currentSlideId: string
  selectedIds: string[]
  clipboard: EditorElement[]
  // Master elements appear on ALL slides (logos, page numbers, etc.)
  masterElements: EditorElement[]
  masterVisible: boolean
  // history — now with labeled entries
  past: HistoryEntry[]
  future: HistoryEntry[]
  // canvas
  zoom: number
  showGrid: boolean
  showGuides: boolean
  // editing
  editingId: string | null
  // actions
  currentSlide: () => Slide
  setSelected: (ids: string[]) => void
  toggleSelected: (id: string) => void
  clearSelection: () => void
  setZoom: (z: number) => void
  toggleGrid: () => void
  toggleGuides: () => void
  setEditing: (id: string | null) => void
  // mutations
  addElement: (el: EditorElement) => void
  updateElement: (id: string, patch: Partial<EditorElement>) => void
  updateElements: (
    updates: { id: string; patch: Partial<EditorElement> }[],
  ) => void
  removeElements: (ids: string[]) => void
  duplicateElements: (ids: string[]) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  // alignment (multi-selection)
  alignElements: (
    ids: string[],
    mode:
      | "left"
      | "centerH"
      | "right"
      | "top"
      | "middle"
      | "bottom",
  ) => void
  distributeElements: (ids: string[], axis: "horizontal" | "vertical") => void
  matchSize: (ids: string[], dimension: "width" | "height" | "both") => void
  // grouping
  groupElements: (ids: string[]) => void
  ungroupElements: (ids: string[]) => void
  // slide background image
  setSlideBackgroundImage: (id: string, src: string | null) => void
  // slides
  addSlide: () => void
  duplicateSlide: (id: string) => void
  removeSlide: (id: string) => void
  setCurrentSlide: (id: string) => void
  reorderSlides: (from: number, to: number) => void
  setSlideBackground: (id: string, bg: string) => void
  setSlideRawHtml: (id: string, rawHtml: string) => void
  setSlideName: (id: string, name: string) => void
  setSlideNotes: (id: string, notes: string) => void
  setSlideTransition: (id: string, transition: "none" | "fade" | "slide" | "zoom" | "inherit") => void
  // Per-slide canvas size. Undefined falls back to CANVAS_WIDTH × CANVAS_HEIGHT
  // (1280×720). Setting an explicit size lets the slide render at a different
  // aspect ratio — e.g. a 16:10 deck at 1280×800, a 4:3 deck at 1024×768, or
  // a presentation at 1920×1080 for a high-DPI export.
  setSlideSize: (id: string, width: number, height: number) => void
  // Master elements
  promoteToMaster: (ids: string[]) => void
  demoteFromMaster: (ids: string[]) => void
  updateMasterElement: (id: string, patch: Partial<EditorElement>) => void
  toggleMasterVisible: () => void
  // clipboard
  copy: (ids: string[]) => void
  paste: () => void
  // Format painter (copy formatting from one element to others)
  copyFormat: (id: string) => void
  pasteFormat: (ids: string[]) => void
  formatClipboard: Partial<EditorElement> | null
  // history
  undo: () => void
  redo: () => void
  /** Jump to a specific point in history by index. Negative = past, positive = future. */
  jumpToHistory: (index: number) => void
  /** Clear all history (past + future) */
  clearHistory: () => void
  pushHistorySnapshot: (label: string, icon?: string) => void
  // import / replace
  replaceSlides: (slides: Slide[]) => void
  loadProject: (data: { slides: Slide[]; currentSlideId?: string | null }) => void
  reset: () => void
}

function snapshot(slides: Slide[]): Slide[][] {
  // Deep clone via structuredClone
  return [structuredClone(slides)]
}

/** Create a labeled history entry from the current slides state */
function makeHistoryEntry(slides: Slide[], label: string, icon: string): HistoryEntry {
  return {
    slides: structuredClone(slides),
    label,
    timestamp: Date.now(),
    icon,
  }
}

/**
 * Helper to push a history entry. Returns the new past array (capped at 50).
 * Use this in actions that modify slides.
 */
function pushHistory(past: HistoryEntry[], slides: Slide[], label: string, icon: string): HistoryEntry[] {
  return [...past, makeHistoryEntry(slides, label, icon)].slice(-50)
}

function reindex(elements: EditorElement[]): EditorElement[] {
  return elements
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((el, i) => ({ ...el, zIndex: i }))
}

export const useEditor = create<EditorState>((set, get) => ({
  slides: [defaultSlide()],
  currentSlideId: "",
  selectedIds: [],
  clipboard: [],
  formatClipboard: null,
  masterElements: [],
  masterVisible: true,
  past: [],
  future: [],
  zoom: 0.62,
  showGrid: false,
  showGuides: true,
  editingId: null,

  currentSlide: () => {
    const state = get()
    const id = state.currentSlideId || state.slides[0]?.id
    return state.slides.find((s) => s.id === id) ?? state.slides[0]
  },

  setSelected: (ids) => set({ selectedIds: ids, editingId: null }),
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
      editingId: null,
    })),
  clearSelection: () => set({ selectedIds: [], editingId: null }),
  setZoom: (z) => set({ zoom: Math.min(2, Math.max(0.2, z)) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  setEditing: (id) => set({ editingId: id }),

  addElement: (el) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const maxZ = slide.elements.reduce(
          (m, e) => Math.max(m, e.zIndex),
          -1,
        )
        return {
          ...slide,
          elements: reindex([...slide.elements, { ...el, zIndex: maxZ + 1 }]),
        }
      })
      return {
        slides,
        past: pushHistory(s.past, s.slides, "Add element", "Plus"),
        future: [],
        selectedIds: [el.id],
        editingId: null,
      }
    })
  },

  updateElement: (id, patch) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        return {
          ...slide,
          elements: slide.elements.map((el) =>
            el.id === id ? ({ ...el, ...patch } as EditorElement) : el,
          ),
        }
      })
      return { slides }
    })
  },

  updateElements: (updates) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        return {
          ...slide,
          elements: slide.elements.map((el) => {
            const u = updates.find((x) => x.id === el.id)
            return u ? ({ ...el, ...u.patch } as EditorElement) : el
          }),
        }
      })
      return { slides }
    })
  },

  removeElements: (ids) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        return {
          ...slide,
          elements: reindex(
            slide.elements.filter((el) => !ids.includes(el.id)),
          ),
        }
      })
      return {
        slides,
        past: pushHistory(s.past, s.slides, "Delete elements", "Trash2"),
        future: [],
        selectedIds: [],
        editingId: null,
      }
    })
  },

  duplicateElements: (ids) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const toDup = slide.elements.filter((el) => ids.includes(el.id))
        const maxZ = slide.elements.reduce(
          (m, e) => Math.max(m, e.zIndex),
          -1,
        )
        const dups: EditorElement[] = toDup.map((el, i) => ({
          ...(structuredClone(el) as EditorElement),
          id: uuid(),
          x: el.x + 24,
          y: el.y + 24,
          zIndex: maxZ + 1 + i,
          name: `${el.name} copy`,
        }))
        return {
          ...slide,
          elements: reindex([...slide.elements, ...dups]),
        }
      })
      const current = slides.find(
        (sl) => sl.id === (s.currentSlideId || s.slides[0]?.id),
      )
      const newIds = current?.elements
        .filter((e) => !s.slides.flatMap((sl) => sl.elements).some((x) => x.id === e.id))
        .map((e) => e.id) ?? []
      return {
        slides,
        past: pushHistory(s.past, s.slides, "Duplicate elements", "Copy"),
        future: [],
        selectedIds: newIds,
      }
    })
  },

  bringForward: (id) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)
        const idx = elements.findIndex((e) => e.id === id)
        if (idx < 0 || idx === elements.length - 1) return slide
        ;[elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]]
        return {
          ...slide,
          elements: reindex(elements),
        }
      })
      return { slides }
    })
  },

  sendBackward: (id) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)
        const idx = elements.findIndex((e) => e.id === id)
        if (idx <= 0) return slide
        ;[elements[idx], elements[idx - 1]] = [elements[idx - 1], elements[idx]]
        return {
          ...slide,
          elements: reindex(elements),
        }
      })
      return { slides }
    })
  },

  bringToFront: (id) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)
        const idx = elements.findIndex((e) => e.id === id)
        if (idx < 0) return slide
        const [el] = elements.splice(idx, 1)
        elements.push(el)
        return {
          ...slide,
          elements: reindex(elements),
        }
      })
      return { slides }
    })
  },

  sendToBack: (id) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)
        const idx = elements.findIndex((e) => e.id === id)
        if (idx < 0) return slide
        const [el] = elements.splice(idx, 1)
        elements.unshift(el)
        return {
          ...slide,
          elements: reindex(elements),
        }
      })
      return { slides }
    })
  },

  alignElements: (ids, mode) => {
    set((s) => {
      if (ids.length < 2) return s
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const targets = slide.elements.filter((e) => ids.includes(e.id))
        if (targets.length < 2) return slide
        // Compute reference bounds based on mode
        const minLeft = Math.min(...targets.map((e) => e.x))
        const maxRight = Math.max(...targets.map((e) => e.x + e.width))
        const minTop = Math.min(...targets.map((e) => e.y))
        const maxBottom = Math.max(...targets.map((e) => e.y + e.height))
        const centerHX = (minLeft + maxRight) / 2
        const centerHY = (minTop + maxBottom) / 2
        const elements = slide.elements.map((el) => {
          if (!ids.includes(el.id)) return el
          let patch: Partial<EditorElement> = {}
          switch (mode) {
            case "left":
              patch = { x: minLeft }
              break
            case "centerH":
              patch = { x: centerHX - el.width / 2 }
              break
            case "right":
              patch = { x: maxRight - el.width }
              break
            case "top":
              patch = { y: minTop }
              break
            case "middle":
              patch = { y: centerHY - el.height / 2 }
              break
            case "bottom":
              patch = { y: maxBottom - el.height }
              break
          }
          return { ...el, ...patch } as EditorElement
        })
        return { ...slide, elements }
      })
      return { slides, past: pushHistory(s.past, s.slides, "Align elements", "AlignStartVertical"), future: [] }
    })
  },

  distributeElements: (ids, axis) => {
    set((s) => {
      if (ids.length < 3) return s
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        let targets = slide.elements.filter((e) => ids.includes(e.id))
        if (targets.length < 3) return slide
        // Sort by position along axis
        if (axis === "horizontal") {
          targets = targets.slice().sort((a, b) => a.x - b.x)
          const first = targets[0]
          const last = targets[targets.length - 1]
          const totalSpan = last.x + last.width - first.x
          const totalSize = targets.reduce((sum, e) => sum + e.width, 0)
          const gap = (totalSpan - totalSize) / (targets.length - 1)
          let cursor = first.x
          const updates = new Map<string, number>()
          for (const t of targets) {
            updates.set(t.id, cursor)
            cursor += t.width + gap
          }
          return {
            ...slide,
            elements: slide.elements.map((el) =>
              updates.has(el.id) ? { ...el, x: updates.get(el.id)! } : el,
            ),
          }
        } else {
          targets = targets.slice().sort((a, b) => a.y - b.y)
          const first = targets[0]
          const last = targets[targets.length - 1]
          const totalSpan = last.y + last.height - first.y
          const totalSize = targets.reduce((sum, e) => sum + e.height, 0)
          const gap = (totalSpan - totalSize) / (targets.length - 1)
          let cursor = first.y
          const updates = new Map<string, number>()
          for (const t of targets) {
            updates.set(t.id, cursor)
            cursor += t.height + gap
          }
          return {
            ...slide,
            elements: slide.elements.map((el) =>
              updates.has(el.id) ? { ...el, y: updates.get(el.id)! } : el,
            ),
          }
        }
      })
      return { slides, past: pushHistory(s.past, s.slides, "Distribute elements", "AlignHorizontalSpaceAround"), future: [] }
    })
  },

  matchSize: (ids, dimension) => {
    set((s) => {
      if (ids.length < 2) return s
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const targets = slide.elements.filter((e) => ids.includes(e.id))
        if (targets.length < 2) return slide
        // Use first selected as reference
        const ref = targets[0]
        const elements = slide.elements.map((el) => {
          if (!ids.includes(el.id)) return el
          const patch: Partial<EditorElement> = {}
          if (dimension === "width" || dimension === "both") patch.width = ref.width
          if (dimension === "height" || dimension === "both") patch.height = ref.height
          return { ...el, ...patch } as EditorElement
        })
        return { ...slide, elements }
      })
      return { slides, past: pushHistory(s.past, s.slides, "Match size", "SquareEqual"), future: [] }
    })
  },

  groupElements: (ids) => {
    set((s) => {
      if (ids.length < 2) return s
      const groupId = uuid()
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        return {
          ...slide,
          elements: slide.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, groupId } as EditorElement) : el,
          ),
        }
      })
      return { slides, past: pushHistory(s.past, s.slides, "Group elements", "Group"), future: [] }
    })
  },

  ungroupElements: (ids) => {
    set((s) => {
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        // Get the groupIds of the selected elements
        const selectedGroups = new Set(
          slide.elements
            .filter((el) => ids.includes(el.id) && el.groupId)
            .map((el) => el.groupId!),
        )
        if (selectedGroups.size === 0) return slide
        return {
          ...slide,
          elements: slide.elements.map((el) =>
            el.groupId && selectedGroups.has(el.groupId)
              ? ({ ...el, groupId: undefined } as EditorElement)
              : el,
          ),
        }
      })
      return { slides, past: pushHistory(s.past, s.slides, "Ungroup elements", "Ungroup"), future: [] }
    })
  },

  setSlideBackgroundImage: (id, src) => {
    set((s) => {
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, backgroundImage: src } : sl,
      )
      return { slides, past: pushHistory(s.past, s.slides, "Set background image", "Image"), future: [] }
    })
  },

  addSlide: () => {
    set((s) => {
      const newSlide: Slide = {
        id: uuid(),
        name: `Slide ${s.slides.length + 1}`,
        background: "#ffffff",
        elements: [],
      }
      return {
        slides: [...s.slides, newSlide],
        currentSlideId: newSlide.id,
        selectedIds: [],
        past: pushHistory(s.past, s.slides, "Add slide", "Plus"),
        future: [],
      }
    })
  },

  duplicateSlide: (id) => {
    set((s) => {
      const idx = s.slides.findIndex((sl) => sl.id === id)
      if (idx < 0) return s
      const original = s.slides[idx]
      const copy: Slide = {
        ...structuredClone(original),
        id: uuid(),
        name: `${original.name} copy`,
        elements: original.elements.map((el) => ({
          ...(structuredClone(el) as EditorElement),
          id: uuid(),
        })),
      }
      const slides = [...s.slides]
      slides.splice(idx + 1, 0, copy)
      return {
        slides,
        currentSlideId: copy.id,
        selectedIds: [],
        past: pushHistory(s.past, s.slides, "Duplicate slide", "Copy"),
        future: [],
      }
    })
  },

  removeSlide: (id) => {
    set((s) => {
      if (s.slides.length <= 1) return s
      const idx = s.slides.findIndex((sl) => sl.id === id)
      const slides = s.slides.filter((sl) => sl.id !== id)
      const nextIdx = Math.max(0, idx - 1)
      return {
        slides,
        currentSlideId: slides[nextIdx].id,
        selectedIds: [],
        past: pushHistory(s.past, s.slides, "Delete slide", "Trash2"),
        future: [],
      }
    })
  },

  setCurrentSlide: (id) => set({ currentSlideId: id, selectedIds: [], editingId: null }),

  reorderSlides: (from, to) => {
    set((s) => {
      const slides = [...s.slides]
      const [moved] = slides.splice(from, 1)
      slides.splice(to, 0, moved)
      return { slides, past: pushHistory(s.past, s.slides, "Reorder slides", "ArrowLeftRight"), future: [] }
    })
  },

  setSlideBackground: (id, bg) => {
    set((s) => {
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, background: bg } : sl,
      )
      return { slides, past: pushHistory(s.past, s.slides, "Set background", "Palette"), future: [] }
    })
  },

  setSlideRawHtml: (id, rawHtml) => {
    set((s) => {
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, rawHtml } : sl,
      )
      // Don't push history on every keystroke — only on significant changes
      // History is pushed by the caller when needed (e.g. on blur)
      return { slides }
    })
  },

  setSlideName: (id, name) => {
    set((s) => {
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, name } : sl,
      )
      return { slides }
    })
  },

  setSlideNotes: (id, notes) => {
    set((s) => {
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, notes } : sl,
      )
      return { slides }
    })
  },

  setSlideTransition: (id, transition) => {
    set((s) => {
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, transition } : sl,
      )
      return { slides, past: pushHistory(s.past, s.slides, "Set transition", "Sparkles"), future: [] }
    })
  },

  setSlideSize: (id, width, height) => {
    set((s) => {
      // Clamp to sane bounds so the slide can't be sized to 0×0 or 99999×99999.
      const w = Math.max(80, Math.min(8192, Math.round(width)))
      const h = Math.max(60, Math.min(8192, Math.round(height)))
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, width: w, height: h } : sl,
      )
      return { slides, past: pushHistory(s.past, s.slides, "Resize slide", "Maximize2"), future: [] }
    })
  },

  promoteToMaster: (ids) => {
    set((s) => {
      const slide = s.slides.find((sl) => sl.id === (s.currentSlideId || s.slides[0]?.id))
      if (!slide) return s
      // Remove elements from current slide
      const remaining = slide.elements.filter((el) => !ids.includes(el.id))
      // Elements to promote
      const promoted = slide.elements.filter((el) => ids.includes(el.id))
      const slides = s.slides.map((sl) =>
        sl.id === slide.id ? { ...sl, elements: remaining } : sl,
      )
      return {
        slides,
        masterElements: [...s.masterElements, ...promoted],
        selectedIds: [],
        past: pushHistory(s.past, s.slides, "Promote to master", "Crown"),
        future: [],
      }
    })
  },

  demoteFromMaster: (ids) => {
    set((s) => {
      const remaining = s.masterElements.filter((el) => !ids.includes(el.id))
      const demoted = s.masterElements.filter((el) => ids.includes(el.id))
      const slide = s.slides.find((sl) => sl.id === (s.currentSlideId || s.slides[0]?.id))
      if (!slide) return { masterElements: remaining }
      const slides = s.slides.map((sl) =>
        sl.id === slide.id ? { ...sl, elements: [...sl.elements, ...demoted] } : sl,
      )
      return {
        slides,
        masterElements: remaining,
        selectedIds: [],
        past: pushHistory(s.past, s.slides, "Demote from master", "ArrowDownToLine"),
        future: [],
      }
    })
  },

  updateMasterElement: (id, patch) => {
    set((s) => {
      const masterElements = s.masterElements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as EditorElement) : el,
      )
      return { masterElements }
    })
  },

  toggleMasterVisible: () => {
    set((s) => ({ masterVisible: !s.masterVisible }))
  },

  copy: (ids) => {
    set((s) => {
      const slide = s.slides.find(
        (sl) => sl.id === (s.currentSlideId || s.slides[0]?.id),
      )
      if (!slide) return s
      const clipboard = slide.elements.filter((el) => ids.includes(el.id))
      return { clipboard: structuredClone(clipboard) }
    })
  },

  paste: () => {
    set((s) => {
      if (s.clipboard.length === 0) return s
      const slides = s.slides.map((slide) => {
        if (slide.id !== (s.currentSlideId || s.slides[0]?.id)) return slide
        const maxZ = slide.elements.reduce(
          (m, e) => Math.max(m, e.zIndex),
          -1,
        )
        const dups: EditorElement[] = s.clipboard.map((el, i) => ({
          ...(structuredClone(el) as EditorElement),
          id: uuid(),
          x: el.x + 24,
          y: el.y + 24,
          zIndex: maxZ + 1 + i,
          name: `${el.name} copy`,
        }))
        return {
          ...slide,
          elements: reindex([...slide.elements, ...dups]),
        }
      })
      const current = slides.find(
        (sl) => sl.id === (s.currentSlideId || s.slides[0]?.id),
      )
      const newIds =
        current?.elements
          .slice(-s.clipboard.length)
          .map((e) => e.id) ?? []
      return {
        slides,
        past: pushHistory(s.past, s.slides, "Paste", "ClipboardPaste"),
        future: [],
        selectedIds: newIds,
      }
    })
  },

  copyFormat: (id) => {
    set((s) => {
      const slide = s.slides.find((sl) => sl.id === (s.currentSlideId || s.slides[0]?.id))
      if (!slide) return s
      const el = slide.elements.find((e) => e.id === id)
      if (!el) return s
      // Copy only formatting properties (not position, size, text content, id, etc.)
      const { ...rest } = el
      const formatProps: Partial<EditorElement> = {
        fill: rest.fill,
        stroke: rest.stroke,
        strokeWidth: rest.strokeWidth,
        borderRadius: rest.borderRadius,
        shadow: rest.shadow,
        shadowColor: rest.shadowColor,
        shadowBlur: rest.shadowBlur,
        shadowX: rest.shadowX,
        shadowY: rest.shadowY,
        opacity: rest.opacity,
      } as Partial<EditorElement>
      // For text elements, also copy typography
      if (el.type === "text") {
        const t = el as TextElement
        Object.assign(formatProps, {
          fontSize: t.fontSize,
          fontFamily: t.fontFamily,
          fontWeight: t.fontWeight,
          fontStyle: t.fontStyle,
          textDecoration: t.textDecoration,
          textAlign: t.textAlign,
          color: t.color,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          padding: t.padding,
          listType: t.listType,
          listStyle: t.listStyle,
          listIndent: t.listIndent,
          wrap: t.wrap,
        })
      }
      return { formatClipboard: formatProps }
    })
  },

  pasteFormat: (ids) => {
    set((s) => {
      if (!s.formatClipboard) return s
      const slide = s.slides.find((sl) => sl.id === (s.currentSlideId || s.slides[0]?.id))
      if (!slide) return s
      const slides = s.slides.map((sl) => {
        if (sl.id !== slide.id) return sl
        return {
          ...sl,
          elements: sl.elements.map((el) => {
            if (!ids.includes(el.id)) return el
            // Only apply type-appropriate properties
            const patch: Partial<EditorElement> = {}
            const fmt = s.formatClipboard!
            // Common properties
            if (fmt.fill !== undefined) patch.fill = fmt.fill
            if (fmt.stroke !== undefined) patch.stroke = fmt.stroke
            if (fmt.strokeWidth !== undefined) patch.strokeWidth = fmt.strokeWidth
            if (fmt.borderRadius !== undefined) patch.borderRadius = fmt.borderRadius
            if (fmt.shadow !== undefined) patch.shadow = fmt.shadow
            if (fmt.shadowColor !== undefined) patch.shadowColor = fmt.shadowColor
            if (fmt.shadowBlur !== undefined) patch.shadowBlur = fmt.shadowBlur
            if (fmt.shadowX !== undefined) patch.shadowX = fmt.shadowX
            if (fmt.shadowY !== undefined) patch.shadowY = fmt.shadowY
            if (fmt.opacity !== undefined) patch.opacity = fmt.opacity
            // Text-specific
            if (el.type === "text") {
              if (fmt.fontSize !== undefined) (patch as Partial<TextElement>).fontSize = fmt.fontSize
              if (fmt.fontFamily !== undefined) (patch as Partial<TextElement>).fontFamily = fmt.fontFamily!
              if (fmt.fontWeight !== undefined) (patch as Partial<TextElement>).fontWeight = fmt.fontWeight!
              if (fmt.fontStyle !== undefined) (patch as Partial<TextElement>).fontStyle = fmt.fontStyle! as "normal" | "italic"
              if (fmt.textDecoration !== undefined) (patch as Partial<TextElement>).textDecoration = fmt.textDecoration! as TextElement["textDecoration"]
              if (fmt.textAlign !== undefined) (patch as Partial<TextElement>).textAlign = fmt.textAlign! as TextElement["textAlign"]
              if (fmt.color !== undefined) (patch as Partial<TextElement>).color = fmt.color!
              if (fmt.lineHeight !== undefined) (patch as Partial<TextElement>).lineHeight = fmt.lineHeight!
              if (fmt.letterSpacing !== undefined) (patch as Partial<TextElement>).letterSpacing = fmt.letterSpacing!
              if (fmt.padding !== undefined) (patch as Partial<TextElement>).padding = fmt.padding!
              if (fmt.listType !== undefined) (patch as Partial<TextElement>).listType = fmt.listType! as TextElement["listType"]
              if (fmt.listStyle !== undefined) (patch as Partial<TextElement>).listStyle = fmt.listStyle! as TextElement["listStyle"]
              if (fmt.listIndent !== undefined) (patch as Partial<TextElement>).listIndent = fmt.listIndent!
              if (fmt.wrap !== undefined) (patch as Partial<TextElement>).wrap = fmt.wrap
            }
            return { ...el, ...patch } as EditorElement
          }),
        }
      })
      return {
        slides,
        past: pushHistory(s.past, s.slides, "Paste format", "Paintbrush"),
        future: [],
      }
    })
  },

  undo: () => {
    set((s) => {
      if (s.past.length === 0) return s
      const previousEntry = s.past[s.past.length - 1]
      // Guard against corrupted history entries (slides may be undefined
      // if a history snapshot was taken at the wrong time)
      if (!previousEntry || !previousEntry.slides || previousEntry.slides.length === 0) {
        return { past: s.past.slice(0, -1) }
      }
      const past = s.past.slice(0, -1)
      const future = [makeHistoryEntry(s.slides, "Current state", "Circle"), ...s.future].slice(0, 50)
      const currentSlideId =
        previousEntry.slides.find((sl) => sl.id === s.currentSlideId)?.id ??
        previousEntry.slides[0]?.id ??
        ""
      return {
        slides: previousEntry.slides,
        past,
        future,
        currentSlideId,
        selectedIds: [],
        editingId: null,
      }
    })
  },

  redo: () => {
    set((s) => {
      if (s.future.length === 0) return s
      const nextEntry = s.future[0]
      if (!nextEntry || !nextEntry.slides || nextEntry.slides.length === 0) {
        return { future: s.future.slice(1) }
      }
      const future = s.future.slice(1)
      const past = [...s.past, makeHistoryEntry(s.slides, "Before redo", "RotateCcw")].slice(-50)
      const currentSlideId =
        nextEntry.slides.find((sl) => sl.id === s.currentSlideId)?.id ?? nextEntry.slides[0]?.id ?? ""
      return {
        slides: nextEntry.slides,
        past,
        future,
        currentSlideId,
        selectedIds: [],
        editingId: null,
      }
    })
  },

  jumpToHistory: (index) => {
    set((s) => {
      // index = 0 means current state (no-op)
      // index < 0 means undo |index| times (jump into past)
      // index > 0 means redo |index| times (jump into future)
      if (index === 0) return s
      if (index < 0) {
        // Jump back into past
        const steps = Math.min(Math.abs(index), s.past.length)
        if (steps === 0) return s
        // Entries to move from past to future (in reverse order)
        const movedToFuture = s.past.slice(-steps).reverse().map((entry) => ({
          ...entry,
          label: entry.label,
          timestamp: Date.now(),
        }))
        // Also add current state to future
        const currentStateEntry = makeHistoryEntry(s.slides, "Current state", "Circle")
        const future = [currentStateEntry, ...movedToFuture, ...s.future].slice(0, 50)
        const past = s.past.slice(0, -steps)
        const targetEntry = s.past[s.past.length - steps]
        const currentSlideId =
          targetEntry.slides.find((sl) => sl.id === s.currentSlideId)?.id ??
          targetEntry.slides[0]?.id ??
          ""
        return {
          slides: targetEntry.slides,
          past,
          future,
          currentSlideId,
          selectedIds: [],
          editingId: null,
        }
      } else {
        // Jump forward into future
        const steps = Math.min(index, s.future.length)
        if (steps === 0) return s
        const movedToPast = s.future.slice(0, steps)
        // Add current state to past
        const currentStateEntry = makeHistoryEntry(s.slides, "Before jump", "Circle")
        const past = [...s.past, currentStateEntry, ...movedToPast].slice(-50)
        const future = s.future.slice(steps)
        const targetEntry = s.future[steps - 1]
        const currentSlideId =
          targetEntry.slides.find((sl) => sl.id === s.currentSlideId)?.id ??
          targetEntry.slides[0]?.id ??
          ""
        return {
          slides: targetEntry.slides,
          past,
          future,
          currentSlideId,
          selectedIds: [],
          editingId: null,
        }
      }
    })
  },

  clearHistory: () => {
    set({ past: [], future: [] })
  },

  pushHistorySnapshot: (label, icon) => {
    set((s) => ({
      past: pushHistory(s.past, s.slides, label, icon || "Circle"),
      future: [],
    }))
  },

  replaceSlides: (slides) => {
    set((s) => {
      return {
        slides,
        currentSlideId: slides[0]?.id ?? "",
        selectedIds: [],
        editingId: null,
        past: pushHistory(s.past, s.slides, "Replace slides", "RefreshCw"),
        future: [],
      }
    })
  },

  loadProject: (data) => {
    set((s) => {
      const currentSlideId = data.currentSlideId && data.slides.find((sl) => sl.id === data.currentSlideId)
        ? data.currentSlideId
        : data.slides[0]?.id ?? ""
      return {
        slides: data.slides,
        currentSlideId,
        selectedIds: [],
        editingId: null,
        past: pushHistory(s.past, s.slides, "Load project", "FolderOpen"),
        future: [],
      }
    })
  },

  reset: () => {
    const slide = defaultSlide()
    set({
      slides: [slide],
      currentSlideId: slide.id,
      selectedIds: [],
      clipboard: [],
      formatClipboard: null,
      masterElements: [],
      masterVisible: true,
      past: [],
      future: [],
      editingId: null,
    })
  },
}))

// Initialize currentSlideId after creation
const initial = useEditor.getState()
if (!initial.currentSlideId && initial.slides.length > 0) {
  useEditor.setState({ currentSlideId: initial.slides[0].id })
}
