# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v9 — HTML file & folder import (multi-file → multi-slide)
**Last Updated**: 2026-06-26 21:58 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v9)

All v1-v8 features remain working. This session added comprehensive HTML file and folder import support.

### Verified This Session (agent-browser + VLM, 2026-06-26 21:58)
- **HTML File Upload**: New "File" tab in ImportHtmlDialog. Click or drag-and-drop .html/.htm files into the drop zone. Multiple files are supported — each file becomes one or more slides. Files are listed with name, filename, char count, size badge, and "first"/"last" position badges. Files can be removed individually. Verified: uploaded 3 HTML files → file list showed all 3 with "2.9 KB" total size badge and first/last badges.
- **HTML Folder Upload**: New "Folder" tab in ImportHtmlDialog. Uses `webkitdirectory` attribute to select a folder. All .html files in the folder (and subfolders) are collected, sorted alphabetically (natural numeric sort), and become slides. Same file list UI as File tab.
- **Multi-File Parsing**: New `parseMultipleHtmlToSlides(files: ParsedFile[])` function in `html-io.ts`. Each file is parsed independently — if a file contains multiple `<section class="slide">` elements, each becomes a separate slide. Slide names use the filename (without extension), with "(N)" suffix if a file produces multiple slides. Files are pre-sorted by the caller using natural numeric sort (so "slide-02" comes before "slide-10").
- **Tabbed Import UI**: ImportHtmlDialog completely redesigned with 3 tabs (Paste / File / Folder), each with appropriate icons (ClipboardPaste, FileUp, FolderUp). Smart/Raw mode toggle moved below the tabs as a segmented control. Drag-and-drop zones have hover and active states. Pending files list shows file icons, names, metadata, and remove buttons.
- **Raw Mode Multi-File**: When importing multiple files in Raw mode, each file becomes a slide with a full-canvas container element (1160×600). Uses `loadProject` to replace all slides.
- **Verified Import**: Created 3 test HTML files (gradient title slide, agenda with white cards, dark slide with 3 colored gradient cards). Uploaded all 3 via File tab → clicked Import → toast "Imported 3 slides from 3 file(s)" → 3 slide thumbnails appeared → navigated to each slide → all elements (titles, cards, gradients, text) rendered correctly.

### Bug Fixes This Session
- None — code was clean from v8. Lint passes with 0 errors.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts` (includes masterElements, masterVisible, promoteToMaster, demoteFromMaster, updateMasterElement, toggleMasterVisible, setSlideNotes, setSlideTransition, loadProject).
- **Types**: `src/types/editor.ts` (Slide has notes?, transition? fields).
- **Theming**: next-themes with `attribute="class"`, ThemeProvider in layout.tsx, ThemeToggle component.
- **Templates**: `src/lib/templates.ts` — 7 slide templates.
- **PNG export**: `src/lib/png-export.ts` — SVG foreignObject + canvas with CORS image handling.
- **Alignment**: `src/lib/alignment.ts`.
- **HTML I/O**: `src/lib/html-io.ts` — `parseHtmlToSlides` (single HTML), `parseMultipleHtmlToSlides` (NEW — multi-file), `exportSlidesToHtml` (accepts masterElements), `ParsedFile` type (NEW).
- **Project I/O**: `src/lib/project-io.ts` — SlideForge JSON project files.
- **PDF export**: `src/lib/pdf-export.ts`.
- **Persistence**: `src/lib/persistence.ts` (v2 format with masterElements) + `src/hooks/use-autosave.ts`.
- **Recent colors**: `src/hooks/use-recent-colors.ts`.
- **Components**: Editor (F5 shortcut), Toolbar (ProjectMenu + Copy HTML), AlignmentToolbar (opacity slider), TextStylePresets, Canvas (renders masterElements), CanvasElement (group move + group resize), MasterElementView (read-only master renderer), LayersPanel, SlidesPanel (drag-to-reorder), PropertyPanel (wraps SpeakerNotesPanel), SpeakerNotesPanel (collapsible notes with word count), ImportHtmlDialog (REDESIGNED — 3-tab Paste/File/Folder with drag-drop + file list), ExportDialog, KeyboardShortcutsDialog (7 categories), FindReplaceDialog, TemplatePickerDialog, PresentationMode (transitions + autoplay + timer + notes overlay + master elements), ProjectMenu (JSON export/import dropdown), CanvasContextMenu (promote/demote master), SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle, StatusBar (master element toggle).

---

## All Features (v1 through v9)

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

### HTML Import (significantly enhanced in v9)
- **Paste mode**: paste HTML directly into a textarea (Smart or Raw)
- **File upload (NEW)**: select one or more .html/.htm files via click or drag-and-drop
- **Folder upload (NEW)**: select a folder — all HTML files become slides (sorted alphabetically)
- **Smart mode**: extracts positioned text, shapes, images as editable elements
- **Raw mode**: keeps HTML intact in a container (single file → current slide; multi-file → one slide per file)
- **Multi-file parsing (NEW)**: each file can contain one or multiple `<section class="slide">` elements
- **File list UI (NEW)**: shows filename, char count, size badge, first/last position badges, remove button
- **Drag-and-drop (NEW)**: drop HTML files directly onto the upload zone

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
- Debounced updates (400ms)
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
- Progress bar, transition selector, click zones

### Styling
- Fill (solid/gradient), Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background (solid/gradient/image)

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
- Folder upload uses `webkitdirectory` which is non-standard but widely supported (Chrome, Firefox, Edge, Safari).
- Inline CSS in imported HTML is preserved, but external stylesheets (`<link>` tags) are not loaded — only inline styles are parsed.

## Priority Recommendations for Next Phase
1. **Feature**: Master slide editor mode — a dedicated view for editing master elements.
2. **Feature**: Per-slide transition UI — expose the `setSlideTransition` action.
3. **Feature**: Snap to other elements' edges during resize.
4. **Performance**: Virtualized layer list for 100+ elements.
5. **Feature**: Keyboard-navigable layer panel (arrow keys, Enter).
6. **Feature**: Custom font upload (FontFace API).
7. **Feature**: Slide thumbnail live preview (real-time mini render updates).
8. **Feature**: External CSS stylesheet support in HTML import (resolve `<link>` tags).
9. **Feature**: Export to individual PNG per slide (batch export).
10. **Polish**: Animated transition between slides in the thumbnail panel.
