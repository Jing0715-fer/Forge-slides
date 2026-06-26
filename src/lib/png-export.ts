import type { Slide } from "@/types/editor"
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"

/**
 * Export a slide as a PNG image by rendering its HTML to a canvas.
 * Uses foreignObject SVG technique (works in modern browsers without libraries).
 * For images, we preload them as data URLs to avoid CORS issues.
 */
export async function exportSlideAsPng(slide: Slide, scale = 2): Promise<string> {
  // Pre-process: convert any image src to data URL to avoid CORS
  const processedSlide = await preprocessImages(slide)
  const html = renderSlideHtml(processedSlide)
  const width = CANVAS_WIDTH
  const height = CANVAS_HEIGHT

  // Build an SVG with a foreignObject containing the slide HTML
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;">
      ${html}
    </div>
  </foreignObject>
</svg>`

  // Convert SVG to data URL (use encodeURIComponent to handle special chars)
  const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext("2d")!
      ctx.scale(scale, scale)
      // Fill background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0)
      try {
        const dataUrl = canvas.toDataURL("image/png")
        resolve(dataUrl)
      } catch (e) {
        reject(new Error("Failed to convert canvas to PNG. " + (e as Error).message))
      }
    }
    img.onerror = () => {
      reject(new Error("Failed to render slide to image. The slide may contain cross-origin images."))
    }
    img.src = svgDataUrl
  })
}

// Convert image URLs to data URLs to avoid CORS taint on canvas
async function preprocessImages(slide: Slide): Promise<Slide> {
  const elements = await Promise.all(
    slide.elements.map(async (el) => {
      if (el.type === "image" && el.src && !el.src.startsWith("data:")) {
        try {
          const dataUrl = await imageUrlToDataUrl(el.src)
          return { ...el, src: dataUrl }
        } catch {
          return el // keep original if conversion fails
        }
      }
      if (el.type === "container" && el.html && el.html.includes("<img")) {
        // Replace img srcs in HTML
        const processedHtml = await processHtmlImages(el.html)
        return { ...el, html: processedHtml }
      }
      return el
    }),
  )
  return { ...slide, elements }
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      try {
        resolve(canvas.toDataURL("image/png"))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error("Failed to load image: " + url))
    img.src = url
  })
}

async function processHtmlImages(html: string): Promise<string> {
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g
  const matches = Array.from(html.matchAll(imgRegex))
  let result = html
  for (const m of matches) {
    const fullMatch = m[0]
    const src = m[1]
    if (src.startsWith("data:")) continue
    try {
      const dataUrl = await imageUrlToDataUrl(src)
      result = result.replace(fullMatch, fullMatch.replace(src, dataUrl))
    } catch {
      // skip
    }
  }
  return result
}

/**
 * Render a slide as self-contained HTML string for canvas capture.
 */
function renderSlideHtml(slide: Slide): string {
  const elements = slide.elements
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((el) => elementToInlineHtml(el))
    .join("\n")

  return `<div style="position:relative;width:1280px;height:720px;background:${slide.background};background-image:${slide.backgroundImage ? `url(${slide.backgroundImage})` : "none"};background-size:cover;background-position:center;overflow:hidden;font-family:Inter,system-ui,sans-serif;">
${elements}
</div>`
}

function elementToInlineHtml(el: any): string {
  const styles: string[] = [
    "position:absolute",
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `transform:rotate(${el.rotation}deg)`,
    `opacity:${el.opacity}`,
  ]
  if (el.shadow) {
    styles.push(`box-shadow:${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur || 24}px ${el.shadowColor || "rgba(15,23,42,0.15)"}`)
  }
  if (el.borderRadius) styles.push(`border-radius:${el.borderRadius}px`)
  if (el.fill && el.fill !== "transparent") styles.push(`background:${el.fill}`)
  if (el.stroke && el.stroke !== "transparent" && el.strokeWidth) {
    styles.push(`border:${el.strokeWidth}px solid ${el.stroke}`)
  }

  const styleStr = styles.join(";")

  switch (el.type) {
    case "text": {
      const t = el
      const textStyles = [
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
        "display:flex",
        "flex-direction:column",
        `justify-content:${t.verticalAlign === "top" ? "flex-start" : t.verticalAlign === "bottom" ? "flex-end" : "center"}`,
        "overflow:hidden",
        "width:100%",
        "height:100%",
      ].join(";")
      const escaped = (t.text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")
      return `<div style="${styleStr};${textStyles}">${escaped}</div>`
    }
    case "rect":
      return `<div style="${styleStr}"></div>`
    case "ellipse":
      return `<div style="${styleStr};border-radius:50%"></div>`
    case "triangle": {
      const triFill = el.fill || "#f59e0b"
      const triStroke = el.stroke || "transparent"
      const triSw = el.strokeWidth || 0
      const triPoints = `${el.width / 2},0 ${el.width},${el.height} 0,${el.height}`
      const triSvg = `<svg width="${el.width}" height="${el.height}" viewBox="0 0 ${el.width} ${el.height}" preserveAspectRatio="none"><polygon points="${triPoints}" fill="${triFill}" stroke="${triStroke}" stroke-width="${triSw}"/></svg>`
      return `<div style="${styleStr};background:transparent">${triSvg}</div>`
    }
    case "line":
      return `<div style="${styleStr};background:${el.stroke};height:${el.strokeWidth || 2}px"></div>`
    case "image":
      return `<img src="${el.src}" alt="${el.alt || ""}" style="${styleStr};object-fit:${el.objectFit}" />`
    case "container":
      return `<div style="${styleStr}">${el.html || ""}</div>`
    default:
      return ""
  }
}

/**
 * Download a data URL as a file.
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
