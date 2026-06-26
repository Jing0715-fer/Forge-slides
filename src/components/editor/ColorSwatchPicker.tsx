"use client"

import React, { useState, useRef, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRecentColors } from "@/hooks/use-recent-colors"
import { cn } from "@/lib/utils"
import { Pipette } from "lucide-react"

interface Props {
  value: string
  onChange: (color: string) => void
  allowTransparent?: boolean
  label?: string
  className?: string
}

export function ColorSwatchPicker({ value, onChange, allowTransparent, label, className }: Props) {
  const { recent, addColor, presetPalette } = useRecentColors()
  const [open, setOpen] = useState(false)
  const isTransparent = value === "transparent"
  const hex = isTransparent ? "#ffffff" : normalizeColor(value)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(color: string) {
    onChange(color)
    addColor(color)
  }

  // Eyedropper API (Chrome/Edge)
  async function handleEyedropper() {
    const anyWindow = window as any
    if (anyWindow.EyeDropper) {
      try {
        const ed = new anyWindow.EyeDropper()
        const result = await ed.open()
        handleSelect(result.sRGBHex)
      } catch {
        // user cancelled
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("flex items-center gap-2", className)}>
          <button
            type="button"
            className="relative w-8 h-8 rounded-md border border-border shadow-sm overflow-hidden shrink-0"
            style={{
              background: isTransparent
                ? "repeating-conic-gradient(#e2e8f0 0% 25%, #fff 25% 50%) 50% / 8px 8px"
                : value.startsWith("linear-gradient") || value.startsWith("url(")
                  ? value
                  : value,
            }}
            title={value}
          >
            {isTransparent && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 rotate-45" />
              </div>
            )}
          </button>
          {label && <span className="text-xs">{label}</span>}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Native color input + hex */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="color"
              value={hex}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-9 h-9 rounded border cursor-pointer shrink-0"
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 text-xs font-mono"
              placeholder="#hex or color"
            />
          </div>

          {allowTransparent && (
            <Button
              variant={isTransparent ? "secondary" : "outline"}
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
            >
              {isTransparent ? "Transparent (on)" : "Set Transparent"}
            </Button>
          )}

          {/* Recent colors */}
          {recent.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5">Recent</div>
              <div className="grid grid-cols-8 gap-1">
                {recent.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preset palette */}
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5">Palette</div>
            <div className="grid grid-cols-10 gap-1">
              {presetPalette.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Eyedropper (if supported) */}
          {typeof window !== "undefined" && (window as any).EyeDropper && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1.5"
              onClick={handleEyedropper}
            >
              <Pipette className="w-3.5 h-3.5" /> Pick from screen
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function normalizeColor(c: string): string {
  if (!c) return "#ffffff"
  if (c.startsWith("#")) return c
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return "#ffffff"
  const r = parseInt(m[1], 10)
  const g = parseInt(m[2], 10)
  const b = parseInt(m[3], 10)
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
}
