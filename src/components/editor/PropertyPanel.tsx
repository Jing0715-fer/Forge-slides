"use client"

import React from "react"
import { useEditor } from "@/store/editor-store"
import type { EditorElement, TextElement, ShapeElement, ImageElement } from "@/types/editor"
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
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowUpToLine, ArrowDownToLine, Lock, Unlock, Eye, EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function PropertyPanel() {
  const { selectedIds, currentSlide, updateElement, bringToFront, sendToBack } = useEditor()
  const slide = currentSlide()
  const selected = slide.elements.filter((e) => selectedIds.includes(e.id))
  if (selected.length === 0) {
    return <EmptyPanel />
  }
  if (selected.length > 1) {
    return <MultiSelectPanel count={selected.length} />
  }
  const el = selected[0]
  return <SingleElementPanel key={el.id} element={el} updateElement={updateElement} bringToFront={bringToFront} sendToBack={sendToBack} />
}

function EmptyPanel() {
  const { currentSlide, setSlideBackground } = useEditor()
  const slide = currentSlide()
  return (
    <div className="w-72 border-l bg-background overflow-y-auto h-full">
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
    <div className="w-72 border-l bg-background overflow-y-auto h-full p-4">
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
  const { updateElement: update } = useEditor()
  function set<K extends keyof EditorElement>(key: K, value: EditorElement[K]) {
    update(element.id, { [key]: value } as Partial<EditorElement>)
  }

  return (
    <div className="w-72 border-l bg-background overflow-y-auto h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold capitalize">{element.type}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => set("locked", !element.locked)}>
              {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => set("visible", !element.visible)}>
              {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <Input
          value={element.name}
          onChange={(e) => set("name", e.target.value)}
          className="h-8 text-sm"
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
    <div className="p-4 border-b space-y-2">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{title}</h4>
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
