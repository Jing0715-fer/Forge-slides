import { idbSaveProject, idbLoadProject, idbDeleteProject, isIndexedDBAvailable, type StoredProject } from "./indexed-db"

const HISTORY_INDEX_KEY = "slideforge:ai-history:index:v1"
const IDB_PREFIX = "aihistory:"

export interface AiHistoryEntry {
  id: string
  templateName: string
  templateId: string | null
  markdownPreview: string // first 200 chars of markdown
  markdownLength: number
  slideCount: number
  generatedAt: number
  /** Full markdown content (stored in IndexedDB, not localStorage) */
  markdown?: string
  /** Generated slides (stored in IndexedDB) */
  slides?: unknown[]
}

export interface AiHistoryIndexEntry {
  id: string
  templateName: string
  templateId: string | null
  markdownPreview: string
  markdownLength: number
  slideCount: number
  generatedAt: number
}

/** Get the AI history index (metadata only). */
export function getAiHistoryIndex(): AiHistoryIndexEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_INDEX_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as AiHistoryIndexEntry[]
    return Array.isArray(data) ? data.sort((a, b) => b.generatedAt - a.generatedAt) : []
  } catch {
    return []
  }
}

/** Save an AI generation to history (IndexedDB + index in localStorage). */
export async function saveAiHistory(entry: Omit<AiHistoryEntry, "id" | "generatedAt"> & { id?: string }): Promise<AiHistoryEntry> {
  const id = entry.id || `ai-${Date.now()}`
  const generatedAt = Date.now()
  const full: AiHistoryEntry = { ...entry, id, generatedAt }

  // Save full data (markdown + slides) to IndexedDB
  if (isIndexedDBAvailable()) {
    const stored: StoredProject = {
      id: IDB_PREFIX + id,
      name: `AI: ${entry.templateName}`,
      savedAt: generatedAt,
      slideCount: entry.slideCount,
      slides: entry.slides || [],
      masterElements: [],
    }
    await idbSaveProject(stored)
  }

  // Update index (metadata only)
  const index = getAiHistoryIndex()
  const indexEntry: AiHistoryIndexEntry = {
    id,
    templateName: full.templateName,
    templateId: full.templateId,
    markdownPreview: full.markdownPreview,
    markdownLength: full.markdownLength,
    slideCount: full.slideCount,
    generatedAt,
  }
  const updated = [indexEntry, ...index].slice(0, 30) // Keep last 30
  try {
    localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn("Failed to save AI history index:", e)
  }

  return full
}

/** Load a full history entry (with slides) from IndexedDB. */
export async function loadAiHistory(id: string): Promise<{ slides: unknown[]; markdown?: string } | null> {
  if (!isIndexedDBAvailable()) return null
  const stored = await idbLoadProject(IDB_PREFIX + id)
  if (!stored) return null
  return {
    slides: stored.slides || [],
  }
}

/** Delete a history entry. */
export async function deleteAiHistory(id: string): Promise<void> {
  if (isIndexedDBAvailable()) {
    await idbDeleteProject(IDB_PREFIX + id)
  }
  const index = getAiHistoryIndex()
  const updated = index.filter((e) => e.id !== id)
  try {
    localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}
