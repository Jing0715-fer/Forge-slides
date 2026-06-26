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
interface EditorState {
  slides: Slide[]
  currentSlideId: string
  selectedIds: string[]
  clipboard: EditorElement[]
  // history
  past: Slide[][]
  future: Slide[][]
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
  // slides
  addSlide: () => void
  duplicateSlide: (id: string) => void
  removeSlide: (id: string) => void
  setCurrentSlide: (id: string) => void
  reorderSlides: (from: number, to: number) => void
  setSlideBackground: (id: string, bg: string) => void
  setSlideName: (id: string, name: string) => void
  // clipboard
  copy: (ids: string[]) => void
  paste: () => void
  // history
  undo: () => void
  redo: () => void
  // import / replace
  replaceSlides: (slides: Slide[]) => void
  reset: () => void
}

function snapshot(slides: Slide[]): Slide[][] {
  // Deep clone via structuredClone
  return [structuredClone(slides)]
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
      const past = [...s.past, ...snapshot(s.slides)]
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
        past: past.slice(-50),
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
      const past = [...s.past, ...snapshot(s.slides)]
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
        past: past.slice(-50),
        future: [],
        selectedIds: [],
        editingId: null,
      }
    })
  },

  duplicateElements: (ids) => {
    set((s) => {
      const past = [...s.past, ...snapshot(s.slides)]
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
        past: past.slice(-50),
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

  addSlide: () => {
    set((s) => {
      const past = [...s.past, ...snapshot(s.slides)]
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
        past: past.slice(-50),
        future: [],
      }
    })
  },

  duplicateSlide: (id) => {
    set((s) => {
      const past = [...s.past, ...snapshot(s.slides)]
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
        past: past.slice(-50),
        future: [],
      }
    })
  },

  removeSlide: (id) => {
    set((s) => {
      if (s.slides.length <= 1) return s
      const past = [...s.past, ...snapshot(s.slides)]
      const idx = s.slides.findIndex((sl) => sl.id === id)
      const slides = s.slides.filter((sl) => sl.id !== id)
      const nextIdx = Math.max(0, idx - 1)
      return {
        slides,
        currentSlideId: slides[nextIdx].id,
        selectedIds: [],
        past: past.slice(-50),
        future: [],
      }
    })
  },

  setCurrentSlide: (id) => set({ currentSlideId: id, selectedIds: [], editingId: null }),

  reorderSlides: (from, to) => {
    set((s) => {
      const past = [...s.past, ...snapshot(s.slides)]
      const slides = [...s.slides]
      const [moved] = slides.splice(from, 1)
      slides.splice(to, 0, moved)
      return { slides, past: past.slice(-50), future: [] }
    })
  },

  setSlideBackground: (id, bg) => {
    set((s) => {
      const past = [...s.past, ...snapshot(s.slides)]
      const slides = s.slides.map((sl) =>
        sl.id === id ? { ...sl, background: bg } : sl,
      )
      return { slides, past: past.slice(-50), future: [] }
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
      const past = [...s.past, ...snapshot(s.slides)]
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
        past: past.slice(-50),
        future: [],
        selectedIds: newIds,
      }
    })
  },

  undo: () => {
    set((s) => {
      if (s.past.length === 0) return s
      const previous = s.past[s.past.length - 1]
      const past = s.past.slice(0, -1)
      const future = [snapshot(s.slides)[0], ...s.future].slice(0, 50)
      const currentSlideId =
        previous.find((sl) => sl.id === s.currentSlideId)?.id ??
        previous[0]?.id ??
        ""
      return {
        slides: previous,
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
      const next = s.future[0]
      const future = s.future.slice(1)
      const past = [...s.past, ...snapshot(s.slides)].slice(-50)
      const currentSlideId =
        next.find((sl) => sl.id === s.currentSlideId)?.id ?? next[0]?.id ?? ""
      return {
        slides: next,
        past,
        future,
        currentSlideId,
        selectedIds: [],
        editingId: null,
      }
    })
  },

  replaceSlides: (slides) => {
    set((s) => {
      const past = [...s.past, ...snapshot(s.slides)]
      return {
        slides,
        currentSlideId: slides[0]?.id ?? "",
        selectedIds: [],
        editingId: null,
        past: past.slice(-50),
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
