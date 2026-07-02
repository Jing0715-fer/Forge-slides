import type { Slide } from "@/types/editor"
import { idbSaveProject, idbLoadProject, idbDeleteProject, idbGetAllIds, isIndexedDBAvailable, type StoredProject } from "./indexed-db"

const TEMPLATES_INDEX_KEY = "slideforge:templates:index:v1"
const IDB_PREFIX = "template:"

export interface SlideTemplate {
  id: string
  name: string
  description: string
  savedAt: number
  slideCount: number
  thumbnail?: string
  /** The raw HTML of the template's slides (for AI prompt generation + rendering) */
  slides: Slide[]
  /** Auto-generated design analysis (color palette, fonts, layout patterns) */
  analysis?: TemplateAnalysis
}

export interface TemplateAnalysis {
  /** Primary background color */
  backgroundColor: string
  /** Extracted color palette (hex) */
  colorPalette: string[]
  /** Font families used */
  fontFamilies: string[]
  /** Font sizes used (px, sorted) */
  fontSizes: number[]
  /** Number of slides */
  slideCount: number
  /** Detected layout style */
  layoutStyle: string
  /** CSS variables defined in :root */
  cssVariables: Record<string, string>
  /** Key design tokens extracted from the CSS */
  designTokens: {
    accentColor?: string
    textColor?: string
    mutedColor?: string
    borderColor?: string
    headingFont?: string
    bodyFont?: string
    monoFont?: string
  }
  /** Structure of each slide (headings, cards, etc.) */
  slideStructures: SlideStructure[]
}

export interface SlideStructure {
  slideIndex: number
  title: string
  /** Types of content blocks detected */
  blocks: { type: string; count: number }[]
}

export interface TemplateIndexEntry {
  id: string
  name: string
  description: string
  savedAt: number
  slideCount: number
  thumbnail?: string
}

/** Get the template index (metadata only — no slides). */
export function getTemplateIndex(): TemplateIndexEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(TEMPLATES_INDEX_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as TemplateIndexEntry[]
    return Array.isArray(data) ? data.sort((a, b) => b.savedAt - a.savedAt) : []
  } catch {
    return []
  }
}

/** Save a template to IndexedDB + update the index in localStorage. */
export async function saveTemplate(template: Omit<SlideTemplate, "id" | "savedAt"> & { id?: string }): Promise<SlideTemplate> {
  const id = template.id || `tpl-${Date.now()}`
  const savedAt = Date.now()
  const full: SlideTemplate = { ...template, id, savedAt }

  // Save full data to IndexedDB
  if (isIndexedDBAvailable()) {
    const stored: StoredProject = {
      id: IDB_PREFIX + id,
      name: full.name,
      savedAt,
      slideCount: full.slideCount,
      thumbnail: full.thumbnail,
      slides: full.slides,
      masterElements: [],
    }
    await idbSaveProject(stored)
  }

  // Update index (metadata only)
  const index = getTemplateIndex()
  const entry: TemplateIndexEntry = {
    id,
    name: full.name,
    description: full.description,
    savedAt,
    slideCount: full.slideCount,
    thumbnail: full.thumbnail,
  }
  const updated = [entry, ...index.filter((t) => t.id !== id)]
  try {
    localStorage.setItem(TEMPLATES_INDEX_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn("Failed to save template index:", e)
  }

  return full
}

/** Load a full template (with slides) from IndexedDB. */
export async function loadTemplate(id: string): Promise<SlideTemplate | null> {
  if (!isIndexedDBAvailable()) return null
  const stored = await idbLoadProject(IDB_PREFIX + id)
  if (!stored || !stored.slides || stored.slides.length === 0) return null
  return {
    id,
    name: stored.name,
    description: "",
    savedAt: stored.savedAt,
    slideCount: stored.slideCount,
    thumbnail: stored.thumbnail,
    slides: stored.slides as Slide[],
  }
}

/** Delete a template. */
export async function deleteTemplate(id: string): Promise<void> {
  if (isIndexedDBAvailable()) {
    await idbDeleteProject(IDB_PREFIX + id)
  }
  const index = getTemplateIndex()
  const updated = index.filter((t) => t.id !== id)
  try {
    localStorage.setItem(TEMPLATES_INDEX_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}
