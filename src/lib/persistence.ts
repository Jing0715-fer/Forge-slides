import type { Slide, EditorElement } from "@/types/editor"

const STORAGE_KEY = "slideforge:autosave:v2"
const TIMESTAMP_KEY = "slideforge:autosave:ts:v2"

export interface AutosaveData {
  slides: Slide[]
  currentSlideId: string
  masterElements?: EditorElement[]
  savedAt: number
}

export function saveToLocalStorage(
  slides: Slide[],
  currentSlideId: string,
  masterElements: EditorElement[] = [],
): boolean {
  if (typeof window === "undefined") return false
  try {
    const data: AutosaveData = {
      slides,
      currentSlideId,
      masterElements,
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    localStorage.setItem(TIMESTAMP_KEY, String(data.savedAt))
    return true
  } catch (e) {
    console.warn("Autosave failed:", e)
    return false
  }
}

export function loadFromLocalStorage(): AutosaveData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Try v1 format for backward compatibility
      const v1Raw = localStorage.getItem("slideforge:autosave:v1")
      if (v1Raw) {
        const v1Data = JSON.parse(v1Raw) as AutosaveData
        if (v1Data.slides && Array.isArray(v1Data.slides)) {
          return { ...v1Data, masterElements: [] }
        }
      }
      return null
    }
    const data = JSON.parse(raw) as AutosaveData
    if (!data.slides || !Array.isArray(data.slides)) return null
    return data
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
