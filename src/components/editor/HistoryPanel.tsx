"use client"

import React, { useState } from "react"
import { useEditor, type HistoryEntry } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  History, Undo2, Redo2, Trash2, ChevronDown, ChevronRight,
  Plus, Trash2 as TrashIcon, Copy, AlignStartVertical, AlignHorizontalSpaceAround,
  SquareEqual, Group, Ungroup, Image, Palette, Sparkles, Crown, ArrowDownToLine,
  ClipboardPaste, RefreshCw, FolderOpen, ArrowLeftRight, Circle, RotateCcw,
  Edit3, Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus, Trash2: TrashIcon, Copy, AlignStartVertical, AlignHorizontalSpaceAround,
  SquareEqual, Group, Ungroup, Image, Palette, Sparkles, Crown, ArrowDownToLine,
  ClipboardPaste, RefreshCw, FolderOpen, ArrowLeftRight, Circle, RotateCcw, Edit3,
}

function getIcon(name: string) {
  return ICON_MAP[name] || Edit3
}

function formatTime(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts
  if (diff < 5000) return "just now"
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function HistoryPanel() {
  const { past, future, undo, redo, jumpToHistory, clearHistory } = useEditor()
  const [expanded, setExpanded] = useState(true)

  const canUndo = past.length > 0
  const canRedo = future.length > 0
  const totalCount = past.length + future.length

  // Build the timeline: past entries (oldest first at top), current state, future entries
  const pastEntries = [...past].reverse() // most recent past first (closest to current)
  const futureEntries = future // closest future first

  return (
    <div className="border-t-2 border-primary/10 bg-gradient-to-b from-muted/30 to-background shrink-0">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left group"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
          <History className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-semibold uppercase text-foreground/90 tracking-wider">
          History
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {totalCount > 0 && (
            <span className="text-[10px] text-primary/80 font-mono bg-primary/10 px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
          {expanded && (canUndo || canRedo) && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => undo()}
                    disabled={!canUndo}
                  >
                    <Undo2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => redo()}
                    disabled={!canRedo}
                  >
                    <Redo2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Redo (Ctrl+Shift+Z)</TooltipContent>
              </Tooltip>
              {(canUndo || canRedo) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:text-destructive"
                      onClick={() => clearHistory()}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Clear history</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
          )}
        </div>
      </button>

      {/* Timeline */}
      {expanded && (
        <div className="px-2 pb-2 max-h-56 overflow-y-auto editor-scroll">
          {totalCount === 0 ? (
            <div className="text-center py-6 px-2">
              <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground/70">
                No history yet. Your edits will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
                {/* Future entries (redo-able) — shown above current state */}
                {futureEntries.map((entry, idx) => {
                  const Icon = getIcon(entry.icon)
                  return (
                    <HistoryRow
                      key={`future-${idx}`}
                      entry={entry}
                      icon={<Icon className="w-3 h-3" />}
                      isFuture
                      onClick={() => jumpToHistory(idx + 1)}
                      tooltip="Redo to this point"
                    />
                  )
                })}

                {/* Current state indicator */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-primary/5 border border-primary/20">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Circle className="w-2 h-2 text-primary-foreground fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-primary">Current state</p>
                    <p className="text-[9px] text-muted-foreground/60">Editing now</p>
                  </div>
                </div>

                {/* Past entries (undo-able) — shown below current state, most recent first */}
                {pastEntries.map((entry, idx) => {
                  const Icon = getIcon(entry.icon)
                  return (
                    <HistoryRow
                      key={`past-${idx}`}
                      entry={entry}
                      icon={<Icon className="w-3 h-3" />}
                      isPast
                      onClick={() => jumpToHistory(-(idx + 1))}
                      tooltip="Undo to this point"
                    />
                  )
                })}
              </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryRow({
  entry,
  icon,
  isPast,
  isFuture,
  onClick,
  tooltip,
}: {
  entry: HistoryEntry
  icon: React.ReactNode
  isPast?: boolean
  isFuture?: boolean
  onClick: () => void
  tooltip: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors group",
            "hover:bg-muted/60",
            isFuture && "opacity-50 hover:opacity-100",
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
            isPast && "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
            isFuture && "bg-muted/50 text-muted-foreground/70 group-hover:bg-primary/10 group-hover:text-primary",
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate">{entry.label}</p>
            <p className="text-[9px] text-muted-foreground/60">{formatTime(entry.timestamp)}</p>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
