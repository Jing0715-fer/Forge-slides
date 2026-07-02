import type { Slide, EditorElement } from "@/types/editor"
import { idbSaveProject, idbLoadProject, isIndexedDBAvailable, type StoredProject } from "./indexed-db"

const STORAGE_KEY = "slideforge:autosave:v2"
const TIMESTAMP_KEY = "slideforge:autosave:ts:v2"
const AUTOSAVE_IDB_KEY = "slideforge:autosave" // IndexedDB key for autosave data

export interface AutosaveData {
  slides: Slide[]
  currentSlideId: string
  masterElements?: EditorElement[]
  savedAt: number
}

/**
 * Save autosave data. Tries localStorage first (fast), and falls back to
 * IndexedDB if the data is too large for localStorage (~5MB limit).
 * Returns true if the data was saved successfully to either storage.
 */
export function saveToLocalStorage(
  slides: Slide[],
  currentSlideId: string,
  masterElements: EditorElement[] = [],
): boolean {
  if (typeof window === "undefined") return false
  const data: AutosaveData = {
    slides,
    currentSlideId,
    masterElements,
    savedAt: Date.now(),
  }
  // Always save the timestamp to localStorage (small, needed for "has session" check)
  try {
    localStorage.setItem(TIMESTAMP_KEY, String(data.savedAt))
  } catch { /* ignore */ }

  // Try localStorage first
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEY, json)
    return true
  } catch (e) {
    // localStorage overflow — save to IndexedDB instead
    console.warn("Autosave: localStorage overflow, using IndexedDB:", e)
  }

  // Fallback: save full data to IndexedDB (async, fire-and-forget)
  if (isIndexedDBAvailable() && slides.length > 0) {
    const stored: StoredProject = {
      id: AUTOSAVE_IDB_KEY,
      name: "Autosave",
      savedAt: data.savedAt,
      slideCount: slides.length,
      slides,
      masterElements,
    }
    idbSaveProject(stored).then((ok) => {
      if (ok) {
        // Mark in localStorage that the full data is in IndexedDB
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, slides: [], masterElements: [], _inIndexedDB: true }))
        } catch { /* ignore */ }
      }
    })
    return true
  }

  console.warn("Autosave failed: no storage available")
  return false
}

export async function loadFromLocalStorage(): Promise<AutosaveData | null> {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as AutosaveData & { _inIndexedDB?: boolean }
      // If the data was offloaded to IndexedDB, load from there
      if (data._inIndexedDB && isIndexedDBAvailable()) {
        const stored = await idbLoadProject(AUTOSAVE_IDB_KEY)
        if (stored && stored.slides && stored.slides.length > 0) {
          return {
            slides: stored.slides as Slide[],
            currentSlideId: data.currentSlideId,
            masterElements: (stored.masterElements || []) as EditorElement[],
            savedAt: data.savedAt,
          }
        }
      }
      // Normal localStorage data
      if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        return data
      }
    }
    // Try v1 format for backward compatibility
    const v1Raw = localStorage.getItem("slideforge:autosave:v1")
    if (v1Raw) {
      const v1Data = JSON.parse(v1Raw) as AutosaveData
      if (v1Data.slides && Array.isArray(v1Data.slides)) {
        return { ...v1Data, masterElements: [] }
      }
    }
    // Try IndexedDB (in case localStorage was cleared but IDB still has data)
    if (isIndexedDBAvailable()) {
      const stored = await idbLoadProject(AUTOSAVE_IDB_KEY)
      if (stored && stored.slides && stored.slides.length > 0) {
        return {
          slides: stored.slides as Slide[],
          currentSlideId: stored.slides[0]?.id || "",
          masterElements: (stored.masterElements || []) as EditorElement[],
          savedAt: stored.savedAt,
        }
      }
    }
    return null
  } catch (e) {
    console.warn("Load autosave failed:", e)
    return null
  }
}

export function clearLocalStorage(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(TIMESTAMP_KEY)
  localStorage.removeItem("slideforge:autosave:v1")
  localStorage.removeItem("slideforge:autosave:ts:v1")
}

export function getLastSavedTimestamp(): number | null {
  if (typeof window === "undefined") return null
  const ts = localStorage.getItem(TIMESTAMP_KEY) || localStorage.getItem("slideforge:autosave:ts:v1")
  return ts ? Number(ts) : null
}

/** Check if there's a saved session (synchronous — only checks localStorage timestamp). */
export function hasSavedSession(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem(TIMESTAMP_KEY) || !!localStorage.getItem("slideforge:autosave:ts:v1")
}
