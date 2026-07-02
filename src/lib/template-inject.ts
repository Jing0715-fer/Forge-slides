/**
 * Content-injection helpers used by the AI Generate flow's Phase 3.
 *
 * Given a template slide's raw HTML + the user-edited slide content
 * (title, subtitle, bullets, optional image URL), produce a new raw HTML
 * string where the template's title/heading and bullet list have been
 * replaced with the user's content, while preserving all CSS styles and
 * layout structure from the template.
 *
 * The result can be passed directly to `parseHtmlToRawSlides()` to render
 * the slide in the editor with full visual fidelity to the template.
 *
 * Browser-only. Uses DOMParser.
 */

export interface InjectedContent {
  title: string
  subtitle?: string
  bullets: string[]
  image?: string | null
}

/**
 * Walk the slide section's DOM and rewrite text content to match the user's
 * edited slide content. Strategy:
 *   1. First <h1> (or <h2> if no h1) → replaced with user's title
 *   2. Next <h1/h2/h3/h4> → replaced with user's subtitle (if provided)
 *   3. <ul> / <ol> → bullets replaced with user's bullets (cloned or trimmed)
 *   4. <img> → src replaced with user's image URL (if provided)
 *
 * Everything else (colors, fonts, layout containers, decorative elements) is
 * left untouched.
 */
export function injectContentIntoTemplateHtml(
  templateRawHtml: string,
  content: InjectedContent,
): string {
  if (typeof window === "undefined" || !templateRawHtml) {
    // SSR fallback: return original (caller should not invoke during SSR)
    return templateRawHtml
  }

  const doc = new DOMParser().parseFromString(templateRawHtml, "text/html")
  // The templateRawHtml might be a complete <section class="slide"> or a
  // full document. Find the slide container to scope our edits.
  let scope: Element | null =
    doc.querySelector("section.slide, section[data-slide], [class*='slide']") ||
    doc.body?.firstElementChild ||
    doc.body
  if (!scope) return templateRawHtml

  // 1. Title injection — first heading becomes the slide title.
  const titleEl = scope.querySelector("h1, h2, h3")
  if (titleEl) {
    titleEl.textContent = content.title || titleEl.textContent || ""
  }

  // 2. Subtitle injection — second heading (if exists) becomes the subtitle.
  const allHeadings = scope.querySelectorAll("h1, h2, h3, h4")
  if (content.subtitle && allHeadings.length >= 2) {
    allHeadings[1].textContent = content.subtitle
  }

  // 3. Bullets injection — find first <ul>/<ol>, replace <li> children.
  const listEl = scope.querySelector("ul, ol")
  if (listEl) {
    const userBullets = content.bullets.filter((b) => b && b.trim())
    const existingItems = Array.from(listEl.querySelectorAll("li"))
    if (userBullets.length === 0) {
      // User has no bullets — hide the list if there was one.
      listEl.remove()
    } else if (existingItems.length === 0) {
      // List container but no items — just add fresh ones.
      for (const b of userBullets) {
        const li = doc.createElement("li")
        li.textContent = b
        listEl.appendChild(li)
      }
    } else {
      // Replace text of first N items, delete the rest
      existingItems.forEach((li, idx) => {
        if (idx < userBullets.length) {
          li.textContent = userBullets[idx]
        } else {
          li.remove()
        }
      })
      // If user has more bullets than template items, append new ones
      for (let i = existingItems.length; i < userBullets.length; i++) {
        const newLi = doc.createElement("li")
        newLi.textContent = userBullets[i]
        listEl.appendChild(newLi)
      }
    }
  } else if (content.bullets.filter((b) => b && b.trim()).length > 0) {
    // No list in template, but user has bullets — append a <ul> at end
    const ul = doc.createElement("ul")
    for (const b of content.bullets) {
      if (!b || !b.trim()) continue
      const li = doc.createElement("li")
      li.textContent = b
      ul.appendChild(li)
    }
    scope.appendChild(ul)
  }

  // 4. Image injection
  if (content.image) {
    const img = scope.querySelector("img")
    if (img) {
      img.setAttribute("src", content.image)
      img.setAttribute("alt", content.title || "")
    }
  }

  // Return the outerHTML of the slide section if we found one, else the whole body.
  const slideEl =
    doc.querySelector("section.slide, section[data-slide], [class*='slide']") ||
    scope
  return slideEl.outerHTML
}

/**
 * Build a full HTML document wrapping a single slide's section HTML so it can
 * be parsed by the same parseHtmlToRawSlides pipeline. Inline styles from the
 * template's <style> blocks are preserved.
 */
export function buildInjectedHtmlDoc(
  templateFullHtml: string,
  content: InjectedContent,
): string {
  if (typeof window === "undefined") return ""
  const parser = new DOMParser()
  const srcDoc = parser.parseFromString(templateFullHtml, "text/html")

  // Pull style/link tags verbatim from the source
  const styleBlocks = Array.from(srcDoc.querySelectorAll("style"))
    .map((s) => s.outerHTML)
    .join("\n")
  const linkTags = Array.from(srcDoc.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => l.outerHTML)
    .join("\n")

  // Get the slide section's outerHTML
  let slideEl =
    srcDoc.querySelector("section.slide, section[data-slide], [class*='slide']") ||
    srcDoc.body?.firstElementChild
  if (!slideEl) return ""

  // Apply injection by reusing our helper on the section in isolation
  const injectedHtml = injectContentIntoTemplateHtml(slideEl.outerHTML, content)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280, initial-scale=1.0">
${linkTags}
${styleBlocks}
<style>
  html, body { margin: 0; padding: 0; width: 1280px; height: 720px; overflow: hidden; background: #FAF9F6; }
  .slide, section.slide, [data-slide] { display: block !important; width: 1280px; height: 720px; }
</style>
</head>
<body>
${injectedHtml}
</body>
</html>`
}
