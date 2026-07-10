"use client"

import React from "react"
import { useEditor } from "@/store/editor-store"
import type { EditorElement, TextElement, ShapeElement, ImageElement, Slide } from "@/types/editor"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { ColorSwatchPicker } from "./ColorSwatchPicker"
import { GradientPicker } from "./GradientPicker"
import { SpeakerNotesPanel } from "./SpeakerNotesPanel"
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowUpToLine, ArrowDownToLine, Lock, Unlock, Eye, EyeOff,
  Maximize2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Preset slide sizes — the most common presentation aspect ratios at their
// native pixel dimensions. Picked because PowerPoint / Keynote / Google
// Slides all use the same canonical sizes for their defaults.
const SLIDE_SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "16:9 · 1280×720", w: 1280, h: 720 },
  { label: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { label: "16:10 · 1280×800", w: 1280, h: 800 },
  { label: "4:3 · 1024×768", w: 1024, h: 768 },
  { label: "A4 landscape", w: 1123, h: 794 },
  { label: "Square · 1080", w: 1080, h: 1080 },
]

// Per-slide canvas size control. The width/height fields drive the editor
// canvas, the slide thumbnails, and the presentation-mode wrapper (each
// reads slide.width / slide.height and falls back to CANVAS_WIDTH ×
// CANVAS_HEIGHT). Changing this lets the user re-format a single page for
// a different aspect ratio without affecting any other slide.
function SlideSizeControl({ slide }: { slide: Slide }) {
  const { setSlideSize } = useEditor()
  // The slide is the source of truth. We track the "committed" value as
  // a local string buffer so the user can type partial values (e.g. clear
  // the field and start typing) without React reverting mid-edit. We
  // commit to the store on blur or Enter.
  const currentW = slide.width ?? 1280
  const currentH = slide.height ?? 720
  const [w, setW] = React.useState(String(currentW))
  const [h, setH] = React.useState(String(currentH))

  // Re-sync local input state when the active slide changes (e.g. user
  // switches to another slide and back). Done via the `key` prop pattern
  // — no setState-in-effect needed.
  const slideKey = `${slide.id}:${currentW}:${currentH}`

  const commit = () => {
    const newW = Number(w) || 0
    const newH = Number(h) || 0
    if (newW !== currentW || newH !== currentH) {
      setSlideSize(slide.id, newW, newH)
    }
  }

  return (
    <div className="space-y-2" key={slideKey}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Width</Label>
          <Input
            type="number"
            min={80}
            max={8192}
            value={w}
            onChange={(e) => setW(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Height</Label>
          <Input
            type="number"
            min={60}
            max={8192}
            value={h}
            onChange={(e) => setH(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="h-7 text-xs"
          />
        </div>
      </div>
      <Select
        value=""
        onValueChange={(v) => {
          if (!v) return
          const preset = SLIDE_SIZE_PRESETS.find((p) => `${p.w}x${p.h}` === v)
          if (preset) {
            setW(String(preset.w))
            setH(String(preset.h))
            setSlideSize(slide.id, preset.w, preset.h)
          }
        }}
      >
        <SelectTrigger className="h-7 text-xs">
          <Maximize2 className="w-3 h-3 mr-1.5" />
          <SelectValue placeholder="Apply preset…" />
        </SelectTrigger>
        <SelectContent>
          {SLIDE_SIZE_PRESETS.map((p) => (
            <SelectItem key={p.label} value={`${p.w}x${p.h}`}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function PropertyPanel() {
  const { selectedIds, currentSlide, updateElement, bringToFront, sendToBack } = useEditor()
  const slide = currentSlide()
  // Defensive: empty editor (no slide loaded yet). Render a friendly placeholder
  // instead of crashing on `slide.elements.filter(...)` below.
  if (!slide) {
    return (
      <div className="w-56 xl:w-72 border-l border-border/40 flex flex-col h-full" style={{ background: "linear-gradient(to bottom, rgba(245,243,255,0.85), rgba(255,255,255,0.7), rgba(253,242,248,0.75))" }}>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
          No slide loaded
        </div>
        <SpeakerNotesPanel compact />
      </div>
    )
  }
  const selected = slide.elements.filter((e) => selectedIds.includes(e.id))
  let content: React.ReactNode
  if (slide.rawHtml) {
    // Exact mode: if an overlay element is selected (selectedIds has a sf- id),
    // show its properties. Otherwise show the ExactModePanel.
    if (selected.length === 1 && selected[0].id.startsWith("sf-")) {
      content = <SingleElementPanel key={selected[0].id} element={selected[0]} updateElement={updateElement} bringToFront={bringToFront} sendToBack={sendToBack} />
    } else {
      content = <ExactModePanel slide={slide} />
    }
  } else if (selected.length === 0) {
    content = <EmptyPanel />
  } else if (selected.length > 1) {
    content = <MultiSelectPanel count={selected.length} />
  } else {
    const el = selected[0]
    content = <SingleElementPanel key={el.id} element={el} updateElement={updateElement} bringToFront={bringToFront} sendToBack={sendToBack} />
  }
  return (
    <div className="w-56 xl:w-72 border-l border-border/40 flex flex-col h-full" style={{ background: "linear-gradient(to bottom, rgba(245,243,255,0.85), rgba(255,255,255,0.7), rgba(253,242,248,0.75))" }}>
      <div className="flex-1 overflow-y-auto sf-layers-scroll">{content}</div>
      <SpeakerNotesPanel compact />
    </div>
  )
}

function ExactModePanel({ slide }: { slide: Slide }) {
  const { setSlideBackground } = useEditor()
  return (
    <div className="h-full">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold mb-2">Exact Mode (100% Fidelity)</h3>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>✓ <strong>Click text</strong> to edit directly — changes save in real-time.</p>
          <p>✓ <strong>Click + drag</strong> any element to move it (5px threshold distinguishes click from drag).</p>
          <p>✓ <strong>Click to select</strong> → drag purple handles to resize.</p>
          <p>✓ <strong>Double-click</strong> to enter text editing for a specific element.</p>
          <p>✓ All CSS variables, fonts, and layouts are preserved from the original HTML.</p>
          <p>✓ Use Export HTML to download the edited slide.</p>
        </div>
      </div>
      <div className="p-4 border-b">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">SLIDE INFO</h4>
        <div className="text-xs space-y-1">
          <div>Name: <span className="text-foreground">{slide.name}</span></div>
          <div>Elements: <span className="text-foreground">{slide.elements.length}</span></div>
          <div>Mode: <span className="text-foreground">Exact (iframe)</span></div>
        </div>
      </div>
      <div className="p-4 border-b">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">BACKGROUND</h4>
        <ColorField label="Background Color" value={slide.background} onChange={(c) => setSlideBackground(slide.id, c)} />
      </div>
      <div className="p-4 border-b">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">SLIDE SIZE</h4>
        <p className="text-[10px] text-muted-foreground mb-2">
          Per-page resolution. Affects the editor canvas, thumbnails, and the
          presentation-mode wrapper for this slide only.
        </p>
        <SlideSizeControl slide={slide} />
      </div>
    </div>
  )
}

function EmptyPanel() {
  const { currentSlide, setSlideBackground } = useEditor()
  const slide = currentSlide()
  if (!slide) return null
  return (
    <div className="h-full">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold mb-3">Slide Properties</h3>
        <div className="space-y-3">
          <ColorField
            label="Background"
            value={slide.background}
            onChange={(c) => setSlideBackground(slide.id, c)}
            allowGradient
          />
        </div>
      </div>
      <div className="p-4 border-b">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">SLIDE SIZE</h4>
        <p className="text-[10px] text-muted-foreground mb-2">
          Per-page resolution — affects this slide's editor canvas, thumbnail,
          and presentation-mode render only.
        </p>
        <SlideSizeControl slide={slide} />
      </div>
      <div className="p-4 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Tips</p>
        <ul className="space-y-1.5 text-xs">
          <li>• Click an element to select it</li>
          <li>• Drag to move, snap to alignment guides</li>
          <li>• Use handles to resize & rotate</li>
          <li>• Double-click text to edit</li>
          <li>• Shift+click for multi-select</li>
          <li>• Arrow keys nudge by 1px (Shift = 10px)</li>
          <li>• Hold Shift while rotating for 15° snap</li>
        </ul>
      </div>
    </div>
  )
}

function MultiSelectPanel({ count }: { count: number }) {
  return (
    <div className="h-full p-4">
      <h3 className="text-sm font-semibold mb-2">Multiple Selection</h3>
      <p className="text-xs text-muted-foreground">{count} elements selected</p>
      <p className="text-xs text-muted-foreground mt-3">
        Use alignment tools in the toolbar. Drag any element to move the group.
      </p>
    </div>
  )
}

function SingleElementPanel({
  element,
  updateElement,
  bringToFront,
  sendToBack,
}: {
  element: EditorElement
  updateElement: (id: string, patch: Partial<EditorElement>) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
}) {
  const { updateElement: update, currentSlide, setSlideRawHtml } = useEditor()
  function set<K extends keyof EditorElement>(key: K, value: EditorElement[K]) {
    update(element.id, { [key]: value } as Partial<EditorElement>)
    // If this is an Exact-mode overlay element (sf- prefix), also update
    // the corresponding iframe element and sync to rawHtml
    if (element.id.startsWith("sf-")) {
      const slide = currentSlide()
      if (!slide || !slide.rawHtml) return
      const canvas = document.getElementById("editor-canvas")
      const iframe = canvas?.querySelector("iframe")
      if (!iframe) return
      try {
        const doc = iframe.contentDocument
        if (!doc) return
        const el = doc.querySelector(`[data-sf-id="${element.id}"]`) as HTMLElement
        if (!el) return
        // Apply the property change to the iframe element
        if (key === "text" && typeof value === "string") {
          el.textContent = value
        } else if (key === "x" || key === "y") {
          // Use transform (not position:absolute + left/top) to avoid
          // offsetParent coordinate-system mismatches. The drag handler
          // also uses transform — this keeps the two in sync.
          // Compute the delta from the current overlay position and add
          // it to the existing transform.
          const delta = (value as number) - (key === "x" ? element.x : element.y)
          const existing = el.style.transform || ""
          const match = existing.match(/translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)/)
          const currentTx = match ? parseFloat(match[1]) : 0
          const currentTy = match ? parseFloat(match[2]) : 0
          const newTx = key === "x" ? currentTx + delta : currentTx
          const newTy = key === "y" ? currentTy + delta : currentTy
          el.style.transform = `translate(${newTx}px, ${newTy}px)`
        } else if (key === "width") {
          el.style.width = value + "px"
        } else if (key === "height") {
          el.style.height = value + "px"
        } else if (key === "fontSize" && typeof value === "number") {
          el.style.fontSize = value + "px"
        } else if (key === "color" && typeof value === "string") {
          el.style.color = value
        } else if (key === "fontFamily" && typeof value === "string") {
          el.style.fontFamily = value
        } else if (key === "fontWeight" && typeof value === "string") {
          el.style.fontWeight = value
        } else if (key === "fontStyle") {
          el.style.fontStyle = value as string
        } else if (key === "textAlign") {
          el.style.textAlign = value as string
        } else if (key === "fill" && typeof value === "string") {
          if (value !== "transparent") el.style.background = value
        }
        // Sync the updated HTML back to rawHtml WITHOUT triggering an iframe
        // reload. The iframe DOM is already up-to-date (we just set the style
        // directly above). Reloading would cause overlays to disappear briefly
        // and potentially lose differently-colored child overlays (like "5分钟")
        // if the color-aware dedup re-evaluates with changed colors.
        // We update lastHtml.current on the RawHtmlFrame to prevent the reload
        // useEffect from firing.
        const newHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML
        // Find the RawHtmlFrame's iframe and update its lastHtml ref
        const canvas = document.getElementById("editor-canvas")
        const iframeEl = canvas?.querySelector("iframe")
        if (iframeEl) {
          // Mark that we've already applied this change to the iframe DOM,
          // so the useEffect won't reload. We do this by updating the
          // lastHtml ref via a custom property.
          ;(iframeEl as any)._sfLastHtml = newHtml
        }
        setSlideRawHtml(slide.id, newHtml)
      } catch (e) {
        // iframe not accessible — ignore
      }
    }
  }

  return (
    <div className="h-full">
      <div className="p-4 border-b border-border/40 bg-muted/15">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
            <h3 className="text-sm font-semibold capitalize tracking-tight">{element.type}</h3>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background" onClick={() => set("locked", !element.locked)}>
              {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-50" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background" onClick={() => set("visible", !element.visible)}>
              {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
            </Button>
          </div>
        </div>
        <Input
          value={element.name}
          onChange={(e) => set("name", e.target.value)}
          className="h-8 text-sm bg-background/60 border-border/40"
        />
      </div>

      {/* Position & Size */}
      <Section title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={Math.round(element.x)} onChange={(v) => set("x", v)} />
          <NumberField label="Y" value={Math.round(element.y)} onChange={(v) => set("y", v)} />
          <NumberField label="W" value={Math.round(element.width)} onChange={(v) => set("width", Math.max(8, v))} />
          <NumberField label="H" value={Math.round(element.height)} onChange={(v) => set("height", Math.max(8, v))} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NumberField label="Rotation" value={Math.round(element.rotation)} onChange={(v) => set("rotation", v)} suffix="°" />
          <div>
            <Label className="text-xs">Opacity</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider
                value={[element.opacity * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => set("opacity", v[0] / 100)}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">{Math.round(element.opacity * 100)}%</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Type-specific properties */}
      {element.type === "text" && <TextProps element={element as TextElement} set={set} />}
      {(element.type === "rect" || element.type === "ellipse" || element.type === "triangle" || element.type === "line") && (
        <ShapeProps element={element as ShapeElement} set={set} />
      )}
      {element.type === "image" && <ImageProps element={element as ImageElement} set={set} />}

      {/* Fill & Stroke (common) */}
      {element.type !== "line" && element.type !== "image" && (
        <Section title="Fill & Stroke">
          <ColorField
            label="Fill"
            value={element.fill || "transparent"}
            onChange={(c) => set("fill", c)}
            allowTransparent
            allowGradient
          />
          <ColorField
            label="Stroke"
            value={element.stroke || "#0f172a"}
            onChange={(c) => set("stroke", c)}
          />
          <NumberField label="Stroke Width" value={element.strokeWidth || 0} onChange={(v) => set("strokeWidth", Math.max(0, v))} />
          <NumberField label="Corner Radius" value={element.borderRadius || 0} onChange={(v) => set("borderRadius", Math.max(0, v))} />
        </Section>
      )}
      {element.type === "line" && (
        <Section title="Line">
          <ColorField label="Color" value={element.stroke || "#0f172a"} onChange={(c) => set("stroke", c)} />
          <NumberField label="Thickness" value={element.strokeWidth || 2} onChange={(v) => set("strokeWidth", Math.max(1, v))} />
        </Section>
      )}

      {/* Shadow */}
      <Section title="Shadow">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Enabled</Label>
          <Toggle pressed={element.shadow ?? false} onPressedChange={(v) => set("shadow", v)} />
        </div>
        {element.shadow && (
          <div className="space-y-2 mt-2">
            <ColorField label="Color" value={element.shadowColor || "rgba(15,23,42,0.15)"} onChange={(c) => set("shadowColor", c)} allowAlpha />
            <NumberField label="Blur" value={element.shadowBlur ?? 24} onChange={(v) => set("shadowBlur", v)} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Offset X" value={element.shadowX ?? 0} onChange={(v) => set("shadowX", v)} />
              <NumberField label="Offset Y" value={element.shadowY ?? 0} onChange={(v) => set("shadowY", v)} />
            </div>
          </div>
        )}
      </Section>

      {/* Arrange */}
      <Section title="Arrange">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => bringToFront(element.id)} className="gap-1.5">
            <ArrowUpToLine className="w-3.5 h-3.5" /> Front
          </Button>
          <Button variant="outline" size="sm" onClick={() => sendToBack(element.id)} className="gap-1.5">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Back
          </Button>
        </div>
      </Section>
    </div>
  )
}

function TextProps({
  element,
  set,
}: {
  element: TextElement
  set: <K extends keyof EditorElement>(key: K, value: EditorElement[K]) => void
}) {
  return (
    <Section title="Text">
      {/* Text content editor — live updates the canvas as you type */}
      <div>
        <Label className="text-xs">Content</Label>
        <textarea
          value={element.text}
          onChange={(e) => set("text", e.target.value as EditorElement["text"])}
          className="w-full mt-1 min-h-[80px] max-h-[200px] text-xs font-mono p-2 rounded border resize-y bg-background"
          placeholder="Enter text..."
        />
      </div>
      <div>
        <Label className="text-xs">Font Family</Label>
        <Select value={element.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
          <SelectTrigger className="h-8 mt-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter, system-ui, sans-serif">Inter (Sans)</SelectItem>
            <SelectItem value="Georgia, serif">Georgia (Serif)</SelectItem>
            <SelectItem value="'Courier New', monospace">Courier (Mono)</SelectItem>
            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
            <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
            <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
            <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
            <SelectItem value="'Comic Sans MS', cursive">Comic Sans</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <div className="flex items-center gap-1 mt-1">
            <Input
              type="number"
              value={element.fontSize}
              onChange={(e) => set("fontSize", Math.max(1, Number(e.target.value)))}
              className="h-8 text-xs"
            />
            <span className="text-xs">px</span>
          </div>
        </div>
        <div>
          <Label className="text-xs">Line Height</Label>
          <Input
            type="number"
            step={0.1}
            value={element.lineHeight}
            onChange={(e) => set("lineHeight", Math.max(0.5, Number(e.target.value)))}
            className="h-8 mt-1 text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <Label className="text-xs">Letter Spacing</Label>
          <Input
            type="number"
            value={element.letterSpacing}
            onChange={(e) => set("letterSpacing", Number(e.target.value))}
            className="h-8 mt-1 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Padding</Label>
          <Input
            type="number"
            value={element.padding}
            onChange={(e) => set("padding", Math.max(0, Number(e.target.value)))}
            className="h-8 mt-1 text-xs"
          />
        </div>
      </div>

      {/* Style toggles */}
      <div className="flex gap-1 mt-3">
        <Toggle
          pressed={element.fontWeight === "bold" || element.fontWeight === "700"}
          onPressedChange={(v) => set("fontWeight", v ? "700" : "400")}
          className="h-8 w-8"
        >
          <Bold className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle pressed={element.fontStyle === "italic"} onPressedChange={(v) => set("fontStyle", v ? "italic" : "normal")} className="h-8 w-8">
          <Italic className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          pressed={element.textDecoration === "underline"}
          onPressedChange={(v) => set("textDecoration", v ? "underline" : "none")}
          className="h-8 w-8"
        >
          <Underline className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle
          pressed={element.textDecoration === "line-through"}
          onPressedChange={(v) => set("textDecoration", v ? "line-through" : "none")}
          className="h-8 w-8"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </Toggle>
      </div>

      {/* Alignment */}
      <Label className="text-xs mt-3 block">Text Align</Label>
      <div className="flex gap-1 mt-1">
        <Toggle pressed={element.textAlign === "left"} onPressedChange={() => set("textAlign", "left")} className="h-8 w-8">
          <AlignLeft className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle pressed={element.textAlign === "center"} onPressedChange={() => set("textAlign", "center")} className="h-8 w-8">
          <AlignCenter className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle pressed={element.textAlign === "right"} onPressedChange={() => set("textAlign", "right")} className="h-8 w-8">
          <AlignRight className="w-3.5 h-3.5" />
        </Toggle>
        <Toggle pressed={element.textAlign === "justify"} onPressedChange={() => set("textAlign", "justify")} className="h-8 w-8">
          <AlignJustify className="w-3.5 h-3.5" />
        </Toggle>
      </div>

      <Label className="text-xs mt-3 block">Vertical Align</Label>
      <Select value={element.verticalAlign} onValueChange={(v) => set("verticalAlign", v as TextElement["verticalAlign"])}>
        <SelectTrigger className="h-8 mt-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="top">Top</SelectItem>
          <SelectItem value="middle">Middle</SelectItem>
          <SelectItem value="bottom">Bottom</SelectItem>
        </SelectContent>
      </Select>

      <ColorField label="Text Color" value={element.color} onChange={(c) => set("color", c)} />

      {/* List formatting (PPT-style bullets & numbering) */}
      <Label className="text-xs mt-3 block">List</Label>
      <div className="flex gap-1 mt-1">
        <Toggle
          pressed={(element.listType || "none") === "none"}
          onPressedChange={() => set("listType", "none" as TextElement["listType"])}
          className="h-8 w-8"
          title="No list"
        >
          <span className="text-[10px] font-mono">—</span>
        </Toggle>
        <Toggle
          pressed={(element.listType || "none") === "bullet"}
          onPressedChange={() => set("listType", "bullet" as TextElement["listType"])}
          className="h-8 w-8"
          title="Bullet list"
        >
          <span className="text-sm leading-none">•</span>
        </Toggle>
        <Toggle
          pressed={(element.listType || "none") === "number"}
          onPressedChange={() => set("listType", "number" as TextElement["listType"])}
          className="h-8 w-8"
          title="Numbered list"
        >
          <span className="text-[10px] font-mono">1.</span>
        </Toggle>
      </div>
      {(element.listType === "bullet" || element.listType === "number") && (
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">Style</Label>
            <Select
              value={element.listStyle || "disc"}
              onValueChange={(v) => set("listStyle", v as TextElement["listStyle"])}
            >
              <SelectTrigger className="h-8 mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {element.listType === "bullet" ? (
                  <>
                    <SelectItem value="disc">● Filled circle</SelectItem>
                    <SelectItem value="circle">○ Hollow circle</SelectItem>
                    <SelectItem value="square">■ Filled square</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="decimal">1. 2. 3.</SelectItem>
                    <SelectItem value="lower-alpha">a. b. c.</SelectItem>
                    <SelectItem value="upper-roman">I. II. III.</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20">
            <Label className="text-[10px] text-muted-foreground">Indent</Label>
            <Input
              type="number"
              value={element.listIndent || 0}
              onChange={(e) => set("listIndent", parseInt(e.target.value) || 0)}
              className="h-8 mt-1 text-xs"
            />
          </div>
        </div>
      )}

      {/* Wrapping toggle — auto-detected on import, user can override */}
      <Label className="text-xs mt-3 block">Wrapping</Label>
      <div className="flex gap-1 mt-1">
        <Toggle
          pressed={element.wrap !== false}
          onPressedChange={() => set("wrap", true)}
          className="h-8 flex-1 text-[11px]"
          title="Wrap text inside the box (paragraphs, body text)"
        >
          Wrap
        </Toggle>
        <Toggle
          pressed={element.wrap === false}
          onPressedChange={() => set("wrap", false)}
          className="h-8 flex-1 text-[11px]"
          title="Keep text on a single line (headings, labels)"
        >
          Single line
        </Toggle>
      </div>
    </Section>
  )
}

function ShapeProps({
  element,
  set,
}: {
  element: ShapeElement
  set: <K extends keyof EditorElement>(key: K, value: EditorElement[K]) => void
}) {
  return null // shape-specific handled in Fill & Stroke section
}

function ImageProps({
  element,
  set,
}: {
  element: ImageElement
  set: <K extends keyof EditorElement>(key: K, value: EditorElement[K]) => void
}) {
  return (
    <Section title="Image">
      <div>
        <Label className="text-xs">Source URL</Label>
        <Input
          value={element.src}
          onChange={(e) => set("src", e.target.value as EditorElement["src"])}
          className="h-8 mt-1 text-xs"
        />
      </div>
      <div className="mt-2">
        <Label className="text-xs">Object Fit</Label>
        <Select
          value={element.objectFit}
          onValueChange={(v) => set("objectFit", v as ImageElement["objectFit"])}
        >
          <SelectTrigger className="h-8 mt-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2">
        <Label className="text-xs">Alt Text</Label>
        <Input
          value={element.alt || ""}
          onChange={(e) => set("alt", e.target.value as EditorElement["alt"])}
          className="h-8 mt-1 text-xs"
        />
      </div>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-border/40 space-y-2.5">
      <h4 className="text-[10px] font-bold uppercase text-muted-foreground/80 tracking-wider">{title}</h4>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1 mt-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 text-xs"
        />
        {suffix && <span className="text-xs">{suffix}</span>}
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent,
  allowGradient,
}: {
  label: string
  value: string
  onChange: (c: string) => void
  allowTransparent?: boolean
  allowAlpha?: boolean
  allowGradient?: boolean
}) {
  return (
    <div className="mt-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center mt-1">
        <ColorSwatchPicker
          value={value}
          onChange={onChange}
          allowTransparent={allowTransparent}
        />
        {allowGradient && (
          <GradientPicker value={value} onChange={onChange} />
        )}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs font-mono"
        />
      </div>
    </div>
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
