# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v10 — Landing page, history timeline panel, enhanced undo/redo
**Last Updated**: 2026-06-26 23:05 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v10)

All v1-v9 features remain working. This session added a beautiful landing page, a visual history timeline panel, and enhanced multi-step undo/redo with jump-to-point functionality.

### Verified This Session (agent-browser + VLM, 2026-06-26 23:05)
- **Landing Page**: New `LandingPage` component with hero section (gradient title, badge, CTA buttons), 6 feature cards with gradient icons (Drag & Snap, Resize & Rotate, HTML Import, Layers & Groups, History Timeline, Presentation Mode), "How it works" 3-step section, and final CTA. CSS animations for entrance effects (fade-up with staggered delays). Restore session link appears when a saved session exists. ThemeToggle in header. Verified: landing page loads with hero title, feature cards visible after scroll, "Start Editing" button navigates to editor.
- **History Timeline Panel**: New `HistoryPanel` component at the bottom of the Layers panel. Shows a vertical timeline with: future entries (redo-able, dimmed), "Current state" indicator (blue dot), and past entries (undo-able, most recent first). Each entry shows an icon, action label, and relative timestamp ("just now", "18s ago"). Includes undo/redo/clear buttons in the header. Collapsible. Verified: added 2 elements → history showed "Add element" x2 and "Replace slides" with "just now" timestamps.
- **Labeled History Entries**: History system refactored from `Slide[][]` to `HistoryEntry[]` with `label`, `timestamp`, and `icon` fields. Each action now pushes a descriptive entry: "Add element" (Plus icon), "Delete elements" (Trash2), "Duplicate elements" (Copy), "Align elements" (AlignStartVertical), "Group elements" (Group), "Set background" (Palette), "Add slide" (Plus), "Promote to master" (Crown), etc. 21 action types mapped to labels and icons.
- **Jump to History Point**: New `jumpToHistory(index)` store action. Click any past entry to undo to that point, or any future entry to redo to that point. Verified: clicked "Replace slides" entry → jumped back to 11 elements (original welcome slide), confirming multi-step undo works.
- **Multi-step Undo/Redo**: Undo (Ctrl+Z) and Redo (Ctrl+Shift+Z) work across multiple steps (50-step limit). Verified: added rect (16 elements) → undo (15 elements) → redo (16 elements).
- **Clear History**: New "Clear history" button (trash icon) in the History panel header clears all past/future entries.
- **Home Button**: Editor header now has a "Home" button (ArrowLeft icon) that returns to the landing page. Verified: clicked Home → returned to landing page.
- **View Routing**: `page.tsx` manages view state ("landing" vs "editor"). Landing page has "Start Editing" and "Import HTML" buttons that transition to editor. Import button opens the import dialog automatically. Restore session link loads saved project.

### Bug Fixes This Session
- Fixed `react-hooks/set-state-in-effect` in `page.tsx`: replaced `useEffect` + `setHasSavedSession` with lazy `useState` initializer that reads localStorage on mount.
- Fixed `react-hooks/set-state-in-effect` in `LandingPage.tsx`: replaced `useEffect` + `setMounted` animation pattern with pure CSS animations (`landing-animate-in` class with staggered `animationDelay`).
- Fixed History panel visibility: Layers panel needed `overflow-hidden` on the container and `min-h-0` on the ScrollArea to prevent the History panel from being pushed off-screen on short viewports.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts` — now exports `HistoryEntry` type, includes `jumpToHistory`, `clearHistory` actions. History uses `HistoryEntry[]` (with label/timestamp/icon) instead of bare `Slide[][]`.
- **Types**: `src/types/editor.ts` (Slide has notes?, transition? fields).
- **Theming**: next-themes with `attribute="class"`, ThemeProvider in layout.tsx, ThemeToggle component (used in both landing and editor).
- **Templates**: `src/lib/templates.ts` — 7 slide templates.
- **PNG export**: `src/lib/png-export.ts`.
- **Alignment**: `src/lib/alignment.ts`.
- **HTML I/O**: `src/lib/html-io.ts` — parseHtmlToSlides, parseMultipleHtmlToSlides, exportSlidesToHtml, ParsedFile type.
- **Project I/O**: `src/lib/project-io.ts` — SlideForge JSON project files.
- **PDF export**: `src/lib/pdf-export.ts`.
- **Persistence**: `src/lib/persistence.ts` (v2 format) + `src/hooks/use-autosave.ts`.
- **Recent colors**: `src/hooks/use-recent-colors.ts`.
- **Components**: LandingPage (NEW), Editor (with Home button + initialImportOpen prop), Toolbar, AlignmentToolbar, TextStylePresets, Canvas, CanvasElement, MasterElementView, LayersPanel (now includes HistoryPanel), HistoryPanel (NEW — timeline with jump-to-point), SlidesPanel, PropertyPanel (wraps SpeakerNotesPanel), SpeakerNotesPanel, ImportHtmlDialog (3-tab), ExportDialog, KeyboardShortcutsDialog, FindReplaceDialog, TemplatePickerDialog, PresentationMode, ProjectMenu, CanvasContextMenu, SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle, StatusBar.
- **Page routing**: `src/app/page.tsx` manages "landing" vs "editor" view state with lazy localStorage check for saved sessions.

---

## All Features (v1 through v10)

### Landing Page (NEW in v10)
- Hero section with gradient title, badge, and CTA buttons
- 6 feature cards with gradient icons and descriptions
- "How it works" 3-step visual guide
- Final CTA section
- Restore previous session link (when autosave exists)
- CSS entrance animations (staggered fade-up)
- ThemeToggle in header

### History Timeline (NEW in v10)
- Visual timeline panel at bottom of Layers panel
- Labeled entries with icons (21 action types mapped)
- Relative timestamps ("just now", "18s ago", "5m ago")
- "Current state" indicator with blue dot
- Future entries shown dimmed (redo-able)
- Click any entry to jump to that point in history
- Undo/Redo/Clear buttons in header
- Collapsible panel
- 50-step history limit

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu (elements) — with Promote to Master
- Multi-select bounding box with count label

### Elements
- Text (full typography + 8 style presets)
- Rectangle, Ellipse, Triangle, Line
- Image (file upload, URL, drag-drop)
- Container (raw HTML)

### Grouping
- Ctrl+G / Ctrl+Shift+G, group move, dashed ring
- Group resize — all members scale proportionally with text/stroke scaling

### Master Elements
- Promote elements to master layer (appear on all slides)
- Demote master elements back to current slide
- Toggle master visibility (crown icon in status bar)
- Master elements render in editor, presentation mode, and HTML export

### HTML Import
- Paste mode: paste HTML directly into a textarea
- File upload: select one or more .html/.htm files via click or drag-and-drop
- Folder upload: select a folder — all HTML files become slides
- Smart mode: extracts positioned text, shapes, images as editable elements
- Raw mode: keeps HTML intact in a container
- Multi-file parsing: each file can contain one or multiple slides
- File list UI with metadata, remove buttons, first/last badges

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
- JSON Project Export/Import — full project backup with slides, masterElements, notes

### Speaker Notes
- Per-slide notes in collapsible panel (bottom of Property Panel)
- Word count + estimated speaking time (130 wpm)
- Notes overlay in presentation mode (S key to toggle)
- Notes preserved in autosave and JSON export

### Presentation Mode
- Fullscreen slideshow with keyboard navigation
- 4 slide transitions: none/fade/slide/zoom
- Auto-play mode (5s/slide) with progress bar
- Elapsed timer / stopwatch
- Auto-hiding controls
- Speaker notes overlay (S key)
- Master elements rendered
- Fullscreen toggle (F key)

### Styling
- Fill (solid/gradient), Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background (solid/gradient/image)

### UI
- Dark mode toggle — sun/moon icons, persists via next-themes
- Status bar — slide info, element/group/master counts, selection count, master toggle, snap/grid indicators, zoom
- Home button in editor header (returns to landing page)
- Smooth animations and hover effects throughout

### Slides
- Multi-slide, add/duplicate/delete, templates, reorder via context menu + drag

### Layers
- Searchable, lock/visibility, reorder

### History
- Undo/Redo (50-step) with labeled entries
- Visual timeline panel with jump-to-point
- Clear history button

### Persistence
- Autosave (1.5s debounce) v2 format with masterElements, restore banner
- Restore session from landing page

### Keyboard Shortcuts (48+)
- T, Ctrl+Z/Y/C/V/D/A/S/G/H/F, F5, arrows, Shift+corner, Shift+rotate, Ctrl+Shift+L/E/R/T/M/B, ?, Esc, right-click
- Presentation: →/Space/PgDn, ←/PgUp, Home/End, F, P, S, T, Esc
- Master: Right-click → Promote/Demote, Status bar crown toggle

---

## Unresolved Issues / Risks
- Rotated element resize doesn't account for rotation matrix (resize math correct at rotation=0).
- Smart HTML import works best with absolutely-positioned elements.
- PDF export opens new window (popup blockers may block).
- PNG export uses foreignObject SVG — may not render perfectly in all browsers.
- EyeDropper API only in Chrome/Edge.
- HTML5 drag-to-reorder for slide thumbnails may not work in all headless browsers.
- Clipboard API may be blocked in some browsers — Copy HTML has execCommand fallback.
- Master elements cannot be edited directly on slides (must demote first).
- Per-slide transition override is in the store but not yet exposed in the UI.
- Folder upload uses `webkitdirectory` which is non-standard but widely supported.
- Inline CSS in imported HTML is preserved, but external stylesheets (`<link>` tags) are not loaded.
- History panel may be hard to see on very short viewports (under 500px height) — the Layers panel ScrollArea takes most of the space.

## Priority Recommendations for Next Phase
1. **Feature**: Master slide editor mode — a dedicated view for editing master elements.
2. **Feature**: Per-slide transition UI — expose the `setSlideTransition` action.
3. **Feature**: Snap to other elements' edges during resize.
4. **Performance**: Virtualized layer list for 100+ elements.
5. **Feature**: Keyboard-navigable layer panel (arrow keys, Enter).
6. **Feature**: Custom font upload (FontFace API).
7. **Feature**: Slide thumbnail live preview (real-time mini render updates).
8. **Feature**: External CSS stylesheet support in HTML import.
9. **Feature**: Export to individual PNG per slide (batch export).
10. **Polish**: Animated transition between slides in the thumbnail panel.
