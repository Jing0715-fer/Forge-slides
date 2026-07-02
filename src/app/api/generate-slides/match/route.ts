import { NextRequest, NextResponse } from "next/server"
import { callHermes } from "@/lib/hermes-ai"
import { getJobs, type Job } from "../count/route"

/**
 * Phase 3 of the AI generation flow: template matching.
 *
 * Given the user-edited slides (from Phase 1 + manual edits) and a list of
 * template slides (loaded from a SlideTemplate in the UI), we ask Hermes to
 * decide which template slide best fits each user slide — by layout type,
 * bullet count, image presence, etc.
 *
 * The output is a JSON array of matches that the client uses to render each
 * user slide using the matched template slide's HTML structure (with bullets
 * injected into the right slots). This is why Phase 3 quality is high:
 * we never ask the model to generate free-form HTML — only to choose a
 * template and tell us where each bullet goes.
 */

interface MatchRequest {
  userSlides: UserSlide[]
  templateSummaries: TemplateSlideSummary[]
  /** Markdown source — included in the prompt for context, helps semantic matching */
  markdown?: string
}

interface UserSlide {
  index: number
  title: string
  subtitle?: string
  bullets: string[]
  layout: string
}

interface TemplateSlideSummary {
  index: number
  /** Heuristic label for the slide's layout (e.g. "3-bullet card", "title only") */
  layout: string
  /** Bullet count on this template slide */
  bulletCount: number
  /** Comma-separated text snippet of the slide's first ~150 chars (for semantic match) */
  textPreview: string
  /** True if template slide has a <img> element */
  hasImage: boolean
}

interface MatchEntry {
  userSlideIndex: number
  templateSlideIndex: number
  reasoning: string
}

const PROMPT_TEMPLATE = `You are a presentation layout matcher. Given the user's deck outline (already revised by the user) and a list of available template slides, pair each user slide with the template slide that best matches it visually.

Output STRICT JSON ONLY — no commentary, no markdown fences:
{
  "matches": [
    {"userSlideIndex": 1, "templateSlideIndex": 3, "reasoning": "both are title-only covers"},
    {"userSlideIndex": 2, "templateSlideIndex": 7, "reasoning": "3-bullet content slide"}
  ]
}

Matching rules (in priority order):
1. Layout type first: title-only ↔ title-only, title+bullets ↔ title+bullets, etc.
2. Bullet count: prefer a slide with the closest bullet count (±2 bullets OK).
3. Semantic fit (title keyword overlap, topic relatedness) as tiebreaker.
4. Multiple user slides may use the same template slide — templates are
   infinitely reusable (the renderer clones the HTML and injects content).
5. The cover slide (index 1) should match a template slide with layout title-only.
6. The summary slide (last one) should match a summary-style template slide if
   available, else the closest title+bullets slide.

Here is the user's deck:
{{USER_SLIDES}}

Here are the available template slides:
{{TEMPLATE_SLIDES}}`

function renderUserSlides(slides: UserSlide[]): string {
  return slides
    .map(
      (s) =>
        `  Slide ${s.index}: layout="${s.layout}" title="${escape(s.title)}"` +
        (s.subtitle ? ` subtitle="${escape(s.subtitle)}"` : "") +
        ` bullets=[${s.bullets.map((b) => `"${escape(b)}"`).join(", ")}]`,
    )
    .join("\n")
}

function renderTemplateSlides(slides: TemplateSlideSummary[]): string {
  return slides
    .map(
      (s) =>
        `  Template slide ${s.index}: layout="${s.layout}" bulletCount=${s.bulletCount}` +
        ` hasImage=${s.hasImage ? "yes" : "no"} preview="${escape(s.textPreview)}"`,
    )
    .join("\n")
}

function escape(s: string): string {
  return s.replace(/"/g, '\\"').slice(0, 200)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MatchRequest
    const { userSlides, templateSummaries } = body
    if (!Array.isArray(userSlides) || userSlides.length === 0) {
      return NextResponse.json({ error: "userSlides is required (non-empty array)" }, { status: 400 })
    }
    if (!Array.isArray(templateSummaries) || templateSummaries.length === 0) {
      return NextResponse.json({ error: "templateSummaries is required (non-empty array)" }, { status: 400 })
    }

    const prompt =
      PROMPT_TEMPLATE
        .replace("{{USER_SLIDES}}", renderUserSlides(userSlides))
        .replace("{{TEMPLATE_SLIDES}}", renderTemplateSlides(templateSummaries))

    const jobId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const job: Job = { id: jobId, type: "match", status: "running", startedAt: Date.now() }
    getJobs().set(jobId, job)

    ;(async () => {
      try {
        const result = await callHermes(prompt, { toolsets: "", timeoutMs: 300_000 })
        let parsed = result.json as { matches?: MatchEntry[] } | null
        if (!parsed || !Array.isArray(parsed.matches) || parsed.matches.length === 0) {
          throw new Error(
            `Hermes did not return valid matches JSON. Raw response (first 300): ${result.raw.slice(0, 300)}`,
          )
        }
        // Validate: every user slide must have exactly one match.
        const userIndexes = new Set(userSlides.map((s) => s.index))
        const seen = new Set<number>()
        const matches: MatchEntry[] = []
        for (const m of parsed.matches) {
          if (!userIndexes.has(m.userSlideIndex)) continue
          if (seen.has(m.userSlideIndex)) continue
          // Resolve template index — clamp to valid range, fall back to slide 0
          let tIdx = typeof m.templateSlideIndex === "number" ? m.templateSlideIndex : 1
          if (tIdx < 1) tIdx = 1
          if (tIdx > templateSummaries.length) tIdx = ((tIdx - 1) % templateSummaries.length) + 1
          seen.add(m.userSlideIndex)
          matches.push({
            userSlideIndex: m.userSlideIndex,
            templateSlideIndex: tIdx,
            reasoning: (m.reasoning || "").slice(0, 200),
          })
        }
        // Backfill missing matches — fall back to layout-aligned nearest match.
        for (const us of userSlides) {
          if (seen.has(us.index)) continue
          // First try to find a template with matching layout
          let fallback = templateSummaries.find((t) => t.layout === us.layout)
          if (!fallback) fallback = templateSummaries[0]
          matches.push({
            userSlideIndex: us.index,
            templateSlideIndex: fallback.index,
            reasoning: `fallback: no AI match returned, picked template slide with layout "${fallback.layout}"`,
          })
          seen.add(us.index)
        }
        // Sort by userSlideIndex for stable UI consumption
        matches.sort((a, b) => a.userSlideIndex - b.userSlideIndex)

        getJobs().set(jobId, {
          ...job,
          status: "done",
          result: { matches },
        })
      } catch (err) {
        getJobs().set(jobId, {
          ...job,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    })()

    return NextResponse.json({ jobId, status: "running" })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
