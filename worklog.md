# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: MVP complete and verified working via agent-browser.
**Last Updated**: 2026-06-26

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

### Architecture
- **State**: Zustand store at `src/store/editor-store.ts` with full undo/redo history (50 step buffer), multi-slide support, clipboard.
- **Types**: `src/types/editor.ts` — text, rect, ellipse, triangle, line, image, container elements.
- **Alignment**: `src/lib/alignment.ts` — PPT-style smart snapping (left/center/right + top/middle/bottom) against canvas centerlines/edges and other elements, with snap-threshold of 6px.
- **HTML I/O**: `src/lib/html-io.ts` — import parses absolutely-positioned AI HTML into editable elements; export produces clean self-contained HTML.
- **Components**: `src/components/editor/` — Toolbar, Canvas, CanvasElement (drag/resize/rotate + snap), LayersPanel, SlidesPanel, PropertyPanel, ImportHtmlDialog/ExportDialog, Editor shell.

### Verified Features (agent-browser tested 2026-06-26)
- Canvas renders default slide with title, subtitle, three cards (Drag & Snap / Resize & Rotate / Export HTML).
- Click element via canvas → selection ring + property panel updates with type-specific sections (Position & Size, Text, Fill & Stroke, Shadow, Arrange).
- Drag element → position updates (verified x:90 → x:285 after drag).
- Layers panel shows all 11 elements with lock/visibility/forward/backward controls.
- Import HTML dialog opens, accepts pasted HTML, parses into elements on canvas (verified 6 elements imported from sample).
- Export dialog generates clean self-contained HTML, copy & download buttons available.
- Slides panel with thumbnail preview and New/Duplicate/Delete.
- No console errors or runtime errors.

### Keyboard Shortcuts
- `T` add text · `Ctrl+Z/Y` undo/redo · `Ctrl+C/V` copy/paste · `Ctrl+D` duplicate · `Del` delete · `Ctrl+A` select all
- Arrow keys nudge 1px (Shift = 10px) · Alt+Arrow resizes · Shift while rotating snaps to 15°

## Current Goals / Completed
- [x] PPT-like drag with smart alignment guides
- [x] 8-handle resize with edge snapping
- [x] Rotation handle with shift-snap
- [x] Property panel with full typography controls (font size, family, weight, style, decoration, alignment, line height, letter spacing, color, padding, vertical align)
- [x] Fill/stroke/shadow/border-radius controls
- [x] Multi-slide support with thumbnails
- [x] Layers panel with reorder/visibility/lock
- [x] HTML import (smart parse + raw container modes)
- [x] HTML export (copy/download)
- [x] Undo/redo with history snapshots on every drag
- [x] Keyboard shortcuts

## Unresolved Issues / Risks
- Resize math is correct at rotation=0; resizing rotated elements works but does not account for the rotation matrix (acceptable for v1; PPT itself has similar quirks).
- Smart HTML import works best with absolutely-positioned elements; flex/grid layouts fall back to raw container mode.
- No persistence (slides live in memory only) — by design for an editor tool, but could add localStorage save.

## Priority Recommendations for Next Phase
1. **Polish**: Add element alignment toolbar (align left/center/right/top/middle/bottom, distribute horizontally/vertically) for multi-selection.
2. **Polish**: Add zebra-striped guide line color and animation when snapping engages.
3. **Feature**: Add text styles (H1/H2/H3/Body presets) quick-apply dropdown.
4. **Feature**: Add image upload from file (FileReader → data URL) instead of URL prompt only.
5. **Feature**: Add localStorage autosave + "Restore previous session" prompt.
6. **Feature**: Multi-select group operations (rotate group, align group).
7. **Polish**: Keyboard shortcut cheatsheet modal (?).
8. **Feature**: Export to PDF via print stylesheet.
