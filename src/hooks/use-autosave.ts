"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor } from "@/store/editor-store"
import { saveToLocalStorage, loadFromLocalStorage, type AutosaveData } from "@/lib/persistence"

const AUTOSAVE_DEBOUNCE_MS = 1500

export function useAutosave() {
  const { slides, currentSlideId, masterElements, replaceSlides, setCurrentSlide } = useEditor()
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  // Restore on mount — use lazy initializer pattern via useState to avoid
  // calling setState during effect. We read localStorage synchronously.
  const [initialRestore] = useState<AutosaveData | null>(() => {
    if (typeof window === "undefined") return null
    const saved = loadFromLocalStorage()
    return saved && saved.slides.length > 0 ? saved : null
  })
  // Use initialRestore as the initial value of restoreData
  const [restoreDataState, setRestoreDataState] = useState<AutosaveData | null>(initialRestore)

  useEffect(() => {
    initialized.current = true
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
