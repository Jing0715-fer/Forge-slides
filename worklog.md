# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v4 — Find & Replace, slide templates, color swatch palette all implemented and verified.
**Last Updated**: 2026-06-26 17:45 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v4)

All v1 + v2 + v3 features remain working. This session added 3 major features and fixed a lint error from v3.

### Verified This Session (agent-browser + VLM, 2026-06-26 17:45)
- **Find & Replace (Ctrl+H / Ctrl+F)**: Dialog with find/replace inputs, case-sensitive toggle, whole-word toggle, live results list with context highlighting, prev/next navigation, replace current, replace all. Verified: searched "Welcome" → found 1 match in title element; replaced with "Hello" → title changed to "Hello to SlideForge". Results show element name, slide name, and match context with yellow highlight.
- **Slide Templates**: Template picker dialog with 7 templates (Blank, Title Slide, Title+Content, Two Column, Three Cards, Section Divider, Quote, Dark Gradient). Each has a visual thumbnail preview. Verified: picked "Three Cards" → new slide created with 10 elements (title + 3 cards + 3 titles + 3 bodies), all rendering correctly with indigo/cyan/amber colors. Slides panel now has separate "Template" and "Blank" buttons.
- **Color Swatch Palette**: Reusable ColorSwatchPicker component with popover containing: native color input, hex text input, transparent toggle, recent colors (8 slots, persisted to localStorage), full palette of 88 preset colors (grays, reds, oranges, ambers, yellows, greens, teals, cyans, blues, indigos, violets, purples, fuchsias, pinks, roses), and EyeDropper API support (Chrome/Edge). Verified: popover opens with Recent and Palette sections, 88 swatches rendered. Integrated into PropertyPanel's ColorField for all color properties (fill, stroke, text color, shadow color, slide background).
- **Shortcuts dialog updated**: Added Ctrl+H / Ctrl+F (Find & Replace) to General section.

### Bug Fixes This Session
- Fixed lint error in FindReplaceDialog.tsx (`react-hooks/preserve-manual-memoization`) by converting useCallback-wrapped `replaceAll` and `goToMatch` to plain functions.
- Fixed lint error in use-recent-colors.ts (`react-hooks/set-state-in-effect`) by using useState lazy initializer instead of useEffect+setState.
- Wired up FindReplaceDialog (was created in v3 but never connected to Editor/Toolbar/keyboard).

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts`.
- **Types**: `src/types/editor.ts` — text, rect, ellipse, triangle, line, image, container + groupId + backgroundImage.
- **Templates**: `src/lib/templates.ts` — 7 slide templates with build functions.
- **Alignment**: `src/lib/alignment.ts` — PPT-style smart snapping.
- **HTML I/O**: `src/lib/html-io.ts` — gradient/shape/shadow-aware parser.
- **PDF export**: `src/lib/pdf-export.ts` — print-ready HTML.
- **Persistence**: `src/lib/persistence.ts` — localStorage autosave.
- **Recent colors**: `src/hooks/use-recent-colors.ts` — 16 recent + 88 preset palette, persisted.
- **Autosave hook**: `src/hooks/use-autosave.ts` — debounced save + restore banner.
- **Components**: `src/components/editor/` — Editor, Toolbar (2-row), AlignmentToolbar, TextStylePresets, Canvas (with drag-drop), CanvasElement (group move + aspect lock), LayersPanel, SlidesPanel (Template + Blank buttons), PropertyPanel (with ColorSwatchPicker), ImportHtmlDialog, ExportDialog, KeyboardShortcutsDialog (5 categories), FindReplaceDialog, TemplatePickerDialog, CanvasContextMenu, ColorSwatchPicker.

---

## All Features (v1 + v2 + v3 + v4)

### Editing
- PPT-like drag with smart alignment guides (6px threshold)
- 8-handle resize with edge snapping
- Shift+corner resize = lock aspect ratio
- Rotation handle (Shift = 15° snap)
- Double-click text to edit in place
- Marquee (box) selection
- Shift+click for multi-select
- Right-click context menu

### Elements
- Text (full typography + 8 style presets)
- Rectangle, Ellipse, Triangle, Line
- Image (upload from file, URL, OR drag-drop onto canvas)
- Container (raw HTML)

### Grouping
- Ctrl+G to group, Ctrl+Shift+G to ungroup
- Grouped elements move together
- Dashed blue selection ring for groups

### Multi-Selection
- Align L/C/R/T/M/B, Distribute H/V, Match W/H
- Ctrl+Shift+L/E/R/T/M/B alignment shortcuts

### Find & Replace (NEW)
- Ctrl+H or Ctrl+F to open dialog
- Case-sensitive and whole-word toggles
- Live results with context highlighting
- Previous/Next navigation
- Replace current or Replace all

### Slide Templates (NEW)
- 7 templates: Blank, Title Slide, Title+Content, Two Column, Three Cards, Section Divider, Quote, Dark Gradient
- Visual thumbnail previews in picker
- Separate Template and Blank buttons in slides panel

### Color System (NEW)
- ColorSwatchPicker with popover
- Recent colors (persisted, 16 slots)
- 88-color preset palette (15 color families)
- EyeDropper API support (Chrome/Edge)
- Transparent toggle for fill/stroke

### Styling
- Fill, Stroke, Corner radius, Shadow, Opacity, Rotation
- Per-slide background color/gradient + background image

### Slides
- Multi-slide with live thumbnail previews
- Add/Duplicate/Delete slides
- New from template or blank

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

### Keyboard Shortcuts (35+)
- `T` add text · `Ctrl+Z/Y` undo/redo · `Ctrl+C/V/D` copy/paste/duplicate · `Del` delete · `Ctrl+A` select all · `Ctrl+S` save
- `Ctrl+G` group · `Ctrl+Shift+G` ungroup
- `Ctrl+H` / `Ctrl+F` find & replace (NEW)
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
- Group resize moves only the dragged element (not the whole group).
- EyeDropper API only works in Chrome/Edge (button hidden in other browsers).

## Priority Recommendations for Next Phase
1. **Feature**: Export individual slide as PNG (via html-to-image or canvas snapshot).
2. **Feature**: Group resize — when resizing one element in a group, all group members scale proportionally.
3. **Feature**: Master slide / template system (define a master, apply to new slides).
4. **Polish**: Snap to other elements' edges during resize (currently snaps to centers and canvas edges).
5. **Feature**: Slide transitions / animations preview.
6. **Performance**: Virtualized layer list for 100+ elements.
7. **Polish**: Multi-select bounding box with group resize handles.
8. **Feature**: Keyboard-navigable layer panel (arrow up/down to select layers).
9. **Feature**: Gradient picker for fill (currently only solid colors via swatch).
10. **Polish**: Animation when opening dialogs (slide-in, fade).
