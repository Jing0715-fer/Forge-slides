import { NextRequest, NextResponse } from "next/server"
import { getJobs } from "../count/route"

/**
 * Poll endpoint shared by both Phase 1 (count) and Phase 3 (match).
 *
 * The client polls every 2-3s while waiting for Hermes to finish. Each poll
 * is well under the gateway 60s timeout (Hermes already finished by then —
 * we're just reading from in-memory store). After a 'done' or 'error' result
 * is returned, the job is removed from memory.
 *
 * Jobs older than 10 minutes are also cleaned up on each poll to bound memory.
 */

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("id")
  if (!jobId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const jobs = getJobs()
  const job = jobs.get(jobId)
  if (!job) {
    return NextResponse.json({ status: "not_found" }, { status: 404 })
  }

  // Cleanup: delete jobs older than 10 minutes
  const now = Date.now()
  for (const [id, j] of jobs) {
    if (now - j.startedAt > 10 * 60 * 1000) jobs.delete(id)
  }

  if (job.status === "running") {
    return NextResponse.json({ status: "running", type: job.type })
  }
  if (job.status === "done") {
    jobs.delete(jobId)
    return NextResponse.json({
      status: "done",
      type: job.type,
      result: job.result,
    })
  }
  // error
  jobs.delete(jobId)
  return NextResponse.json({
    status: "error",
    type: job.type,
    error: job.error || "Unknown error",
  })
}
