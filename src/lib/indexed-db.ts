/**
 * Thin IndexedDB wrapper for storing large slide data.
 *
 * localStorage has a ~5MB limit, which is too small for HTML slides
 * (a single slide's rawHtml can be 200KB+, and a 24-slide deck can
 * easily reach 5MB+). IndexedDB has a much larger quota (typically
 * 50MB to unlimited depending on browser), making it suitable for
 * storing full slide project data.
 */

const DB_NAME = "slideforge"
const DB_VERSION = 1
const STORE_PROJECTS = "projects"

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available"))
  }
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" })
      }
    }
  })
  return dbPromise
}

export interface StoredProject {
  id: string
  name: string
  savedAt: number
  slideCount: number
  thumbnail?: string
  slides: unknown[]
  masterElements?: unknown[]
}

/** Save a project to IndexedDB. Returns true on success.
 *
 * We resolve on the TRANSACTION's `oncomplete` (not just the put request's
 * `onsuccess`). Resolving on `req.onsuccess` can return before the data is
 * actually committed — a read opened in a new transaction right after may
 * not see the write, which previously caused "clicking a recent project
 * loads nothing / loads the wrong project" races. Waiting for the
 * transaction to fully commit guarantees the data is durable before we
 * tell the caller it's safe.
 */
export async function idbSaveProject(project: StoredProject): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, "readwrite")
      const store = tx.objectStore(STORE_PROJECTS)
      store.put(project)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error("transaction aborted"))
    })
  } catch (e) {
    console.warn("idbSaveProject failed:", e)
    return false
  }
}

/** Load a single project from IndexedDB by ID. Returns null if not found. */
export async function idbLoadProject(id: string): Promise<StoredProject | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, "readonly")
      const store = tx.objectStore(STORE_PROJECTS)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.warn("idbLoadProject failed:", e)
    return null
  }
}

/** Load all project IDs from IndexedDB. */
export async function idbGetAllIds(): Promise<string[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, "readonly")
      const store = tx.objectStore(STORE_PROJECTS)
      const req = store.getAllKeys()
      req.onsuccess = () => resolve(req.result as string[])
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.warn("idbGetAllIds failed:", e)
    return []
  }
}

/** Delete a project from IndexedDB by ID. */
export async function idbDeleteProject(id: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, "readwrite")
      const store = tx.objectStore(STORE_PROJECTS)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.warn("idbDeleteProject failed:", e)
  }
}

/** Check if IndexedDB is available in the current environment. */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined"
}
