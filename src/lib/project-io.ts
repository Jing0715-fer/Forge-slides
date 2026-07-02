import type { Slide, EditorElement } from "@/types/editor"

export interface SlideForgeProject {
  format: "slideforge"
  version: 1
  exportedAt: string
  slides: Slide[]
  currentSlideId: string
  masterElements?: EditorElement[]
}

export function serializeProject(
  slides: Slide[],
  currentSlideId: string,
  masterElements: EditorElement[] = [],
): SlideForgeProject {
  return {
    format: "slideforge",
    version: 1,
    exportedAt: new Date().toISOString(),
    slides: structuredClone(slides),
    currentSlideId,
    masterElements: structuredClone(masterElements),
  }
}

export function downloadProjectFile(
  slides: Slide[],
  currentSlideId: string,
  masterElements: EditorElement[] = [],
  filename = "slideforge-project.json",
): void {
  const project = serializeProject(slides, currentSlideId, masterElements)
  const json = JSON.stringify(project, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ParseResult {
  ok: boolean
  slides?: Slide[]
  currentSlideId?: string
  masterElements?: EditorElement[]
  error?: string
}

export function parseProjectFile(jsonText: string): ParseResult {
  try {
    const data = JSON.parse(jsonText)
    // Accept both our format and a bare slides array
    if (data && data.format === "slideforge" && Array.isArray(data.slides)) {
      return {
        ok: true,
        slides: data.slides,
        currentSlideId: data.currentSlideId,
        masterElements: Array.isArray(data.masterElements) ? data.masterElements : [],
      }
    }
    if (Array.isArray(data) && data.length > 0 && data[0].elements) {
      // Bare slides array
      return { ok: true, slides: data, currentSlideId: data[0].id, masterElements: [] }
    }
    return { ok: false, error: "Unrecognized JSON format. Expected a SlideForge project file or a slides array." }
  } catch (e) {
    return { ok: false, error: "Invalid JSON: " + (e as Error).message }
  }
}

export async function readProjectFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text()
    return parseProjectFile(text)
  } catch (e) {
    return { ok: false, error: "Failed to read file: " + (e as Error).message }
  }
}
