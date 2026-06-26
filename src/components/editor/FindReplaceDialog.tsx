"use client"

import React, { useState, useCallback, useMemo } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Replace, ArrowRight, CaseSensitive, WholeWord } from "lucide-react"
import { useEditor } from "@/store/editor-store"
import type { TextElement } from "@/types/editor"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResult {
  slideId: string
  slideName: string
  elementId: string
  elementName: string
  matchIndex: number
  matchText: string
  startIndex: number
  endIndex: number
}

export function FindReplaceDialog({ open, onOpenChange }: Props) {
  const { slides, updateElement } = useEditor()
  const [findText, setFindText] = useState("")
  const [replaceText, setReplaceText] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [currentMatch, setCurrentMatch] = useState(0)

  // Search all text elements across all slides
  const results = useMemo(() => {
    if (!findText.trim()) return []
    const found: SearchResult[] = []
    const flags = caseSensitive ? "g" : "gi"
    const word = wholeWord ? `\\b${escapeRegex(findText)}\\b` : escapeRegex(findText)
    const regex = new RegExp(word, flags)

    for (const slide of slides) {
      for (const el of slide.elements) {
        if (el.type !== "text") continue
        const t = el as TextElement
        let match: RegExpExecArray | null
        regex.lastIndex = 0
        while ((match = regex.exec(t.text)) !== null) {
          found.push({
            slideId: slide.id,
            slideName: slide.name,
            elementId: el.id,
            elementName: el.name,
            matchIndex: found.length,
            matchText: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          })
          if (found.length > 500) break // safety limit
        }
        if (found.length > 500) break
      }
      if (found.length > 500) break
    }
    return found
  }, [findText, caseSensitive, wholeWord, slides])

  const replaceCurrent = useCallback(() => {
    if (results.length === 0 || currentMatch >= results.length) return
    const r = results[currentMatch]
    const slide = slides.find((s) => s.id === r.slideId)
    if (!slide) return
    const el = slide.elements.find((e) => e.id === r.elementId)
    if (!el || el.type !== "text") return
    const t = el as TextElement
    const before = t.text.slice(0, r.startIndex)
    const after = t.text.slice(r.endIndex)
    const newText = before + replaceText + after
    updateElement(r.elementId, { text: newText } as Partial<TextElement>)
  }, [results, currentMatch, replaceText, slides, updateElement])

  const replaceAll = () => {
    if (results.length === 0 || !findText.trim()) return
    const flags = caseSensitive ? "g" : "gi"
    const word = wholeWord ? `\\b${escapeRegex(findText)}\\b` : escapeRegex(findText)
    const regex = new RegExp(word, flags)
    // Group by element
    const byElement = new Map<string, TextElement[]>()
    for (const slide of slides) {
      for (const el of slide.elements) {
        if (el.type !== "text") continue
        if (!(el as TextElement).text.match(regex)) continue
        const list = byElement.get(el.id) || []
        list.push(el as TextElement)
        byElement.set(el.id, list)
      }
    }
    regex.lastIndex = 0
    for (const [, els] of byElement) {
      const t = els[0]
      const newText = t.text.replace(regex, replaceText)
      updateElement(t.id, { text: newText } as Partial<TextElement>)
    }
  }

  const goToMatch = (index: number) => {
    if (index < 0 || index >= results.length) return
    setCurrentMatch(index)
    const r = results[index]
    // Select the element
    useEditor.getState().setCurrentSlide(r.slideId)
    setTimeout(() => {
      useEditor.getState().setSelected([r.elementId])
    }, 100)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find & Replace
          </DialogTitle>
          <DialogDescription>
            Search text across all slides. Replace individually or all at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Find input */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={findText}
                onChange={(e) => { setFindText(e.target.value); setCurrentMatch(0) }}
                placeholder="Find text..."
                className="pl-9"
                autoFocus
              />
            </div>
            <Button
              variant={caseSensitive ? "secondary" : "outline"}
              size="icon"
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Case sensitive"
            >
              <CaseSensitive className="w-4 h-4" />
            </Button>
            <Button
              variant={wholeWord ? "secondary" : "outline"}
              size="icon"
              onClick={() => setWholeWord(!wholeWord)}
              title="Whole word"
            >
              <WholeWord className="w-4 h-4" />
            </Button>
            {results.length > 0 && (
              <Badge variant="secondary" className="shrink-0">
                {currentMatch + 1} / {results.length}
              </Badge>
            )}
          </div>

          {/* Replace input */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Replace className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Navigation & action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={results.length === 0}
              onClick={() => goToMatch(Math.max(0, currentMatch - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={results.length === 0}
              onClick={() => goToMatch(Math.min(results.length - 1, currentMatch + 1))}
            >
              Next
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              disabled={results.length === 0}
              onClick={replaceCurrent}
            >
              Replace
            </Button>
            <Button
              size="sm"
              disabled={results.length === 0}
              onClick={replaceAll}
            >
              Replace All
            </Button>
          </div>

          {/* Results list */}
          {results.length > 0 && (
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-2 space-y-1">
                {results.map((r, i) => {
                  const slide = slides.find((s) => s.id === r.slideId)
                  const el = slide?.elements.find((e) => e.id === r.elementId)
                  if (!el || el.type !== "text") return null
                  const t = el as TextElement
                  // Highlight the match in context
                  const before = t.text.slice(Math.max(0, r.startIndex - 20), r.startIndex)
                  const match = t.text.slice(r.startIndex, r.endIndex)
                  const after = t.text.slice(r.endIndex, Math.min(t.text.length, r.endIndex + 20))
                  return (
                    <button
                      key={i}
                      onClick={() => goToMatch(i)}
                      className={`w-full text-left px-3 py-2 rounded text-xs hover:bg-accent transition-colors ${i === currentMatch ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{r.elementName}</span>
                        <span className="text-muted-foreground">in</span>
                        <span className="text-muted-foreground">{r.slideName}</span>
                      </div>
                      <div className="text-muted-foreground truncate">
                        ...{before}<span className="bg-yellow-200 text-yellow-900 font-medium">{match}</span>{after}...
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}

          {findText.trim() && results.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No results found for &quot;{findText}&quot;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
