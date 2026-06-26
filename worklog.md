# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v6 — Dark mode, slide context menu, multi-select bounding box all implemented and verified.
**Last Updated**: 2026-06-26 18:15 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v6)

All v1-v5 features remain working. This session added 3 major features.

### Verified This Session (agent-browser + VLM, 2026-06-26 18:15)
- **Dark Mode Toggle**: Added next-themes ThemeProvider to layout, ThemeToggle component (sun/moon icons) in toolbar. Verified: clicked toggle → html class changed to "dark" → panels, toolbar, canvas background all became dark while slide content remained light for readability. Toggle persists via next-themes.
- **Slide Context Menu**: Right-click on slide thumbnail opens context menu with 5 items: Duplicate Slide, Delete Slide (disabled if only 1 slide), Move Left (disabled if first), Move Right (disabled if last), New Slide After. Verified: menu appeared with all 5 items, items are contextually disabled.
- **Multi-Select Bounding Box**: When 2+ elements selected, a dashed border appears around all selected elements with a count label badge ("11 selected"). Verified: selected all 11 elements → dashed bounding box appeared with "11 selected" label in top-left corner.

### Bug Fixes This Session
- Fixed import error: `Duplicate` icon doesn't exist in lucide-react, replaced with `Copy` in SlideContextMenu.
- Fixed SlideContextMenu which had the broken import causing a full page reload error.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts`.
- **Types**: `src/types/editor.ts`.
- **Theming**: next-themes with `attribute="class"`, ThemeProvider in layout.tsx, ThemeToggle component.
- **Templates**: `src/lib/templates.ts` — 7 slide templates.
- **PNG export**: `src/lib/png-export.ts` — SVG foreignObject + canvas with CORS image handling.
- **Alignment**: `src/lib/alignment.ts`.
- **HTML I/O**: `src/lib/html-io.ts`.
- **PDF export**: `src/lib/pdf-export.ts`.
- **Persistence**: `src/lib/persistence.ts` + `src/hooks/use-autosave.ts`.
- **Recent colors**: `src/hooks/use-recent-colors.ts`.
- **Components**: Editor, Toolbar (2-row, with ThemeToggle), AlignmentToolbar, TextStylePresets, Canvas (drag-drop + multi-select box), CanvasElement (group move + aspect lock), LayersPanel, SlidesPanel (Template + Blank + data attributes for context menu), PropertyPanel (ColorSwatchPicker + GradientPicker), ImportHtmlDialog, ExportDialog, KeyboardShortcutsDialog, FindReplaceDialog, TemplatePickerDialog, CanvasContextMenu, SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle.

---

## All Features (v1 + v2 + v3 + v4 + v5 + v6)

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu (elements)
- **Multi-select bounding box with count label** (NEW)

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

### Slide Management (NEW)
- Right-click context menu on slide thumbnails
- Duplicate, Delete, Move Left/Right, New Slide After
- Contextual disabling (can't delete last slide, can't move past ends)

### Color System
- ColorSwatchPicker: 88 preset + 16 recent colors, EyeDropper
- GradientPicker: linear/radial, angle, color stops, 12 presets

### Export
- HTML Export (copy/download)
- PDF Export (print-ready)
- PNG Export (2x resolution, CORS-safe)

### Styling
- Fill (solid/gradient), Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background (solid/gradient/image)

### UI
- **Dark mode toggle** (NEW) — sun/moon icons, persists via next-themes
- Smooth animations and hover effects throughout

### Slides
- Multi-slide, add/duplicate/delete, templates, reorder via context menu

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
- PNG export uses foreignObject SVG — may not render perfectly in all browsers; cross-origin images without CORS headers will fail (handled gracefully).
- Group resize moves only dragged element.
- EyeDropper API only in Chrome/Edge.

## Priority Recommendations for Next Phase
1. **Feature**: Group resize — all group members scale proportionally.
2. **Feature**: Master slide / template system.
3. **Polish**: Snap to other elements' edges during resize.
4. **Feature**: Slide transitions / animations preview.
5. **Performance**: Virtualized layer list for 100+ elements.
6. **Feature**: Keyboard-navigable layer panel.
7. **Feature**: Custom font upload.
8. **Polish**: Drag handle on slide thumbnails for manual reordering.
9. **Feature**: Presentation mode (fullscreen slideshow).
10. **Polish**: Element opacity quick-slider in contextual toolbar.
