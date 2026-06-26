# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v11 — PPT-style lists, Format Painter, Fit-to-Screen
**Last Updated**: 2026-06-27 07:55 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v11)

All v1-v10.1 features remain working. This session added 3 major PPT-style features: bullet/numbered lists, Format Painter, and Fit-to-Screen zoom.

### Verified This Session (agent-browser + VLM, 2026-06-27 07:55)
- **PPT-Style Lists (Bullets & Numbering)**: Added `listType`, `listStyle`, and `listIndent` fields to `TextElement`. Text elements can now render as bullet lists (● Filled circle, ○ Hollow circle, ■ Filled square) or numbered lists (1. 2. 3., a. b. c., I. II. III.). Each line of text becomes a list item. Property panel has 3 toggle buttons (—/•/1.) plus style selector and indent input. HTML export renders proper `<ul>`/`<ol>` tags. Verified: created text with 3 lines → applied bullet list → DOM showed `<ul>` with 3 `<li>` items ("Point one", "Point two", "Point three").
- **Format Painter**: New `copyFormat` and `pasteFormat` store actions with `formatClipboard` state. Copies fill, stroke, shadow, opacity, and all text typography (fontSize, fontFamily, fontWeight, color, lineHeight, listType, etc.) — but NOT position, size, or text content. Paintbrush button in toolbar (active state when format is on clipboard). Keyboard shortcuts: Ctrl+Shift+C (copy format), Ctrl+Shift+V (paste format). Verified: selected Title → clicked paintbrush → "Format copied" toast → selected Body A → clicked paintbrush → "Format applied to 1 element" toast → history panel showed "Paste format" entry.
- **Fit-to-Screen Zoom**: New Maximize icon button in zoom controls. Calculates optimal zoom based on canvas container dimensions and 1280×720 slide size. Verified: button present in toolbar (DOM confirmed `svg.lucide-maximize` exists).
- **Updated Keyboard Shortcuts Dialog**: Added "Ctrl + Shift + C" (Copy format) and "Ctrl + Shift + V" (Paste format) to the Editing category.

### Bug Fixes This Session
- None — code was clean from v10.1. Lint passes with 0 errors.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts` — now includes `formatClipboard`, `copyFormat`, `pasteFormat`. History uses `HistoryEntry[]` with label/timestamp/icon.
- **Types**: `src/types/editor.ts` — `TextElement` now has `listType?`, `listStyle?`, `listIndent?` fields.
- **Theming**: next-themes with `attribute="class"`, ThemeProvider in layout.tsx, ThemeToggle.
- **HTML I/O**: `src/lib/html-io.ts` — text export now renders `<ul>`/`<ol>` for list elements.
- **Project I/O**: `src/lib/project-io.ts` — SlideForge JSON project files.
- **Persistence**: `src/lib/persistence.ts` (v2 format) + `src/hooks/use-autosave.ts`.
- **Components**: LandingPage (with slide preview mockup), Editor (Home button + format painter shortcuts), Toolbar (Paintbrush + Fit-to-Screen + Copy HTML), AlignmentToolbar (opacity slider), TextStylePresets, Canvas, CanvasElement (list rendering), MasterElementView, LayersPanel (includes HistoryPanel), HistoryPanel (timeline with jump-to-point), SlidesPanel, PropertyPanel (list controls + SpeakerNotesPanel), SpeakerNotesPanel, ImportHtmlDialog (3-tab), ExportDialog, KeyboardShortcutsDialog, FindReplaceDialog, TemplatePickerDialog, PresentationMode, ProjectMenu, CanvasContextMenu, SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle, StatusBar.
- **Page routing**: `src/app/page.tsx` manages "landing" vs "editor" view state (hydration-safe).

---

## All Features (v1 through v11)

### PPT-Style Text Formatting (NEW in v11)
- Bullet lists: ● Filled circle, ○ Hollow circle, ■ Filled square
- Numbered lists: 1. 2. 3. (decimal), a. b. c. (lower-alpha), I. II. III. (upper-roman)
- List indent control (px)
- Each text line becomes a list item
- Proper `<ul>`/`<ol>` rendering in canvas and HTML export

### Format Painter (NEW in v11)
- Copy formatting from one element (fill, stroke, shadow, opacity, typography)
- Paste formatting to one or more selected elements
- Type-aware: text formatting only applies to text elements
- Paintbrush button in toolbar with active state
- Keyboard shortcuts: Ctrl+Shift+C (copy), Ctrl+Shift+V (paste)
- History entry: "Paste format" (Paintbrush icon)

### Fit-to-Screen Zoom (NEW in v11)
- Maximize button in zoom controls
- Calculates optimal zoom based on viewport and 1280×720 canvas
- Range: 0.1 to 2.0

### Landing Page
- Hero section with gradient title, badge, CTA buttons, and slide preview mockup
- 6 feature cards with consistent brand-color gradient icons
- "How it works" 3-step visual guide
- Restore previous session link

### History Timeline
- Visual timeline panel with labeled entries (21 action types)
- Relative timestamps, "Current state" indicator
- Click any entry to jump to that point
- Undo/Redo/Clear buttons, 50-step limit

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu with Promote to Master
- Multi-select bounding box with count label

### Elements
- Text (full typography + 8 style presets + bullet/number lists)
- Rectangle, Ellipse, Triangle, Line
- Image (file upload, URL, drag-drop)
- Container (raw HTML)

### Grouping
- Ctrl+G / Ctrl+Shift+G, group move, group resize

### Master Elements
- Promote/demote, visibility toggle, renders on all slides

### HTML Import
- Paste / File upload / Folder upload
- Smart mode (parse elements) / Raw mode (container)
- Multi-file parsing, file list UI

### Export
- HTML / Copy HTML / PDF / PNG / JSON Project

### Speaker Notes
- Per-slide notes, word count, presentation overlay (S key)

### Presentation Mode
- 4 transitions, auto-play, timer, notes overlay, master elements

### UI
- Dark mode toggle
- Status bar with counts and indicators
- Home button in editor header
- Fit-to-Screen zoom button
- Smooth animations throughout

### Persistence
- Autosave v2 with masterElements, restore from landing

### Keyboard Shortcuts (50+)
- T, Ctrl+Z/Y/C/V/D/A/S/G/H/F, F5, arrows, Shift+corner, Shift+rotate, Ctrl+Shift+L/E/R/T/M/B, ?, Esc, right-click
- **Ctrl+Shift+C / Ctrl+Shift+V (NEW)**: Format painter copy/paste
- Presentation: →/Space/PgDn, ←/PgUp, Home/End, F, P, S, T, Esc
- Master: Right-click → Promote/Demote, Status bar crown toggle

---

## Unresolved Issues / Risks
- Rotated element resize doesn't account for rotation matrix.
- Smart HTML import works best with absolutely-positioned elements.
- PDF export opens new window (popup blockers may block).
- PNG export uses foreignObject SVG — may not render perfectly in all browsers.
- EyeDropper API only in Chrome/Edge.
- Folder upload uses `webkitdirectory` (non-standard but widely supported).
- External stylesheets (`<link>` tags) in imported HTML are not loaded.
- History panel may be tight on very short viewports (under 500px).
- List rendering in text edit mode (textarea) doesn't show bullets — only in display mode.

## Priority Recommendations for Next Phase
1. **Feature**: Slide sorter overview mode — grid view of all slides.
2. **Feature**: Master slide editor mode — dedicated view for editing master elements.
3. **Feature**: Per-slide transition UI — expose the `setSlideTransition` action.
4. **Feature**: Snap to other elements' edges during resize.
5. **Performance**: Virtualized layer list for 100+ elements.
6. **Feature**: Keyboard-navigable layer panel (arrow keys, Enter).
7. **Feature**: Custom font upload (FontFace API).
8. **Feature**: External CSS stylesheet support in HTML import.
9. **Feature**: Batch PNG export per slide.
10. **Polish**: Element animation effects (entrance/exit animations like PPT).
