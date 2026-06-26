"use client"

import React from "react"
import { useEditor } from "@/store/editor-store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
  Square, SquareEqual, Group, Ungroup, Droplet,
} from "lucide-react"

export function AlignmentToolbar() {
  const { selectedIds, alignElements, distributeElements, matchSize, groupElements, ungroupElements, currentSlide, updateElements, updateElement } = useEditor()
  const hasMulti = selectedIds.length >= 2
  const canDistribute = selectedIds.length >= 3
  const slide = currentSlide()
  const hasGroup = selectedIds.some((id) => slide.elements.find((e) => e.id === id)?.groupId)

  // For opacity slider — use first selected element's opacity, or apply to all
  const selectedElements = slide.elements.filter((e) => selectedIds.includes(e.id))
  const firstOpacity = selectedElements[0]?.opacity ?? 1

  function setOpacity(value: number) {
    if (selectedIds.length === 1) {
      updateElement(selectedIds[0], { opacity: value })
    } else {
      updateElements(selectedIds.map((id) => ({ id, patch: { opacity: value } })))
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* Horizontal alignment (align along X axis) */}
        <Separator orientation="vertical" className="mx-1 h-7" />
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider mr-1 hidden lg:inline">Align</span>
        <TooltipBtn label="Align Left" onClick={() => alignElements(selectedIds, "left")} disabled={!hasMulti}>
          <AlignStartVertical className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Align Center (Horizontal)" onClick={() => alignElements(selectedIds, "centerH")} disabled={!hasMulti}>
          <AlignCenterVertical className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Align Right" onClick={() => alignElements(selectedIds, "right")} disabled={!hasMulti}>
          <AlignEndVertical className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Align Top" onClick={() => alignElements(selectedIds, "top")} disabled={!hasMulti}>
          <AlignStartHorizontal className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Align Middle (Vertical)" onClick={() => alignElements(selectedIds, "middle")} disabled={!hasMulti}>
          <AlignCenterHorizontal className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Align Bottom" onClick={() => alignElements(selectedIds, "bottom")} disabled={!hasMulti}>
          <AlignEndHorizontal className="w-4 h-4" />
        </TooltipBtn>

        {/* Distribute */}
        <Separator orientation="vertical" className="mx-1 h-7" />
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider mr-1 hidden lg:inline">Distribute</span>
        <TooltipBtn label="Distribute Horizontally (need 3+)" onClick={() => distributeElements(selectedIds, "horizontal")} disabled={!canDistribute}>
          <AlignHorizontalSpaceAround className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Distribute Vertically (need 3+)" onClick={() => distributeElements(selectedIds, "vertical")} disabled={!canDistribute}>
          <AlignVerticalSpaceAround className="w-4 h-4" />
        </TooltipBtn>

        {/* Match size */}
        <Separator orientation="vertical" className="mx-1 h-7" />
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider mr-1 hidden lg:inline">Match</span>
        <TooltipBtn label="Match Width" onClick={() => matchSize(selectedIds, "width")} disabled={!hasMulti}>
          <Square className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Match Width & Height" onClick={() => matchSize(selectedIds, "both")} disabled={!hasMulti}>
          <SquareEqual className="w-4 h-4" />
        </TooltipBtn>

        {/* Group / Ungroup */}
        <Separator orientation="vertical" className="mx-1 h-7" />
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider mr-1 hidden lg:inline">Group</span>
        <TooltipBtn label="Group (Ctrl+G)" onClick={() => groupElements(selectedIds)} disabled={!hasMulti}>
          <Group className="w-4 h-4" />
        </TooltipBtn>
        <TooltipBtn label="Ungroup (Ctrl+Shift+G)" onClick={() => ungroupElements(selectedIds)} disabled={!hasGroup}>
          <Ungroup className="w-4 h-4" />
        </TooltipBtn>

        {/* Opacity quick slider */}
        <Separator orientation="vertical" className="mx-1 h-7" />
        <div className="flex items-center gap-1.5 px-1">
          <Droplet className="w-3.5 h-3.5 text-muted-foreground" />
          <Slider
            value={[firstOpacity * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => setOpacity(v[0] / 100)}
            className="w-24"
          />
          <span className="text-[10px] font-mono w-8 text-muted-foreground">
            {Math.round(firstOpacity * 100)}%
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}

function TooltipBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
