/**
 * Hermes AI helper — spawns `hermes chat -q` as a child process and parses
 * the JSON-only response. Phase 1 (count) and Phase 3 (match) of the new
 * 3-phase AI generation flow both go through this helper.
 *
 * Hermes output format observed:
 *   ┌─ Reasoning ─────────...─┐
 *   [reasoning text]
 *
 *   session_id: 20260701_...
 *   [actual response — JSON on a single line for our prompts]
 *
 * We strip everything before `session_id:` and then strip any code fences
 * (```json ... ```) the model may add despite instructions. Robust enough
 * to handle the few percent of cases where Hermes decides to add a sentence
 * of text around the JSON — we regex-extract the first {...} or [...] block.
 */
import { spawn } from "child_process"

const HERMES_BIN = process.env.HERMES_BIN || "/Users/lijing/.local/bin/hermes"

export interface HermesCallOptions {
  /** Timeout in milliseconds. Default 180_000 (3 min). AI count/match tasks are bounded. */
  timeoutMs?: number
  /** Toolsets to enable. Default "" (no tool use — keeps responses focused on JSON). */
  toolsets?: string
  /** Model override (e.g. "anthropic/claude-sonnet-4"). Default = user's global config. */
  model?: string
}

export interface HermesCallResult {
  /** The raw text after the session_id: header, trimmed. */
  raw: string
  /** Parsed JSON, if the response was valid JSON. */
  json: unknown | null
  /** Session ID assigned by Hermes (useful for debugging / logs). */
  sessionId: string | null
  /** Total wall time in milliseconds. */
  durationMs: number
}

/** Spawn hermes chat -q with the given prompt and return the JSON-only response. */
export function callHermes(prompt: string, opts: HermesCallOptions = {}): Promise<HermesCallResult> {
  const timeoutMs = opts.timeoutMs ?? 180_000
  const toolsets = opts.toolsets ?? ""
  const start = Date.now()

  return new Promise((resolve, reject) => {
    const args = [
      "chat",
      "-q", prompt,
      "-Q", // quiet mode: suppress banner/spinner/tool previews
    ]
    if (toolsets !== undefined) {
      args.push("--toolsets", toolsets)
    }
    if (opts.model) {
      args.push("-m", opts.model)
    }

    const proc = spawn(HERMES_BIN, args, {
      env: { ...process.env, PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin" },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString() })
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      proc.kill("SIGKILL")
      reject(new Error(`Hermes timed out after ${timeoutMs / 1000}s (stderr: ${stderr.slice(0, 200)})`))
    }, timeoutMs)

    proc.on("error", (err) => {
      clearTimeout(timer)
      reject(new Error(`Failed to spawn hermes at ${HERMES_BIN}: ${err.message}. Is hermes installed?`))
    })

    proc.on("close", (code) => {
      clearTimeout(timer)
      const durationMs = Date.now() - start
      if (code !== 0) {
        reject(new Error(`Hermes exited with code ${code}. stderr: ${stderr.slice(0, 500)}`))
        return
      }

      // Split on session_id: header. Output is:
      //   [reasoning block + blank line]
      //   session_id: 20260701_...
      //   [actual response]
      const idx = stdout.indexOf("session_id:")
      if (idx < 0) {
        // No header — could be a bare response. Use whole stdout.
        const raw = stdout.trim()
        resolve({ raw, json: extractJson(raw), sessionId: null, durationMs })
        return
      }
      // After "session_id: 20260701_..." comes a newline + the actual response.
      const afterHeader = stdout.substring(idx)
      const newlineAfterId = afterHeader.indexOf("\n")
      const sessionId = newlineAfterId > 0
        ? afterHeader.substring("session_id:".length, newlineAfterId).trim()
        : null
      const raw = newlineAfterId > 0
        ? afterHeader.substring(newlineAfterId + 1).trim()
        : afterHeader.substring("session_id:".length).trim()

      resolve({ raw, json: extractJson(raw), sessionId, durationMs })
    })
  })
}

/** Extract a JSON object or array from a string that may contain surrounding prose. */
export function extractJson(text: string): unknown | null {
  // Strip code fences if present.
  const fenceMatch = text.match(/```(?:json|javascript)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]) } catch { /* fall through */ }
  }
  // Find first balanced {...} or [...] block.
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch !== "{" && ch !== "[") continue
    const close = ch === "{" ? "}" : "]"
    let depth = 0
    let inString = false
    let escape = false
    for (let j = i; j < text.length; j++) {
      const c = text[j]
      if (escape) { escape = false; continue }
      if (c === "\\") { escape = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === ch) depth++
      else if (c === close) {
        depth--
        if (depth === 0) {
          const slice = text.substring(i, j + 1)
          try { return JSON.parse(slice) } catch { break }
        }
      }
    }
  }
  // Last resort: whole-string parse.
  try { return JSON.parse(text) } catch { return null }
}
