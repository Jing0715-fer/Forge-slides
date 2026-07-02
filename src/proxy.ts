import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Strip Next.js's prerender cache headers so browsers / service workers
 * don't hold onto HTML that references stale chunk hashes from a previous
 * build. Without this, a page gets served with chunk paths that no longer
 * exist on disk → 404 ChunkLoadError until the user does a hard refresh.
 *
 * Only HTML and RSC payloads get the no-store treatment; hashed static
 * assets in /_next/static/* keep their long-lived caching since their
 * filenames change between builds.
 */
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const accept = request.headers.get("accept") || ""
  const isHtmlOrRsc =
    accept.includes("text/html") ||
    request.headers.get("rsc") !== null ||
    request.headers.get("next-router-state-tree") !== null
  if (isHtmlOrRsc) {
    // Override Next.js's default `s-maxage=31536000` for HTML/RSC so the
    // browser will revalidate on every navigation.
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }
  return response
}

export const config = {
  // Match everything except Next internals + the static asset path. Static
  // chunks are content-hashed and safe to cache forever.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
