"use client"

import React, { useState, useEffect } from "react"
import { useEditor } from "@/store/editor-store"
import type { EntranceAnimation, ExitAnimation, EmphasisAnimation, EditorElement } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play, RotateCcw, X, Sparkles, ChevronDown, ChevronRight,
  Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Maximize2, Circle, RefreshCw, LogIn, LogOut, Activity,
  Copy, ClipboardPaste, Waves, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/**
 * Animation definitions — each type has an icon + label + the CSS keyframe
 * names for entrance, exit (reversed), and emphasis (loop).
 */
const ANIMATIONS: { value: EntranceAnimation; label: string; icon: React.ReactNode; entranceKeyframe: string; exitKeyframe: string }[] = [
  { value: "none", label: "None", icon: <X className="w-3.5 h-3.5" />, entranceKeyframe: "", exitKeyframe: "" },
  { value: "fade", label: "Fade", icon: <Circle className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-fade", exitKeyframe: "el-exit-fade" },
  { value: "slide-up", label: "Slide Up", icon: <ArrowUp className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-slide-up", exitKeyframe: "el-exit-slide-up" },
  { value: "slide-down", label: "Slide Down", icon: <ArrowDown className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-slide-down", exitKeyframe: "el-exit-slide-down" },
  { value: "slide-left", label: "Slide Left", icon: <ArrowLeft className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-slide-left", exitKeyframe: "el-exit-slide-left" },
  { value: "slide-right", label: "Slide Right", icon: <ArrowRight className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-slide-right", exitKeyframe: "el-exit-slide-right" },
  { value: "zoom", label: "Zoom", icon: <Maximize2 className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-zoom", exitKeyframe: "el-exit-zoom" },
  { value: "bounce", label: "Bounce", icon: <Zap className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-bounce", exitKeyframe: "el-exit-bounce" },
  { value: "spin", label: "Spin", icon: <RefreshCw className="w-3.5 h-3.5" />, entranceKeyframe: "el-entrance-spin", exitKeyframe: "el-exit-spin" },
]

/**
 * Emphasis animation definitions — these loop continuously.
 */
const EMPHASIS_ANIMATIONS: { value: EmphasisAnimation; label: string; icon: React.ReactNode; keyframe: string }[] = [
  { value: "none", label: "None", icon: <X className="w-3.5 h-3.5" />, keyframe: "" },
  { value: "pulse", label: "Pulse", icon: <Activity className="w-3.5 h-3.5" />, keyframe: "el-emphasis-pulse" },
  { value: "spin-continuous", label: "Spin", icon: <RefreshCw className="w-3.5 h-3.5" />, keyframe: "el-emphasis-spin-continuous" },
  { value: "wiggle", label: "Wiggle", icon: <Waves className="w-3.5 h-3.5" />, keyframe: "el-emphasis-wiggle" },
  { value: "bounce-continuous", label: "Float", icon: <ArrowUp className="w-3.5 h-3.5" />, keyframe: "el-emphasis-bounce-continuous" },
  { value: "glow", label: "Glow", icon: <Sparkles className="w-3.5 h-3.5" />, keyframe: "el-emphasis-glow" },
  { value: "shake", label: "Shake", icon: <AlertTriangle className="w-3.5 h-3.5" />, keyframe: "el-emphasis-shake" },
  { value: "flash", label: "Flash", icon: <Zap className="w-3.5 h-3.5" />, keyframe: "el-emphasis-flash" },
]

type AnimTab = "entrance" | "exit" | "emphasis"

/**
 * AnimationPane — PPT-style animation editor for the selected element.
 *
 * Supports THREE animation categories via a tab toggle:
 *   - Entrance: plays once when the slide appears
 *   - Exit: plays once when leaving the slide
 *   - Emphasis: loops continuously while the slide is visible
 *
 * Also includes copy/paste animation buttons (animation format painter)
 * for transferring all animation settings between elements.
 */
export function AnimationPane({ element }: { element: EditorElement }) {
  const {
    setElementAnimation, setElementExitAnimation, setElementEmphasisAnimation,
    copyElementAnimation, pasteElementAnimation, animationClipboard, selectedIds,
    setElementAnimationTrigger,
  } = useEditor()
  const [previewKey, setPreviewKey] = useState(0)
  const [expanded, setExpanded] = useState(true)
  const [tab, setTab] = useState<AnimTab>("entrance")

  const entrance = element.entrance || "none"
  const entranceDuration = element.entranceDuration ?? 600
  const entranceDelay = element.entranceDelay ?? 0
  const exit = element.exit || "none"
  const animationTrigger = element.animationTrigger || "with-slide"
  const exitDuration = element.exitDuration ?? 600
  const exitDelay = element.exitDelay ?? 0
  const emphasis = element.emphasis || "none"
  const emphasisDuration = element.emphasisDuration ?? 1000

  // Active tab's values
  const activeAnim = tab === "entrance" ? entrance : tab === "exit" ? exit : emphasis
  const activeDuration = tab === "entrance" ? entranceDuration : tab === "exit" ? exitDuration : emphasisDuration
  const activeDelay = tab === "entrance" ? entranceDelay : tab === "exit" ? exitDelay : 0

  // Re-trigger the CSS animation when previewKey changes.
  useEffect(() => {
    if (previewKey === 0) return
    const el = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement | null
    if (!el) return
    // Force reflow so the animation restarts.
    el.classList.remove("el-entrance", "el-exit", "el-emphasis")
    void el.offsetWidth
    let keyframe = ""
    let className = ""
    if (tab === "entrance") {
      const def = ANIMATIONS.find((a) => a.value === activeAnim)
      keyframe = def?.entranceKeyframe || ""
      className = "el-entrance"
    } else if (tab === "exit") {
      const def = ANIMATIONS.find((a) => a.value === activeAnim)
      keyframe = def?.exitKeyframe || ""
      className = "el-exit"
    } else {
      const def = EMPHASIS_ANIMATIONS.find((a) => a.value === activeAnim)
      keyframe = def?.keyframe || ""
      className = "el-emphasis"
    }
    if (keyframe) {
      el.style.setProperty("--el-anim-name", keyframe)
      el.style.setProperty("--el-anim-duration", `${activeDuration}ms`)
      el.style.setProperty("--el-anim-delay", `${activeDelay}ms`)
      el.classList.add(className)
      // For emphasis (infinite loop), auto-remove after 3 loops for preview
      if (tab === "emphasis") {
        setTimeout(() => el.classList.remove("el-emphasis"), activeDuration * 3)
      }
    }
  }, [previewKey, activeAnim, activeDuration, activeDelay, element.id, tab])

  function handlePreview() {
    if (activeAnim === "none") {
      toast.info("Select an animation effect first")
      return
    }
    setPreviewKey((k) => k + 1)
  }

  function handleSet(anim: EntranceAnimation) {
    if (tab === "entrance") {
      setElementAnimation(element.id, anim, anim === "none" ? undefined : activeDuration, anim === "none" ? undefined : activeDelay)
    } else if (tab === "exit") {
      setElementExitAnimation(element.id, anim as ExitAnimation, anim === "none" ? undefined : activeDuration, anim === "none" ? undefined : activeDelay)
    } else {
      setElementEmphasisAnimation(element.id, anim as EmphasisAnimation, anim === "none" ? undefined : activeDuration)
    }
    if (anim !== "none") {
      setTimeout(() => setPreviewKey((k) => k + 1), 50)
    }
  }

  function handleClearAll() {
    if (tab === "entrance") setElementAnimation(element.id, "none")
    else if (tab === "exit") setElementExitAnimation(element.id, "none")
    else setElementEmphasisAnimation(element.id, "none")
    toast.success(`${tab === "entrance" ? "Entrance" : tab === "exit" ? "Exit" : "Emphasis"} animation removed`)
  }

  function handleCopyAnimation() {
    copyElementAnimation(element.id)
    toast.success("Animation copied — select another element and paste")
  }

  function handlePasteAnimation() {
    if (!animationClipboard) {
      toast.info("No animation on clipboard. Copy one first.")
      return
    }
    pasteElementAnimation([element.id])
    toast.success("Animation pasted")
  }

  const hasAnyAnim = entrance !== "none" || exit !== "none" || emphasis !== "none"
  const tabColor = tab === "entrance" ? "violet" : tab === "exit" ? "rose" : "amber"
  const tabColorClasses: Record<string, { active: string; hover: string }> = {
    violet: {
      active: "border-violet-500 bg-violet-50 text-violet-700 shadow-sm dark:bg-violet-950/30 dark:text-violet-300",
      hover: "hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700 dark:hover:bg-violet-950/30",
    },
    rose: {
      active: "border-rose-500 bg-rose-50 text-rose-700 shadow-sm dark:bg-rose-950/30 dark:text-rose-300",
      hover: "hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 dark:hover:bg-rose-950/30",
    },
    amber: {
      active: "border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-950/30 dark:text-amber-300",
      hover: "hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 dark:hover:bg-amber-950/30",
    },
  }

  const animList = tab === "emphasis" ? EMPHASIS_ANIMATIONS : ANIMATIONS

  return (
    <div className="p-4 border-b">
      {/* Header — collapsible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 mb-2 group"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
        <Sparkles className="w-3 h-3 text-violet-500" />
        <h4 className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          ANIMATION
        </h4>
        {hasAnyAnim && expanded && (
          <span className="ml-auto text-[9px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 rounded-full px-1.5 py-0.5">
            {[entrance !== "none" && "in", exit !== "none" && "out", emphasis !== "none" && "∞"].filter(Boolean).join(" + ")}
          </span>
        )}
      </button>

      {expanded && (
        <>
          {/* Tab toggle: Entrance / Exit / Emphasis */}
          <div className="flex items-center gap-1 mb-3 p-0.5 rounded-md bg-muted/40 border border-border/40">
            <button
              onClick={() => setTab("entrance")}
              className={cn(
                "flex-1 px-1 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-0.5",
                tab === "entrance"
                  ? "bg-background shadow-sm text-violet-600 dark:text-violet-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LogIn className="w-2.5 h-2.5" />
              In
            </button>
            <button
              onClick={() => setTab("exit")}
              className={cn(
                "flex-1 px-1 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-0.5",
                tab === "exit"
                  ? "bg-background shadow-sm text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LogOut className="w-2.5 h-2.5" />
              Out
            </button>
            <button
              onClick={() => setTab("emphasis")}
              className={cn(
                "flex-1 px-1 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-0.5",
                tab === "emphasis"
                  ? "bg-background shadow-sm text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Loop
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mb-2.5">
            {tab === "entrance"
              ? "Plays once when the slide appears."
              : tab === "exit"
                ? "Plays once when leaving the slide."
                : "Loops continuously while the slide is visible."}
          </p>

          {/* Animation type grid */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {animList.map((anim) => {
              const active = activeAnim === anim.value
              return (
                <button
                  key={anim.value}
                  onClick={() => handleSet(anim.value)}
                  title={anim.label}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1.5 rounded border text-[9px] font-medium transition-all",
                    active
                      ? tabColorClasses[tabColor].active
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {anim.icon}
                  <span className="leading-none">{anim.label}</span>
                </button>
              )
            })}
          </div>

          {/* Duration slider — only when an effect is selected */}
          {activeAnim !== "none" && (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Duration
                  </label>
                  <span className="text-[10px] font-mono text-foreground tabular-nums">
                    {activeDuration}ms
                  </span>
                </div>
                <Slider
                  value={[activeDuration]}
                  min={tab === "emphasis" ? 300 : 200}
                  max={tab === "emphasis" ? 5000 : 2000}
                  step={100}
                  onValueChange={(v) => {
                    if (tab === "entrance") setElementAnimation(element.id, entrance, v[0], entranceDelay)
                    else if (tab === "exit") setElementExitAnimation(element.id, exit as ExitAnimation, v[0], exitDelay)
                    else setElementEmphasisAnimation(element.id, emphasis as EmphasisAnimation, v[0])
                  }}
                  className="cursor-pointer"
                />
              </div>

              {/* Delay slider — only for entrance/exit (not emphasis) */}
              {tab !== "emphasis" && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Delay
                    </label>
                    <span className="text-[10px] font-mono text-foreground tabular-nums">
                      {activeDelay}ms
                    </span>
                  </div>
                  <Slider
                    value={[activeDelay]}
                    min={0}
                    max={3000}
                    step={50}
                    onValueChange={(v) => {
                      if (tab === "entrance") setElementAnimation(element.id, entrance, entranceDuration, v[0])
                      else setElementExitAnimation(element.id, exit as ExitAnimation, exitDuration, v[0])
                    }}
                    className="cursor-pointer"
                  />
                </div>
              )}

              {/* Trigger selector — only for entrance (when it plays in presentation) */}
              {tab === "entrance" && (
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block">
                    Start
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {([
                      { value: "with-slide", label: "With Slide", tip: "Play automatically when slide loads" },
                      { value: "with-previous", label: "With Previous", tip: "Play at the same time as the previous element" },
                      { value: "on-click", label: "On Click", tip: "Play when the user clicks to advance" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setElementAnimationTrigger(element.id, opt.value)}
                        title={opt.tip}
                        className={cn(
                          "py-1.5 px-1 rounded border text-[9px] font-medium transition-all",
                          animationTrigger === opt.value
                            ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm dark:bg-violet-950/30 dark:text-violet-300"
                            : "border-border hover:border-violet-400/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-7 gap-1 text-[11px] flex-1 transition-colors", tabColorClasses[tabColor].hover)}
                  onClick={handlePreview}
                >
                  <Play className="w-3 h-3" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[11px] px-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  onClick={handleClearAll}
                  title={`Remove ${tab} animation`}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}

          {/* Copy/Paste animation — format painter for animations */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[10px] flex-1 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
              onClick={handleCopyAnimation}
              title="Copy all animation settings from this element"
            >
              <Copy className="w-3 h-3" />
              Copy Anim
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1 text-[10px] flex-1 transition-colors",
                animationClipboard
                  ? "hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30"
                  : "opacity-50 cursor-not-allowed",
              )}
              onClick={handlePasteAnimation}
              disabled={!animationClipboard}
              title="Paste copied animation settings to this element"
            >
              <ClipboardPaste className="w-3 h-3" />
              Paste Anim
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
