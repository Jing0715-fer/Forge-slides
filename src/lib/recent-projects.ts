import type { Slide, EditorElement } from "@/types/editor"
import { idbSaveProject, idbLoadProject, idbDeleteProject, isIndexedDBAvailable, type StoredProject } from "./indexed-db"

const RECENT_KEY = "slideforge:recent-projects:v2"
const MAX_RECENT = 12

// Monotonic counter + 6-char random suffix → collisions vanishingly
// unlikely even when the user imports multiple projects in the same
// millisecond. Previously used `Date.now()` alone, which collided
// when imports happened in the same tick and silently merged projects
// in IndexedDB (so opening any "recent" loaded whichever had the
// most recent put()).
let __recentIdCounter = 0
function generateRecentId(): string {
  __recentIdCounter += 1
  return `proj-${Date.now().toString(36)}-${__recentIdCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface RecentProject {
  id: string
  name: string
  savedAt: number
  slideCount: number
  thumbnail?: string
  /** Slides are stored in IndexedDB, not here (localStorage overflows).
   * This flag indicates whether the full data is available in IndexedDB. */
  hasFullData: boolean
  /** Slides may be present if the project is small enough for localStorage.
   * For large projects, this will be empty — load from IndexedDB instead. */
  slides?: Slide[]
  masterElements?: EditorElement[]
}

export function getRecentProjects(): RecentProject[] {
  if (typeof window === "undefined") return []
  try {
    // Try v2 format first (with IndexedDB)
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) {
      const data = JSON.parse(raw) as RecentProject[]
      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => b.savedAt - a.savedAt)
        // Defensive: dedupe by id. Older data created with the
        // `Date.now()`-only id generator can have multiple recent entries
        // that share an id (collided when imported in the same ms). When
        // that happens, IndexedDB only has the most recent put() under
        // that key, so opening ANY of the duplicated entries would load
        // the same project. Reassigning fresh ids here at load time
        // preserves the visible entry (so the user still sees both rows
        // in the list) but marks the duplicates as hasFullData: false —
        // the user can re-import to recover the actual slide data.
        const seen = new Set<string>()
        const deduped: RecentProject[] = []
        for (const p of sorted) {
          if (seen.has(p.id)) {
            deduped.push({ ...p, id: generateRecentId(), hasFullData: false })
          } else {
            seen.add(p.id)
            deduped.push(p)
          }
        }
        return deduped
      }
    }
    // Try v1 format (legacy — full slides in localStorage)
    const v1Raw = localStorage.getItem("slideforge:recent-projects:v1")
    if (v1Raw) {
      const v1Data = JSON.parse(v1Raw) as RecentProject[]
      if (Array.isArray(v1Data)) {
        // Migrate: mark projects that still have slides as having full data.
        // Strip slides from localStorage (they'd overflow v2) — the full
        // data is lost for v1 projects unless they're re-imported, but at
        // least the metadata (name, thumbnail, count) is preserved.
        const migrated = v1Data.map(p => ({
          id: p.id,
          name: p.name,
          savedAt: p.savedAt,
          slideCount: p.slideCount,
          thumbnail: p.thumbnail,
          hasFullData: false, // v1 data is not in IndexedDB
        }))
        // Save migrated data in v2 format (lightweight — no slides)
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(migrated))
          localStorage.removeItem("slideforge:recent-projects:v1")
        } catch { /* ignore migration errors */ }
        return migrated.sort((a, b) => b.savedAt - a.savedAt)
      }
    }
    return []
  } catch {
    return []
  }
}

export async function saveRecentProject(project: Omit<RecentProject, "id" | "savedAt" | "hasFullData"> & { id?: string }): Promise<RecentProject> {
  if (typeof window === "undefined") {
    return { ...project, id: project.id || generateRecentId(), savedAt: Date.now(), hasFullData: false } as RecentProject
  }

  const existing = getRecentProjects()
  const id = project.id || generateRecentId()
  const entry: RecentProject = {
    ...project,
    id,
    savedAt: Date.now(),
    hasFullData: false, // will be set to true if IndexedDB save succeeds
  }

  // Try to save the full slides data to IndexedDB (handles large data)
  if (isIndexedDBAvailable() && project.slides && project.slides.length > 0) {
    const stored: StoredProject = {
      id,
      name: project.name,
      savedAt: entry.savedAt,
      slideCount: project.slideCount,
      thumbnail: project.thumbnail,
      slides: project.slides,
      masterElements: project.masterElements || [],
    }
    const saved = await idbSaveProject(stored)
    if (saved) {
      entry.hasFullData = true
      // Don't keep slides in localStorage — it would overflow.
      // The landing page only needs metadata + thumbnail.
      entry.slides = undefined
      entry.masterElements = undefined
    }
  }

  // Save metadata to localStorage (small — just name, thumbnail, counts)
  const filtered = existing.filter((p) => p.id !== id)
  const updated = [entry, ...filtered].slice(0, MAX_RECENT)
  try {
    // Remove slides/masterElements from all entries before saving to localStorage
    // (they're stored in IndexedDB). Keep only metadata.
    const lightweight = updated.map(p => ({
      id: p.id,
      name: p.name,
      savedAt: p.savedAt,
      slideCount: p.slideCount,
      thumbnail: p.thumbnail,
      hasFullData: p.hasFullData,
    }))
    localStorage.setItem(RECENT_KEY, JSON.stringify(lightweight))
  } catch (e) {
    console.warn("Failed to save recent project metadata:", e)
  }

  return entry
}

export function removeRecentProject(id: string): void {
  if (typeof window === "undefined") return
  try {
    const existing = getRecentProjects()
    const filtered = existing.filter((p) => p.id !== id)
    const lightweight = filtered.map(p => ({
      id: p.id,
      name: p.name,
      savedAt: p.savedAt,
      slideCount: p.slideCount,
      thumbnail: p.thumbnail,
      hasFullData: p.hasFullData,
    }))
    localStorage.setItem(RECENT_KEY, JSON.stringify(lightweight))
    // Also delete from IndexedDB (async, fire-and-forget)
    idbDeleteProject(id)
  } catch { /* ignore */ }
}

export function clearRecentProjects(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(RECENT_KEY)
  localStorage.removeItem("slideforge:recent-projects:v1")
}

/** Load the full project data (slides + masterElements) from IndexedDB.
 * Returns null if the data is not available. */
export async function loadRecentProjectData(id: string): Promise<{ slides: Slide[]; masterElements: EditorElement[] } | null> {
  if (!isIndexedDBAvailable()) return null
  const stored = await idbLoadProject(id)
  if (!stored || !stored.slides || stored.slides.length === 0) return null
  return {
    slides: stored.slides as Slide[],
    masterElements: (stored.masterElements || []) as EditorElement[],
  }
}

export function generateSlideThumbnail(slides: Slide[]): string | undefined {
  if (typeof document === "undefined" || slides.length === 0) return undefined
  try {
    const slide = slides[0]
    const canvas = document.createElement("canvas")
    canvas.width = 320
    canvas.height = 180
    const ctx = canvas.getContext("2d")
    if (!ctx) return undefined

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (slide.background && slide.background.includes("gradient")) {
      ctx.fillStyle = "#f8fafc"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (slide.background) {
      ctx.fillStyle = slide.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const scaleX = canvas.width / 1280
    const scaleY = canvas.height / 720
    const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)
    for (const el of elements) {
      const x = el.x * scaleX
      const y = el.y * scaleY
      const w = el.width * scaleX
      const h = el.height * scaleY
      if (el.fill && el.fill !== "transparent") {
        ctx.fillStyle = el.fill
        ctx.fillRect(x, y, w, h)
      }
      if (el.type === "text") {
        const t = el as any
        ctx.fillStyle = t.color || "#000000"
        ctx.font = `${Math.max(8, (t.fontSize || 16) * scaleX)}px sans-serif`
        ctx.textBaseline = "top"
        ctx.fillText((t.text || "").slice(0, 30), x + 2, y + 2, w - 4)
      }
    }

    return canvas.toDataURL("image/jpeg", 0.6)
  } catch {
    return undefined
  }
}
