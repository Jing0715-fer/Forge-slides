import { NextRequest, NextResponse } from "next/server"
import { callHermes, extractJson } from "@/lib/hermes-ai"

/**
 * Phase 1 of the AI generation flow: count + outline.
 *
 * The user pastes markdown; we ask Hermes (the user's configured model) to
 * decide how many slides the deck should have and what each slide should
 * cover. We deliberately do NOT ask for HTML here — keeping it structured
 * JSON only (titles + bullets + layout hints) means:
 *   - Smaller, faster token usage → faster response
 *   - User can review and edit the outline in the UI before any HTML exists
 *   - Phase 3 (template match) becomes a content-injection task, not a
 *     free-form generation task → much higher visual quality
 *
 * Hermes is spawned as a child process (cold-start ~30-40s). To avoid
 * gateway 60s timeouts we return a jobId immediately and let the client
 * poll /api/generate-slides/poll for the result.
 */

interface CountRequest {
  markdown: string
}

interface ProposedSlide {
  index: number
  title: string
  /** Short subtitle / one-line description shown under the title (optional) */
  subtitle?: string
  /** 2-6 bullet points covering this slide's content. Empty array for divider/intro slides. */
  bullets: string[]
  /** Visual layout hint for Phase 3 — drives template matching. */
  layout: "title-only" | "title+bullets" | "title+image" | "section-divider" | "quote" | "summary"
  /** Optional image URL or caption ("see fig. 3", "logo") the user could fill in */
  image?: string
}

const PROMPT_TEMPLATE = `You are a senior presentation designer. Given a markdown document, decide how many slides the deck should have (3-15, no more) and produce a structured outline for each slide.

Output STRICT JSON ONLY — no commentary, no markdown fences, no prose:
{
  "deckTitle": "short deck title shown on the first slide",
  "deckSubtitle": "one-line subtitle (optional, omit if not applicable)",
  "slides": [
    {
      "index": 1,
      "title": "Slide headline",
      "subtitle": "optional one-line subhead",
      "bullets": ["key point 1", "key point 2"],
      "layout": "title+bullets",
      "image": null
    }
  ]
}

Layout values: "title-only" (cover slide), "title+bullets" (most content slides),
"title+image" (slide with one hero image + a few bullets), "section-divider" (large
title only, signals a new section), "quote" (large quote with attribution), "summary"
(closing summary).

Rules:
- Slide 1 should usually be layout "title-only" (cover) — use deckTitle as its title
- Last slide should usually be "summary" (key takeaways)
- Use "section-divider" sparingly to break long decks into 2-3 chapters
- Each bullet must be self-contained (don't say "see above")
- 2-6 bullets per slide, bias toward 3-4
- Capture every distinct idea from the markdown — don't drop content
- If markdown has H1/H2 headings, those usually become slide titles
- Output MUST be valid parseable JSON. No trailing commas. No \`\`\` blocks.

Markdown content:
---
{{MARKDOWN}}
---`

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CountRequest
    const { markdown } = body
    if (!markdown || typeof markdown !== "string" || !markdown.trim()) {
      return NextResponse.json({ error: "markdown is required" }, { status: 400 })
    }
    if (markdown.length > 50_000) {
      return NextResponse.json({ error: "markdown too large (max 50K chars)" }, { status: 400 })
    }

    const prompt = PROMPT_TEMPLATE.replace("{{MARKDOWN}}", markdown)
    const jobId = `count-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setGlobalJob(jobId, { id: jobId, type: "count", status: "running", startedAt: Date.now() })

    // Spawn hermes in the background; return immediately with jobId.
    ;(async () => {
      try {
        const result = await callHermes(prompt, { toolsets: "", timeoutMs: 300_000 })
        let parsed = result.json as { deckTitle?: string; deckSubtitle?: string; slides?: ProposedSlide[] } | null
        if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
          // Try one more time without the JSON extraction — some models wrap in prose.
          const retry = extractJson(result.raw)
          if (retry && typeof retry === "object") parsed = retry as typeof parsed
        }
        if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
          throw new Error(
            `Hermes did not return valid JSON. Raw response (first 300 chars): ${result.raw.slice(0, 300)}`,
          )
        }
        // Validate each slide
        for (const s of parsed.slides) {
          if (!s.title || typeof s.title !== "string") s.title = `Slide ${s.index}`
          if (!Array.isArray(s.bullets)) s.bullets = []
          if (!s.layout) s.layout = "title+bullets"
        }
        setGlobalJob(jobId, {
          id: jobId,
          type: "count",
          status: "done",
          startedAt: getJob(jobId)?.startedAt || Date.now(),
          result: parsed,
        })
      } catch (err) {
        setGlobalJob(jobId, {
          id: jobId,
          type: "count",
          status: "error",
          startedAt: getJob(jobId)?.startedAt || Date.now(),
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    })()

    return NextResponse.json({ jobId, status: "running" })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}

// --- shared job store (also used by match route + poll route) ---
export interface Job {
  id: string
  type: "count" | "match"
  status: "running" | "done" | "error"
  startedAt: number
  result?: unknown
  error?: string
}

declare global {
  // eslint-disable-next-line no-var
  var __aiJobs: Map<string, Job> | undefined
}

export function getJobs(): Map<string, Job> {
  if (!globalThis.__aiJobs) globalThis.__aiJobs = new Map()
  return globalThis.__aiJobs
}

function getJob(id: string): Job | undefined {
  return getJobs().get(id)
}

function setGlobalJob(id: string, j: Job) {
  getJobs().set(id, j)
}
