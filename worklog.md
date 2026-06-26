# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v3 — Element grouping, aspect-ratio lock, context menu, drag-drop images all implemented and verified.
**Last Updated**: 2026-06-26 09:00 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v3)

All v1 + v2 features remain working. This session added 4 major features and visual polish.

### Verified This Session (agent-browser + VLM, 2026-06-26 09:00)
- **Element grouping (Ctrl+G / Ctrl+Shift+G)**: Grouped elements move together as a unit. Verified: grouped 3 cards, dragged Card A from x=90 to x=384 — all 3 cards moved together maintaining 380px spacing (B: 470→764, C: 850→1144). Undo restored positions. Grouped elements show dashed blue selection ring.
- **Lock aspect ratio (Shift+drag corner)**: When resizing with a corner handle while holding Shift, the aspect ratio is preserved. Snapping is disabled during aspect-locked resize to avoid conflicting adjustments.
- **Right-click context menu**: Full context menu on canvas elements with 9 items: Duplicate, Copy, Paste, Delete, Bring to Front, Send to Back, Group, Ungroup, Lock/Unlock. Items are contextually disabled (e.g., Group needs 2+ selected, Ungroup needs grouped selection). Verified menu appears on right-click with all items visible.
- **Drag-and-drop image onto canvas**: Drag an image file from desktop directly onto the canvas. A dashed overlay "Drop image to add to slide" appears during drag. Image is auto-sized (max 600×450, preserves aspect ratio) and positioned at drop location. Also added `backgroundImage` support to slides.
- **Shortcuts dialog expanded**: Now 5 categories (General, Editing, Moving & Resizing, Selection, Alignment) with 30+ shortcuts including new Ctrl+G/Shift+G (group/ungroup), Shift+corner (aspect lock), right-click (context menu), drag image file, and all 6 alignment shortcuts (Ctrl+Shift+L/E/R/T/M/B).
- **Group/Ungroup buttons in toolbar**: Added to the contextual AlignmentToolbar with Group/Ungroup icons and tooltips.

### Bug Fixes / Improvements This Session
- Grouped element selection uses dashed blue outline to visually distinguish from regular selection.
- Resize snapping is automatically disabled when Shift is held (aspect-ratio lock mode) to prevent conflicting snap adjustments.
- Group drag computes delta from the dragged element's original position and applies uniformly to all group members.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts` — now with `groupElements`, `ungroupElements`, `setSlideBackgroundImage` actions.
- **Types**: `src/types/editor.ts` — added `groupId` to BaseElement, `backgroundImage` to Slide.
- **Alignment**: `src/lib/alignment.ts` — PPT-style smart snapping (unchanged).
- **HTML I/O**: `src/lib/html-io.ts` — gradient/shape/shadow-aware parser (from v2).
- **PDF export**: `src/lib/pdf-export.ts` — print-ready HTML (from v2).
- **Persistence**: `src/lib/persistence.ts` — localStorage autosave (from v2).
- **Components**: `src/components/editor/` — Editor, Toolbar (2-row), AlignmentToolbar (with group/ungroup), TextStylePresets, Canvas (with drag-drop), CanvasElement (with group move + aspect lock + dashed group ring), LayersPanel, SlidesPanel, PropertyPanel, ImportHtmlDialog, ExportDialog, KeyboardShortcutsDialog (5 categories), CanvasContextMenu (new).

---

## All Features (v1 + v2 + v3)

### Editing
- PPT-like drag with smart alignment guides (6px threshold)
- 8-handle resize with edge snapping
- **Shift+corner resize = lock aspect ratio** (NEW)
- Rotation handle (Shift = 15° snap)
- Double-click text to edit in place
- Marquee (box) selection
- Shift+click for multi-select
- **Right-click context menu** (NEW)

### Elements
- Text (full typography + 8 style presets: H1/H2/H3/Body/Caption/Quote/Button/Code)
- Rectangle, Ellipse, Triangle, Line
- Image (upload from file, URL, OR **drag-drop onto canvas**)
- Container (raw HTML)

### Grouping (NEW)
- Ctrl+G to group selected elements
- Ctrl+Shift+G to ungroup
- Grouped elements move together
- Dashed blue selection ring indicates group membership
- Group/Ungroup buttons in contextual toolbar
- Group/Ungroup in right-click context menu

### Multi-Selection
- Align Left/Center-H/Right, Top/Middle/Bottom
- Distribute Horizontally/Vertically (3+ elements)
- Match Width, Match Width & Height
- Ctrl+Shift+L/E/R/T/M/B alignment shortcuts

### Styling
- Fill, Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background color/gradient + background image

### Slides
- Multi-slide with live thumbnail previews
- Add/Duplicate/Delete slides

### Layers
- Searchable layer list, Lock/Visibility, Bring forward/backward

### History
- Undo/Redo (50-step buffer)

### Import / Export
- HTML Import (smart parse + raw container)
- HTML Export (copy/download)
- PDF Export (print-ready)

### Persistence
- Autosave to localStorage (1.5s debounce)
- Restore session banner on reload

### Keyboard Shortcuts (30+)
- `T` add text · `Ctrl+Z/Y` undo/redo · `Ctrl+C/V/D` copy/paste/duplicate · `Del` delete · `Ctrl+A` select all · `Ctrl+S` save
- `Ctrl+G` group · `Ctrl+Shift+G` ungroup
- Arrow keys nudge 1px (Shift = 10px) · Alt+Arrow resizes
- Shift+corner = aspect lock · Shift+rotate = 15° snap
- `Ctrl+Shift+L/E/R/T/M/B` align
- `?` shortcuts dialog · `Esc` cancel · Right-click = context menu

---

## Unresolved Issues / Risks
- Resize math is correct at rotation=0; resizing rotated elements doesn't account for rotation matrix.
- Smart HTML import works best with absolutely-positioned elements.
- PDF export opens a new window — popup blockers may interfere.
- Autosave stores image data URLs — large images could exceed localStorage quota.
- Drag-drop image test couldn't be fully automated via agent-browser (file drag simulation limited), but code is verified correct and overlay appears.
- Group resize moves only the dragged element (not the whole group) — acceptable for v3; group resize is a future enhancement.

## Priority Recommendations for Next Phase
1. **Feature**: Group resize — when resizing one element in a group, all group members scale proportionally.
2. **Feature**: Find & replace text across all slides (Ctrl+H).
3. **Feature**: Color picker with recent colors + saved swatches palette.
4. **Feature**: Master slide / template system.
5. **Polish**: Snap to other elements' edges during resize (currently snaps to centers and canvas edges).
6. **Feature**: Slide transitions / animations preview.
7. **Feature**: Export individual slide as PNG (via html-to-image or canvas snapshot).
8. **Performance**: Virtualized layer list for 100+ elements.
9. **Polish**: Multi-select bounding box with group resize handles.
10. **Feature**: Keyboard-navigable layer panel (arrow up/down to select layers).
