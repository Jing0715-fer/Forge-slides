"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEditor } from "@/store/editor-store"
import { getTemplateIndex, loadTemplate, type TemplateIndexEntry, type SlideTemplate, type TemplateAnalysis } from "@/lib/template-store"
import { analyzeTemplate, buildTemplatePrompt } from "@/lib/template-analyzer"
import { saveAiHistory } from "@/lib/ai-history"
import { parseHtmlToRawSlides, loadFontsFromHtml } from "@/lib/html-io"
import { injectContentIntoTemplateHtml, buildInjectedHtmlDoc } from "@/lib/template-inject"
import { toast } from "sonner"
import {
  Sparkles, FileText, Loader2, Wand2, ChevronRight, ChevronLeft, FileUp, Check,
  Plus, Trash2, Image as ImageIcon, ArrowRight, Settings2, X, Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A slide as proposed by Phase 1 (count) and editable by the user. */
interface EditableSlide {
  index: number
  title: string
  subtitle: string
  bullets: string[]
  layout: "title-only" | "title+bullets" | "title+image" | "section-divider" | "quote" | "summary"
  image: string
}

const PHASES = {
  INPUT: "input",       // user pastes markdown + selects template
  COUNTING: "counting", // Phase 1: Hermes is running
  EDIT: "edit",         // Phase 2: user reviews/edits the outline
  MATCHING: "matching", // Phase 3: Hermes matches slides to template
  RENDERING: "rendering", // client-side: injecting content + loading slides
  DONE: "done",
  ERROR: "error",
} as const
type Phase = typeof PHASES[keyof typeof PHASES]

const STEP_TITLES: Record<Phase, string> = {
  input: "Paste your content",
  counting: "Phase 1 — Outline (Hermes)",
  edit: "Phase 2 — Review & Edit",
  matching: "Phase 3 — Template Match (Hermes)",
  rendering: "Building slides",
  done: "Slides loaded into editor",
  error: "Generation failed",
}

const LAYOUT_BADGES: Record<EditableSlide["layout"], string> = {
  "title-only": "Cover",
  "title+bullets": "Bullets",
  "title+image": "Image",
  "section-divider": "Divider",
  "quote": "Quote",
  "summary": "Summary",
}

const DEFAULT_EMPTY_SLIDE: EditableSlide = {
  index: 0, title: "", subtitle: "", bullets: [], layout: "title+bullets", image: "",
}

export function AiGenerateDialog({ open, onOpenChange }: Props) {
  const { loadProject, slides: currentSlides } = useEditor()
  const [phase, setPhase] = useState<Phase>(PHASES.INPUT)
  const [markdown, setMarkdown] = useState("")
  const [templates, setTemplates] = useState<TemplateIndexEntry[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [proposedSlides, setProposedSlides] = useState<EditableSlide[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [polling, setPolling] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (open) {
      setTemplates(getTemplateIndex())
      resetState()
    }
  }, [open])

  // Elapsed-time counter while waiting for Hermes
  useEffect(() => {
    if (phase !== PHASES.COUNTING && phase !== PHASES.MATCHING) {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [phase])

  function resetState() {
    setPhase(PHASES.INPUT)
    setMarkdown("")
    setSelectedTemplate(null)
    setProposedSlides([])
    setErrorMessage("")
    setPolling(false)
    setElapsed(0)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setMarkdown(reader.result as string)
      toast.success(`Loaded ${file.name} (${(reader.result as string).length} chars)`)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // ─── Phase 1: ask Hermes to outline the deck ─────────────────────────────
  async function runCountPhase() {
    if (!markdown.trim()) {
      toast.error("Please paste or upload markdown content first")
      return
    }
    setPhase(PHASES.COUNTING)
    setErrorMessage("")
    try {
      const startRes = await fetch("/api/generate-slides/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      })
      if (!startRes.ok) {
        const t = await startRes.text().catch(() => "")
        throw new Error(t.slice(0, 300) || `HTTP ${startRes.status}`)
      }
      const { jobId } = await startRes.json()
      // Poll
      setPolling(true)
      const result = await pollUntilDone(jobId, 60) // up to 60 polls × 3s = 3 min
      setPolling(false)

      const parsed = (result.result as { slides?: EditableSlide[] }) || {}
      const slidesArr = (parsed.slides || []).map((s, i) => ({
        index: i + 1,
        title: s.title || `Slide ${i + 1}`,
        subtitle: s.subtitle || "",
        bullets: Array.isArray(s.bullets) ? s.bullets.filter(Boolean) : [],
        layout: (s.layout || "title+bullets") as EditableSlide["layout"],
        image: s.image || "",
      }))
      if (slidesArr.length === 0) throw new Error("Hermes returned no slides")
      setProposedSlides(slidesArr)
      setPhase(PHASES.EDIT)
      toast.success(`Hermes proposed ${slidesArr.length} slides — review & edit, then click Next.`)
    } catch (e) {
      handleError(e)
    }
  }

  // ─── Phase 3: ask Hermes to match user slides → template slides ──────────
  async function runMatchPhase() {
    setPhase(PHASES.MATCHING)
    setErrorMessage("")
    try {
      let template: SlideTemplate | null = null
      if (selectedTemplate) {
        template = await loadTemplate(selectedTemplate)
        if (!template) throw new Error("Template not found — it may have been deleted")
      }
      const tplSummaries = (template?.slides || []).map((s, i) => summarizeTemplateSlide(s, i + 1))
      if (tplSummaries.length === 0) {
        throw new Error("No template slides available. Select a template or load one with 'Import HTML' first.")
      }
      const userSlides = proposedSlides.map((s) => ({
        index: s.index,
        title: s.title,
        subtitle: s.subtitle || undefined,
        bullets: s.bullets,
        layout: s.layout,
      }))

      const startRes = await fetch("/api/generate-slides/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSlides,
          templateSummaries: tplSummaries,
          markdown: markdown.slice(0, 5000),
        }),
      })
      if (!startRes.ok) {
        const t = await startRes.text().catch(() => "")
        throw new Error(t.slice(0, 300) || `HTTP ${startRes.status}`)
      }
      const { jobId } = await startRes.json()
      setPolling(true)
      const result = await pollUntilDone(jobId, 60)
      setPolling(false)

      const matches = (result.result as { matches?: { userSlideIndex: number; templateSlideIndex: number; reasoning: string }[] })?.matches || []
      if (matches.length !== proposedSlides.length) {
        throw new Error(`Hermes returned ${matches.length} matches but expected ${proposedSlides.length}. Please retry.`)
      }

      setPhase(PHASES.RENDERING)
      const newSlides = renderMatchedSlides(proposedSlides, matches, template!.slides)
      if (newSlides.length === 0) throw new Error("Rendering produced 0 slides")

      loadFontsFromHtml(serializeSlidesToHtml(newSlides))
      loadProject({ slides: newSlides, currentSlideId: newSlides[0]?.id || "" })

      try {
        await saveAiHistory({
          templateName: template!.name,
          templateId: selectedTemplate,
          markdownPreview: markdown.substring(0, 200),
          markdownLength: markdown.length,
          slideCount: newSlides.length,
          markdown,
          slides: newSlides as unknown[],
        })
      } catch (e) { console.warn("Failed to save AI history:", e) }

      setPhase(PHASES.DONE)
      toast.success(`Generated ${newSlides.length} slide${newSlides.length === 1 ? "" : "s"} — loaded into editor`)
    } catch (e) {
      handleError(e)
    }
  }

  function handleError(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    setErrorMessage(msg)
    setPhase(PHASES.ERROR)
    setPolling(false)
    toast.error("Generation failed: " + msg)
  }

  // ─── Edit helpers ────────────────────────────────────────────────────────
  function addSlide(afterIdx: number) {
    const newSlide: EditableSlide = {
      ...DEFAULT_EMPTY_SLIDE,
      index: proposedSlides.length + 1,
      title: "New slide",
      bullets: ["First point", "Second point"],
    }
    const next = [...proposedSlides]
    next.splice(afterIdx + 1, 0, newSlide)
    setProposedSlides(next.map((s, i) => ({ ...s, index: i + 1 })))
  }
  function deleteSlide(idx: number) {
    if (proposedSlides.length <= 1) {
      toast.error("Need at least 1 slide")
      return
    }
    const next = proposedSlides.filter((_, i) => i !== idx)
    setProposedSlides(next.map((s, i) => ({ ...s, index: i + 1 })))
  }
  function moveSlide(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= proposedSlides.length) return
    const next = [...proposedSlides]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setProposedSlides(next.map((s, i) => ({ ...s, index: i + 1 })))
  }
  function updateSlide(idx: number, patch: Partial<EditableSlide>) {
    setProposedSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }
  function updateBullet(idx: number, bIdx: number, value: string) {
    setProposedSlides((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s
        const bullets = [...s.bullets]
        bullets[bIdx] = value
        return { ...s, bullets }
      }),
    )
  }
  function addBullet(idx: number) {
    setProposedSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, bullets: [...s.bullets, "New point"] } : s)),
    )
  }
  function removeBullet(idx: number, bIdx: number) {
    setProposedSlides((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s
        return { ...s, bullets: s.bullets.filter((_, j) => j !== bIdx) }
      }),
    )
  }

  // ─── Phase navigation ────────────────────────────────────────────────────
  function goBackFromEdit() {
    setPhase(PHASES.INPUT)
  }
  function goForwardFromEdit() {
    if (!selectedTemplate) {
      toast.error("Please go back and select a template before continuing")
      return
    }
    runMatchPhase()
  }

  function closeDialog() {
    onOpenChange(false)
    // Defer reset so users don't see the flash
    setTimeout(resetState, 300)
  }

  const isWorking = phase === PHASES.COUNTING || phase === PHASES.MATCHING || phase === PHASES.RENDERING

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Generate Slides
            <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              via Hermes
            </span>
          </DialogTitle>
          <DialogDescription>{STEP_TITLES[phase]}</DialogDescription>
        </DialogHeader>

        {/* Phase progress indicator */}
        {phase !== PHASES.INPUT && (
          <PhaseIndicator phase={phase} polling={polling} elapsed={elapsed} />
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          {phase === PHASES.INPUT && (
            <InputPhase
              markdown={markdown}
              setMarkdown={setMarkdown}
              templates={templates}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              onFileUpload={handleFileUpload}
              useCurrentAsTemplate={currentSlides.length > 0 && currentSlides.some((s) => s.rawHtml)}
              hasCurrentSlides={currentSlides.length > 0}
            />
          )}
          {phase === PHASES.COUNTING && (
            <WorkingPhase
              title="Phase 1: Asking Hermes to outline your deck"
              subtitle="Hermes is reading your markdown and proposing a slide structure (titles, bullets per slide)."
              elapsed={elapsed}
            />
          )}
          {phase === PHASES.EDIT && (
            <EditPhase
              slides={proposedSlides}
              addSlide={addSlide}
              deleteSlide={deleteSlide}
              moveSlide={moveSlide}
              updateSlide={updateSlide}
              updateBullet={updateBullet}
              addBullet={addBullet}
              removeBullet={removeBullet}
            />
          )}
          {phase === PHASES.MATCHING && (
            <WorkingPhase
              title="Phase 3: Asking Hermes to match each slide to a template"
              subtitle="For every slide you edited, Hermes picks the template slide whose layout fits best (cover/divider/bullets/summary)."
              elapsed={elapsed}
            />
          )}
          {phase === PHASES.RENDERING && (
            <WorkingPhase
              title="Building slides"
              subtitle="Injecting your content into the matched template HTML."
              elapsed={0}
            />
          )}
          {phase === PHASES.DONE && (
            <DonePhase slideCount={proposedSlides.length} />
          )}
          {phase === PHASES.ERROR && (
            <ErrorPhase message={errorMessage} onRetry={resetState} />
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          {phase === PHASES.INPUT && (
            <>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                onClick={runCountPhase}
                disabled={!markdown.trim()}
                className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
              >
                <Wand2 className="w-4 h-4" />
                Phase 1: Plan deck with Hermes
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {phase === PHASES.COUNTING && (
            <Button variant="outline" disabled>Working...</Button>
          )}
          {phase === PHASES.EDIT && (
            <>
              <Button variant="outline" onClick={goBackFromEdit} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                onClick={goForwardFromEdit}
                className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
              >
                Phase 3: Match & build slides
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {phase === PHASES.MATCHING && (
            <Button variant="outline" disabled>Working...</Button>
          )}
          {phase === PHASES.RENDERING && (
            <Button variant="outline" disabled>Working...</Button>
          )}
          {phase === PHASES.DONE && (
            <Button onClick={closeDialog} className="gap-2">
              <Check className="w-4 h-4" /> View Slides
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {phase === PHASES.ERROR && (
            <>
              <Button variant="outline" onClick={closeDialog}>Close</Button>
              <Button onClick={resetState} className="gap-2">
                <Settings2 className="w-4 h-4" /> Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PhaseIndicator({ phase, polling, elapsed }: { phase: Phase; polling: boolean; elapsed: number }) {
  const order: Phase[] = [PHASES.COUNTING, PHASES.EDIT, PHASES.MATCHING, PHASES.RENDERING]
  const labels = ["Count", "Edit", "Match", "Build"]
  const icons = [Wand2, FileText, Settings2, ArrowRight]
  const currentIdx = order.indexOf(phase)
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      {order.map((p, i) => {
        const Icon = icons[i]
        const isCurrent = p === phase
        const isDone = currentIdx > i || phase === PHASES.DONE
        return (
          <React.Fragment key={p}>
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                isDone && "bg-green-500/15 text-green-700",
                isCurrent && "bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/30",
                !isCurrent && !isDone && "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? <Check className="w-3 h-3" /> : isCurrent && polling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
              {labels[i]}
              {isCurrent && polling && <span className="ml-1 text-[10px] tabular-nums opacity-70">({elapsed}s)</span>}
            </div>
            {i < order.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function InputPhase(props: {
  markdown: string
  setMarkdown: (s: string) => void
  templates: TemplateIndexEntry[]
  selectedTemplate: string | null
  setSelectedTemplate: (s: string | null) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  useCurrentAsTemplate: boolean
  hasCurrentSlides: boolean
}) {
  const { markdown, setMarkdown, templates, selectedTemplate, setSelectedTemplate, onFileUpload, useCurrentAsTemplate } = props
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 h-full min-h-0 overflow-hidden">
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Markdown Content</Label>
          <label className="cursor-pointer">
            <input type="file" accept=".md,.txt,.markdown" onChange={onFileUpload} className="hidden" />
            <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <FileUp className="w-3 h-3" /> Upload .md
            </span>
          </label>
        </div>
        <Textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={`# Title of the deck\n\nIntro paragraph.\n\n## First section\n- Point one\n- Point two\n\n## Second section\nSome paragraph text...`}
          className="flex-1 min-h-[250px] font-mono text-xs resize-none"
        />
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
          <span>{markdown.length} chars</span>
          <span>Hermes decides slide count + content</span>
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">2. Choose a Template</Label>
        <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
          <div className="space-y-1.5 pr-2">
            {templates.length === 0 && !useCurrentAsTemplate && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No templates saved yet.</p>
                <p className="text-xs mt-1">Import HTML and use "Save as Template" first.</p>
              </div>
            )}
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border-2 transition-all",
                  selectedTemplate === tpl.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {tpl.thumbnail
                    ? <img src={tpl.thumbnail} alt="" className="w-10 h-6 rounded object-cover border" />
                    : <div className="w-10 h-6 rounded bg-muted border flex items-center justify-center"><FileText className="w-3 h-3 text-muted-foreground/50" /></div>
                  }
                  <span className="text-sm font-semibold truncate">{tpl.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tpl.slideCount} slides</span>
                </div>
                {tpl.description && <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>}
              </button>
            ))}
          </div>
        </ScrollArea>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Used in Phase 3 — Hermes pairs each user slide with the best-matching template slide.
        </p>
      </div>
    </div>
  )
}

function WorkingPhase({ title, subtitle, elapsed }: { title: string; subtitle: string; elapsed: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-20 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md text-center px-4">{subtitle}</p>
      {elapsed > 0 && (
        <div className="mt-4 px-3 py-1.5 rounded-full bg-muted text-xs font-mono tabular-nums">
          {elapsed}s elapsed
          {elapsed > 90 && " — Hermes is thinking hard, please be patient"}
        </div>
      )}
    </div>
  )
}

function EditPhase({
  slides, addSlide, deleteSlide, moveSlide, updateSlide, updateBullet, addBullet, removeBullet,
}: {
  slides: EditableSlide[]
  addSlide: (idx: number) => void
  deleteSlide: (idx: number) => void
  moveSlide: (idx: number, dir: -1 | 1) => void
  updateSlide: (idx: number, patch: Partial<EditableSlide>) => void
  updateBullet: (idx: number, bIdx: number, value: string) => void
  addBullet: (idx: number) => void
  removeBullet: (idx: number, bIdx: number) => void
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="text-xs text-muted-foreground">
          <strong className="text-foreground">{slides.length}</strong> slides proposed by Hermes — edit anything (titles, bullets, layout, image URL) before matching to template.
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-3 pb-2">
          {slides.map((s, i) => (
            <div key={i} className="rounded-lg border-2 border-border bg-card p-3 group hover:border-muted-foreground/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  #{s.index}
                </span>
                <select
                  value={s.layout}
                  onChange={(e) => updateSlide(i, { layout: e.target.value as EditableSlide["layout"] })}
                  className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border bg-background"
                >
                  {(Object.keys(LAYOUT_BADGES) as EditableSlide["layout"][]).map((k) => (
                    <option key={k} value={k}>{LAYOUT_BADGES[k]}</option>
                  ))}
                </select>
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" onClick={() => moveSlide(i, -1)} disabled={i === 0} className="h-6 w-6 p-0 text-xs">↑</Button>
                  <Button size="sm" variant="ghost" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="h-6 w-6 p-0 text-xs">↓</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSlide(i)} className="h-6 w-6 p-0 text-xs hover:text-destructive">×</Button>
                </div>
              </div>

              <Input
                value={s.title}
                onChange={(e) => updateSlide(i, { title: e.target.value })}
                placeholder="Slide title"
                className="mb-2 h-8 font-semibold"
              />

              <Input
                value={s.subtitle}
                onChange={(e) => updateSlide(i, { subtitle: e.target.value })}
                placeholder="Subtitle (optional)"
                className="mb-2 h-7 text-xs text-muted-foreground"
              />

              {(s.layout === "title+image") && (
                <div className="mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={s.image}
                    onChange={(e) => updateSlide(i, { image: e.target.value })}
                    placeholder="https://... image URL"
                    className="h-7 text-xs"
                  />
                </div>
              )}

              {s.layout !== "title-only" && s.layout !== "section-divider" && s.layout !== "quote" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Bullets</Label>
                    <Button size="sm" variant="ghost" onClick={() => addBullet(i)} className="h-5 px-1.5 text-[10px] gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add
                    </Button>
                  </div>
                  {s.bullets.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs">•</span>
                      <Input
                        value={b}
                        onChange={(e) => updateBullet(i, bIdx, e.target.value)}
                        placeholder="Bullet point"
                        className="flex-1 h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBullet(i, bIdx)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {s.bullets.length === 0 && (
                    <div className="text-[10px] text-muted-foreground italic pl-4">No bullets — slide will be text/title only</div>
                  )}
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-dashed flex justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addSlide(i)}
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                >
                  <Plus className="w-3 h-3" /> Insert slide here
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function DonePhase({ slideCount }: { slideCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{slideCount} slides ready</h3>
      <p className="text-sm text-muted-foreground max-w-md text-center px-4">
        Each slide was built by injecting your edited content into the template HTML that Hermes matched. You can keep editing in the editor — every element is now part of the design surface.
      </p>
    </div>
  )
}

function ErrorPhase({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <span className="text-4xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">Generation failed</h3>
      <p className="text-sm text-muted-foreground max-w-md text-center px-4 mb-2">
        Hermes (or the network) returned an error. Common causes: model not configured, network unreachable, or markdown too large.
      </p>
      <pre className="mt-2 text-[10px] font-mono bg-muted p-2 rounded max-w-md overflow-auto whitespace-pre-wrap break-words">
        {message}
      </pre>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function pollUntilDone(jobId: string, maxPolls: number): Promise<{ result?: unknown; status: string; error?: string }> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const res = await fetch(`/api/generate-slides/poll?id=${jobId}`)
      if (!res.ok) {
        if (res.status === 404) continue
        continue
      }
      const data = await res.json()
      if (data.status === "done" || data.status === "error") return data
      // running — keep polling
    } catch {
      // network blip — keep trying
    }
  }
  throw new Error("Timed out waiting for Hermes (3 minutes). Please try again.")
}

interface SlideLite {
  index: number
  rawHtml?: string
  html?: string
  background?: string
  id?: string
}

/** Build a compact text summary of a template slide for the match prompt. */
function summarizeTemplateSlide(s: SlideLite, index: number) {
  const html = (s.rawHtml || s.html || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "")
  const parser = typeof window !== "undefined" ? new DOMParser() : null
  if (!parser) return { index, layout: "title+bullets", bulletCount: 0, textPreview: "", hasImage: false }
  const doc = parser.parseFromString(html, "text/html")
  const scope = doc.querySelector("section.slide, section[data-slide], [class*='slide']") || doc.body
  if (!scope) return { index, layout: "title+bullets", bulletCount: 0, textPreview: "", hasImage: false }

  const hasImage = !!scope.querySelector("img")
  const bulletCount = scope.querySelectorAll("li").length
  const headings = scope.querySelectorAll("h1, h2, h3, h4")
  const headingCount = headings.length
  const textContent = (scope.textContent || "").replace(/\s+/g, " ").trim().slice(0, 150)

  let layout = "title+bullets"
  if (headingCount === 0 && bulletCount <= 1) layout = "section-divider"
  else if (headingCount === 1 && bulletCount === 0 && !hasImage) layout = "title-only"
  else if (bulletCount === 0 && hasImage) layout = "title+image"
  else if (headingCount === 1 && bulletCount === 0 && !hasImage) layout = "summary"
  else if (headingCount >= 2 && bulletCount <= 1) layout = "quote"

  return {
    index,
    layout,
    bulletCount,
    textPreview: textContent,
    hasImage,
  }
}

/**
 * For each user slide, find the matched template slide and inject the user's
 * content into its rawHtml. The resulting Slide[] is loaded into the editor.
 */
function renderMatchedSlides(
  userSlides: EditableSlide[],
  matches: { userSlideIndex: number; templateSlideIndex: number; reasoning: string }[],
  templateSlides: SlideLite[],
) {
  const parser = new DOMParser()
  const result: SlideLite[] = []

  for (const us of userSlides) {
    const match = matches.find((m) => m.userSlideIndex === us.index)
    const tIdx = match ? Math.max(0, match.templateSlideIndex - 1) : 0
    const tmpl = templateSlides[tIdx] || templateSlides[0]
    if (!tmpl) continue

    const baseHtml = tmpl.rawHtml || tmpl.html || ""
    if (!baseHtml) continue

    // Parse the section element's outerHTML
    const doc = parser.parseFromString(baseHtml, "text/html")
    let scope: Element | null =
      doc.querySelector("section.slide, section[data-slide], [class*='slide']") ||
      doc.body?.firstElementChild
    if (!scope) continue

    // Inject content
    const titleEl = scope.querySelector("h1, h2, h3")
    if (titleEl) titleEl.textContent = us.title || titleEl.textContent || ""

    const allHeadings = scope.querySelectorAll("h1, h2, h3, h4")
    if (us.subtitle && allHeadings.length >= 2) {
      allHeadings[1].textContent = us.subtitle
    }

    const listEl = scope.querySelector("ul, ol")
    const userBullets = (us.bullets || []).filter((b) => b && b.trim())
    if (listEl) {
      const existing = Array.from(listEl.querySelectorAll("li"))
      if (userBullets.length === 0) {
        listEl.remove()
      } else if (existing.length === 0) {
        for (const b of userBullets) {
          const li = doc.createElement("li")
          li.textContent = b
          listEl.appendChild(li)
        }
      } else {
        existing.forEach((li, idx) => {
          if (idx < userBullets.length) li.textContent = userBullets[idx]
          else li.remove()
        })
        for (let i = existing.length; i < userBullets.length; i++) {
          const li = doc.createElement("li")
          li.textContent = userBullets[i]
          listEl.appendChild(li)
        }
      }
    } else if (userBullets.length > 0) {
      const ul = doc.createElement("ul")
      for (const b of userBullets) {
        const li = doc.createElement("li")
        li.textContent = b
        ul.appendChild(li)
      }
      scope.appendChild(ul)
    }

    if (us.image) {
      const img = scope.querySelector("img")
      if (img) {
        img.setAttribute("src", us.image)
        img.setAttribute("alt", us.title || "")
      }
    }

    // Wrap in doc and parse via parseHtmlToRawSlides pipeline
    const styleBlocks = Array.from(doc.querySelectorAll("style")).map((s) => s.outerHTML).join("\n")
    const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.outerHTML).join("\n")
    const wrapped = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1280, initial-scale=1.0">${linkTags}${styleBlocks}<style>html,body{margin:0;padding:0;width:1280px;height:720px;overflow:hidden;background:#FAF9F6;}.slide,section.slide,[data-slide]{display:block!important;width:1280px!important;height:720px!important;}</style></head><body>${scope.outerHTML}</body></html>`
    const parsed = parseHtmlToRawSlides(wrapped)
    if (parsed.length > 0) {
      result.push(parsed[0])
    }
  }

  return result
}

/** Best-effort: serialize a Slide[] back to one HTML doc, for font detection. */
function serializeSlidesToHtml(slides: SlideLite[]): string {
  return `<!DOCTYPE html><html><head></head><body>${slides.map((s) => s.rawHtml || s.html || "").join("\n")}</body></html>`
}
