import type { Slide } from "@/types/editor"

/**
 * Generate a print-ready HTML document for PDF export.
 * Each slide becomes one printed page.
 */
export function exportSlidesToPrintableHtml(slides: Slide[]): string {
  const body = slides
    .map((slide, idx) => {
      const elements = slide.elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => elementToPrintHtml(el))
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
<title>SlideForge — Print Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #ffffff; }
  body { font-family: Inter, system-ui, sans-serif; }
  .slide {
    position: relative;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .slide:last-child { page-break-after: auto; }
  .el { position: absolute; }
  @page {
    size: 1280px 720px;
    margin: 0;
  }
  @media print {
    body { background: white; }
    .slide { box-shadow: none; }
  }
</style>
</head>
<body>
${body}
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`
}

function elementToPrintHtml(el: any): string {
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
      const t = el
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
        `width:100%`,
        `height:100%`,
      ].join(";")
      const escaped = (t.text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")
      return `      <div class="${cls}" style="${styleStr};${textStyle}">${escaped}</div>`
    }
    case "rect":
      return `      <div class="${cls}" style="${styleStr}"></div>`
    case "ellipse":
      return `      <div class="${cls}" style="${styleStr};border-radius:50%"></div>`
    case "triangle": {
      const triFill = el.fill || "#f59e0b"
      const triStroke = el.stroke || "transparent"
      const triSw = el.strokeWidth || 0
      const triPoints = `${el.width / 2},0 ${el.width},${el.height} 0,${el.height}`
      const triSvg = `<svg width="${el.width}" height="${el.height}" viewBox="0 0 ${el.width} ${el.height}" preserveAspectRatio="none"><polygon points="${triPoints}" fill="${triFill}" stroke="${triStroke}" stroke-width="${triSw}"/></svg>`
      return `      <div class="${cls}" style="${styleStr};background:transparent">${triSvg}</div>`
    }
    case "line":
      return `      <div class="${cls}" style="${styleStr};background:${el.stroke};height:${el.strokeWidth || 2}px"></div>`
    case "image":
      return `      <img class="${cls}" src="${el.src}" alt="${el.alt || ""}" style="${styleStr};object-fit:${el.objectFit}" />`
    case "container":
      return `      <div class="${cls}" style="${styleStr}">${el.html || ""}</div>`
    default:
      return ""
  }
}
