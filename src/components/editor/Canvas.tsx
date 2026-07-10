"use client"
import React, { useEffect, useRef, useState } from "react"
import { useEditor, CANVAS_WIDTH, CANVAS_HEIGHT, createTextElement, createShapeElement, createImageElement, createContainerElement } from "@/store/editor-store"
import { CanvasElementView } from "./CanvasElement"
import { MasterElementView } from "./MasterElementView"
import type { EditorElement } from "@/types/editor"
import { cn } from "@/lib/utils"

// Attach `pointermove` + `pointerup` + `pointercancel` to `window` for
// a drag operation. Returns a cleanup function that removes all three
// listeners. `pointercancel` is needed because iOS Safari sends it
// mid-drag (system gestures, notification banners, etc.) — without it
// the global listeners persist and continue mutating state after the
// user thinks the drag has ended. `blur` covers the Alt-Tab case on
// desktop.
function attachDragWindowListeners(
  onMove: (e: PointerEvent) => void,
  onUp: (e: PointerEvent) => void,
): () => void {
  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onUp)
  window.addEventListener("blur", onUp)
  return () => {
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onUp)
    window.removeEventListener("blur", onUp)
  }
}

export function Canvas() {
  const {
    currentSlide,
    selectedIds,
    editingId,
    clearSelection,
    setSelected,
    addElement,
    zoom,
    showGrid,
    showGuides,
    masterElements,
    masterVisible,
    setSlideRawHtml,
    setSlideSize,
    pushHistorySnapshot,
  } = useEditor()
  const slide = currentSlide()
  // Defensive: when no slide is loaded yet (e.g. immediately after landing → editor
  // transition, before the saved session is restored), `currentSlide()` returns
  // undefined. Without this guard, downstream `slide.elements` accesses throw
  // "Cannot read properties of undefined". Render an empty canvas instead.
  const containerRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Handle image drag-and-drop onto canvas
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const imgFile = files.find((f) => f.type.startsWith("image/"))
    if (!imgFile) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const { x, y } = clientToCanvas(e.clientX, e.clientY)
        const maxW = 600
        const maxH = 450
        let w = img.naturalWidth
        let h = img.naturalHeight
        const ratio = Math.min(maxW / w, maxH / h, 1)
        w = w * ratio
        h = h * ratio
        addElement(createImageElement(dataUrl, {
          x: x - w / 2,
          y: y - h / 2,
          width: w,
          height: h,
          name: imgFile.name.replace(/\.[^.]+$/, ""),
        }))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(imgFile)
  }

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault()
      setDragOver(true)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target) setDragOver(false)
  }

  // Convert client coords to canvas coords. The zoom divisor is
  // `rect.width / slide.width` (not `rect.width / CANVAS_WIDTH`) so that
  // non-default slide sizes (1920×1080, 1280×800, etc.) scale correctly.
  // Using CANVAS_WIDTH here would silently mis-scale any slide whose
  // `width !== 1280` — the cursor's canvas-space position would be off
  // by `slide.width / 1280` and dropped/dragged elements would land in
  // the wrong place.
  function clientToCanvas(clientX: number, clientY: number) {
    const canvas = document.getElementById("editor-canvas")
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const slideW = slide?.width || CANVAS_WIDTH
    const z = rect.width / slideW
    return { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z }
  }

  // Background pointer down: start marquee selection or clear
  function onCanvasPointerDown(e: React.PointerEvent) {
    const targetId = (e.target as HTMLElement).id
    // Only fire marquee when user clicked the slide background (canvas
    // wrapper, canvas-bg, or canvas-inner) — never when clicking an element.
    if (targetId !== "editor-canvas" && targetId !== "editor-canvas-bg" && targetId !== "editor-canvas-inner") {
      return
    }
    if (e.button !== 0) return
    clearSelection()
    const start = clientToCanvas(e.clientX, e.clientY)
    setMarquee({ x1: start.x, y1: start.y, x2: start.x, y2: start.y })

    const onMove = (ev: PointerEvent) => {
      const cur = clientToCanvas(ev.clientX, ev.clientY)
      setMarquee((m) => (m ? { ...m, x2: cur.x, y2: cur.y } : m))
    }
    const onUp = () => {
      setMarquee((m) => {
        if (m) {
          const x1 = Math.min(m.x1, m.x2)
          const y1 = Math.min(m.y1, m.y2)
          const x2 = Math.max(m.x1, m.x2)
          const y2 = Math.max(m.y1, m.y2)
          if (Math.abs(x2 - x1) > 4 && Math.abs(y2 - y1) > 4) {
            const ids = slide.elements
              .filter((el) => el.visible && el.x < x2 && el.x + el.width > x1 && el.y < y2 && el.y + el.height > y1)
              .map((el) => el.id)
            if (ids.length > 0) setSelected(ids)
          }
        }
        return null
      })
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      window.removeEventListener("blur", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    window.addEventListener("blur", onUp)
  }

  // Render
  if (!slide) {
    return (
      <div className="canvas-scroll flex-1 relative overflow-auto sf-layers-scroll flex items-center justify-center">
        <div className="text-muted-foreground text-sm">No slide selected</div>
      </div>
    )
  }
  const elements = slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div
      className="canvas-scroll flex-1 relative overflow-auto sf-layers-scroll"
      style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #fdf2f8 35%, #f5f3ff 70%, #eff6ff 100%)" }}
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Subtle dot grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-45" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.16) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }} />
      {/* Soft warm radial glow in the center for depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(204,120,92,0.08), transparent 70%)",
      }} />
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none backdrop-blur-sm">
          <div className="bg-background/90 backdrop-blur px-6 py-4 rounded-xl shadow-lg">
            <p className="text-primary font-semibold text-lg">Drop image to add to slide</p>
          </div>
        </div>
      )}
      <div className="min-w-full min-h-full flex items-center justify-center p-12 relative">
        <div
          id="editor-canvas"
          onPointerDown={onCanvasPointerDown}
          className="relative sf-canvas-shadow rounded-sm"
          style={{
            // Use per-slide dimensions when set (e.g. imported Z.ai decks
            // with 1280×900 layouts). Fall back to the standard 1280×720.
            width: (slide.width || CANVAS_WIDTH) * zoom,
            height: (slide.height || CANVAS_HEIGHT) * zoom,
            // No overflow-hidden: allow off-canvas elements to be visible so
            // they can be selected, dragged and resized. The slide background
            // is painted on the inner div below so it stays bounded to the
            // slide's nominal canvas while elements can extend beyond.
            overflow: "visible",
          }}
        >
          {/* Slide background — bounded to the nominal slide area (1280×720
              or per-slide size). Inner div carries the bg color/gradient/image
              so the outer canvas wrapper can be overflow:visible. The id
              "editor-canvas-bg" lets onCanvasPointerDown recognize a click on
              the slide background as a marquee start. */}
          <div
            id="editor-canvas-bg"
            className="absolute top-0 left-0 origin-top-left pointer-events-none"
            style={{
              width: slide.width || CANVAS_WIDTH,
              height: slide.height || CANVAS_HEIGHT,
              transform: `scale(${zoom})`,
              ...(slide.background && slide.background.includes("gradient")
                ? { backgroundImage: slide.background, backgroundSize: "cover", backgroundPosition: "center" }
                : { backgroundColor: slide.background }),
              ...(slide.backgroundImage
                ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}),
            }}
          />
          {/* Inner canvas at native resolution — holds elements + grid */}
          <div
            id="editor-canvas-inner"
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: slide.width || CANVAS_WIDTH,
              height: slide.height || CANVAS_HEIGHT,
              transform: `scale(${zoom})`,
            }}
          >
            {/* Grid */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            )}
            {/* Center cross hair */}
            {showGuides && (
              <>
                <div className="absolute top-0 left-1/2 w-px h-full bg-slate-200/60 pointer-events-none" />
                <div className="absolute left-0 top-1/2 w-full h-px bg-slate-200/60 pointer-events-none" />
              </>
            )}
            {/* Master elements (rendered first = behind regular elements) */}
            {masterVisible && masterElements.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {masterElements.slice().sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                  <MasterElementView key={el.id} element={el} />
                ))}
              </div>
            )}
            {/* Raw HTML mode: render the slide's original HTML in an interactive
                iframe for 100% visual fidelity AND direct editing. The iframe's
                body is set to contentEditable so the user can click and edit
                text directly. No overlay elements needed — the iframe IS the editor. */}
            {slide.rawHtml && (
              <RawHtmlFrame
                html={slide.rawHtml}
                zoom={zoom}
                slideId={slide.id}
                width={slide.width || CANVAS_WIDTH}
                height={slide.height || CANVAS_HEIGHT}
                onTextChange={(newHtml) => {
                  setSlideRawHtml(slide.id, newHtml)
                }}
                onTextBlur={() => {
                  pushHistorySnapshot("Edit text", "Type")
                }}
                onSizeMeasured={(w, h) => {
                  // Adopt the imported HTML's actual rendered size, not
                  // just whatever the static detector (w-[NNNpx] / inline
                  // width / data-width) happened to find. If the file
                  // says nothing explicit (e.g. 100% / 100vw), the
                  // browser renders it at the iframe's content width —
                  // and that's what we measure here, so the editor
                  // matches what the user sees in their own browser.
                  setSlideSize(slide.id, w, h)
                }}
                onOverlaysUpdate={(items) => {
                  // Store overlay items as elements in the slide so they
                  // appear in the Layers panel and PropertyPanel can edit them.
                  //
                  // CRITICAL: don't blow away user-added elements (anything
                  // whose id doesn't start with "sf-"). User-added elements
                  // are created by Toolbar / addElement() with `uuid()` v4
                  // ids; iframe-scan elements use `sf-{slideId}-{N}`. The
                  // original code did `slide.elements = items.map(...)` and
                  // lost every user-added element on every iframe reload,
                  // which is why the user reported "some elements became
                  // unselectable / uneditable" after the sf-* dedup fix.
                  const { slides, selectedIds } = useEditor.getState()
                  const currentSlide = slides.find(s => s.id === slide.id)
                  if (!currentSlide) return
                  const isScanId = (id: string) => id.startsWith("sf-")
                  const existingScanElements = currentSlide.elements.filter(
                    (e) => isScanId(e.id),
                  )
                  const userElements = currentSlide.elements.filter(
                    (e) => !isScanId(e.id),
                  )
                  // Fast-path: skip the setState if the scan produced
                  // exactly the same ids and positions as what's already
                  // stored. Avoids the infinite-loop guard from firing
                  // every render.
                  if (
                    existingScanElements.length === items.length &&
                    existingScanElements.every((e, idx) => {
                      const it = items[idx]
                      return (
                        it &&
                        e.id === it.id &&
                        e.x === it.x &&
                        e.y === it.y &&
                        e.width === it.width &&
                        e.height === it.height
                      )
                    })
                  ) {
                    return
                  }
                  const newElements: EditorElement[] = items.map((item) => {
                    const base = {
                      id: item.id,
                      name: item.label,
                      x: item.x, y: item.y, width: item.width, height: item.height,
                      rotation: 0, opacity: 1, visible: true, locked: false,
                      zIndex: 0,
                      fill: "transparent", stroke: "transparent", strokeWidth: 0,
                    }
                    if (item.type === "text") {
                      // Use the ACTUAL computed styles from the iframe element
                      // so the PropertyPanel shows real font size, color, etc.
                      const cs = item.computedStyle
                      return { ...base, type: "text" as const, text: item.label,
                        fontSize: cs?.fontSize ?? 16,
                        fontFamily: cs?.fontFamily ?? "Inter, system-ui, sans-serif",
                        fontWeight: cs?.fontWeight ?? "400",
                        fontStyle: (cs?.fontStyle ?? "normal") as "normal" | "italic",
                        textDecoration: (cs?.textDecoration ?? "none") as "none" | "underline" | "line-through",
                        textAlign: (cs?.textAlign ?? "left") as "left" | "center" | "right" | "justify",
                        color: cs?.color ?? "#0f172a",
                        lineHeight: cs?.lineHeight ?? 1.4,
                        letterSpacing: cs?.letterSpacing ?? 0,
                        verticalAlign: "middle" as const, autoSize: false, padding: 0 }
                    }
                    if (item.type === "image") {
                      return { ...base, type: "image" as const, src: "", alt: "", objectFit: "cover" as const }
                    }
                    return { ...base, type: "rect" as const }
                  })
                  // Dedupe by id (defensive) then merge user elements back in.
                  // User elements get a high zIndex band so they always render
                  // on top of the scanned iframe content.
                  const seenIds = new Set<string>()
                  const dedupedScanElements = newElements.filter((e) => {
                    if (seenIds.has(e.id)) return false
                    seenIds.add(e.id)
                    return true
                  })
                  const merged = [
                    ...dedupedScanElements,
                    ...userElements,
                  ]
                  // Stale scan-only selection: if a previously-selected id is
                  // no longer in the scan results (iframe reloaded with
                  // different content), drop just that id — but preserve
                  // selection of user-added elements.
                  const newScanIds = seenIds
                  useEditor.setState({
                    slides: slides.map((s) =>
                      s.id === slide.id ? { ...s, elements: merged } : s,
                    ),
                    selectedIds: selectedIds.filter(
                      (id) => isScanId(id) ? newScanIds.has(id) : true,
                    ),
                    editingId: null,
                  })
                }}
              />
            )}
            {/* Elements — only rendered when NOT in rawHtml mode.
                In rawHtml mode, the iframe handles everything. */}
            {!slide.rawHtml && elements.map((el) => (
              <CanvasElementView
                key={el.id}
                element={el}
                selected={selectedIds.includes(el.id)}
                editing={editingId === el.id}
                overlay={!!slide.rawHtml}
              />
            ))}
            {/* Multi-select bounding box */}
            {selectedIds.length >= 2 && (() => {
              const selected = elements.filter((e) => selectedIds.includes(e.id))
              if (selected.length < 2) return null
              const minX = Math.min(...selected.map((e) => e.x))
              const minY = Math.min(...selected.map((e) => e.y))
              const maxX = Math.max(...selected.map((e) => e.x + e.width))
              const maxY = Math.max(...selected.map((e) => e.y + e.height))
              return (
                <div
                  className="absolute pointer-events-none border border-dashed border-primary/50 rounded"
                  style={{
                    left: minX - 4,
                    top: minY - 4,
                    width: maxX - minX + 8,
                    height: maxY - minY + 8,
                    zIndex: 9998,
                  }}
                >
                  <div className="absolute -top-5 left-0 text-[10px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    {selected.length} selected
                  </div>
                </div>
              )
            })()}
            {/* Marquee selection */}
            {marquee && (
              <div
                className="absolute pointer-events-none border border-primary bg-primary/10"
                style={{
                  left: Math.min(marquee.x1, marquee.x2),
                  top: Math.min(marquee.y1, marquee.y2),
                  width: Math.abs(marquee.x2 - marquee.x1),
                  height: Math.abs(marquee.y2 - marquee.y1),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Interactive iframe for Exact mode with overlay elements.
 *
 * After the iframe loads, we scan the iframe's DOM to identify ALL visible
 * elements (text, images, shapes). For each element, we create a transparent
 * overlay div positioned exactly on top (measured via getBoundingClientRect
 * from the actual rendered iframe — so positions are always correct).
 *
 * The overlay divs handle:
 *  - Click to select (shows outline + resize handles)
 *  - Click + drag to move (5px threshold distinguishes from text editing)
 *  - Resize handles (8 directions)
 *  - Double-click to edit text (makes iframe element contentEditable)
 *
 * When an overlay is moved/resized, the corresponding iframe element's
 * style is updated directly. Changes are synced back to rawHtml.
 *
 * The iframe provides 100% visual fidelity; the overlays provide
 * precise element-level interaction — combining the best of both approaches.
 */
function RawHtmlFrame({ html, zoom, slideId, width, height, onTextChange, onTextBlur, onOverlaysUpdate, onSizeMeasured }: { 
  html: string
  zoom: number
  slideId: string
  // P2-6: per-slide canvas dimensions. Default 1280×720 when the slide
  // doesn't declare a custom size (e.g. AI-generated decks where the
  // import detected `w-[NNNpx]` / `h-[NNNpx]` classes).
  width: number
  height: number
  onTextChange: (html: string) => void
  onTextBlur?: () => void
  onOverlaysUpdate?: (items: { id: string; x: number; y: number; width: number; height: number; label: string; type: string; computedStyle?: { fontSize: number; fontFamily: string; fontWeight: string; fontStyle: string; textDecoration: string; color: string; textAlign: string; lineHeight: number; letterSpacing: number } }) => void
  // Optional callback fired with the iframe body's actual rendered size
  // after load. Lets the parent sync the slide.width/height to whatever
  // the imported HTML is actually rendering at — so an HTML file opened
  // directly in a browser at 1440×900 gets imported at 1440×900 even
  // if the import-time static-detector missed the size.
  onSizeMeasured?: (width: number, height: number) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastHtml = useRef(html)
  const [overlays, setOverlays] = useState<OverlayItem[]>([])
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null)
  const [textEditingId, setTextEditingId] = useState<string | null>(null)
  const [snapLines, setSnapLines] = useState<{ axis: "x" | "y"; pos: number }[]>([])

  // Sync selectedOverlay with the store's selectedIds. This ensures that when
  // a layer row is clicked in the LayersPanel (which calls setSelected in the
  // store), the corresponding overlay visually shows as selected.
  const storeSelectedIds = useEditor((s) => s.selectedIds)
  useEffect(() => {
    if (storeSelectedIds.length === 1) {
      setSelectedOverlay(storeSelectedIds[0])
    } else if (storeSelectedIds.length === 0) {
      setSelectedOverlay(null)
    }
  }, [storeSelectedIds])

  // When the html prop changes externally (e.g. undo), reload the iframe.
  // But DON'T reload while text editing is active — that would reset the
  // cursor and lose the editing session. The changes are already in the DOM.
  // Also DON'T reload if the PropertyPanel already applied the change directly
  // to the iframe DOM (marked via _sfLastHtml) — reloading would cause
  // overlays to disappear and potentially lose differently-colored child
  // overlays.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    if (textEditingId !== null) return // Don't reload during text editing
    if (html !== lastHtml.current) {
      // Check if the PropertyPanel already applied this change to the iframe
      const sfLastHtml = (iframe as any)._sfLastHtml as string | undefined
      if (sfLastHtml === html) {
        // The iframe DOM is already up-to-date — just update lastHtml without
        // reloading, so overlays are preserved.
        lastHtml.current = html
        ;(iframe as any)._sfLastHtml = undefined
      } else {
        lastHtml.current = html
        iframe.srcdoc = html
      }
    }
  }, [html, textEditingId])

  interface OverlayItem {
    id: string
    x: number
    y: number
    width: number
    height: number
    label: string
    type: "text" | "image" | "shape" | "container"
    // DOM nesting depth (0 = direct child of body). Used to compute z-index
    // so deeper elements render BELOW shallower ones — this prevents the
    // "can't click an outer element because a nested inner one is on top"
    // problem. Click on an overlap → outer wins, user can pick the inner
    // via Tab/cycle or by dragging the outer away first.
    depth: number
    // Reference to the iframe element (by index in a lookup)
    iframeSelector: string
    // Computed text styles from the iframe element (for text overlays)
    computedStyle?: {
      fontSize: number
      fontFamily: string
      fontWeight: string
      fontStyle: string
      textDecoration: string
      color: string
      textAlign: string
      lineHeight: number
      letterSpacing: number
    }
  }

  // After iframe loads, scan DOM and create overlays
  function handleLoad() {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (!doc) return
      const win = iframe.contentWindow
      if (!win) return

      // Make body contentEditable for text editing
      doc.body.setAttribute("contenteditable", "true")
      doc.body.style.outline = "none"

      // Inject selection/drag styles
      const styleEl = doc.createElement("style")
      styleEl.textContent = `
        .sf-selected { outline: 2px solid #6366f1 !important; outline-offset: 0 !important; }
        .sf-dragging { opacity: 0.8 !important; }
      `
      doc.head.appendChild(styleEl)

      // ---- Scan iframe DOM for visible elements ----
      // We look for: text elements (h1-h6, p, span, div with text), images, and shapes
      const bodyRect = doc.body.getBoundingClientRect()
      const items: OverlayItem[] = []
      // Seed the per-scan counter with a per-slide prefix so IDs are unique
      // across slides even though the local counter resets on every iframe
      // reload. The per-slide prefix (slideId) is stable, so reloading the
      // same slide's iframe produces the same IDs — undo/redo history
      // references stay valid.
      let idCounter = 0
      const idSeed = `${slideId}`

      // Assign unique data-sf-id to each element for later lookup
      function assignId(el: HTMLElement): string {
        let id = el.getAttribute("data-sf-id")
        if (!id) {
          id = `sf-${idSeed}-${(idCounter++).toString(36)}`
          el.setAttribute("data-sf-id", id)
        }
        return id
      }

      function scanElements(root: Element, depth: number) {
        Array.from(root.children).forEach((child) => {
          const tag = child.tagName.toLowerCase()
          if (tag === "script" || tag === "style" || tag === "link" || tag === "meta") return

          const el = child as HTMLElement
          const cs = win.getComputedStyle(el)
          const rect = el.getBoundingClientRect()

          // Skip elements with zero size
          if (rect.width < 2 && rect.height < 2) {
            scanElements(child, depth + 1)
            return
          }

          // Skip elements outside the slide
          if (rect.right < 0 || rect.bottom < 0 || rect.left > 1280 || rect.top > 720) {
            scanElements(child, depth + 1)
            return
          }

          // Skip elements with display:none
          if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
            scanElements(child, depth + 1)
            return
          }

          const x = rect.left - bodyRect.left
          const y = rect.top - bodyRect.top
          const w = rect.width
          const h = rect.height

          // Determine type and label
          const textContent = (el.textContent || "").replace(/\s+/g, " ").trim()
          const hasText = textContent.length > 0
          // directTextContent: text from the element's OWN text nodes only (excludes
          // child element text). This is used for labels so that a parent element
          // with differently-styled children (e.g., "5分钟" in accent color) shows
          // only its own text, effectively "skipping" the child's text.
          const directTextContent = Array.from(el.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent || "")
            .join("")
            .replace(/\s+/g, " ")
            .trim()
          // isLeafText: element has no children, or only inline children (br, span, a, strong, em, b, i, mark, small, sub, sup, code)
          const inlineTags = new Set(["br", "span", "a", "strong", "em", "b", "i", "mark", "small", "sub", "sup", "code", "u", "s"])
          const isLeafText = !el.children.length || Array.from(el.children).every(c => {
            const t = c.tagName.toLowerCase()
            return inlineTags.has(t)
          })
          const isImg = tag === "img"
          const hasBg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent"
          const hasBorder = parseFloat(cs.borderTopWidth) || parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderLeftWidth) || parseFloat(cs.borderRightWidth)
          const hasShadow = cs.boxShadow && cs.boxShadow !== "none"
          // isPositioned: absolutely or relatively positioned (common for background shapes)
          const isPositioned = cs.position === "absolute" || cs.position === "relative" || cs.position === "fixed"

          let type: OverlayItem["type"] = "container"
          let label = ""
          // Use directTextContent for the label when available — this shows only
          // the element's own text, skipping differently-styled children (e.g.,
          // "5分钟" won't appear in the parent's label because it's in a child
          // span with a different color).
          const labelText = directTextContent || textContent

          if (isImg) {
            type = "image"
            label = el.getAttribute("alt") || "Image"
          } else if (hasText && isLeafText) {
            type = "text"
            label = labelText
          } else if ((hasBg || hasBorder || hasShadow) && !hasText) {
            type = "shape"
            label = el.className && typeof el.className === "string" ? el.className.split(" ")[0] || "Shape" : "Shape"
          } else if ((hasBg || hasBorder || hasShadow) && hasText && !isLeafText) {
            // A container with visible styling AND text — treat as shape (so it can be
            // selected/moved/resized as a unit). Child text elements will be scanned
            // separately for finer text editing.
            type = "shape"
            label = labelText || "Container"
          } else if (hasText) {
            type = "text"
            label = labelText
          } else {
            type = "container"
            label = tag
          }

          // Create overlay for:
          //  - Images
          //  - Leaf text elements (text with only inline children)
          //  - Shapes/containers with visible styling (bg, border, shadow) — EVEN if
          //    they have child elements. This ensures background boxes, cards, and
          //    decorative shapes can be selected and resized.
          //  - Positioned elements with visible styling
          const hasVisibleStyling = hasBg || hasBorder || hasShadow
          const shouldCreateOverlay = isImg
            || (hasText && isLeafText)
            || (hasVisibleStyling && (isPositioned || !el.children.length || hasBg || hasBorder || hasShadow))

          if (shouldCreateOverlay) {
            const sfId = assignId(el)
            // For text elements, read the ACTUAL computed styles from the
            // iframe so the PropertyPanel shows real values (font size,
            // color, weight, etc.) instead of hardcoded defaults.
            let computedStyle: OverlayItem["computedStyle"] | undefined
            if (type === "text") {
              const fs = parseFloat(cs.fontSize)
              const lh = parseFloat(cs.lineHeight)
              const ls = parseFloat(cs.letterSpacing)
              computedStyle = {
                fontSize: isNaN(fs) ? 16 : fs,
                fontFamily: cs.fontFamily || "Inter, system-ui, sans-serif",
                fontWeight: cs.fontWeight || "400",
                fontStyle: cs.fontStyle || "normal",
                textDecoration: cs.textDecoration || "none",
                color: cs.color || "#0f172a",
                textAlign: cs.textAlign || "left",
                lineHeight: isNaN(lh) ? 1.4 : (lh / fs || 1.4),
                letterSpacing: isNaN(ls) ? 0 : ls,
              }
            }
            items.push({
              id: sfId,
              x, y, width: w, height: h,
              label,
              type,
              depth,
              iframeSelector: `[data-sf-id="${sfId}"]`,
              computedStyle,
            })
          }

          // Always recurse into children (for finer granularity)
          scanElements(child, depth + 1)
        })
      }

      scanElements(doc.body, 0)

      // Belt-and-suspenders dedup: drop items with duplicate IDs (a safety net
      // for any path where two items could share an ID — e.g., React batching
      // two scans before the iframe DOM stabilises). This is the only dedup
      // that actually prevents the React "two children with the same key, sf-0"
      // console error.
      const seenIds = new Set<string>()
      let uniqueItems = items.filter((item, idx, arr) => {
        if (seenIds.has(item.id)) return false
        seenIds.add(item.id)
        // Also dedupe by position+size as before (same element scanned twice)
        return idx === arr.findIndex(i => i.x === item.x && i.y === item.y && i.width === item.width && i.height === item.height)
      })

      // Sort by area descending (largest first) so we can detect containment
      uniqueItems.sort((a, b) => (b.width * b.height) - (a.width * a.height))

      // Remove overlays that are fully contained within a larger overlay of the
      // SAME type (e.g., a text span inside a text div — both would select the
      // same text, causing confusion). Keep the larger one.
      // BUT: if the child text has a DIFFERENT color than the parent (e.g., an
      // accent-colored "5分钟" inside a normal-colored sentence), keep the child
      // as a separately selectable element. The parent's overlay is still kept
      // so the whole sentence can be selected — clicking the child area selects
      // the child (more specific), clicking elsewhere selects the parent.
      const finalItems: OverlayItem[] = []
      for (const item of uniqueItems) {
        if (item.type === "text") {
          // Check if this text item is fully contained within an already-accepted text item
          const containingParent = finalItems.find(accepted =>
            accepted.type === "text" &&
            item.x >= accepted.x - 1 && item.y >= accepted.y - 1 &&
            item.x + item.width <= accepted.x + accepted.width + 1 &&
            item.y + item.height <= accepted.y + accepted.height + 1
          )
          if (containingParent) {
            // The parent needs to be SUBSTANTIALLY larger than the child
            // (≥1.4× on each axis) before we treat the child as a
            // "subset text". Without this guard, two adjacent paragraphs
            // of similar size but the same text colour (which is the
            // common case in AI-generated HTML — most text doesn't
            // override `color`, so it inherits and computes to the same
            // RGB) get collapsed into a single layer.
            const wRatio = containingParent.width / Math.max(1, item.width)
            const hRatio = containingParent.height / Math.max(1, item.height)
            const parentIsSubstantiallyLarger = wRatio >= 1.4 && hRatio >= 1.4
            if (!parentIsSubstantiallyLarger) {
              // Same size / near-same size → they're peers, not
              // parent/child. Keep both.
              finalItems.push(item)
              continue
            }
            // If the child has a different color than the parent, keep it as a
            // separately selectable element (e.g., accent-colored numbers/keywords)
            const parentColor = containingParent.computedStyle?.color
            const childColor = item.computedStyle?.color
            if (parentColor && childColor && parentColor !== childColor) {
              // Keep the child — it has a distinct style
            } else {
              // Same color + parent substantially larger → skip the child
              continue
            }
          }
        }
        finalItems.push(item)
      }

      setOverlays(finalItems)
      // Notify parent of the iframe body's actual rendered size. This lets
      // the editor adopt the same resolution the user sees when opening
      // the file in a browser, even if the import-time static detector
      // (Tailwind class match, inline style match) missed the size. We
      // only fire when the measured size differs meaningfully from what
      // the parent thinks the size is, to avoid an infinite re-render
      // loop (setSlideSize → re-render → handleLoad → measure → setSlideSize).
      if (onSizeMeasured) {
        const measuredW = Math.round(bodyRect.width)
        const measuredH = Math.round(bodyRect.height)
        if (
          Math.abs(measuredW - width) > 2 ||
          Math.abs(measuredH - height) > 2
        ) {
          // Defer one tick so we're not calling setState during the
          // document parsing we're inside of.
          setTimeout(() => onSizeMeasured(measuredW, measuredH), 0)
        }
      }
      // Notify parent to store elements in the slide for Layers/PropertyPanel
      if (onOverlaysUpdate) {
        onOverlaysUpdate(finalItems.map(item => ({
          id: item.id, x: item.x, y: item.y, width: item.width, height: item.height,
          label: item.label, type: item.type,
          computedStyle: item.computedStyle,
        })))
      }

      // ---- Sync changes back ----
      // For drag/resize: called after the operation completes.
      // For text editing: called on blur (NOT on every input — that would
      // reload the iframe and lose the cursor).
      const syncChanges = () => {
        // Remove selection styles before capturing HTML
        doc.querySelectorAll(".sf-selected").forEach(el => el.classList.remove("sf-selected"))
        // Keep data-sf-id attributes — they're needed for overlay interaction
        const newHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML
        lastHtml.current = newHtml
        onTextChange(newHtml)
      }

      // For text editing: DON'T call syncChanges on every input.
      // The text is already visible in the iframe (it's contentEditable).
      // We only sync on blur to save the final state.
      // The input event listener is NOT added here — sync happens on blur.

      // Push history on focus (before editing starts)
      doc.addEventListener("focusin", () => {
        if (onTextBlur) onTextBlur()
      }, true)

      // Prevent navigation clicks
      doc.addEventListener("click", (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === "A") e.preventDefault()
      })

      // ---- Store syncChanges and doc/win for overlay event handlers ----
      ;(iframeRef.current as any)._sfSync = syncChanges
      ;(iframeRef.current as any)._sfDoc = doc
      ;(iframeRef.current as any)._sfWin = win

    } catch (e) {
      // Cross-origin or other error — ignore
    }
  }

  // ---- Overlay event handlers (rendered in React, outside the iframe) ----

  // Handle overlay click: select
  function handleOverlayClick(e: React.MouseEvent, item: OverlayItem) {
    e.stopPropagation()
    setSelectedOverlay(item.id)
    // Select in store so PropertyPanel shows properties
    useEditor.getState().setSelected([item.id])
    // Don't add .sf-selected to iframe elements — the overlay border is enough.
    // Adding it to iframe elements causes a second visible box.
  }

  // Handle overlay drag: move element
  function handleOverlayMouseDown(e: React.MouseEvent, item: OverlayItem) {
    if (e.button !== 0) return
    e.preventDefault()
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = (iframe as any)._sfDoc as Document
    const win = (iframe as any)._sfWin as Window
    const syncChanges = (iframe as any)._sfSync as () => void
    if (!doc || !win || !syncChanges) return

    const el = doc.querySelector(`[data-sf-id="${item.id}"]`) as HTMLElement
    if (!el) return

    // Use the OVERLAY's stored position as the baseline (canvas coordinates)
    const currentX = item.x
    const currentY = item.y
    const currentW = item.width
    const currentH = item.height

    // Capture the element's existing transform at drag start. The drag delta
    // is ADDED to this — not replaced — so multiple consecutive drags
    // accumulate correctly. (Replacing would lose the previous drag's offset.)
    const existingTransform = el.style.transform || ""
    const tMatch = existingTransform.match(/translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)/)
    const startTx = tMatch ? parseFloat(tMatch[1]) : 0
    const startTy = tMatch ? parseFloat(tMatch[2]) : 0

    const startX = e.clientX
    const startY = e.clientY
    let isDragging = false
    const dragThreshold = 5

    const onMove = (ev: PointerEvent) => {
      let dx = (ev.clientX - startX) / zoom
      let dy = (ev.clientY - startY) / zoom

      if (!isDragging) {
        if (Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return
        isDragging = true
        // Use transform for movement — this doesn't change the element's
        // positioning model and avoids offsetParent issues. The element
        // stays in its original CSS position and is visually shifted.
      }

      let newLeft = currentX + dx
      let newTop = currentY + dy

      // Snap to alignment guides
      const snapThreshold = 8
      const snapGuides: { axis: "x" | "y"; pos: number }[] = []
      overlays.forEach(o => {
        if (o.id === item.id) return
        snapGuides.push({ axis: "x", pos: o.x + o.width / 2 })
        snapGuides.push({ axis: "x", pos: o.x })
        snapGuides.push({ axis: "x", pos: o.x + o.width })
        snapGuides.push({ axis: "y", pos: o.y + o.height / 2 })
        snapGuides.push({ axis: "y", pos: o.y })
        snapGuides.push({ axis: "y", pos: o.y + o.height })
      })
      snapGuides.push({ axis: "x", pos: CANVAS_WIDTH / 2 })
      snapGuides.push({ axis: "y", pos: CANVAS_HEIGHT / 2 })

      // X snap
      const activeSnaps: { axis: "x" | "y"; pos: number }[] = []
      const myXPoints = [newLeft, newLeft + currentW / 2, newLeft + currentW]
      for (const xp of myXPoints) {
        for (const g of snapGuides) {
          if (g.axis === "x" && Math.abs(xp - g.pos) < snapThreshold) {
            if (xp === newLeft) dx = g.pos - currentX
            else if (xp === newLeft + currentW / 2) dx = g.pos - currentX - currentW / 2
            else dx = g.pos - currentX - currentW
            activeSnaps.push({ axis: "x", pos: g.pos })
            break
          }
        }
      }
      newLeft = currentX + dx

      // Y snap
      const myYPoints = [newTop, newTop + currentH / 2, newTop + currentH]
      for (const yp of myYPoints) {
        for (const g of snapGuides) {
          if (g.axis === "y" && Math.abs(yp - g.pos) < snapThreshold) {
            if (yp === newTop) dy = g.pos - currentY
            else if (yp === newTop + currentH / 2) dy = g.pos - currentY - currentH / 2
            else dy = g.pos - currentY - currentH
            activeSnaps.push({ axis: "y", pos: g.pos })
            break
          }
        }
      }
      newTop = currentY + dy

      // Update snap guide lines for visual feedback
      setSnapLines(activeSnaps)

      // Use transform to move the element — this preserves the original
      // CSS positioning and doesn't cause content to shift outside the box.
      // The element stays in its original position and is visually translated.
      // Add the drag delta to the transform captured at drag start so that
      // consecutive drags accumulate correctly.
      el.style.transform = `translate(${startTx + dx}px, ${startTy + dy}px)`

      // Update overlay position
      setOverlays(prev => prev.map(o =>
        o.id === item.id ? { ...o, x: newLeft, y: newTop } : o
      ))
    }

    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      window.removeEventListener("blur", onUp)
      setSnapLines([]) // Clear snap guide lines
      if (isDragging) {
        // Keep the transform as-is — it's already in canvas coordinates.
        // Don't convert to absolute position (that causes offsetParent
        // and coordinate system mismatches).
        // The transform persists and the element stays at its visual position.
        syncChanges()
        if (onTextBlur) onTextBlur()
      }
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    window.addEventListener("blur", onUp)
  }

  // Handle overlay double-click: edit text
  function handleOverlayDoubleClick(e: React.MouseEvent, item: OverlayItem) {
    e.stopPropagation()
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = (iframe as any)._sfDoc as Document
    if (!doc) return
    const el = doc.querySelector(`[data-sf-id="${item.id}"]`) as HTMLElement
    if (!el) return
    el.setAttribute("contenteditable", "true")
    el.focus()
    // Place cursor at end
    const sel = iframe.contentWindow?.getSelection()
    if (sel) {
      const range = doc.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    // Enable iframe pointer events so text editing works
    setTextEditingId(item.id)
    // Add blur listener to exit text editing mode. Guard against the
    // double-bind case: if the user double-clicks the same overlay
    // twice in a row (or the iframe's previous focus fires blur and
    // we re-enter), `el` may be the same DOM node and the listener
    // would fire twice. Without this guard, `onTextChange` is called
    // twice → two history snapshots, two rawHtml writes.
    if (!(el as any)._sfBlurBound) {
      ;(el as any)._sfBlurBound = true
      el.addEventListener(
        "blur",
        () => {
          ;(el as any)._sfBlurBound = false
          // Remove contenteditable first
          el.removeAttribute("contenteditable")
          setTextEditingId(null)
          // Now sync the changes to rawHtml
          const iframe2 = iframeRef.current
          if (!iframe2) return
          const doc2 = (iframe2 as any)._sfDoc as Document
          if (!doc2) return
          // Capture the updated HTML (with new text)
          const newHtml = "<!DOCTYPE html>\n" + doc2.documentElement.outerHTML
          lastHtml.current = newHtml
          onTextChange(newHtml)
          if (onTextBlur) onTextBlur()
        },
        { once: true },
      )
    }
  }

  // Handle resize handle drag
  function handleResizeMouseDown(e: React.MouseEvent, item: OverlayItem, dir: string) {
    e.preventDefault()
    e.stopPropagation()
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = (iframe as any)._sfDoc as Document
    const win = (iframe as any)._sfWin as Window
    const syncChanges = (iframe as any)._sfSync as () => void
    if (!doc || !win || !syncChanges) return

    const el = doc.querySelector(`[data-sf-id="${item.id}"]`) as HTMLElement
    if (!el) return

    // Use overlay's stored position (canvas coordinates) as baseline
    const currentX = item.x
    const currentY = item.y
    const currentW = item.width
    const currentH = item.height

    // Capture the element's existing transform at resize start (same pattern
    // as the drag handler — add to it, don't replace it).
    const existingTransform = el.style.transform || ""
    const tMatch = existingTransform.match(/translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)/)
    const startTx = tMatch ? parseFloat(tMatch[1]) : 0
    const startTy = tMatch ? parseFloat(tMatch[2]) : 0

    const startX = e.clientX
    const startY = e.clientY

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      let newW = currentW, newH = currentH

      // Compute new dimensions based on which edge is being dragged.
      // e/s: grow from left/top edge (position stays).
      // w/n: grow from right/bottom edge (position shifts to keep opposite edge fixed).
      if (dir.includes("e")) newW = Math.max(20, currentW + dx)
      if (dir.includes("s")) newH = Math.max(20, currentH + dy)
      if (dir.includes("w")) newW = Math.max(20, currentW - dx)
      if (dir.includes("n")) newH = Math.max(20, currentH - dy)

      // Apply size changes directly (width/height don't have offsetParent issues)
      el.style.width = newW + "px"
      el.style.height = newH + "px"

      // For w/n: shift the element so the opposite (right/bottom) edge stays
      // fixed. The shift = how much the width/height decreased.
      // Use transform (added to the start-of-resize transform) to avoid
      // offsetParent coordinate-system mismatches.
      const shiftX = dir.includes("w") ? (currentW - newW) : 0
      const shiftY = dir.includes("n") ? (currentH - newH) : 0
      el.style.transform = `translate(${startTx + shiftX}px, ${startTy + shiftY}px)`

      // Update overlay position to match the visual position
      let newL = currentX, newT = currentY
      if (dir.includes("w")) newL = currentX + shiftX
      if (dir.includes("n")) newT = currentY + shiftY
      setOverlays(prev => prev.map(o =>
        o.id === item.id ? { ...o, x: newL, y: newT, width: newW, height: newH } : o
      ))
    }

    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      window.removeEventListener("blur", onUp)
      // Keep transform — don't convert to absolute (avoids coordinate mismatch)
      syncChanges()
      if (onTextBlur) onTextBlur()
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    window.addEventListener("blur", onUp)
  }

  return (
    <>
      {/* The iframe — visual display + text editing */}
      <iframe
        ref={iframeRef}
        className="absolute top-0 left-0 border-none"
        style={{
          // P2-6: per-slide canvas dimensions (1280×720 default, larger for
          // imported AI decks that declare bigger layouts).
          width,
          height,
          pointerEvents: textEditingId === null ? "none" : "auto",
        }}
        srcDoc={html}
        sandbox="allow-same-origin allow-scripts"
        title="Slide editor"
        onLoad={handleLoad}
      />
      {/* Transparent overlay elements — handle selection, drag, resize */}
      {overlays.map((item) => (
        <div
          key={item.id}
          data-overlay-id={item.id}
          onMouseDown={(e) => handleOverlayMouseDown(e, item)}
          onClick={(e) => handleOverlayClick(e, item)}
          onDoubleClick={(e) => handleOverlayDoubleClick(e, item)}
          className="absolute cursor-move"
          style={{
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            background: "transparent",
            border: selectedOverlay === item.id ? "2px solid #6366f1" : "1px dashed transparent",
            // Shallower (less nested) elements get HIGHER z-index so the
            // outer container of a nested stack is selectable. Without this,
            // the deepest nested overlay always wins the click race and
            // "outer" elements become unclickable.
            zIndex: 100 + Math.max(0, 20 - item.depth),
          }}
          title={item.label}
        >
          {/* Label badge */}
          {selectedOverlay === item.id && (
            <div className="absolute -top-5 left-0 text-[10px] font-mono bg-indigo-500 text-white px-1.5 py-0.5 rounded pointer-events-none max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
              {item.label}
            </div>
          )}
          {/* Resize handles */}
          {selectedOverlay === item.id && [
            "se", "sw", "ne", "nw", "e", "w", "n", "s"
          ].map(dir => (
            <div
              key={dir}
              onMouseDown={(e) => handleResizeMouseDown(e, item, dir)}
              className="absolute w-2.5 h-2.5 bg-white border border-indigo-500 rounded-sm z-10"
              style={{
                cursor: `${dir}-resize`,
                ...(dir.includes("e") ? { right: "-5px" } : {}),
                ...(dir.includes("w") ? { left: "-5px" } : {}),
                ...(dir.includes("s") ? { bottom: "-5px" } : {}),
                ...(dir.includes("n") ? { top: "-5px" } : {}),
                ...((dir === "e" || dir === "w") ? { top: "50%", marginTop: "-5px" } : {}),
                ...((dir === "n" || dir === "s") ? { left: "50%", marginLeft: "-5px" } : {}),
              }}
            />
          ))}
        </div>
      ))}
      {/* Snap alignment guide lines — shown during drag */}
      {snapLines.map((line, i) => (
        <div
          key={`snap-${i}`}
          className="absolute pointer-events-none"
          style={
            line.axis === "x"
              ? { left: line.pos, top: 0, width: 1, height: "100%", background: "#ec4899", zIndex: 200 }
              : { top: line.pos, left: 0, height: 1, width: "100%", background: "#ec4899", zIndex: 200 }
          }
        />
      ))}
    </>
  )
}
