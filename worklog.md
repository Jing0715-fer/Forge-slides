# SlideForge — HTML Editor Worklog

## Project Status

**Phase**: v10.1 — Hydration fix, VLM-optimized landing page, improved history panel
**Last Updated**: 2026-06-26 23:25 (Asia/Shanghai)

SlideForge is a PowerPoint-like HTML editor for fine-tuning AI-generated slides.
The app runs on Next.js 16 at `http://localhost:3000/` (single route `/`).

---

## Current State (v10.1)

All v1-v10 features remain working. This session fixed a critical hydration error, optimized the landing page UI based on VLM feedback (7→8.2/10), and improved the History panel visibility (5→8/10).

### Verified This Session (agent-browser + VLM, 2026-06-26 23:25)
- **Hydration Error Fix**: Fixed "Hydration failed because the server rendered HTML didn't match the client" error. Root cause: `hasSavedSession` lazy `useState` initializer read `localStorage` on the client but returned `false` on the server, causing a mismatch when the "Restore session" button rendered only on the client. Fix: initialize `hasSavedSession` to `false` on both server and client, then update via `useEffect` after mount (with `eslint-disable-next-line react-hooks/set-state-in-effect` since reading localStorage is a valid external-system subscription). Verified: 0 hydration errors in dev.log.
- **Landing Page VLM Optimization**: Iteratively improved the landing page based on VLM feedback:
  - Removed redundant "Open Editor" button (was duplicate of "Start Editing")
  - Standardized feature card colors to brand palette (pink/purple/indigo gradients instead of mixed amber/teal/violet)
  - Increased feature card padding (p-6→p-7) and icon size (w-11→w-12, rounded-lg→rounded-xl)
  - Added section badges ("Features", "Workflow") with Sparkles/Zap icons
  - Made subtitle more prominent (split into two lines: bold value prop + muted description)
  - Changed primary CTA to gradient (from-pink-500 to-purple-600) with colored shadow
  - Added anchor links ("Features", "How it works") in header
  - Added slide preview mockup in hero section (mini editor window with gradient slide, 3 cards, selection handles, glow effect)
  - Consistent brand colors in stats row (pink/purple/fuchsia instead of amber/violet/emerald)
  - Background decorative elements use brand colors (pink/purple/indigo)
- **History Panel Visibility Improvement**: Made the History panel more prominent:
  - Added `border-t-2 border-primary/10` and gradient background (`from-muted/30 to-background`)
  - History icon now in a rounded badge container (`bg-primary/10`)
  - Action count badge styled as pill (`bg-primary/10 text-primary/80 rounded-full`)
  - Header label uses `text-foreground/90` instead of muted
  - Increased header padding (py-2→py-2.5)
  - Added `shrink-0` to prevent compression
- **E2E Test Results**: All tests pass:
  - Hydration errors: 0 ✓
  - Landing page loads ✓
  - Navigate to editor ✓
  - Home button returns to landing ✓
  - Undo works (12→11 elements) ✓
  - Redo works (11→12 elements) ✓
  - History panel visible ✓
  - Jump to history point works ✓

### VLM Score Progression
- Landing page: 7/10 → 8/10 → 8.2/10 (after slide preview mockup)
- Color scheme: 7/10 → 9/10
- CTA clarity: 7/10 → 9/10
- History panel visibility: 5/10 → 8/10

### Bug Fixes This Session
- **Hydration mismatch**: `hasSavedSession` lazy initializer caused SSR/client mismatch. Fixed by using `useState(false)` + `useEffect` to read localStorage after mount.
- **History panel ScrollArea**: Replaced `ScrollArea` component with native `overflow-y-auto` + `editor-scroll` class for more reliable scrolling in the constrained panel.

---

## Architecture
- **State**: Zustand store at `src/store/editor-store.ts` — exports `HistoryEntry` type, includes `jumpToHistory`, `clearHistory`. History uses `HistoryEntry[]` with label/timestamp/icon.
- **Types**: `src/types/editor.ts` (Slide has notes?, transition? fields).
- **Theming**: next-themes with `attribute="class"`, ThemeProvider in layout.tsx, ThemeToggle (used in landing + editor).
- **HTML I/O**: `src/lib/html-io.ts` — parseHtmlToSlides, parseMultipleHtmlToSlides, exportSlidesToHtml, ParsedFile.
- **Project I/O**: `src/lib/project-io.ts` — SlideForge JSON project files.
- **Persistence**: `src/lib/persistence.ts` (v2 format) + `src/hooks/use-autosave.ts`.
- **Components**: LandingPage (with slide preview mockup), Editor (Home button + initialImportOpen), Toolbar, AlignmentToolbar, TextStylePresets, Canvas, CanvasElement, MasterElementView, LayersPanel (includes HistoryPanel), HistoryPanel (improved visibility with badge + gradient), SlidesPanel, PropertyPanel (wraps SpeakerNotesPanel), SpeakerNotesPanel, ImportHtmlDialog (3-tab), ExportDialog, KeyboardShortcutsDialog, FindReplaceDialog, TemplatePickerDialog, PresentationMode, ProjectMenu, CanvasContextMenu, SlideContextMenu, ColorSwatchPicker, GradientPicker, ThemeToggle, StatusBar.
- **Page routing**: `src/app/page.tsx` manages "landing" vs "editor" view state with `useEffect`-based localStorage check (hydration-safe).

---

## All Features (v1 through v10.1)

### Landing Page
- Hero section with gradient title, badge, CTA buttons, and slide preview mockup
- 6 feature cards with consistent brand-color gradient icons
- "How it works" 3-step visual guide with numbered badges
- Final CTA section with crown badge
- Restore previous session link (when autosave exists)
- CSS entrance animations (staggered fade-up)
- ThemeToggle + anchor links in header

### History Timeline
- Visual timeline panel at bottom of Layers panel (prominent with gradient + badge)
- Labeled entries with icons (21 action types)
- Relative timestamps ("just now", "18s ago")
- "Current state" indicator with blue dot
- Click any entry to jump to that point
- Undo/Redo/Clear buttons in header
- Collapsible, 50-step limit

### Editing
- PPT-like drag with smart alignment guides
- 8-handle resize with edge snapping + Shift aspect lock
- Rotation handle (Shift = 15° snap)
- Double-click text edit, marquee selection, multi-select
- Right-click context menu with Promote to Master
- Multi-select bounding box with count label

### Elements
- Text (full typography + 8 style presets)
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
- Smooth animations throughout

### Persistence
- Autosave v2 with masterElements, restore from landing

### Keyboard Shortcuts (48+)
- T, Ctrl+Z/Y/C/V/D/A/S/G/H/F, F5, arrows, Shift+corner, Shift+rotate, Ctrl+Shift+L/E/R/T/M/B, ?, Esc, right-click
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
- History panel may still be tight on very short viewports (under 500px).

## Priority Recommendations for Next Phase
1. **Feature**: Master slide editor mode.
2. **Feature**: Per-slide transition UI.
3. **Feature**: Snap to other elements' edges during resize.
4. **Performance**: Virtualized layer list for 100+ elements.
5. **Feature**: Keyboard-navigable layer panel.
6. **Feature**: Custom font upload (FontFace API).
7. **Feature**: External CSS stylesheet support in HTML import.
8. **Feature**: Batch PNG export per slide.
9. **Polish**: Toolbar icon grouping and labels for better discoverability.
10. **Polish**: Animated slide thumbnail transitions.
