"use client"

/**
 * ImportLauncher — single source of truth for "import HTML" UX.
 *
 * One button + one dialog. Used by the landing page (primary CTA) and
 * the editor toolbar (compact button). The dialog itself
 * (ImportHtmlDialog) holds all read / parse / viewer-resolution logic.
 *
 * This component is intentionally tiny — it just:
 *   1. Holds the open/closed state for the dialog.
 *   2. Renders a single trigger button (no more "folder vs single file"
 *      button pair; that choice is the dialog's tabs).
 *   3. Hands the parsed slides off to the parent's `onSlidesLoaded`
 *      callback. The dialog never calls the editor store directly when
 *      a callback is provided, so the landing page can decide what to
 *      do (load project, persist, switch view) without duplicating the
 *      import pipeline.
 *
 * Why one component:
 *   Both pages used to maintain their own file / folder input refs and
 *   drag-drop handlers, duplicating ~150 lines of viewer-detection and
 *   import logic. Now: one dialog + one launcher. Change the dialog
 *   logic and both pages update in lockstep.
 */

import React, { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { FolderUp, FileCode2 } from "lucide-react"
import { ImportHtmlDialog } from "./ImportHtmlDialog"
import { cn } from "@/lib/utils"
import type { Slide } from "@/types/editor"
import type { ParsedFile } from "@/lib/html-io"

interface Props {
  /**
   * Receives the parsed slides + raw pending files once the user
   * confirms in the dialog. Caller decides what to do: landing page
   * does `loadProject + persist + setView('editor')`, editor page
   * falls back to the dialog's own `replaceSlides` (just don't pass
   * this prop).
   */
  onSlidesLoaded: (slides: Slide[], pendingFiles: ParsedFile[]) => void

  /**
   * `landing`  — equal-width filled button (rose→pink gradient) that
   *               matches the visual weight of the Start Editing +
   *               AI Generate siblings on the landing hero. Sits in
   *               the middle of a rose→purple→fuchsia color ring.
   * `primary`   — full-height hero-sized CTA, used standalone (same
   *               hue as `landing` but `outline` for the legacy
   *               single-button hero).
   * `toolbar`   — compact, label hidden below 2xl, used in the editor
   *               toolbar.
   */
  variant?: "landing" | "primary" | "toolbar"

  /** Button label. Defaults to "Import". Use "Import HTML" on the
   *  landing page (the user knows exactly what they'll get). */
  label?: string

  /**
   * Which icon to show. `file` = single-file/FileCode2 (the dialog
   * handles both file + folder inside), `folder` = FolderUp (legacy).
   * Defaults to `folder`.
   */
  icon?: "file" | "folder"

  /** Extra className on the inner trigger button. */
  className?: string
}

export function ImportLauncher({
  onSlidesLoaded,
  variant = "primary",
  label = "Import",
  icon = "folder",
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isDraggingFolder, setIsDraggingFolder] = useState(false)

  // Drag-and-drop *directly on the button* — opens the dialog with a
  // hint that the user dropped something. The dialog itself has its own
  // drag-drop zone for files, but accepting a drop on the trigger makes
  // the landing-page CTA feel responsive to drop gestures from anywhere.
  const handleButtonDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isDraggingFolder) setIsDraggingFolder(true)
  }, [isDraggingFolder])

  const handleButtonDragLeave = useCallback(() => setIsDraggingFolder(false), [])

  const handleButtonDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFolder(false)
      // Only open the dialog if the drop actually carried files;
      // innocuous drops (text, browser-internal drags) are ignored.
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setOpen(true)
      }
    },
    [],
  )

  const isHero = variant === "landing" || variant === "primary"

  const triggerClasses =
    variant === "landing"
      ? cn(
          // Equal-width gradient button — matches Start Editing and
          // AI Generate visually. Sits between rose-purple (warm) and
          // violet-fuchsia (cool) on the color ring, giving the row a
          // continuous gradient feel.
          //
          // h-12 / px-6 / text-base / rounded-xl are duplicated here
          // (parent passes them as `[&_button]:*` selectors) but
          // Tailwind 4 doesn't always compile arbitrary descendant
          // variants — keep them inline as a safety belt. The parent
          // selectors still work for any future Tailwind upgrade.
          "group gap-2 h-12 px-6 text-base rounded-xl border-0 text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]",
          isDraggingFolder &&
            "from-rose-600 to-pink-600 scale-[1.02] shadow-2xl shadow-rose-500/50 ring-2 ring-rose-400/40",
          className,
        )
      : variant === "primary"
      ? cn(
          "group gap-2 h-12 px-8 text-base border-0 text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl",
          isDraggingFolder &&
            "from-rose-600 to-pink-600 scale-[1.02] shadow-2xl shadow-rose-500/50",
          className,
        )
      : cn(
          // toolbar — subtle ghost button in the editor top bar
          "gap-1.5 h-8 hover:bg-muted/60 transition-colors text-xs px-2 2xl:px-3",
          className,
        )

  const size = variant === "toolbar" ? "sm" : "default"
  // `landing` cancels the default `outline` border; the others keep it.
  // Note: `default` size (h-9) is chosen so that cva's `h-9` is overridden
  // by our explicit `h-12` in triggerClasses — using `size="lg"` would
  // emit `h-10 px-6 has-[>svg]:px-4` which fights with the parent's
  // expected baseline heights.
  const buttonVariant: "default" | "outline" | "ghost" =
    variant === "landing" ? "default" : variant === "primary" ? "outline" : "ghost"
  const Icon = icon === "file" ? FileCode2 : FolderUp

  return (
    <>
      <Button
        size={size}
        variant={buttonVariant}
        onClick={() => setOpen(true)}
        onDragOver={handleButtonDragOver}
        onDragLeave={handleButtonDragLeave}
        onDrop={handleButtonDrop}
        className={triggerClasses}
        title={
          isHero
            ? "Import HTML files, folders, or paste markup"
            : "Import HTML files or folders"
        }
      >
        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
        {isHero ? (
          label
        ) : (
          <span className="hidden 2xl:inline">{label}</span>
        )}
      </Button>

      <ImportHtmlDialog
        open={open}
        onOpenChange={setOpen}
        onSlidesLoaded={(slides, pending) => {
          setOpen(false)
          onSlidesLoaded(slides, pending)
        }}
      />
    </>
  )
}
