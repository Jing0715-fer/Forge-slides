"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor } from "@/store/editor-store"
import { saveToLocalStorage, loadFromLocalStorage, hasSavedSession, type AutosaveData } from "@/lib/persistence"

const AUTOSAVE_DEBOUNCE_MS = 1500

export function useAutosave() {
  const { slides, currentSlideId, masterElements, replaceSlides, setCurrentSlide } = useEditor()
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  // Restore on mount — check localStorage synchronously for the "has session"
  // flag, then load the full data asynchronously from IndexedDB if needed.
  const [restoreDataState, setRestoreDataState] = useState<AutosaveData | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false
    // Quick synchronous check: is there a saved session?
    if (!hasSavedSession()) {
      initialized.current = true
      return
    }
    // Load full data asynchronously (may read from IndexedDB for large projects)
    loadFromLocalStorage().then((saved) => {
      if (cancelled) return
      if (saved && saved.slides.length > 0) {
        setRestoreDataState(saved)
      }
      initialized.current = true
    })
    return () => { cancelled = true }
  }, [])

  // Debounced autosave whenever slides or masterElements change
  useEffect(() => {
    if (!initialized.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const ok = saveToLocalStorage(slides, currentSlideId, masterElements)
      if (ok) {
        setLastSaved(Date.now())
      }
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [slides, currentSlideId, masterElements])

  function acceptRestore() {
    if (restoreDataState) {
      replaceSlides(restoreDataState.slides)
      setCurrentSlide(restoreDataState.currentSlideId || restoreDataState.slides[0]?.id || "")
      // Restore master elements
      if (restoreDataState.masterElements) {
        useEditor.setState({ masterElements: restoreDataState.masterElements })
      }
    }
    setRestoreDataState(null)
  }
  function dismissRestore() {
    setRestoreDataState(null)
  }

  return { lastSaved, pending: false, restoreData: restoreDataState, acceptRestore, dismissRestore }
}
