import type { Slide } from "@/types/editor"

const STORAGE_KEY = "slideforge:autosave:v1"
const TIMESTAMP_KEY = "slideforge:autosave:ts:v1"

export interface AutosaveData {
  slides: Slide[]
  currentSlideId: string
  savedAt: number
}

export function saveToLocalStorage(slides: Slide[], currentSlideId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const data: AutosaveData = {
      slides,
      currentSlideId,
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
    if (!raw) return null
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
}

export function getLastSavedTimestamp(): number | null {
  if (typeof window === "undefined") return null
  const ts = localStorage.getItem(TIMESTAMP_KEY)
  return ts ? Number(ts) : null
}
