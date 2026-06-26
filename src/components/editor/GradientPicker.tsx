"use client"

import React, { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Blend, Plus, X, RotateCw } from "lucide-react"
import { useRecentColors } from "@/hooks/use-recent-colors"
import { cn } from "@/lib/utils"

interface GradientStop {
  color: string
  position: number // 0-100
}

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

const GRADIENT_PRESETS: { name: string; value: string }[] = [
  { name: "Sunset", value: "linear-gradient(135deg, #f97316, #ec4899)" },
  { name: "Ocean", value: "linear-gradient(135deg, #0ea5e9, #6366f1)" },
  { name: "Forest", value: "linear-gradient(135deg, #10b981, #06b6d4)" },
  { name: "Purple", value: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
  { name: "Fire", value: "linear-gradient(135deg, #ef4444, #f59e0b)" },
  { name: "Mint", value: "linear-gradient(135deg, #14b8a6, #84cc16)" },
  { name: "Berry", value: "linear-gradient(135deg, #d946ef, #8b5cf6)" },
  { name: "Steel", value: "linear-gradient(135deg, #475569, #1e293b)" },
  { name: "Peach", value: "linear-gradient(135deg, #fb923c, #fde047)" },
  { name: "Sky", value: "linear-gradient(135deg, #38bdf8, #818cf8)" },
  { name: "Rose", value: "linear-gradient(135deg, #f43f5e, #ec4899)" },
  { name: "Dark", value: "linear-gradient(135deg, #1e293b, #0f172a)" },
]

function parseGradient(value: string): { type: "linear" | "radial"; angle: number; stops: GradientStop[] } | null {
  // Match: linear-gradient(angle, color1 pos%, color2 pos%)
  const linearMatch = value.match(/linear-gradient\(([^,]+),\s*(.+)\)/)
  if (linearMatch) {
    const angleStr = linearMatch[1].trim()
    let angle = 135
    if (angleStr.includes("deg")) {
      angle = parseInt(angleStr)
    } else if (angleStr === "to right") angle = 90
    else if (angleStr === "to left") angle = 270
    else if (angleStr === "to top") angle = 0
    else if (angleStr === "to bottom") angle = 180
    const stopsStr = linearMatch[2]
    const stops = parseStops(stopsStr)
    return { type: "linear", angle, stops }
  }
  const radialMatch = value.match(/radial-gradient\(([^,]+),\s*(.+)\)/)
  if (radialMatch) {
    const stops = parseStops(radialMatch[2])
    return { type: "radial", angle: 0, stops }
  }
  return null
}

function parseStops(stopsStr: string): GradientStop[] {
  const parts = stopsStr.split(",").map((s) => s.trim())
  const stops: GradientStop[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    // Might be "color pos%" or just "color"
    const m = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/)
    if (m) {
      stops.push({ color: m[1].trim(), position: parseFloat(m[2]) })
    } else {
      // color only — distribute evenly
      stops.push({ color: part, position: (i / (parts.length - 1)) * 100 })
    }
  }
  return stops
}

function buildGradient(type: "linear" | "radial", angle: number, stops: GradientStop[]): string {
  const stopsStr = stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${Math.round(s.position)}%`)
    .join(", ")
  if (type === "linear") {
    return `linear-gradient(${angle}deg, ${stopsStr})`
  }
  return `radial-gradient(circle, ${stopsStr})`
}

export function GradientPicker({ value, onChange, className }: Props) {
  const { addColor } = useRecentColors()
  const isGradient = value.includes("gradient")
  const parsed = isGradient ? parseGradient(value) : null
  const [type, setType] = useState<"linear" | "radial">(parsed?.type || "linear")
  const [angle, setAngle] = useState(parsed?.angle || 135)
  const [stops, setStops] = useState<GradientStop[]>(
    parsed?.stops || [
      { color: "#6366f1", position: 0 },
      { color: "#8b5cf6", position: 100 },
    ],
  )

  function updateGradient(newType: "linear" | "radial", newAngle: number, newStops: GradientStop[]) {
    onChange(buildGradient(newType, newAngle, newStops))
  }

  function updateStop(index: number, patch: Partial<GradientStop>) {
    const next = stops.map((s, i) => (i === index ? { ...s, ...patch } : s))
    setStops(next)
    updateGradient(type, angle, next)
  }

  function addStop() {
    const next = [...stops, { color: "#ffffff", position: 50 }]
    setStops(next)
    updateGradient(type, angle, next)
  }

  function removeStop(index: number) {
    if (stops.length <= 2) return
    const next = stops.filter((_, i) => i !== index)
    setStops(next)
    updateGradient(type, angle, next)
  }

  function applyPreset(presetValue: string) {
    const p = parseGradient(presetValue)
    if (p) {
      setType(p.type)
      setAngle(p.angle)
      setStops(p.stops)
      onChange(presetValue)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-8 h-8 rounded-md border border-border shadow-sm shrink-0",
            isGradient ? "" : "opacity-50",
          )}
          style={{ background: isGradient ? value : "transparent" }}
          title={isGradient ? value : "No gradient (click to add)"}
        >
          {!isGradient && <Blend className="w-4 h-4 mx-auto text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Blend className="w-4 h-4" />
            <span className="text-sm font-medium">Gradient</span>
          </div>

          {/* Type & Angle */}
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => { setType(v as any); updateGradient(v as any, angle, stops) }}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="radial">Radial</SelectItem>
              </SelectContent>
            </Select>
            {type === "linear" && (
              <div className="flex items-center gap-1">
                <Slider
                  value={[angle]}
                  min={0}
                  max={360}
                  step={15}
                  onValueChange={(v) => { setAngle(v[0]); updateGradient(type, v[0], stops) }}
                  className="w-20"
                />
                <span className="text-xs font-mono w-8">{angle}°</span>
              </div>
            )}
          </div>

          {/* Preview bar */}
          <div
            className="h-8 rounded border border-border"
            style={{ background: value.startsWith("gradient") || value.includes("gradient") ? value : buildGradient(type, angle, stops) }}
          />

          {/* Color stops */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">Color Stops</Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addStop}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => { updateStop(i, { color: e.target.value }); addColor(e.target.value) }}
                    className="w-7 h-7 rounded border cursor-pointer shrink-0"
                  />
                  <Slider
                    value={[stop.position]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => updateStop(i, { position: v[0] })}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">{Math.round(stop.position)}%</span>
                  {stops.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeStop(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <Label className="text-xs mb-1.5 block">Presets</Label>
            <div className="grid grid-cols-6 gap-1">
              {GRADIENT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p.value)}
                  className="h-7 rounded border border-border hover:scale-110 transition-transform"
                  style={{ background: p.value }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Hex input */}
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs font-mono"
            placeholder="linear-gradient(...) or #hex"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
