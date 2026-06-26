"use client"

import { useState, useCallback } from "react"

const STORAGE_KEY = "slideforge:recent-colors:v1"
const MAX_COLORS = 16

const DEFAULT_RECENT = [
  "#0f172a", "#1e293b", "#475569", "#94a3b8",
  "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0",
]

const PRESET_PALETTE = [
  // Grays
  "#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#ffffff",
  // Reds
  "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fee2e2",
  // Oranges
  "#ea580c", "#f97316", "#fb923c", "#fdba74", "#ffedd5",
  // Ambers
  "#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fef3c7",
  // Yellows
  "#ca8a04", "#eab308", "#facc15", "#fde047", "#fef9c3",
  // Greens
  "#16a34a", "#22c55e", "#4ade80", "#86efac", "#dcfce7",
  // Teals
  "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#ccfbf1",
  // Cyans
  "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#cffafe",
  // Blues
  "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe",
  // Indigos
  "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#e0e7ff",
  // Violets
  "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ede9fe",
  // Purples
  "#9333ea", "#a855f7", "#c084fc", "#d8b4fe", "#f3e8ff",
  // Fuchsias
  "#c026d3", "#d946ef", "#e879f9", "#f0abfc", "#fae8ff",
  // Pinks
  "#db2777", "#ec4899", "#f472b6", "#f9a8d4", "#fce7f3",
  // Roses
  "#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#ffe4e6",
]

export function useRecentColors() {
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_RECENT
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // ignore
    }
    return DEFAULT_RECENT
  })

  const addColor = useCallback((color: string) => {
    if (!color || color === "transparent") return
    setRecent((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== color.toLowerCase())
      const next = [color, ...filtered].slice(0, MAX_COLORS)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return { recent, addColor, presetPalette: PRESET_PALETTE }
}
