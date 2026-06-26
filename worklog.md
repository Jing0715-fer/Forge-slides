# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v5 — PNG export, gradient picker, visual polish animations all implemented and verified.
**Last Updated**: 2026-06-26 18:00 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v5)

All v1-v4 features remain working. This session added 3 major features.

### Verified This Session (agent-browser + VLM, 2026-06-26 18:00)
- **PNG Export**: New PNG button in toolbar. Exports current slide as a 2x resolution PNG using SVG foreignObject + canvas technique. Handles image CORS by pre-converting image URLs to data URLs. Verified: download was triggered (MutationObserver confirmed `<a download>` element created). Toast notifications show loading/success/error states.
- **Gradient Picker**: New GradientPicker component with popover. Features: linear/radial type selector, angle slider (0-360°, 15° steps), color stops with position sliders (add/remove stops, min 2), 12 gradient presets (Sunset, Ocean, Forest, Purple, Fire, Mint, Berry, Steel, Peach, Sky, Rose, Dark), live preview bar, hex input. Integrated into Fill color field and slide background. Verified: clicked "Purple" preset on Card A → card fill changed to `linear-gradient(135deg, rgb(99, 102, 241), rgb(139, 92, 246))`.
- **Visual Polish**: Added CSS animations and hover effects throughout:
  - Slide thumbnails: hover lift + shadow, active state with primary ring
  - Layer rows: hover translateX
  - Color swatches: hover scale + shadow
  - Template cards: hover lift + shadow
  - Resize handles: hover scale (already existed)
  - Group selection: pulsing dashed outline animation
  - Drop zone overlay: pulsing opacity animation
  - Toolbar buttons: active press scale

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts`.
- **Types**: `src/types/editor.ts`.
- **Templates**: `src/lib/templates.ts` — 7 slide templates.
- **PNG export**: `src/lib/png-export.ts` — SVG foreignObject + canvas with CORS image handling.
- **Alignment**: `src/lib/alignment.ts`.
- **HTML I/O**: `src/lib/html-io.ts`.
- **PDF export**: `src/lib/pdf-export.ts`.
- **Persistence**: `src/lib/persistence.ts` + `src/hooks/use-autosave.ts`.
- **Recent colors**: `src/hooks/use-recent-colors.ts`.
- **Components**: Editor, Toolbar (2-row), AlignmentToolbar, TextStylePresets, Canvas (drag-drop), CanvasElement (group move + aspect lock), LayersPanel, SlidesPanel (Template + Blank), PropertyPanel (ColorSwatchPicker + GradientPicker), ImportHtmlDialog, ExportDialog, KeyboardShortcutsDialog, FindReplaceDialog, TemplatePickerDialog, CanvasContextMenu, ColorSwatchPicker, GradientPicker.

---

## All Features (v1 + v2 + v3 + v4 + v5)

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu

### Elements
- Text (full typography + 8 style presets)
- Rectangle, Ellipse, Triangle, Line
- Image (file upload, URL, drag-drop)
- Container (raw HTML)

### Grouping
- Ctrl+G / Ctrl+Shift+G, group move, dashed ring

### Multi-Selection
- Align L/C/R/T/M/B, Distribute H/V, Match W/H

### Find & Replace
- Ctrl+H/Ctrl+F, case-sensitive, whole-word, replace all

### Slide Templates
- 7 templates with visual thumbnails

### Color System
- ColorSwatchPicker: 88 preset + 16 recent colors, EyeDropper
- **GradientPicker**: linear/radial, angle, color stops, 12 presets (NEW)

### Export
- HTML Export (copy/download)
- PDF Export (print-ready)
- **PNG Export** (2x resolution, CORS-safe) (NEW)

### Styling
- Fill (solid/gradient), Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background (solid/gradient/image)

### Slides
- Multi-slide, add/duplicate/delete, templates

### Layers
- Searchable, lock/visibility, reorder

### History
- Undo/Redo (50-step)

### Persistence
- Autosave (1.5s debounce), restore banner

### Keyboard Shortcuts (35+)
- T, Ctrl+Z/Y/C/V/D/A/S/G/H/F, arrows, Shift+corner, Shift+rotate, Ctrl+Shift+L/E/R/T/M/B, ?, Esc, right-click

---

## Unresolved Issues / Risks
- Resize math correct at rotation=0; rotated element resize doesn't account for rotation matrix.
- Smart HTML import works best with absolutely-positioned elements.
- PDF export opens new window (popup blockers).
- PNG export uses foreignObject SVG — may not render perfectly in all browsers; cross-origin images without CORS headers will fail (handled gracefully with error toast).
- Group resize moves only dragged element.
- EyeDropper API only in Chrome/Edge.

## Priority Recommendations for Next Phase
1. **Feature**: Group resize — all group members scale proportionally.
2. **Feature**: Master slide / template system.
3. **Polish**: Snap to other elements' edges during resize.
4. **Feature**: Slide transitions / animations preview.
5. **Performance**: Virtualized layer list for 100+ elements.
6. **Feature**: Keyboard-navigable layer panel.
7. **Polish**: Multi-select bounding box with group resize handles.
8. **Feature**: Dark mode toggle for the editor UI.
9. **Feature**: Custom font upload.
10. **Polish**: Right-click context menu on slide thumbnails (duplicate/delete here).
