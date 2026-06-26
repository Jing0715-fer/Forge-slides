# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v8 — Speaker notes, JSON project export/import, master slide system, presentation notes overlay
**Last Updated**: 2026-06-26 20:55 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v8)

All v1-v7 features remain working. This session added 3 major features and expanded the keyboard shortcuts dialog.

### Verified This Session (agent-browser + VLM, 2026-06-26 20:55)
- **Speaker Notes**: New `SpeakerNotesPanel` component embedded at the bottom of the Property Panel. Collapsible header with word count + estimated speaking time (130 wpm). Debounced (400ms) store updates to avoid history spam. Added `notes` and `transition` fields to the `Slide` type. Verified: typed notes → word count "38w · 0:15" appeared after debounce.
- **JSON Project Export/Import**: New `ProjectMenu` dropdown in toolbar with "Export as JSON" and "Import from JSON". `slideforge-project.json` format includes format/version/exportedAt/slides/currentSlideId/masterElements. Import shows confirmation dialog warning about slide replacement. Verified: clicked Export → toast "Exported 1 slide as JSON project file".
- **Master Slide System**: New `masterElements` array at store root level. Elements can be promoted to master via context menu "Promote to Master" (crown icon). Master elements render on ALL slides as read-only overlays (pointer-events: none). Right-click on a master element shows "Demote to Slide" option. Master visibility toggle (crown icon) in status bar. Verified: promoted title to master → appeared on new blank slide → status bar showed "1 master" → right-click showed demote option → undo restored original state.
- **Presentation Notes Overlay**: In presentation mode, press **S** to toggle a speaker notes overlay (amber-themed, bottom-center, max 40% height, scrollable). "Notes" button appears in control bar when notes exist. Badge in top-right also toggles notes. Verified: pressed S in presentation mode → amber overlay appeared with "SPEAKER NOTES" header, 15-word count, and note text.
- **Master Elements in Presentation**: Master elements render in presentation mode (behind slide elements). Verified via code review — `masterElements` passed to PresentationMode, rendered via `PresentationElement` component before slide elements.
- **Updated Keyboard Shortcuts Dialog**: Added "Master Elements" category (3 items) and "S" shortcut to Presentation Mode category. Now 7 categories, 48+ shortcuts.
- **Backward-Compatible Persistence**: Autosave upgraded to v2 format (`slideforge:autosave:v2`) which includes `masterElements`. Falls back to v1 format for existing sessions. Clear removes both.

### Bug Fixes This Session
- None — code was clean from v7. Lint passes with 0 errors throughout.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts` (now includes `masterElements`, `masterVisible`, `promoteToMaster`, `demoteFromMaster`, `updateMasterElement`, `toggleMasterVisible`, `setSlideNotes`, `setSlideTransition`, `loadProject`).
- **Types**: `src/types/editor.ts` (Slide now has `notes?` and `transition?` fields).
- **Theming**: next-themes with `attribute="class"`, ThemeProvider in layout.tsx, ThemeToggle component.
- **Templates**: `src/lib/templates.ts` — 7 slide templates.
- **PNG export**: `src/lib/png-export.ts` — SVG foreignObject + canvas with CORS image handling.
- **Alignment**: `src/lib/alignment.ts`.
- **HTML I/O**: `src/lib/html-io.ts` — `exportSlidesToHtml` now accepts `masterElements` parameter.
- **Project I/O**: `src/lib/project-io.ts` (NEW) — serialize/parse/download/read SlideForge JSON project files.
- **PDF export**: `src/lib/pdf-export.ts`.
- **Persistence**: `src/lib/persistence.ts` (v2 format with masterElements) + `src/hooks/use-autosave.ts`.
- **Recent colors**: `src/hooks/use-recent-colors.ts`.
- **Components**: Editor (F5 shortcut), Toolbar (ProjectMenu + Copy HTML), AlignmentToolbar (opacity slider), TextStylePresets, Canvas (renders masterElements), CanvasElement (group move + group resize), MasterElementView (NEW — read-only master renderer), LayersPanel, SlidesPanel (drag-to-reorder), PropertyPanel (wraps SpeakerNotesPanel), SpeakerNotesPanel (NEW — collapsible notes with word count), ImportHtmlDialog, ExportDialog, KeyboardShortcutsDialog (7 categories), FindReplaceDialog, TemplatePickerDialog, PresentationMode (transitions + autoplay + timer + notes overlay + master elements), ProjectMenu (NEW — JSON export/import dropdown), CanvasContextMenu (promote/demote master), SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle, StatusBar (master element toggle).

---

## All Features (v1 through v8)

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu (elements) — now with Promote to Master
- Multi-select bounding box with count label

### Elements
- Text (full typography + 8 style presets)
- Rectangle, Ellipse, Triangle, Line
- Image (file upload, URL, drag-drop)
- Container (raw HTML)

### Grouping
- Ctrl+G / Ctrl+Shift+G, group move, dashed ring
- Group resize — all members scale proportionally with text/stroke scaling

### Master Elements (NEW)
- Promote elements to master layer (appear on all slides)
- Demote master elements back to current slide
- Toggle master visibility (crown icon in status bar)
- Master elements render in editor, presentation mode, and HTML export
- Right-click master element for demote option

### Multi-Selection
- Align L/C/R/T/M/B, Distribute H/V, Match W/H
- Opacity quick-slider in contextual toolbar

### Find & Replace
- Ctrl+H/Ctrl+F, case-sensitive, whole-word, replace all

### Slide Templates
- 7 templates with visual thumbnails

### Slide Management
- Right-click context menu on slide thumbnails
- Duplicate, Delete, Move Left/Right, New Slide After
- Drag-to-reorder with drop indicators

### Color System
- ColorSwatchPicker: 88 preset + 16 recent colors, EyeDropper
- GradientPicker: linear/radial, angle, color stops, 12 presets

### Export
- HTML Export (copy/download via dialog) — includes master elements
- Copy HTML to clipboard — quick toolbar button
- PDF Export (print-ready)
- PNG Export (2x resolution, CORS-safe)
- **JSON Project Export/Import (NEW)** — full project backup with slides, masterElements, notes

### Speaker Notes (NEW)
- Per-slide notes in collapsible panel (bottom of Property Panel)
- Word count + estimated speaking time (130 wpm)
- Debounced updates (400ms)
- Notes overlay in presentation mode (S key to toggle)
- Amber-themed overlay with scrollable content
- Notes preserved in autosave and JSON export

### Presentation Mode
- Fullscreen slideshow with keyboard navigation
- 4 slide transitions: none/fade/slide/zoom
- Auto-play mode (5s/slide) with progress bar
- Elapsed timer / stopwatch
- Auto-hiding controls
- **Speaker notes overlay (S key) (NEW)**
- **Master elements rendered (NEW)**
- Fullscreen toggle (F key)
- Progress bar, transition selector, click zones

### Styling
- Fill (solid/gradient), Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background (solid/gradient/image)
- Per-slide transition override (via store action, UI not yet exposed)

### UI
- Dark mode toggle — sun/moon icons, persists via next-themes
- Status bar — slide info, element/group/master counts, selection count, master toggle, snap/grid indicators, zoom
- Smooth animations and hover effects throughout

### Slides
- Multi-slide, add/duplicate/delete, templates, reorder via context menu + drag

### Layers
- Searchable, lock/visibility, reorder

### History
- Undo/Redo (50-step)

### Persistence
- Autosave (1.5s debounce) v2 format with masterElements, restore banner

### Keyboard Shortcuts (48+)
- T, Ctrl+Z/Y/C/V/D/A/S/G/H/F, F5, arrows, Shift+corner, Shift+rotate, Ctrl+Shift+L/E/R/T/M/B, ?, Esc, right-click
- Presentation: →/Space/PgDn, ←/PgUp, Home/End, F, P, **S (NEW)**, T, Esc
- Master: Right-click → Promote/Demote, Status bar crown toggle

---

## Unresolved Issues / Risks
- Rotated element resize doesn't account for rotation matrix (resize math correct at rotation=0).
- Smart HTML import works best with absolutely-positioned elements.
- PDF export opens new window (popup blockers may block).
- PNG export uses foreignObject SVG — may not render perfectly in all browsers; cross-origin images without CORS headers will fail (handled gracefully).
- EyeDropper API only in Chrome/Edge.
- HTML5 drag-to-reorder for slide thumbnails may not work in all headless/automated browsers.
- Clipboard API may be blocked in some browsers/contexts — Copy HTML has execCommand fallback.
- Master elements cannot be edited directly on slides (must demote first). This is by design but may confuse users — consider adding a "master editor" mode.
- Per-slide transition override is in the store but not yet exposed in the UI (only global transition in presentation mode).

## Priority Recommendations for Next Phase
1. **Feature**: Master slide editor mode — a dedicated view for editing master elements with full selection/resize.
2. **Feature**: Per-slide transition UI — expose the `setSlideTransition` action in the slide context menu or property panel.
3. **Feature**: Snap to other elements' edges during resize (currently only snaps canvas center/edges).
4. **Performance**: Virtualized layer list for 100+ elements.
5. **Feature**: Keyboard-navigable layer panel (arrow keys to move focus, Enter to select).
6. **Feature**: Custom font upload (FontFace API).
7. **Feature**: Slide thumbnail live preview (real-time mini render updates).
8. **Feature**: Alignment guides persistence (remember snap settings per project).
9. **Feature**: Export to individual PNG per slide (batch export).
10. **Polish**: Animated transition between slides in the thumbnail panel.
