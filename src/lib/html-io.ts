import type { EditorElement, Slide, TextElement, ShapeElement, ImageElement, ContainerElement } from "@/types/editor"
import { createTextElement, createShapeElement, createImageElement, createContainerElement } from "@/store/editor-store"

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

  // Find slide sections
  let sections: Element[] = Array.from(
    doc.querySelectorAll("section.slide, section[data-slide], .slide"),
  )

  // If there are no slide sections, treat the body as a single slide
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

function parseSlideSection(section: Element, index: number): Slide {
  // Render the section off-screen to compute layout & computed styles
  const container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "-99999px"
  container.style.top = "0"
  container.style.width = "1280px"
  container.style.height = "720px"
  container.style.visibility = "hidden"
  container.innerHTML = section.outerHTML
  document.body.appendChild(container)
  const renderedSection = container.firstElementChild as Element

  // Compute background (could be gradient or color)
  const bg = extractBackground(renderedSection) || "#ffffff"

  const elements: EditorElement[] = []
  let zIndex = 0

  const walk = (node: Element, offsetX = 0, offsetY = 0) => {
    Array.from(node.children).forEach((child) => {
      const tag = child.tagName.toLowerCase()
      if (tag === "script" || tag === "style" || tag === "link" || tag === "meta") return

      const style = window.getComputedStyle(child)
      const position = style.position

      // Skip non-positioned elements unless they're at the slide root
      // (we only care about absolutely or relatively positioned elements)
      if (position !== "absolute" && position !== "relative" && position !== "fixed") {
        // Recurse into static children in case they have positioned descendants
        walk(child, offsetX, offsetY)
        return
      }

      let x = parseFloat(style.left)
      let y = parseFloat(style.top)
      if (isNaN(x)) x = (child as HTMLElement).offsetLeft
      if (isNaN(y)) y = (child as HTMLElement).offsetTop
      x += offsetX
      y += offsetY

      const width = parseFloat(style.width) || (child as HTMLElement).offsetWidth || 200
      const height = parseFloat(style.height) || (child as HTMLElement).offsetHeight || 100

      const textTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "li", "label", "button", "a", "strong", "em", "blockquote"]
      const isTextTag = textTags.includes(tag)

      // Determine if this element should become a shape (has visible bg, border, shadow, or radius)
      const bgValue = extractBackground(child)
      const hasBg = bgValue && bgValue !== "transparent" && bgValue !== "rgba(0, 0, 0, 0)"
      const borderWidth = parseFloat(style.borderLeftWidth) || 0
      const hasBorder = borderWidth > 0
      const hasShadow = style.boxShadow && style.boxShadow !== "none"
      const borderRadius = parseFloat(style.borderRadius) || 0
      const isCard = hasBg || hasBorder || hasShadow

      const text = (child.textContent || "").trim()

      if (tag === "img") {
        const src = child.getAttribute("src") || ""
        const alt = child.getAttribute("alt") || "Image"
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
      if (isTextTag && text) {
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
            shadow: hasShadow ? true : false,
            shadowColor: hasShadow ? extractShadowColor(style.boxShadow) : undefined,
            shadowBlur: hasShadow ? extractShadowBlur(style.boxShadow) : undefined,
            shadowX: hasShadow ? extractShadowX(style.boxShadow) : undefined,
            shadowY: hasShadow ? extractShadowY(style.boxShadow) : undefined,
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
      }

      // Always recurse into children (positioned or not)
      walk(child, x, y)
    })
  }

  if (renderedSection) {
    walk(renderedSection)
  }
  document.body.removeChild(container)

  return {
    id: Math.random().toString(36).slice(2),
    name: `Slide ${index + 1}`,
    background: bg,
    elements,
  }
}

// Extract background as a CSS value, preserving gradients
function extractBackground(el: Element): string | null {
  const style = window.getComputedStyle(el)
  // backgroundImage takes precedence for gradients
  const img = style.backgroundImage
  if (img && img !== "none") return img
  const bg = style.background
  if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
    // Computed background shorthand may include color, image, etc.
    return bg
  }
  const bgColor = style.backgroundColor
  if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
    return bgColor
  }
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
export function exportSlidesToHtml(slides: Slide[]): string {
  const body = slides
    .map((slide, idx) => {
      const elements = slide.elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => elementToHtml(el))
        .join("\n      ")
      return `  <section class="slide" data-slide="${idx + 1}" style="background:${slide.background}">
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
  body { background: #0f172a; padding: 40px 20px; font-family: Inter, system-ui, sans-serif; }
  .slide {
    position: relative;
    width: 1280px;
    height: 720px;
    margin: 0 auto 32px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    border-radius: 12px;
  }
  .el {
    position: absolute;
  }
</style>
</head>
<body>
${body}
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
        `display:flex`,
        `flex-direction:column`,
        `justify-content:${t.verticalAlign === "top" ? "flex-start" : t.verticalAlign === "bottom" ? "flex-end" : "center"}`,
        `overflow:hidden`,
      ].join(";")
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
