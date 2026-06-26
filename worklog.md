# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v7 — Group resize, slide drag-reorder, presentation transitions, status bar, toolbar polish
**Last Updated**: 2026-06-26 20:30 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v7)

All v1-v6 features remain working. This session added 6 major features and fixed 2 pre-existing lint errors.

### Verified This Session (agent-browser + VLM, 2026-06-26 20:30)
- **Group Resize**: When resizing an element that's part of a group, ALL group members scale proportionally relative to the group's bounding box. Text fontSize, letterSpacing, padding, and shape strokeWidth also scale (fontSize/padding use geometric mean of X/Y scales; letterSpacing/strokeWidth use the appropriate axis). Verified: grouped all 11 welcome-slide elements, dragged SE handle of rightmost card by 100×50px → all 3 cards grew by dw~37px, dh~31px, with proportional x-offsets (0, 42, 84px). Text inside cards also enlarged. Layout preserved.
- **Slide Drag-to-Reorder**: Slide thumbnails are now HTML5 draggable. Drag one thumbnail over another → a glowing blue drop indicator appears (before/after based on mouse midpoint). Drop reorders via `reorderSlides`. Grip handle icon appears on hover. Verified the underlying `reorderSlides` action via context menu "Move Right" (same code path) — slide order successfully swapped.
- **Presentation Mode Transitions**: Added 4 transition types (none/fade/slide/zoom) with a selector in the bottom control bar. Slide-in direction is aware of forward/backward navigation. Verified: selected "slide" transition, pressed → to advance to slide 2, transition animation played, slide 2 displayed with progress bar at ~50%.
- **Presentation Mode Enhancements**: Auto-play (5s/slide, toggle with P key, thin progress bar fills), elapsed timer (stopwatch in bottom-left), auto-hiding controls (mouse-move shows, 3s idle hides), transition badge in top-right.
- **Toolbar Polish**: Removed redundant "Download" button (ExportDialog already has copy+download). Made PDF/PNG/Copy-HTML icon-only buttons with tooltips to save horizontal space. Added new "Copy HTML to clipboard" button (Clipboard icon) with toast feedback + execCommand fallback. Verified: all 6 right-side buttons visible without truncation.
- **Status Bar**: New bottom status bar (h-6) showing: Slide N/total, element count, visible count (if different), locked count, group count, selected count, plus Snap/Grid indicators and zoom %. Verified by VLM: "Slide 1/1, 11, 1 group" on left; "Snap, Grid, 62%" on right.
- **F5 Shortcut**: Pressing F5 opens presentation mode from the current slide. Added to keyboard handler in Editor.tsx.
- **Updated Keyboard Shortcuts Dialog**: Added new "Presentation Mode" category (7 shortcuts: arrows, Home/End, F, P, T, Esc). Added F5 to General, group resize info to Moving & Resizing, slide context menu to Editing. Now 6 categories, 45+ shortcuts.

### Bug Fixes This Session
- **Fixed `react-hooks/immutability` error in PresentationMode.tsx**: `toggleFullscreen` was used in a keyboard effect before being declared. Moved the `useCallback` declaration above the effect and added it to the dependency array.
- **Fixed `react-hooks/set-state-in-effect` error in PresentationMode.tsx**: `setIndex` was called synchronously in an effect when opening. Replaced with the React-recommended "adjust state during render" pattern using `prevOpen`/`prevCurrentSlideId` tracking state.
- **Fixed `react-hooks/set-state-in-effect` for elapsed timer**: Moved `setElapsed(0)` reset to the render-phase transition detection, and used a `startRef` for the timer start time so the interval doesn't reset every second.

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
- **Components**: Editor (with F5 shortcut + StatusBar), Toolbar (icon-only secondary buttons + Copy HTML), AlignmentToolbar (with opacity slider), TextStylePresets, Canvas (drag-drop + multi-select box), CanvasElement (group move + group resize + aspect lock), LayersPanel, SlidesPanel (drag-to-reorder + grip handles), PropertyPanel (ColorSwatchPicker + GradientPicker), ImportHtmlDialog, ExportDialog, KeyboardShortcutsDialog (6 categories), FindReplaceDialog, TemplatePickerDialog, PresentationMode (transitions + autoplay + timer + auto-hide controls), CanvasContextMenu, SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle, **StatusBar (NEW)**.

---

## All Features (v1 + v2 + v3 + v4 + v5 + v6 + v7)

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu (elements)
- Multi-select bounding box with count label

### Elements
- Text (full typography + 8 style presets)
- Rectangle, Ellipse, Triangle, Line
- Image (file upload, URL, drag-drop)
- Container (raw HTML)

### Grouping
- Ctrl+G / Ctrl+Shift+G, group move, dashed ring
- **Group resize — all members scale proportionally (NEW)** with text/stroke scaling

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
- Contextual disabling (can't delete last slide, can't move past ends)
- **Drag-to-reorder with drop indicators (NEW)**

### Color System
- ColorSwatchPicker: 88 preset + 16 recent colors, EyeDropper
- GradientPicker: linear/radial, angle, color stops, 12 presets

### Export
- HTML Export (copy/download via dialog)
- **Copy HTML to clipboard (NEW)** — quick toolbar button with toast
- PDF Export (print-ready)
- PNG Export (2x resolution, CORS-safe)

### Presentation Mode (significantly enhanced)
- Fullscreen slideshow with keyboard navigation (←/→/Space/PgUp/PgDn/Home/End)
- **4 slide transitions: none/fade/slide/zoom (NEW)** with direction-aware animation
- **Auto-play mode (5s/slide) with progress bar (NEW)** — toggle with P key
- **Elapsed timer / stopwatch (NEW)**
- **Auto-hiding controls (NEW)** — show on mouse move, hide after 3s idle
- Fullscreen toggle (F key)
- Click zones for navigation
- Progress bar at bottom
- Transition selector in control bar + badge in top-right

### Styling
- Fill (solid/gradient), Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background (solid/gradient/image)

### UI
- Dark mode toggle — sun/moon icons, persists via next-themes
- **Status bar (NEW)** — slide info, element/group counts, selection count, snap/grid indicators, zoom
- Smooth animations and hover effects throughout
- Contextual toolbar slide-in animation

### Slides
- Multi-slide, add/duplicate/delete, templates, reorder via context menu + drag

### Layers
- Searchable, lock/visibility, reorder

### History
- Undo/Redo (50-step)

### Persistence
- Autosave (1.5s debounce), restore banner

### Keyboard Shortcuts (45+)
- T, Ctrl+Z/Y/C/V/D/A/S/G/H/F, **F5 (NEW)**, arrows, Shift+corner, Shift+rotate, Ctrl+Shift+L/E/R/T/M/B, ?, Esc, right-click
- Presentation: →/Space/PgDn, ←/PgUp, Home/End, F, P, T, Esc

---

## Unresolved Issues / Risks
- Rotated element resize doesn't account for rotation matrix (resize math correct at rotation=0).
- Smart HTML import works best with absolutely-positioned elements.
- PDF export opens new window (popup blockers may block).
- PNG export uses foreignObject SVG — may not render perfectly in all browsers; cross-origin images without CORS headers will fail (handled gracefully).
- EyeDropper API only in Chrome/Edge.
- HTML5 drag-to-reorder for slide thumbnails may not work in all headless/automated browsers, but works in normal browsers (the underlying `reorderSlides` action is verified via context menu).
- Clipboard API may be blocked in some browsers/contexts — Copy HTML has execCommand fallback.

## Priority Recommendations for Next Phase
1. **Feature**: Master slide / template system — define a master slide whose elements appear on all slides.
2. **Feature**: Snap to other elements' edges during resize (currently only snaps canvas center/edges).
3. **Performance**: Virtualized layer list for 100+ elements.
4. **Feature**: Keyboard-navigable layer panel (arrow keys to move focus, Enter to select).
5. **Feature**: Custom font upload (FontFace API).
6. **Feature**: Speaker notes panel in presentation mode.
7. **Feature**: Slide transition preview thumbnails in slide panel.
8. **Polish**: Animated slide thumbnails (mini preview updates in real-time).
9. **Feature**: Export to JSON (project file) for backup/sharing.
10. **Feature**: Alignment guides persistence (remember snap settings per project).
