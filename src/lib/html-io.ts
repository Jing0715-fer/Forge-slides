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
 *  - Within a slide, walk the DOM and convert headings/paragraphs/divs into
 *    text or container elements with their bounding rects
 */
export function parseHtmlToSlides(html: string): Slide[] {
  if (typeof window === "undefined") return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Find slide sections
  let sections: Element[] = Array.from(doc.querySelectorAll("section.slide, section[data-slide], .slide"))

  // If there are no slide sections, treat the body as a single slide
  if (sections.length === 0) {
    // If body has children, wrap them
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
  // Compute background from inline style or computed style
  const bg = section.getAttribute("data-background") ||
    getStyle(section, "background-color") ||
    getStyle(section, "background") ||
    "#ffffff"

  const elements: EditorElement[] = []
  let zIndex = 0

  const walk = (node: Element, offsetX = 0, offsetY = 0) => {
    Array.from(node.children).forEach((child) => {
      const tag = child.tagName.toLowerCase()
      // Skip script/style
      if (tag === "script" || tag === "style") return

      const rect = child.getBoundingClientRect()
      // Use offsetLeft/Top relative to section if available (works for absolutely positioned)
      const style = window.getComputedStyle(child)
      const position = style.position

      let x = rect.left
      let y = rect.top
      let width = rect.width
      let height = rect.height

      // If absolutely positioned, use left/top relative to section
      if (position === "absolute" || position === "relative") {
        const left = parseFloat(style.left)
        const top = parseFloat(style.top)
        if (!isNaN(left)) x = left + offsetX
        if (!isNaN(top)) y = top + offsetY
        const w = parseFloat(style.width)
        const h = parseFloat(style.height)
        if (!isNaN(w)) width = w
        if (!isNaN(h)) height = h
      }

      // Heuristic: if the element has children that are also positioned, treat
      // it as a container; otherwise convert to text/shape/image
      const hasPositionedChildren = Array.from(child.children).some(
        (c) => window.getComputedStyle(c).position === "absolute" || window.getComputedStyle(c).position === "relative",
      )

      if (tag === "img") {
        const src = child.getAttribute("src") || ""
        const alt = child.getAttribute("alt") || "Image"
        elements.push(
          createImageElement(src, {
            x, y, width: width || 200, height: height || 200,
            alt, zIndex: zIndex++, name: alt,
          }),
        )
      } else if (hasPositionedChildren) {
        // Walk into positioned children
        walk(child, x, y)
      } else if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "p" || tag === "span" || tag === "div" || tag === "li" || tag === "label") {
        const text = child.textContent?.trim() || ""
        if (text) {
          const fontSize = parseFloat(style.fontSize) || 16
          const color = rgbToHex(style.color) || "#0f172a"
          const fontWeight = style.fontWeight
          const fontStyle = (style.fontStyle as "normal" | "italic") || "normal"
          const textAlign = (style.textAlign as TextElement["textAlign"]) || "left"
          const fontFamily = style.fontFamily || "Inter, system-ui, sans-serif"
          const lineHeight = parseFloat(style.lineHeight) || 1.4
          const fill = rgbToHex(style.backgroundColor) || "transparent"
          const borderRadius = parseFloat(style.borderRadius) || 0
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
            }),
          )
        }
      } else if (tag === "svg" || tag === "rect" || tag === "circle" || tag === "path" || tag === "div") {
        // Treat as a shape if it has visible background or border
        const fill = rgbToHex(style.backgroundColor) || "transparent"
        const stroke = rgbToHex(style.borderColor) || "#0f172a"
        const strokeWidth = parseFloat(style.borderLeftWidth) || 0
        const borderRadius = parseFloat(style.borderRadius) || 0
        if (fill !== "transparent" || strokeWidth > 0) {
          const shape: "rect" | "ellipse" = borderRadius > Math.min(width, height) / 2 - 1 && width > 0 && height > 0
            ? "ellipse"
            : "rect"
          elements.push(
            createShapeElement(shape, {
              x, y, width: width || 200, height: height || 200,
              fill: fill === "transparent" ? "#ffffff" : fill,
              stroke,
              strokeWidth,
              borderRadius,
              zIndex: zIndex++,
              name: shape === "rect" ? "Rectangle" : "Ellipse",
            }),
          )
        }
      }
    })
  }

  // Render the section off-screen to compute layout
  const container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "-99999px"
  container.style.top = "0"
  container.style.width = "1280px"
  container.style.height = "720px"
  container.innerHTML = section.outerHTML
  document.body.appendChild(container)
  const renderedSection = container.firstElementChild as Element
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

function getStyle(el: Element, prop: string): string {
  const style = window.getComputedStyle(el)
  return style.getPropertyValue(prop)
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
