import type { TemplateAnalysis, SlideStructure } from "./template-store"
import type { Slide } from "@/types/editor"

/**
 * Analyze a slide template's HTML to extract design tokens that will be used
 * to generate a detailed AI prompt. This ensures the AI-generated slides match
 * the template's visual style closely.
 *
 * Extracts:
 *  - CSS variables from :root
 *  - Color palette (from computed backgrounds, text, borders)
 *  - Font families and sizes
 *  - Layout patterns (flex, grid, card structures)
 *  - Slide structure (headings, card counts per slide)
 */
export function analyzeTemplate(slides: Slide[]): TemplateAnalysis {
  if (typeof window === "undefined" || slides.length === 0) {
    return {
      backgroundColor: "#ffffff",
      colorPalette: [],
      fontFamilies: [],
      fontSizes: [],
      slideCount: 0,
      layoutStyle: "unknown",
      cssVariables: {},
      designTokens: {},
      slideStructures: [],
    }
  }

  // Create a hidden container to render the template and read computed styles
  const container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "-99999px"
  container.style.top = "0"
  container.style.width = "1280px"
  container.style.height = "720px"
  container.style.visibility = "hidden"
  container.style.pointerEvents = "none"
  document.body.appendChild(container)

  const cssVariables: Record<string, string> = {}
  const colorPalette = new Set<string>()
  const fontFamilies = new Set<string>()
  const fontSizes = new Set<number>()
  const slideStructures: SlideStructure[] = []

  try {
    // Render the first slide's rawHtml to extract styles
    const firstSlide = slides[0]
    if (firstSlide.rawHtml) {
      // Parse the rawHtml to extract <style> blocks
      const parser = new DOMParser()
      const doc = parser.parseFromString(firstSlide.rawHtml, "text/html")

      // Extract CSS variables from :root
      const styleBlocks = Array.from(doc.querySelectorAll("style"))
      for (const style of styleBlocks) {
        const css = style.textContent || ""
        // Match :root { --var: value; }
        const rootMatch = css.match(/:root\s*\{([^}]*)\}/)
        if (rootMatch) {
          const rootContent = rootMatch[1]
          const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g
          let varMatch
          while ((varMatch = varRegex.exec(rootContent)) !== null) {
            cssVariables[varMatch[1]] = varMatch[2].trim()
          }
        }
      }

      // Render the slide in the container to read computed styles
      container.innerHTML = firstSlide.rawHtml
      // Wait a frame for styles to apply (synchronous in practice)
      const allEls = container.querySelectorAll("*")
      allEls.forEach((el) => {
        const htmlEl = el as HTMLElement
        const cs = window.getComputedStyle(htmlEl)

        // Collect colors
        if (cs.color && cs.color !== "rgba(0, 0, 0, 0)") {
          colorPalette.add(rgbToHex(cs.color))
        }
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
          colorPalette.add(rgbToHex(cs.backgroundColor))
        }
        if (cs.borderColor && cs.borderColor !== "rgba(0, 0, 0, 0)" && cs.borderColor !== "rgb(0, 0, 0)") {
          colorPalette.add(rgbToHex(cs.borderColor))
        }

        // Collect fonts
        if (cs.fontFamily) {
          // Take the first font family (before comma)
          const firstFont = cs.fontFamily.split(",")[0].trim().replace(/['"]/g, "")
          if (firstFont) fontFamilies.add(firstFont)
        }
        if (cs.fontSize) {
          const size = parseFloat(cs.fontSize)
          if (!isNaN(size) && size > 0) fontSizes.add(Math.round(size))
        }
      })
    }

    // Analyze slide structures
    slides.forEach((slide, idx) => {
      const structure: SlideStructure = {
        slideIndex: idx,
        title: slide.name || `Slide ${idx + 1}`,
        blocks: [],
      }
      if (slide.rawHtml) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(slide.rawHtml, "text/html")
        const blockTypes: Record<string, number> = {}
        // Count common element types
        const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6").length
        const paragraphs = doc.querySelectorAll("p").length
        const cards = doc.querySelectorAll("[class*='card'], [class*='qcard'], [class*='sub-card']").length
        const lists = doc.querySelectorAll("ul, ol").length
        const images = doc.querySelectorAll("img").length
        const tables = doc.querySelectorAll("table").length
        if (headings) blockTypes["heading"] = headings
        if (paragraphs) blockTypes["paragraph"] = paragraphs
        if (cards) blockTypes["card"] = cards
        if (lists) blockTypes["list"] = lists
        if (images) blockTypes["image"] = images
        if (tables) blockTypes["table"] = tables
        structure.blocks = Object.entries(blockTypes).map(([type, count]) => ({ type, count }))
      }
      slideStructures.push(structure)
    })
  } finally {
    document.body.removeChild(container)
  }

  // Extract design tokens from CSS variables
  const designTokens: TemplateAnalysis["designTokens"] = {}
  if (cssVariables["--accent"]) designTokens.accentColor = cssVariables["--accent"]
  if (cssVariables["--primary"]) designTokens.textColor = cssVariables["--primary"]
  if (cssVariables["--muted"]) designTokens.mutedColor = cssVariables["--muted"]
  if (cssVariables["--hairline"]) designTokens.borderColor = cssVariables["--hairline"]
  if (cssVariables["--font-heading"]) designTokens.headingFont = cssVariables["--font-heading"]
  if (cssVariables["--font-body"]) designTokens.bodyFont = cssVariables["--font-body"]
  if (cssVariables["--font-num"]) designTokens.monoFont = cssVariables["--font-num"]

  // Detect layout style
  let layoutStyle = "single-column"
  if (slideStructures.some((s) => s.blocks.find((b) => b.type === "card" && b.count >= 2))) {
    layoutStyle = "multi-card"
  } else if (slideStructures.some((s) => s.blocks.find((b) => b.type === "list" && b.count >= 2))) {
    layoutStyle = "list-based"
  } else if (slideStructures.some((s) => s.blocks.find((b) => b.type === "table"))) {
    layoutStyle = "table-based"
  }

  return {
    backgroundColor: cssVariables["--bg"] || "#ffffff",
    colorPalette: Array.from(colorPalette).slice(0, 12),
    fontFamilies: Array.from(fontFamilies).slice(0, 6),
    fontSizes: Array.from(fontSizes).sort((a, b) => a - b).slice(0, 8),
    slideCount: slides.length,
    layoutStyle,
    cssVariables,
    designTokens,
    slideStructures,
  }
}

/** Convert rgb(r, g, b) to #rrggbb */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!m) return rgb
  const r = parseInt(m[1], 10)
  const g = parseInt(m[2], 10)
  const b = parseInt(m[3], 10)
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
}

/**
 * Build a very detailed system prompt for the AI, describing the template's
 * visual style so the generated slides match closely.
 */
export function buildTemplatePrompt(analysis: TemplateAnalysis): string {
  const lines: string[] = []
  lines.push("You are an expert HTML slide designer. Generate a complete, self-contained HTML document that contains multiple <section class=\"slide\"> slides based on the user's markdown content.")
  lines.push("")
  lines.push("CRITICAL: The generated slides MUST match the following template's visual style EXACTLY — same colors, fonts, layout patterns, spacing, and design language.")
  lines.push("")
  lines.push("=== TEMPLATE DESIGN SPECIFICATION ===")
  lines.push("")
  lines.push("## Color Palette (CSS Variables — use these exact values)")
  const cssVars = Object.entries(analysis.cssVariables)
  if (cssVars.length > 0) {
    lines.push("The template defines these CSS variables in :root. You MUST include them verbatim in your output:")
    lines.push("```css")
    lines.push(":root {")
    for (const [key, value] of cssVars) {
      lines.push(`  ${key}: ${value};`)
    }
    lines.push("}")
    lines.push("```")
  }
  lines.push("")
  lines.push("## Design Tokens")
  if (analysis.designTokens.accentColor) lines.push(`- Accent color: ${analysis.designTokens.accentColor}`)
  if (analysis.designTokens.textColor) lines.push(`- Text color: ${analysis.designTokens.textColor}`)
  if (analysis.designTokens.mutedColor) lines.push(`- Muted text color: ${analysis.designTokens.mutedColor}`)
  if (analysis.designTokens.borderColor) lines.push(`- Border/hairline color: ${analysis.designTokens.borderColor}`)
  if (analysis.designTokens.headingFont) lines.push(`- Heading font: ${analysis.designTokens.headingFont}`)
  if (analysis.designTokens.bodyFont) lines.push(`- Body font: ${analysis.designTokens.bodyFont}`)
  if (analysis.designTokens.monoFont) lines.push(`- Monospace font: ${analysis.designTokens.monoFont}`)
  lines.push("")
  lines.push("## Extracted Color Palette")
  lines.push(analysis.colorPalette.map((c) => `- ${c}`).join("\n"))
  lines.push("")
  lines.push("## Font Families Used")
  lines.push(analysis.fontFamilies.map((f) => `- ${f}`).join("\n"))
  lines.push("")
  lines.push("## Font Sizes (px, sorted)")
  lines.push(analysis.fontSizes.join(", "))
  lines.push("")
  lines.push(`## Layout Style: ${analysis.layoutStyle}`)
  lines.push(`The template has ${analysis.slideCount} slides. Follow the same layout patterns.`)
  lines.push("")
  lines.push("## Slide Structure Analysis")
  for (const s of analysis.slideStructures.slice(0, 5)) {
    const blockDesc = s.blocks.map((b) => `${b.count}x ${b.type}`).join(", ") || "no blocks detected"
    lines.push(`- Slide ${s.slideIndex + 1} "${s.title}": ${blockDesc}`)
  }
  lines.push("")
  lines.push("=== OUTPUT REQUIREMENTS ===")
  lines.push("")
  lines.push("1. Output a COMPLETE, self-contained HTML document (<!DOCTYPE html>...</html>).")
  lines.push("2. Include ALL CSS in <style> tags in the <head>. Do NOT use external stylesheets (except Google Fonts <link> tags if needed).")
  lines.push("3. Each slide must be a <section class=\"slide\"> with width:1280px and height:720px.")
  lines.push("4. Use the EXACT CSS variables and color palette from the template specification above.")
  lines.push("5. Match the template's font families, font sizes, spacing, and layout patterns.")
  lines.push("6. Each slide should have a clear title, subtitle (if applicable), and content blocks matching the template's style.")
  lines.push("7. Use the same card styles, border treatments, and decorative elements as the template.")
  lines.push("8. The content comes from the user's markdown — adapt it to fit the template's slide structure.")
  lines.push("9. If the markdown has N top-level sections (## headings), generate approximately N slides (or more if content is dense).")
  lines.push("10. Include the @import url(...) for Google Fonts in the <style> block if the template uses them.")
  lines.push('11. Add a page number indicator (e.g., "01 / 24") on each slide if the template has one.')
  lines.push("12. Keep the same background texture/pattern (dot grid, gradients) as the template.")
  lines.push("")
  lines.push("=== OUTPUT FORMAT ===")
  lines.push("Return ONLY the HTML code. Do not wrap it in markdown code fences. Start with <!DOCTYPE html> and end with </html>.")

  return lines.join("\n")
}
