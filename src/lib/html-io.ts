import type { EditorElement, Slide, TextElement, ShapeElement, ImageElement, ContainerElement } from "@/types/editor"
import { createTextElement, createShapeElement, createImageElement, createContainerElement } from "@/store/editor-store"

// Monotonic counter + timestamp prefix makes collisions vanishingly unlikely
// even when many IDs are generated in a single tick (the previous
// Math.random().toString(36).slice(2) collided under bulk-import load and
// surfaced as React duplicate-key warnings on LayersPanel / Canvas /
// PresentationMode).
let __sfIdCounter = 0
function uniqueId(prefix = "sf"): string {
  __sfIdCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${__sfIdCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Parse AI-generated HTML slide content into editor elements.
 * Accepts either:
 *   - A full HTML document
 *   - A slide fragment (e.g., one <section class="slide">...</section>)
 *   - Multiple slides separated by <section> tags
 *
 * Strategy:
 *  - Each top-level slide is one slide (if multiple <section> found, split)
 *  - Within a slide, walk the DOM. For each positioned element:
 *    - <img>  -> image element
 *    - text-bearing element (h1..h6, p, span, li, label, button, a) -> text element
 *    - other element with visible bg/border/shadow -> shape element
 *    - container with positioned children -> create shape (if visible) THEN recurse
 */
export function parseHtmlToSlides(html: string): Slide[] {
  if (typeof window === "undefined") return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Apply <style> blocks from the HTML
  applyStyleBlocks(doc, html)

  // Find slide sections using multiple strategies.
  // Substring `slide` matching is too greedy ("ppt-slide", "swiper-slide", etc.
  // would be treated as slide wrappers), so use the exact-token matcher.
  let sections = matchSlideSections(doc)
  // Filter nested elements (avoid duplicates when both outer and inner containers match)
  if (sections.length > 0) {
    sections = filterNestedElements(sections)
  }

  // If no slide sections found, try <section> elements
  if (sections.length === 0) {
    sections = Array.from(doc.querySelectorAll("section"))
    if (sections.length > 0) sections = filterNestedElements(sections)
  }

  // If still no sections, try <article> elements
  if (sections.length === 0) {
    sections = Array.from(doc.querySelectorAll("article"))
  }

  // If still no sections, treat the body as a single slide
  if (sections.length === 0) {
    const body = doc.body
    if (body.children.length > 0) {
      sections = [body]
    } else {
      return []
    }
  }

  return sections.map((section, idx) => parseSlideSection(section, idx))
}

/**
 * Parse HTML into slides using RAW HTML mode — 100% visual fidelity.
 *
 * Instead of decomposing the HTML into editable elements (which loses CSS
 * inheritance, flexbox layout, pseudo-elements, CSS variables, etc.), this
 * mode extracts each slide section's outer HTML + all <style> blocks and
 * stores them as `rawHtml` on the Slide. The canvas renders the slide in an
 * iframe, showing the exact original appearance with zero parsing artifacts.
 */
export function parseHtmlToRawSlides(html: string): Slide[] {
  if (typeof window === "undefined") return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Extract ALL <style> blocks verbatim — keep original CSS with :root vars
  const styleBlocks = Array.from(doc.querySelectorAll("style"))
    .map((s) => s.outerHTML)
    .join("\n")

  // Collect external <script> tags (e.g. Tailwind CDN, GLM artifact proxy).
  // These are critical for decks that rely on utility-class frameworks
  // (Tailwind, UnoCSS, Windi CSS). Many AI-generated decks serve these
  // scripts through artifact CDN proxies (e.g. artifacts-cdn.chatglm.site)
  // that wrap/modify the original script. The proxied versions can inject
  // globals or reference DOM elements that only exist in the original
  // viewer context, causing runtime errors like "slide is not defined".
  //
  // To avoid this, we rewrite artifact CDN URLs to their original source.
  // Pattern: https://artifacts-cdn.chatglm.site/https://cdn.tailwindcss.com
  //         → https://cdn.tailwindcss.com
  const scriptTags = Array.from(doc.querySelectorAll("script[src]"))
    .map((s) => {
      const src = s.getAttribute("src") || ""
      const unproxied = unwrapArtifactCdnUrl(src)
      if (unproxied) return `<script src="${escapeHtmlAttr(unproxied)}"></script>`
      return s.outerHTML
    })
    .join("\n")

  // Also rewrite artifact-CDN-proxied <link> hrefs (fonts, stylesheets).
  const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => {
      const href = l.getAttribute("href") || ""
      const unproxied = unwrapArtifactCdnUrl(href)
      if (unproxied) return `<link rel="stylesheet" href="${escapeHtmlAttr(unproxied)}">`
      return l.outerHTML
    })
    .join("\n")

  // Find slide sections (reuse the same detection logic).
  // Use exact `.slide` class match (not substring) so that "ppt-slide",
  // "current-slide", etc. don't get caught up.
  let sections = matchSlideSections(doc)
  if (sections.length > 0) sections = filterNestedElements(sections)
  if (sections.length === 0) {
    sections = Array.from(doc.querySelectorAll("section"))
    if (sections.length > 0) sections = filterNestedElements(sections)
  }
  if (sections.length === 0) sections = Array.from(doc.querySelectorAll("article"))
  if (sections.length === 0) {
    if (doc.body && doc.body.children.length > 0) sections = [doc.body]
    else return []
  }

  // ALSO parse elements via Smart mode — these provide:
  //   1. Layers panel entries (so the left panel isn't empty)
  //   2. Editable overlay elements (for text editing, moving, resizing)
  // The iframe provides 100% visual fidelity; the overlay elements
  // provide editability. Elements are rendered as transparent overlays
  // on top of the iframe.
  const smartSlides = parseHtmlToSlides(html)

  return sections.map((section, idx) => {
    const sectionHtml = section.outerHTML
    const title = section.getAttribute("data-title") || `Slide ${idx + 1}`
    const notes = section.getAttribute("data-notes") || undefined

    // Detect intended background colour so the editor canvas outside the
    // slide frame matches the slide visually. Priority:
    //   1. data-bg attribute
    //   2. inline style="background: <color>" on the section
    //   3. any explicit background-image on the section
    //   4. fall back to neutral paper colour
    const detectedBg = detectSlideBackground(section) || "#FAF9F6"

    // Detect the slide's natural rendered size. Z.ai / GLM artifacts and
    // similar decks frequently exceed the 16:9 1280×720 canvas (e.g. dense
    // layouts at 1280×900, 1280×1200). When the imported slide declares a
    // larger size we propagate it so the canvas does not clip the body.
    const slideSize = detectSlideSize(section, doc)

    // Build a complete, self-contained HTML document for the iframe.
    // The wrapper is intentionally light: it sets the chrome (margins, font
    // fallback) but does NOT impose width/height on the slide itself — many
    // imported decks (e.g. tailwind-generated "ppt-slide" decks) rely on
    // their own responsive sizing. The canvas <iframe> sizes itself to
    // match the rendered slide (see slide/raw-mode iframe wrapper).
    //
    // CRITICAL: many carousel-style decks use a single CSS rule like
    //   .slide { visibility: hidden; opacity: 0 }
    //   .slide.active, .slide.visible { visibility: visible; opacity: 1 }
    // to drive a single-screen presentation. When we extract ONE section
    // into its own iframe, that section's class usually doesn't include
    // "active" or "visible" (only slide 1 does, in the original doc), so
    // the section renders as fully transparent and the iframe shows
    // nothing — making slides 2-N look broken. We inject a scoped
    // override that forces visibility on whichever element the author
    // marked as a slide container. This is a no-op for slides that the
    // author did mark as visible.

    // Clean the section HTML: remove layout-conflicting inline scripts
    // (scaleSlide / AutoFit helpers that adjust body height and overflow
    // for standalone viewer mode). These scripts are harmless no-ops in
    // the viewer but actively break the editor's iframe layout by setting
    // body.style.height, overflow: hidden, etc.
    const cleanedSectionHtml = cleanSlideScripts(sectionHtml)

    // Classify the section so the override targets the right element. The
    // slide's outermost tag may not be <section> — e.g. it could be a
    // <div class="slide"> or <article data-slide>. Find the element
    // matching the section so the override applies.
    const sectionTag = section.tagName.toLowerCase()
    const sectionClass = section.getAttribute("class") || ""

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280, initial-scale=1.0">
${linkTags}
${scriptTags}
${styleBlocks}
<style>
  html, body { margin: 0; padding: 0; background: ${escapeForCssValue(detectedBg)}; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Songti SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif; }
  body { min-height: 100%; overflow: visible; }
  /* Force the slide section itself visible + displayed.
     Only override display:none on the SECTION — don't touch children's
     display values (they may use flex/grid/absolute for layout). */
  ${sectionTag}${sectionClass ? "." + sectionClass.split(/\s+/).filter(Boolean).join(".") : ""} {
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
    pointer-events: auto !important;
  }
  /* Force reveal/animation-gated elements visible — opacity + transform only.
     Do NOT override display here (would break flex/grid layout). */
  .reveal, .bar, .animate-in, [data-animate], .step,
  .fade-in, .slide-up, .slide-down, .slide-left, .slide-right,
  .zoom-in, .bounce-in, .flip-in, .roll-in, .rotate-in,
  .aos-init, .aos-animate, [data-aos],
  .scroll-animate, .scroll-reveal, .scroll-fade,
  .stagger, .stagger-in,
  .anim, .animated, .animation,
  [data-scroll], [data-animation],
  .page-content, .slide-content {
    opacity: 1 !important;
    transform: none !important;
    visibility: visible !important;
    clip-path: none !important;
    filter: none !important;
  }
  /* Force visibility on ALL descendants — but ONLY visibility, NOT display.
     This catches visibility:hidden without breaking layout (flex/grid/absolute). */
  ${sectionTag}, ${sectionTag} * {
    visibility: visible !important;
  }
  /* Keep utility elements hidden */
  .skip-link, .deck-controls, [aria-hidden="true"] {
    display: none !important;
  }
</style>
</head>
<body>
${cleanedSectionHtml}
</body>
</html>`

    return {
      id: uniqueId("slide"),
      name: title,
      background: detectedBg,
      // Per-slide canvas dimensions (so slides taller than 720px aren't clipped)
      width: slideSize.width,
      height: slideSize.height,
      // Use Smart-mode parsed elements for layers panel and editing overlay
      elements: smartSlides[idx]?.elements || [],
      rawHtml: fullHtml,
      notes,
    } as Slide
  })
}

/**
 * Detect the natural rendered width × height of a slide container.
 *
 * Detection priority (first match wins):
 *  1. `data-width` / `data-height` attributes on the section
 *  2. Tailwind `w-[NNNpx]` / `h-[NNNpx]` classes
 *  3. Inline `style="width: NNNpx"` / `style="height: NNNpx"`
 *  4. CSS rules in `<style>` blocks targeting common slide/stage selectors
 *     (`.slide`, `.deck-stage`, `.ppt-slide`, etc.). This is essential for
 *     decks that define the stage size in a stylesheet rather than inline —
 *     e.g. the attached test file uses `.deck-stage { width: 1920px;
 *     height: 1080px }` and `.slide { width: 1920px; height: 1080px }` in
 *     a `<style>` block, with NO inline size on the section. Without this
 *     step the slide fell back to 1280×720 and clipped all content.
 *
 * Falls back to 1280×720.
 */
function detectSlideSize(el: Element, doc?: Document): { width: number; height: number } {
  const out = { width: 1280, height: 720 }
  const dw = el.getAttribute("data-width")
  const dh = el.getAttribute("data-height")
  if (dw) {
    const n = parseInt(dw, 10)
    if (!isNaN(n) && n > 0) out.width = n
  }
  if (dh) {
    const n = parseInt(dh, 10)
    if (!isNaN(n) && n > 0) out.height = n
  }
  const cls = el.getAttribute("class") || ""
  const wClass = cls.match(/\bw-\[(\d+)px\]/)
  if (wClass) out.width = parseInt(wClass[1], 10)
  const hClass = cls.match(/\bh-\[(\d+)px\]/)
  if (hClass) out.height = parseInt(hClass[1], 10)
  const inline = el.getAttribute("style") || ""
  const wStyle = inline.match(/\bwidth\s*:\s*(\d+)px/i)
  if (wStyle) out.width = parseInt(wStyle[1], 10)
  const hStyle = inline.match(/\bheight\s*:\s*(\d+)px/i)
  if (hStyle) out.height = parseInt(hStyle[1], 10)

  // Step 4: scan <style> blocks for rules targeting common slide/stage
  // selectors. Many AI-generated decks (and the attached test file) define
  // the stage size in a stylesheet, not inline on the element.
  if (doc) {
    const fromCss = detectSlideSizeFromStyles(doc)
    // Only adopt the CSS-detected size if it's LARGER than what we have —
    // a deck that explicitly says 1920×1080 should never be shrunk back to
    // 1280×720 by a default.
    if (fromCss.width > out.width) out.width = fromCss.width
    if (fromCss.height > out.height) out.height = fromCss.height
  }
  return out
}

/**
 * Scan all `<style>` blocks in the document for CSS rules that set an
 * explicit pixel width/height on common slide-stage selectors. Returns the
 * largest width and height found (so a 1920×1080 declaration wins over the
 * 1280×720 default).
 *
 * Selectors considered (in roughly decreasing specificity):
 *   .deck-stage, .slide-stage, .slide-container, .slide-page,
 *   .ppt-slide, .pptx-slide, .deck-slide, .slide
 *
 * We deliberately do NOT use a full CSS parser — the corpus is small and
 * predictable, and a regex over `selector { ... width: NNNpx; height:
 * NNNpx ... }` is robust enough for AI-generated decks.
 */
function detectSlideSizeFromStyles(doc: Document): { width: number; height: number } {
  const out = { width: 0, height: 0 }
  const selectors = [
    ".deck-stage", ".slide-stage", ".slide-container", ".slide-page",
    ".ppt-slide", ".pptx-slide", ".deck-slide", ".slide",
  ]
  // Build one combined selector alternation. Escape dots for regex.
  const selRe = selectors.map((s) => s.replace(/\./g, "\\.")).join("|")
  const styleEls = Array.from(doc.querySelectorAll("style"))
  for (const styleEl of styleEls) {
    const text = styleEl.textContent || ""
    // Match: <selector> { ... width: 1920px ... height: 1080px ... }
    // The rule block may span multiple lines.
    const ruleRe = new RegExp(
      "(?:" + selRe + ")\\s*\\{([^}]*)\\}",
      "gi",
    )
    let m: RegExpExecArray | null
    while ((m = ruleRe.exec(text)) !== null) {
      const block = m[1]
      const wMatch = block.match(/\bwidth\s*:\s*(\d+)\s*px/i)
      const hMatch = block.match(/\bheight\s*:\s*(\d+)\s*px/i)
      if (wMatch) {
        const w = parseInt(wMatch[1], 10)
        if (!isNaN(w) && w > out.width) out.width = w
      }
      if (hMatch) {
        const h = parseInt(hMatch[1], 10)
        if (!isNaN(h) && h > out.height) out.height = h
      }
    }
  }
  return out
}

/**
 * Match slide containers by exact `.slide` class (or the standard plural
 * variants the existing corpus uses). Substring matching would also pick up
 * `ppt-slide`, `swiper-slide`, `carousel-slide`, etc., which would otherwise
 * wrap the wrong element when the deck uses those classes for layout.
 */
function matchSlideSections(doc: Document): Element[] {
  const allowedClassTokens = new Set([
    "slide",
    "slide-section",
    "slide-stage",
    "slide-container",
    "slide-page",
    "ppt-slide",
    "pptx-slide",
    "deck-slide",
  ])
  const isAllowed = (el: Element): boolean => {
    const cls = el.getAttribute("class") || ""
    return cls
      .split(/\s+/)
      .filter(Boolean)
      .some((tok) => allowedClassTokens.has(tok)) || el.hasAttribute("data-slide")
  }
  // Prefer explicit section elements, fall back to divs with slide-like class
  const out: Element[] = []
  for (const el of Array.from(doc.querySelectorAll("section, div"))) {
    if (isAllowed(el)) out.push(el)
  }
  return out
}

/**
 * Remove layout-conflicting scripts from a slide's HTML.
 *
 * Many AI-generated slide decks include inline JavaScript that adjusts the
 * slide layout for standalone viewing: setting body height, overflow, and
 * applying CSS transforms to fit content within a 720px viewport. These
 * scripts are necessary in the original viewer (index.html + iframe) but
 * actively break the editor's layout because:
 *
 *   - They set body.style.height = 720px + overflow: hidden, clipping content.
 *   - They apply content.style.transform = scale(...), distorting elements.
 *   - They call window.addEventListener("resize", ...) repeatedly.
 *
 * This function strips those scripts while preserving harmless ones
 * (event handlers, data scripts, etc.).
 */
function cleanSlideScripts(sectionHtml: string): string {
  // Regex that matches <script>...</script> blocks containing known
  // layout-adjustment patterns. We match the ENTIRE script block so
  // it's fully removed.
  const layoutScriptPatterns = [
    /MAX_H\s*=\s*\d+/,          // var MAX_H = 720
    /\bscaleSlide\b/,            // function scaleSlide()
    /\bAutoFit\b/,               // AutoFit layout adjuster
    /\.style\.height\s*=\s*MAX_H/, // slide.style.height = MAX_H
    /\.style\.setProperty\(['"]height['"]/, // style.setProperty('height', ...)
    /\.style\.overflow\s*=/,     // style.overflow = 'hidden'
    /content\.style\.transform\s*=/, // content.style.transform = 'scale(...)'
    /document\.body\.style\.(height|overflow)/, // body.style.height/overflow
    /\bslide\.style\.(height|overflow)\b/, // direct slide style manipulation
  ]

  // Remove <script> blocks that match any of the layout patterns
  const cleaned = sectionHtml.replace(
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
    (match, content) => {
      for (const pattern of layoutScriptPatterns) {
        if (pattern.test(content)) {
          return "" // Remove this script block entirely
        }
      }
      return match // Keep harmless scripts
    },
  )

  return cleaned
}

/** Best-effort background colour/image detection for a slide container. */
function detectSlideBackground(el: Element): string | null {
  const ds = el.getAttribute("data-bg")
  if (ds) return ds
  // Check inline style first (most common in generated decks)
  const inlineStyle = el.getAttribute("style") || ""
  // background: <color>
  const bgColorMatch = inlineStyle.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/i)
  if (bgColorMatch) return bgColorMatch[1]
  // background: linear-gradient(...) — preserve the whole declaration so
  // gradients stay intact (it's a valid CSS shorthand)
  const gradientMatch = inlineStyle.match(/background\s*:\s*([^;]+)/i)
  if (gradientMatch) return gradientMatch[1].trim()
  return null
}

function escapeForCssValue(value) {
  if (value == null) return "#FAF9F6"
  // Strip newlines + quotes that would break the inline style value
  return String(value).replace(/[\n\r"\\]/g, function (m) {
    if (m === "\n" || m === "\r") return " "
    if (m === '"') return '\\"'
    if (m === "\\") return "\\\\"
    return m
  })
}

/**
 * Unwrap an artifact CDN proxy URL to the original source.
 *
 * Many AI-generated slide decks serve external resources (Tailwind CDN,
 * Google Fonts, Material Icons) through artifact CDN proxies such as
 * `artifacts-cdn.chatglm.site`. These proxies wrap the original script
 * and may inject globals (e.g. a `slide` variable) or other modifications
 * that only work in the original viewer context. Using the proxied
 * versions in our iframe causes runtime errors ("slide is not defined")
 * and layout failures.
 *
 * This function extracts the original URL from the proxy wrapper.
 *
 * Examples:
 *   artifacts-cdn.chatglm.site/https://cdn.tailwindcss.com
 *     → https://cdn.tailwindcss.com
 *   artifacts-cdn.chatglm.site/https://fonts.googleapis.com/css2?family=...
 *     → https://fonts.googleapis.com/css2?family=...
 */
function unwrapArtifactCdnUrl(url: string): string | null {
  // Match common GLM / ChatGLM artifact CDN patterns
  const patterns = [
    /^https?:\/\/artifacts-cdn\.chatglm\.site\/(https?:\/\/.+)$/i,
    /^https?:\/\/sfile\.chatglm\.cn\/(https?:\/\/.+)$/i,
  ]
  for (const pattern of patterns) {
    const m = url.match(pattern)
    if (m) return m[1]
  }
  return null
}

/** Escape a value for use inside an HTML attribute double-quoted string. */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Filter out elements that are descendants of other matched elements */
function filterNestedElements(elements: Element[]): Element[] {
  const elementSet = new Set(elements)
  return elements.filter((el) => {
    let parent = el.parentElement
    while (parent) {
      if (elementSet.has(parent)) return false
      parent = parent.parentElement
    }
    return true
  })
}

/** Extract <style> blocks and inject into document head */
function applyStyleBlocks(doc: Document, html: string): void {
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
  for (const block of styleBlocks) {
    let css = block.replace(/<\/?style[^>]*>/gi, "")
    if (css.trim()) {
      css = css.replace(/:root\s*\{/g, ":root, .slideforge-parse-container {")
      const styleEl = doc.createElement("style")
      styleEl.textContent = css
      doc.head.appendChild(styleEl)
    }
  }
}

/** Extract @import font URLs from HTML and load them in the current document */
export function loadFontsFromHtml(html: string): void {
  if (typeof document === "undefined") return
  // Find all @import url(...) for fonts
  const importRegex = /@import\s+url\(['"]?(https:\/\/fonts\.googleapis\.com[^'")]*)['"]?\)/gi
  const fontUrls: string[] = []
  let match
  while ((match = importRegex.exec(html)) !== null) {
    fontUrls.push(match[1])
  }
  
  // Also check <link> tags for Google Fonts
  const linkRegex = /<link[^>]*href=['"](https:\/\/fonts\.googleapis\.com[^'"]*)['"][^>]*>/gi
  while ((match = linkRegex.exec(html)) !== null) {
    fontUrls.push(match[1])
  }
  
  // Load each font URL by injecting a <link> tag
  for (const url of fontUrls) {
    // Check if already loaded
    const existing = document.querySelector(`link[href="${url}"]`)
    if (existing) continue
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = url
    document.head.appendChild(link)
  }
}

/**
 * A parsed HTML file from file/folder upload.
 * Each file becomes one or more slides (depending on its content).
 */
/**
 * One uploaded HTML file plus the path information needed to resolve
 * relative references (e.g. `<iframe src="processed/slide_00.html">`).
 */
export interface ParsedFile {
  /** Display name (without extension) */
  name: string
  /** Original filename including extension */
  filename: string
  /**
   * Path relative to the folder the user selected (folder upload), e.g.
   * `知识库构建/index.html` or `processed/slide_00.html`. Empty string when
   * the file was picked individually (single file upload, drag-and-drop,
   * or paste). Used to resolve `src="processed/slide_XX.html"` style
   * references in a viewer file back to the sibling slides the user
   * already uploaded.
   */
  relativePath: string
  /** Raw HTML content */
  content: string
  /** File size in bytes */
  size: number
}

/**
 * Inspect an HTML string and return a list of relative paths it references
 * as iframe / link / script / img sources that look like sibling slide files.
 *
 * Used to detect "viewer" files (e.g. `index.html` that loads sibling
 * `processed/slide_XX.html` via JS) so we can auto-import the referenced
 * slides instead of the viewer wrapper itself.
 *
 * Returns paths like `processed/slide_00.html`. Matching against the
 * caller's uploaded file list is the caller's job (e.g. by suffix or by
 * `relativePath`).
 *
 * Detection patterns:
 *   1. `<iframe src="...">` / `<link rel="..." href="...">` / `<script src="...">`
 *   2. JS string literals like `"processed/slide_" + i + ".html"` — we extract
 *      the static prefix (e.g. `processed/slide_`) and a numeric pattern
 *      so the caller can match all `slide_NN.html` siblings.
 *   3. Data attributes that look like a numeric sequence (slide_0..N).
 */
export function detectViewerSlideReferences(html: string): string[] {
  if (typeof window === "undefined" && typeof DOMParser === "undefined") {
    // Server-side or non-DOM environment — fall back to regex extraction.
    return extractSlidePathsFromHtmlRegex(html)
  }
  const refs = new Set<string>()
  try {
    const doc = new DOMParser().parseFromString(html, "text/html")

    // 1. Static refs in <iframe>, <script src>, <link href>, <img src>
    const staticSelector = 'iframe[src], script[src], link[href], img[src]'
    for (const el of Array.from(doc.querySelectorAll(staticSelector))) {
      const attr = el.getAttribute("src") || el.getAttribute("href")
      if (!attr) continue
      if (looksLikeSlidePath(attr)) refs.add(attr)
    }

    // 2. Inline scripts with templated path: "processed/slide_" + i + ".html"
    const scripts = Array.from(doc.querySelectorAll("script"))
    for (const script of scripts) {
      const text = script.textContent || ""
      // Capture the literal prefix before the first numeric concatenation.
      // IMPORTANT: the separator character (`_` or `-`) is part of the
      // captured group, NOT an optional non-capturing token — otherwise
      // we lose the underscore and the prefix becomes unmatchable against
      // files like `processed/slide_00.html`. Two patterns covered:
      //   - String concat:  "processed/slide_" + i + ".html"
      //   - Template literal: `processed/slide_${i}.html`
      const patterns = [
        /["'`]([^"'`]*?(?:slide|page|section|deck|step)[_-]?)["'`](?:\s*\+\s*|[^"'`]*?\$\{)/gi,
        /["'`]([^"'`]*?(?:slide|page|section|deck|step)[_-]?)["'`]\s*\+\s*[a-zA-Z_$][\w$]*\s*\+\s*["'`]\.html/gi,
      ]
      for (const re of patterns) {
        let m
        while ((m = re.exec(text)) !== null) {
          const prefix = m[1]
          if (prefix && prefix.length >= 3) refs.add(prefix)
        }
      }
    }
  } catch {
    return extractSlidePathsFromHtmlRegex(html)
  }
  return Array.from(refs)
}

function looksLikeSlidePath(p: string): boolean {
  if (!p) return false
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:") || p.startsWith("blob:") || p.startsWith("#")) return false
  if (!/\.html?$/i.test(p)) return false
  // Heuristic: path contains a slide/page/section-like token OR a numbered
  // name like "slide_00" / "page-1" / "section_5".
  return /slide|page|section|deck|step/i.test(p) || /[_-]?\d+/.test(p)
}

function extractSlidePathsFromHtmlRegex(html: string): string[] {
  const refs = new Set<string>()
  // Minimal regex fallback for SSR or non-DOM callers.
  const re = /(?:src|href)\s*=\s*["']([^"']+\.html?)["']/gi
  let m
  while ((m = re.exec(html)) !== null) {
    if (looksLikeSlidePath(m[1])) refs.add(m[1])
  }
  return Array.from(refs)
}

/**
 * Given a list of files (one of which is suspected to be a "viewer" index)
 * and the references the viewer declares, expand the list to the actual
 * slide files. The viewer file is excluded from the returned list (it's
 * not a slide; just a wrapper).
 *
 * Matching strategy:
 *   1. If a file's `relativePath` ends with the same suffix as a reference,
 *      use it directly. This handles the common case where the user
 *      folder-uploads the deck and the viewer's `src="processed/slide_00.html"`
 *      matches the file at `processed/slide_00.html`.
 *   2. If the viewer uses a templated path like `processed/slide_` (no
 *      specific number) and the uploaded files include `processed/slide_NN.html`,
 *      include all matching siblings.
 *   3. If no `relativePath` info is available, fall back to filename suffix
 *      match (works when the viewer and slides share a flat folder).
 *
 * Returns the expanded list, plus a `viewerFilename` field on the
 * result so the caller can show a toast like "Found 42 slides referenced
 * by index.html".
 */
export interface ExpandViewerResult {
  /** Files that are actual slides (no viewer). */
  slides: ParsedFile[]
  /** The viewer's filename, or null if no viewer was detected. */
  viewerFilename: string | null
  /** How the viewer was matched. Useful for debugging / logs. */
  matchMode: "relativePath" | "filename-suffix" | "templated-prefix" | null
  /** Slide info extracted from the viewer (count, path, etc.) */
  viewerSlideInfo: ViewerSlideInfo | null
}

export function expandViewerReferences(
  files: ParsedFile[],
  viewerFile: ParsedFile,
  viewerRefs: string[],
): ExpandViewerResult {
  if (files.length === 0 || viewerRefs.length === 0) {
    return { slides: files, viewerFilename: null, matchMode: null, viewerSlideInfo: null }
  }

  // When files come from a folder upload, their `relativePath` includes the
  // top-level directory name (e.g. "知识库构建/processed/slide_00.html").
  // The viewer's refs are relative to the viewer's own location
  // (e.g. "processed/slide_"). To match correctly, we strip the viewer's
  // directory prefix from all file paths.
  const viewerDir = (() => {
    const rp = viewerFile.relativePath
    if (!rp) return ""
    const idx = rp.lastIndexOf("/")
    return idx >= 0 ? rp.slice(0, idx + 1) : ""
  })()

  function relativeToViewer(file: ParsedFile): string {
    const rp = file.relativePath || file.filename
    if (viewerDir && rp.startsWith(viewerDir)) return rp.slice(viewerDir.length)
    return rp
  }

  // 1. Direct relativePath suffix match
  // 2. Templated-prefix match (e.g. viewer says "processed/slide_" → match any
  //    file whose path relative to viewer endsWith "processed/slide_NN.html")
  // 3. Plain filename match (no relativePath)

  const refsByFile = new Map<string, ParsedFile>()
  const otherFiles = files.filter((f) => f !== viewerFile)

  // If viewer declares static refs like "processed/slide_00.html", try exact match.
  for (const file of otherFiles) {
    const rPath = relativeToViewer(file)
    for (const ref of viewerRefs) {
      if (rPath === ref || rPath.endsWith("/" + ref) || rPath.endsWith(ref)) {
        if (!refsByFile.has(file.filename)) refsByFile.set(file.filename, file)
        break
      }
    }
  }

  if (refsByFile.size > 0) {
    return {
      slides: otherFiles.filter((f) => refsByFile.has(f.filename)),
      viewerFilename: viewerFile.filename,
      matchMode: "relativePath",
      viewerSlideInfo: extractViewerSlideInfo(viewerFile.content),
    }
  }

  // 2. Templated prefix: a ref like "processed/slide_" means any file matching
  //    "processed/slide_<digits>.html" (relative to the viewer file).
  const isTemplated = (r: string) => /[_-]$/.test(r) || r.length < 14
  const templatedRefs = viewerRefs.filter(isTemplated)
  if (templatedRefs.length > 0) {
    const matched = new Set<string>()
    for (const file of otherFiles) {
      const rPath = relativeToViewer(file)
      for (const prefix of templatedRefs) {
        // match: "processed/slide_NN.html" against prefix "processed/slide_"
        if (rPath.startsWith(prefix) && /\.html?$/i.test(rPath)) {
          const tail = rPath.slice(prefix.length)
          // tail should be like "00.html" / "0.html" — purely numeric + ext
          if (/^\d+\.html?$/i.test(tail)) {
            matched.add(file.filename)
            break
          }
        }
      }
    }
    if (matched.size > 0) {
      return {
        slides: otherFiles.filter((f) => matched.has(f.filename)),
        viewerFilename: viewerFile.filename,
        matchMode: "templated-prefix",
        viewerSlideInfo: extractViewerSlideInfo(viewerFile.content),
      }
    }
  }

  // 3. Plain filename match (relativePath empty)
  const matched = new Set<string>()
  for (const file of otherFiles) {
    for (const ref of viewerRefs) {
      const refBasename = ref.split("/").pop() || ref
      if (file.filename === refBasename) {
        matched.add(file.filename)
        break
      }
    }
  }
  if (matched.size > 0) {
    return {
      slides: otherFiles.filter((f) => matched.has(f.filename)),
      viewerFilename: viewerFile.filename,
      matchMode: "filename-suffix",
      viewerSlideInfo: extractViewerSlideInfo(viewerFile.content),
    }
  }

  return { slides: files, viewerFilename: null, matchMode: null, viewerSlideInfo: null }
}

/**
 * Detect whether a file looks like a "viewer" / "deck shell" — a wrapper
 * that loads sibling slides via JS / iframe rather than being a slide
 * itself. Returns true for files named `index.html` / `index.htm` whose
 * body has no real slide content (or whose only purpose is to host an
 * iframe pointing at sibling slides).
 */
export function isLikelyViewerFile(parsed: ParsedFile): boolean {
  const name = parsed.filename.toLowerCase()
  if (name !== "index.html" && name !== "index.htm") return false
  // Heuristic: very small file, references a sibling slide via script.
  if (parsed.content.length > 50_000) return false
  const refs = detectViewerSlideReferences(parsed.content)
  return refs.length > 0
}

/** Information extracted from a viewer/deck-shell HTML. */
export interface ViewerSlideInfo {
  /** Total number of slides referenced by the viewer */
  totalCount: number
  /** The path prefix pattern (e.g. "processed/slide_" for "processed/slide_00.html") */
  pathPrefix: string
  /** Example filename (e.g. "slide_00.html") */
  exampleFilename: string
  /** The full subdirectory path (e.g. "processed/") */
  subdirectory: string
}

/**
 * Parse a viewer HTML to extract deck metadata: how many slides,
 * what path pattern, and what subdirectory the slides live in.
 *
 * Detection strategies (ordered by confidence):
 *   1. Explicit `var total = N` in a script — most reliable
 *   2. `var heights = { 0:720, 1:720, ... }` — count the keys
 *   3. Array/object literal with per-slide data
 *   4. Iframe src pattern with numeric range in JS
 */
export function extractViewerSlideInfo(html: string): ViewerSlideInfo | null {
  let totalCount = 0
  let pathPrefix = ""
  let exampleFilename = ""

  // Strategy 1: `var total = <N>;`
  const totalMatch = html.match(/\bvar\s+total\s*=\s*(\d+)\b/)
  if (totalMatch) {
    totalCount = parseInt(totalMatch[1], 10)
  }

  // Strategy 2: `var heights = { 0:720, 1:720, ..., N:720 }` — count keys
  if (totalCount === 0) {
    const heightsMatch = html.match(/\bheights\s*=\s*\{([^}]+)\}/)
    if (heightsMatch) {
      const keys = heightsMatch[1].match(/(\d+)\s*:/g)
      if (keys) totalCount = keys.length
    }
  }

  // If we couldn't determine the total, we can't provide useful info.
  if (totalCount === 0) return null

  // Extract the path pattern from JS string concatenation:
  //   src = "processed/slide_" + String(c).padStart(2,"0") + ".html"
  //   or: '"processed/slide_" + i + ".html"'
  const pathPattern = html.match(/["'`]([^"'`]*(?:slide|page|section|deck|step))[_-]?["'`](?:\s*\+\s*[^+]+\+\s*["'`]\.html["'`])/)
  if (pathPattern) {
    pathPrefix = pathPattern[1]

    // Extract the subdirectory (e.g. "processed/" from "processed/slide_")
    const lastSlash = pathPrefix.lastIndexOf("/")
    const subdirectory = lastSlash >= 0 ? pathPrefix.substring(0, lastSlash + 1) : ""
    pathPrefix = pathPrefix + (pathPrefix.endsWith("/") ? "" : pathPrefix.endsWith("_") || pathPrefix.endsWith("-") ? "" : "_")

    // Construct example filename
    exampleFilename = `${pathPrefix.split("/").pop() || "slide"}00.html`
  }

  // Try alternative: templated string literal like `processed/slide_${i}.html`
  if (!pathPrefix) {
    const tplMatch = html.match(/["'`]([^"'`]*?(?:slide|page|section|deck|step))[_-]?\$\{/)
    if (tplMatch) {
      pathPrefix = tplMatch[1] + "_"
      exampleFilename = `${pathPrefix.split("/").pop()}00.html`
    }
  }

  // Extract subdirectory from path prefix
  const lastSlash = pathPrefix.lastIndexOf("/")
  const subdirectory = lastSlash >= 0 ? pathPrefix.substring(0, lastSlash + 1) : ""

  return { totalCount, pathPrefix, exampleFilename, subdirectory }
}

/**
 * Parse multiple HTML files (from file or folder upload) into slides.
 *
 * Strategy per file:
 *  - If the file contains multiple <section class="slide"> elements, each becomes a slide
 *  - If the file has no slide sections, the body becomes one slide
 *  - File name is used as the slide name prefix
 *
 * All slides from all files are concatenated in order (files should be pre-sorted by the caller).
 */
export function parseMultipleHtmlToSlides(files: ParsedFile[]): Slide[] {
  if (typeof window === "undefined") return []
  const allSlides: Slide[] = []
  let slideIndex = 0

  for (const file of files) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(file.content, "text/html")

    // Apply <style> blocks
    applyStyleBlocks(doc, file.content)

    // Find slide sections using multiple strategies
    let sections = Array.from(
      doc.querySelectorAll(
        '.slide, [data-slide], section[class*="slide"], div[class*="slide"]'
      )
    )
    if (sections.length > 0) {
      sections = filterNestedElements(sections)
    }

    if (sections.length === 0) {
      sections = Array.from(doc.querySelectorAll("section"))
      if (sections.length > 0) sections = filterNestedElements(sections)
    }

    if (sections.length === 0) {
      sections = Array.from(doc.querySelectorAll("article"))
    }

    if (sections.length === 0) {
      const body = doc.body
      if (body.children.length > 0) {
        sections = [body]
      } else {
        continue
      }
    }

    for (const section of sections) {
      const slide = parseSlideSection(section, slideIndex)
      if (sections.length === 1) {
        slide.name = file.name
      } else {
        slide.name = `${file.name} (${slideIndex + 1})`
      }
      allSlides.push(slide)
      slideIndex++
    }
  }

  return allSlides
}

function parseSlideSection(section: Element, index: number): Slide {
  // Render the section off-screen to compute layout & computed styles
  const container = document.createElement("div")
  container.className = "slideforge-parse-container"
  container.style.position = "absolute"
  container.style.left = "-99999px"
  container.style.top = "0"
  container.style.width = "1280px"
  container.style.height = "720px"
  container.style.visibility = "hidden"

  // Copy <style> blocks from the document head, converting :root to also match our container
  const docStyles = section.ownerDocument?.querySelectorAll("style") || []
  const styleHtml = Array.from(docStyles).map((s) => {
    let css = s.textContent || ""
    css = css.replace(/:root\s*\{/g, ":root, .slideforge-parse-container {")
    return `<style>${css}</style>`
  }).join("")

  // Clone section, override display:none (common in slide frameworks)
  const sectionClone = section.cloneNode(true) as HTMLElement
  sectionClone.style.display = "block"
  sectionClone.removeAttribute("hidden")
  sectionClone.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((el) => {
    ;(el as HTMLElement).style.display = "block"
  })

  // Inject style blocks into document head (not container) so CSS is properly applied
  // Also inject into container for scoped styles
  container.innerHTML = sectionClone.outerHTML
  
  // Create a temporary style element in the head with the CSS
  const tempStyle = document.createElement("style")
  tempStyle.setAttribute("data-slideforge-temp", "true")
  const allDocStyles = section.ownerDocument?.querySelectorAll("style") || []
  let combinedCss = ""
  Array.from(allDocStyles).forEach((s) => {
    let css = s.textContent || ""
    css = css.replace(/:root\s*\{/g, ":root, .slideforge-parse-container {")
    combinedCss += css + "\n"
  })
  tempStyle.textContent = combinedCss
  document.head.appendChild(tempStyle)
  document.body.appendChild(container)

  // Find the rendered section
  let renderedSection: Element | null = null
  if (section.getAttribute("data-slide")) {
    renderedSection = container.querySelector(`[data-slide="${section.getAttribute("data-slide")}"]`)
  }
  if (!renderedSection) {
    const tagName = section.tagName.toLowerCase()
    const firstClass = section.className?.split(" ")[0]
    if (firstClass) {
      renderedSection = container.querySelector(`${tagName}.${firstClass}`)
    }
    if (!renderedSection) {
      renderedSection = container.querySelector(tagName) || container.lastElementChild as Element
    }
  }

  // Compute background (could be gradient or color)
  // Check the section itself, then its first child (often a .slide div with the actual background)
  let bg = extractBackground(renderedSection)
  if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
    // Try first child element (e.g. .slide div inside section)
    // Try finding a .slide div or the first non-style child element
    const slideDiv = renderedSection?.querySelector(".slide")
    if (slideDiv) {
      bg = extractBackground(slideDiv)
    }
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
      // Try first non-style child
      const children = renderedSection?.children
      if (children) {
        for (let i = 0; i < children.length; i++) {
          if (children[i].tagName.toLowerCase() !== "style") {
            bg = extractBackground(children[i])
            if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") break
          }
        }
      }
    }
  }
  bg = bg || "#ffffff"

  const elements: EditorElement[] = []
  let zIndex = 0

  const walk = (node: Element, offsetX = 0, offsetY = 0) => {
    Array.from(node.children).forEach((child) => {
      const tag = child.tagName.toLowerCase()
      if (tag === "script" || tag === "style" || tag === "link" || tag === "meta" || tag === "head") return

      // Skip presentation framework UI elements (not slide content)
      const elementId = child.getAttribute("id") || ""
      const frameworkIds = ["viewport", "scaler", "progress", "controls", "nav", "navigation", "toolbar"]
      if (frameworkIds.includes(elementId)) {
        walk(child, 0, 0)
        return
      }

      // Skip decorative elements (data-decor attribute or aria-hidden="true")
      // These are visual decorations like geometric corners that use pseudo-elements
      // and would create empty shape elements
      if (child.getAttribute("data-decor") !== null || child.getAttribute("aria-hidden") === "true") {
        walk(child, 0, 0)
        return
      }

      // Skip decorative elements by class name pattern.
      // Common decorative class prefixes: geo-*, decor*, ornament*, bg-decor*
      // These are visual flourishes (corner circles, accent dots, lines) that
      // would create spurious shape elements in the editor.
      const className = (child.getAttribute("class") || "").trim()
      if (className) {
        const classTokens = className.split(/\s+/)
        const isDecorative = classTokens.some((tok) =>
          /^(geo-|decor[-_]?|ornament[-_]?|bg-decor[-_]?|corner-|accent-line[-_]?|divider[-_]?)/i.test(tok)
          || /(^|-)(decor|ornament|flourish)([-_]|$)/i.test(tok)
        )
        if (isDecorative) {
          walk(child, 0, 0)
          return
        }
      }

      const style = window.getComputedStyle(child)
      const position = style.position

      // Skip fixed-position elements (they're presentation framework UI like
      // navigation bars, progress bars, control buttons — not slide content)
      if (position === "fixed") {
        // Still recurse into children in case they have slide content
        walk(child, 0, 0)
        return
      }

      // Skip empty decorative elements with pointer-events: none.
      // These are purely visual decorations (e.g. ::before/::after containers,
      // geometric shape outlines) that have no real text or image content.
      // Only skip if truly empty: no text, no element children, no images.
      const hasElementKids = child.children.length > 0
      const hasTextContent = (child.textContent || "").trim().length > 0
      const hasImg = child.querySelector("img, svg, video, canvas")
      if (
        style.pointerEvents === "none" &&
        !hasElementKids &&
        !hasTextContent &&
        !hasImg &&
        tag !== "img" && tag !== "svg" && tag !== "video"
      ) {
        walk(child, 0, 0)
        return
      }

      // Use getBoundingClientRect for accurate position (handles flexbox/grid)
      const childRect = (child as HTMLElement).getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      let x = childRect.left - containerRect.left
      let y = childRect.top - containerRect.top
      // For absolutely positioned elements, prefer left/top from style
      if (position === "absolute") {
        const styleX = parseFloat(style.left)
        const styleY = parseFloat(style.top)
        if (!isNaN(styleX)) x = styleX
        if (!isNaN(styleY)) y = styleY
      }

      let width = parseFloat(style.width) || (child as HTMLElement).offsetWidth || 200
      let height = parseFloat(style.height) || (child as HTMLElement).offsetHeight || 100
      // Use scrollHeight if content overflows
      const childEl = child as HTMLElement
      if (childEl.scrollHeight > height + 2) {
        height = childEl.scrollHeight
      }

      // Skip elements with zero size
      if (width < 2 && height < 2 && tag !== "img" && tag !== "video") {
        walk(child, x, y)
        return
      }

      // Skip elements that are entirely outside the slide bounds (decorative off-canvas elements)
      // Allow elements that are partially visible (at least 50% inside the slide)
      if ((x + width < -20 || y + height < -20 || x > 1300 || y > 740) && tag !== "img" && tag !== "video") {
        walk(child, x, y)
        return
      }

      // ---- Text wrapping detection ----
      // For text-bearing elements we compare the text's natural single-line
      // width to the rendered box width to decide whether the text was meant
      // to wrap in the original HTML. This drives the `wrap` flag on the
      // TextElement so the editor can reproduce the exact same wrapping
      // behaviour (single-line headings stay single-line; paragraphs wrap).
      let textWrap = true // default: wrapping enabled (paragraphs, body text)
      const textTagsForWidth = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "li", "label", "a", "strong", "em", "blockquote", "figcaption", "caption", "dt", "dd", "td", "th", "div"]
      if (textTagsForWidth.includes(tag)) {
        const textContent = (child.textContent || "").trim()
        if (textContent) {
          // Measure natural single-line width by temporarily setting white-space: nowrap
          const childEl2 = child as HTMLElement
          const origWhiteSpace = childEl2.style.whiteSpace
          childEl2.style.whiteSpace = "nowrap"
          const naturalWidth = childEl2.scrollWidth
          childEl2.style.whiteSpace = origWhiteSpace
          const padding = parseFloat(style.paddingLeft) || parseFloat(style.padding) || 0
          // tolerance absorbs minor font-rendering differences between the parse
          // container and the live editor canvas (sub-pixel rounding, font load
          // timing). 8px is enough for CJK headings up to ~40px font size.
          const tolerance = 8

          if (naturalWidth + padding * 2 <= width + tolerance) {
            // Text fits on a single line in the original layout → keep it
            // single-line in the editor. Expand the box just enough to fit the
            // natural width so font-load differences don't trigger wrapping.
            textWrap = false
            const needed = Math.ceil(naturalWidth + padding * 2 + tolerance)
            if (needed > width) width = needed
          } else {
            // Text was wrapping in the original layout → keep the original
            // rendered width and let the text wrap naturally.
            textWrap = true
          }
        }
      }

      // Note: do NOT globally cap the width to 1280 - x. That distorts shapes
      // (e.g. off-canvas decorative circles become squished ellipses) and
      // truncates legitimate elements. The original rendered width is correct.

      const textTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "li", "label", "button", "a", "strong", "em", "blockquote", "figcaption", "caption", "dt", "dd", "td", "th"]
      const isTextTag = textTags.includes(tag)

      // Extract text content, normalizing whitespace to prevent unwanted line breaks
      const rawText = (child.textContent || "").trim()
      const text = rawText.replace(/\s+/g, " ").trim()

      // Also handle <div> elements that have direct text content and no element children
      const hasElementChildren = Array.from(child.children).length > 0
      const isLeafTextDiv = tag === "div" && !hasElementChildren && text

      // Determine if this element should become a shape (has visible bg, border, shadow, or radius)
      const bgValue = extractBackground(child)
      const hasBg = bgValue && bgValue !== "transparent" && bgValue !== "rgba(0, 0, 0, 0)"
      const borderWidth = parseFloat(style.borderLeftWidth) || 0
      const hasBorder = borderWidth > 0
      const hasShadow = style.boxShadow && style.boxShadow !== "none"
      const borderRadius = parseFloat(style.borderRadius) || 0
      const isCard = hasBg || hasBorder || hasShadow

      if (tag === "img") {
        const src = child.getAttribute("src") || ""
        const alt = child.getAttribute("alt") || "Image"
        // Skip placeholder/broken images (no src) — they trigger React's
        // "empty string passed to src" warning at render time and add nothing
        // useful to the editor.
        if (!src.trim()) return
        elements.push(
          createImageElement(src, {
            x, y, width: width || 200, height: height || 200,
            alt, zIndex: zIndex++, name: alt || "Image",
          }),
        )
        return
      }

      // If this is a text-bearing tag with text content, create a text element
      // (also create a shape underneath if the parent has visible bg)
      if ((isTextTag && text) || isLeafTextDiv) {
        const fontSize = parseFloat(style.fontSize) || 16
        const color = rgbToHex(style.color) || "#0f172a"
        const fontWeight = style.fontWeight
        const fontStyle = (style.fontStyle as "normal" | "italic") || "normal"
        const textAlign = (style.textAlign as TextElement["textAlign"]) || "left"
        const fontFamily = style.fontFamily || "Inter, system-ui, sans-serif"
        // lineHeight from computed style: if it has "px" it's absolute (convert to multiplier);
        // if unitless it's already a multiplier
        let lineHeight = 1.4
        if (style.lineHeight && style.lineHeight !== "normal") {
          if (style.lineHeight.endsWith("px")) {
            const px = parseFloat(style.lineHeight)
            lineHeight = px / (fontSize || 16)
          } else {
            lineHeight = parseFloat(style.lineHeight) || 1.4
          }
        }
        const fill = bgValue || "transparent"
        const textDecoration = (style.textDecoration.includes("underline")
          ? "underline"
          : style.textDecoration.includes("line-through")
            ? "line-through"
            : "none") as TextElement["textDecoration"]

        const isHeading = tag.startsWith("h")
        elements.push(
          createTextElement({
            x, y,
            width: width || 400,
            height: height || fontSize * 1.4,
            text,
            fontSize,
            color,
            fontWeight,
            fontStyle,
            textAlign,
            fontFamily,
            lineHeight: isNaN(lineHeight) ? 1.4 : lineHeight,
            fill: fill === "transparent" ? "transparent" : fill,
            borderRadius,
            textDecoration,
            verticalAlign: "middle",
            name: isHeading ? `Heading ${tag}` : "Text",
            zIndex: zIndex++,
            wrap: textWrap,
            shadow: hasShadow ? true : false,
            shadowColor: hasShadow ? extractShadowColor(style.boxShadow) : undefined,
            shadowBlur: hasShadow ? extractShadowBlur(style.boxShadow) : undefined,
            shadowX: hasShadow ? extractShadowX(style.boxShadow) : undefined,
            shadowY: hasShadow ? extractShadowY(style.boxShadow) : undefined,
          }),
        )
        return
      }

      // Handle <svg> elements — convert to container (raw HTML) to preserve icons
      if (tag === "svg") {
        // Clone the SVG and add width/height to ensure it renders at the correct size
        const svgClone = child.cloneNode(true) as HTMLElement
        svgClone.setAttribute("width", "100%")
        svgClone.setAttribute("height", "100%")
        // Also ensure paths/shapes inherit fill from parent
        svgClone.removeAttribute("fill")
        elements.push(
          createContainerElement(svgClone.outerHTML, {
            x, y, width: width || 200, height: height || 200,
            fill: "transparent",
            stroke: "transparent",
            strokeWidth: 0,
            zIndex: zIndex++, name: "SVG Icon",
          }),
        )
        return
      }

      // If this is a div/container with visible bg/border/shadow, create a shape
      if (isCard) {
        const shape: "rect" | "ellipse" =
          borderRadius > Math.min(width, height) / 2 - 1 && width > 0 && height > 0
            ? "ellipse"
            : "rect"
        elements.push(
          createShapeElement(shape, {
            x, y, width: width || 200, height: height || 200,
            fill: hasBg ? bgValue : "#ffffff",
            stroke: hasBorder ? rgbToHex(style.borderLeftColor) || "#0f172a" : "transparent",
            strokeWidth: borderWidth,
            borderRadius,
            shadow: hasShadow ? true : false,
            shadowColor: hasShadow ? extractShadowColor(style.boxShadow) : undefined,
            shadowBlur: hasShadow ? extractShadowBlur(style.boxShadow) : undefined,
            shadowX: hasShadow ? extractShadowX(style.boxShadow) : undefined,
            shadowY: hasShadow ? extractShadowY(style.boxShadow) : undefined,
            zIndex: zIndex++,
            name: shape === "rect" ? "Rectangle" : "Ellipse",
          }),
        )
      } else if (!text && !isTextTag && !isLeafTextDiv && tag !== "img" && tag !== "video" && tag !== "a" && tag !== "button") {
        // Skip empty elements with no visible style, no text, and no special type
        // These are likely pseudo-element containers or layout wrappers
        // Still recurse into children
        walk(child, x, y)
        return
      }

      // Always recurse into children (positioned or not)
      walk(child, x, y)
    })
  }

  if (renderedSection) {
    walk(renderedSection)
  }
  document.body.removeChild(container)
  // Clean up temporary style element
  tempStyle.remove()

  // Extract speaker notes and title from data attributes
  const notes = section.getAttribute("data-notes") || undefined
  const title = section.getAttribute("data-title")

  return {
    id: uniqueId("el"),
    name: title || `Slide ${index + 1}`,
    background: bg,
    elements,
    notes,
  }
}

// Extract background as a CSS value, preserving gradients
function extractBackground(el: Element): string | null {
  const style = window.getComputedStyle(el)
  const bgColor = style.backgroundColor
  const hasBgColor = bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent"
  const img = style.backgroundImage
  
  // If there's a solid background color, prefer it (more reliable than gradients)
  // This is especially important for slide backgrounds that use CSS variables
  if (hasBgColor) {
    return bgColor
  }
  
  // If no solid color but has gradient/image, return it
  if (img && img !== "none") return img
  
  return null
}

// Parse a CSS box-shadow value into its components
function parseBoxShadow(shadow: string): { x: number; y: number; blur: number; color: string } | null {
  if (!shadow || shadow === "none") return null
  // Match: offsetX offsetY blurRadius [spread] color
  const m = shadow.match(
    /(-?\d+\.?\d*)px\s+(-?\d+\.?\d*)px\s+(-?\d+\.?\d*)px\s*(?:(-?\d+\.?\d*)px\s*)?(rgba?\([^)]+\)|#[0-9a-fA-F]+|[a-z]+)/,
  )
  if (!m) return null
  return {
    x: parseFloat(m[1]),
    y: parseFloat(m[2]),
    blur: parseFloat(m[3]),
    color: m[5] || "rgba(15,23,42,0.15)",
  }
}
function extractShadowColor(shadow: string): string {
  return parseBoxShadow(shadow)?.color || "rgba(15,23,42,0.15)"
}
function extractShadowBlur(shadow: string): number {
  return parseBoxShadow(shadow)?.blur ?? 24
}
function extractShadowX(shadow: string): number {
  return parseBoxShadow(shadow)?.x ?? 0
}
function extractShadowY(shadow: string): number {
  return parseBoxShadow(shadow)?.y ?? 8
}

function rgbToHex(color: string): string | null {
  if (!color) return null
  if (color.startsWith("#")) return color
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  const r = parseInt(m[1], 10)
  const g = parseInt(m[2], 10)
  const b = parseInt(m[3], 10)
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
}

// ---------- Export ----------

/**
 * Strip CSS rules whose selectors target document-level elements (html, body)
 * or framework IDs (#scaler, #viewport, #progress, #controls, etc.) from the
 * original HTML's styles. These conflict with the export's own framework CSS
 * and cause issues like:
 *   - `html, body { width: 1280px; overflow: hidden; }` clipping the viewport
 *     at 1280px (right-side cutoff when browser is wider than 1280px).
 *   - `#scaler { overflow: hidden; background: var(--bg); }` conflicting with
 *     the export's scaler that uses `transform: scale()`.
 *
 * Uses the CSSOM (via a temp <style> element) to robustly parse and filter
 * rules, including those nested inside @media / @supports blocks.
 */
function stripConflictingCss(css: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") return css
  try {
    const doc = document.implementation.createHTMLDocument("")
    const style = doc.createElement("style")
    style.textContent = css
    doc.head.appendChild(style)
    const sheet = style.sheet
    if (!sheet) return css

    // Selectors to strip: html, body, and framework IDs that the original
    // presentation viewer uses (but which conflict with our export framework).
    const conflictRegex = /(^|[\s,>+~])(html|body)\b/i
    const conflictIdRegex = /#(scaler|viewport|progress|controls|notes-panel|overview|help-hint|deck)\b/i

    function stripFromRuleList(ruleList: { cssRules: CSSRule[]; deleteRule: (i: number) => void }): boolean {
      let anyRemoved = false
      for (let i = ruleList.cssRules.length - 1; i >= 0; i--) {
        const rule = ruleList.cssRules[i] as CSSRule
        // CSSStyleRule — check selector
        if (rule instanceof CSSStyleRule) {
          if (conflictRegex.test(rule.selectorText) || conflictIdRegex.test(rule.selectorText)) {
            ruleList.deleteRule(i)
            anyRemoved = true
          }
        }
        // CSSMediaRule / CSSSupportsRule — recurse into nested rules
        else if ("cssRules" in rule && typeof (rule as any).deleteRule === "function") {
          const inner = rule as unknown as { cssRules: CSSRule[]; deleteRule: (i: number) => void }
          const innerRemoved = stripFromRuleList(inner)
          // Remove empty @media / @supports blocks
          if (inner.cssRules.length === 0) {
            ruleList.deleteRule(i)
            anyRemoved = true
          } else if (innerRemoved) {
            anyRemoved = true
          }
        }
      }
      return anyRemoved
    }

    stripFromRuleList(sheet as unknown as { cssRules: CSSRule[]; deleteRule: (i: number) => void })

    // Serialize back to CSS text
    let result = ""
    for (const rule of Array.from(sheet.cssRules)) {
      result += rule.cssText + "\n"
    }
    return result
  } catch {
    return css
  }
}

export function exportSlidesToHtml(slides: Slide[], masterElements: EditorElement[] = []): string {
  const body = slides
    .map((s, idx) => {
      // If the slide has rawHtml, extract body content and embed directly
      // — this preserves 100% of the original styling in the exported file.
      if (s.rawHtml) {
        try {
          const rawDoc = new DOMParser().parseFromString(s.rawHtml, "text/html")
          // Collect raw <style> blocks, then strip conflicting rules
          // (html/body sizing, #scaler framework IDs) that would break the
          // export's own framework layout.
          const rawStylesRaw = Array.from(rawDoc.querySelectorAll("style"))
            .map((st) => st.textContent || "")
            .join("\n")
          const rawStyles = stripConflictingCss(rawStylesRaw)
          const rawBody = rawDoc.body ? rawDoc.body.innerHTML : ""
          return `  <section class="export-slide" data-slide="${idx + 1}">
        <style>.slide-stage, section.slide-stage, [data-slide] { display: block !important; }</style>
        <style>
${rawStyles}
        </style>
        ${rawBody}
      </section>`
        } catch {
          // Fall through to element-based export
        }
      }
      const masterHtml = masterElements.length > 0
        ? masterElements.slice().sort((a, b) => a.zIndex - b.zIndex).map((el) => elementToHtml(el)).join("\n      ")
        : ""
      const elements = s.elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => elementToHtml(el))
        .join("\n      ")
      return `  <section class="export-slide" data-slide="${idx + 1}" style="background:${s.background}">
      ${masterHtml}
      ${elements}
    </section>`
    })
    .join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exported Slides</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  /* !important on html/body to win over any original CSS that sets
     html, body { width: 1280px; overflow: hidden; ... } which would
     clip the viewport at 1280px and cut off the right side. */
  html, body { width: 100% !important; height: 100% !important; min-height: 100% !important; overflow: hidden !important; background: transparent !important; margin: 0 !important; padding: 0 !important; font-family: Inter, system-ui, sans-serif !important; }
  .sf-viewport { width: 100vw !important; height: 100vh !important; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .sf-scaler { transform-origin: center center; position: relative; }
  /* Stage: no overflow clipping. The inner .slide div (from original HTML)
     has its own overflow:hidden to clip slide content. The stage should NOT
     add another clip layer — that causes right-side content to be cut off. */
  .sf-stage { width: 1280px; height: 720px; overflow: visible; position: relative; }
  .sf-deck { display: flex; width: ${slides.length * 1280}px; height: 720px; transition: transform 0.4s ease; }
  /* Outer .export-slide section: just a flex item, no overflow clipping.
     Uses a unique class name to avoid conflicting with the original HTML's
     .slide CSS (which has overflow:hidden, display:flex, etc.). */
  .export-slide { position: relative; width: 1280px; height: 720px; flex-shrink: 0; overflow: visible; }
  .el { position: absolute; }
  .sf-nav { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; align-items: center; z-index: 100; background: rgba(15,23,42,0.85); padding: 8px 16px; border-radius: 24px; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
  .sf-nav button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .sf-nav button:hover { background: rgba(255,255,255,0.25); transform: scale(1.08); }
  .sf-nav button:disabled { opacity: 0.3; cursor: default; transform: none; }
  .sf-nav .sf-counter { color: rgba(255,255,255,0.85); font-size: 13px; min-width: 60px; text-align: center; font-variant-numeric: tabular-nums; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="sf-viewport">
  <div class="sf-scaler" id="sf-scaler">
    <div class="sf-stage">
      <div class="sf-deck" id="sf-deck">
${body}
      </div>
    </div>
  </div>
</div>
<div class="sf-nav">
  <button id="sf-prev" onclick="sfNav(-1)" aria-label="Previous slide">&#8592;</button>
  <span class="sf-counter" id="sf-counter">1 / ${slides.length}</span>
  <button id="sf-next" onclick="sfNav(1)" aria-label="Next slide">&#8594;</button>
</div>
<script>
  // Auto-fit the 1280x720 stage to fill the viewport.
  // Uses Math.min so the slide always fits entirely (letterboxed if needed).
  function sfFitToScreen() {
    var sx = window.innerWidth / 1280;
    var sy = window.innerHeight / 720;
    var scale = Math.min(sx, sy);
    var scaler = document.getElementById('sf-scaler');
    if (scaler) scaler.style.transform = 'scale(' + scale + ')';
  }
  window.addEventListener('resize', sfFitToScreen);
  sfFitToScreen();

  var sfCurrent = 0;
  var sfTotal = ${slides.length};
  var sfDeck = document.getElementById('sf-deck');
  var sfCounter = document.getElementById('sf-counter');
  var sfPrevBtn = document.getElementById('sf-prev');
  var sfNextBtn = document.getElementById('sf-next');
  function sfNav(dir) {
    sfCurrent = Math.max(0, Math.min(sfTotal - 1, sfCurrent + dir));
    if (sfDeck) sfDeck.style.transform = 'translateX(-' + (sfCurrent * 1280) + 'px)';
    if (sfCounter) sfCounter.textContent = (sfCurrent + 1) + ' / ' + sfTotal;
    if (sfPrevBtn) sfPrevBtn.disabled = sfCurrent === 0;
    if (sfNextBtn) sfNextBtn.disabled = sfCurrent === sfTotal - 1;
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); sfNav(-1); }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); sfNav(1); }
    if (e.key === 'Home') { e.preventDefault(); sfNav(-sfCurrent); }
    if (e.key === 'End') { e.preventDefault(); sfNav(sfTotal - 1 - sfCurrent); }
  });
  if (sfPrevBtn) sfPrevBtn.disabled = true;
  // Click on left/right half of screen to navigate
  document.addEventListener('click', function(e) {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (e.clientX < window.innerWidth / 2) sfNav(-1);
    else sfNav(1);
  });
</script>
</body>
</html>`
}

function elementToHtml(el: EditorElement): string {
  const baseStyle = [
    `position:absolute`,
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `transform:rotate(${el.rotation}deg)`,
    `opacity:${el.opacity}`,
  ]
  if (el.shadow) {
    baseStyle.push(
      `box-shadow:${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur || 24}px ${el.shadowColor || "rgba(15,23,42,0.15)"}`,
    )
  }
  if (el.borderRadius) baseStyle.push(`border-radius:${el.borderRadius}px`)
  if (el.fill && el.fill !== "transparent") baseStyle.push(`background:${el.fill}`)
  if (el.stroke && el.stroke !== "transparent" && el.strokeWidth) {
    baseStyle.push(`border:${el.strokeWidth}px solid ${el.stroke}`)
  }

  const styleStr = baseStyle.join(";")
  const cls = `el el-${el.type}`

  switch (el.type) {
    case "text": {
      const t = el as TextElement
      const isList = t.listType && t.listType !== "none"
      const textStyle = [
        `font-size:${t.fontSize}px`,
        `font-family:${t.fontFamily}`,
        `font-weight:${t.fontWeight}`,
        `font-style:${t.fontStyle}`,
        `text-decoration:${t.textDecoration}`,
        `text-align:${t.textAlign}`,
        `color:${t.color}`,
        `line-height:${t.lineHeight}`,
        `letter-spacing:${t.letterSpacing}px`,
        `padding:${t.padding}px`,
        // Preserve the wrapping behaviour chosen at import time so the
        // exported HTML matches the editor canvas exactly.
        `white-space:${t.wrap === false ? "nowrap" : "pre-wrap"}`,
        t.wrap === false ? `word-break:keep-all` : `word-break:break-word`,
        `display:flex`,
        `flex-direction:column`,
        `justify-content:${t.verticalAlign === "top" ? "flex-start" : t.verticalAlign === "bottom" ? "flex-end" : "center"}`,
        `overflow:visible`,
      ].join(";")
      if (isList) {
        const lines = t.text.split("\n").filter((l) => l.trim() !== "")
        const listStyleType = t.listType === "number"
          ? (t.listStyle === "lower-alpha" ? "lower-alpha" : t.listStyle === "upper-roman" ? "upper-roman" : "decimal")
          : (t.listStyle || "disc")
        const tag = t.listType === "number" ? "ol" : "ul"
        const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")
        return `      <div class="${cls}" data-name="${escapeAttr(t.name)}" style="${styleStr};${textStyle};display:block"><${tag} style="list-style-type:${listStyleType};margin:0;padding-left:${(t.listIndent || 0) + (t.fontSize || 16) * 1.2}px">${items}</${tag}></div>`
      }
      return `      <div class="${cls}" data-name="${escapeAttr(t.name)}" style="${styleStr};${textStyle}">${escapeHtml(t.text)}</div>`
    }
    case "rect":
    case "ellipse":
    case "triangle":
    case "line": {
      const s = el as ShapeElement
      if (s.type === "ellipse") {
        return `      <div class="${cls}" data-name="${escapeAttr(s.name)}" style="${styleStr};border-radius:50%"></div>`
      }
      if (s.type === "triangle") {
        const triFill = s.fill || "#f59e0b"
        const triStroke = s.stroke || "transparent"
        const triSw = s.strokeWidth || 0
        const triPoints = `${s.width / 2},0 ${s.width},${s.height} 0,${s.height}`
        const triSvg = `<svg width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}" preserveAspectRatio="none"><polygon points="${triPoints}" fill="${triFill}" stroke="${triStroke}" stroke-width="${triSw}"/></svg>`
        return `      <div class="${cls}" data-name="${escapeAttr(s.name)}" style="${styleStr};background:transparent">
        ${triSvg}
      </div>`
      }
      if (s.type === "line") {
        return `      <div class="${cls}" data-name="${escapeAttr(s.name)}" style="${styleStr};background:${s.stroke};height:${s.strokeWidth || 2}px"></div>`
      }
      return `      <div class="${cls}" data-name="${escapeAttr(s.name)}" style="${styleStr}"></div>`
    }
    case "image": {
      const i = el as ImageElement
      return `      <img class="${cls}" data-name="${escapeAttr(i.name)}" src="${escapeAttr(i.src)}" alt="${escapeAttr(i.alt || "")}" style="${styleStr};object-fit:${i.objectFit}" />`
    }
    case "container": {
      const c = el as ContainerElement
      return `      <div class="${cls}" data-name="${escapeAttr(c.name)}" style="${styleStr}">${c.html || ""}</div>`
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>")
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;")
}
