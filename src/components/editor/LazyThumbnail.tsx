"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/store/editor-store"
import type { Slide } from "@/types/editor"
import { FileText } from "lucide-react"

/**
 * In-memory PNG snapshot cache for slide thumbnails.
 *
 * Key: a hash of the slide's rawHtml (or element JSON for native slides).
 * Value: a data URL (PNG) of the rendered slide.
 *
 * Once a thumbnail is captured, subsequent renders use the cached PNG
 * instead of re-mounting the iframe — this eliminates font reloading,
 * script execution, and layout reflow when scrolling back to a slide
 * the user has already seen. The cache is session-scoped (in-memory)
 * to avoid localStorage quota issues with large PNG data URLs.
 */
const thumbnailCache = new Map<string, string>()

function hashContent(slide: Slide): string {
  if (slide.rawHtml) {
    // Simple hash of the HTML content — good enough for cache keys
    let hash = 0
    const str = slide.rawHtml
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `raw-${slide.id}-${hash}`
  }
  // For native slides, hash the element positions
  const elStr = slide.elements.map(e => `${e.id}:${e.x}:${e.y}:${e.w}`).join(",")
  return `native-${slide.id}-${elStr.length}`
}

/**
 * Capture an iframe element as a PNG data URL.
 * Uses SVG foreignObject → canvas technique (same as batch PNG export).
 * Returns null if capture fails (e.g. cross-origin content taint).
 */
async function captureIframeAsPng(iframe: HTMLIFrameElement, w: number, h: number): Promise<string | null> {
  try {
    const doc = iframe.contentDocument
    if (!doc) return null
    await new Promise(r => setTimeout(r, 200)) // let fonts settle
    const html = doc.documentElement.outerHTML
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;overflow:hidden;">
      ${html}
    </div>
  </foreignObject>
</svg>`
    const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          // Downscale to thumbnail size to keep cache small
          const thumbW = 200
          const thumbH = Math.round((thumbW * h) / w)
          canvas.width = thumbW
          canvas.height = thumbH
          const ctx = canvas.getContext("2d")
          if (!ctx) { resolve(null); return }
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, thumbW, thumbH)
          ctx.drawImage(img, 0, 0, thumbW, thumbH)
          resolve(canvas.toDataURL("image/jpeg", 0.7))
        } catch {
          resolve(null) // canvas tainted
        }
      }
      img.onerror = () => resolve(null)
      img.src = svgDataUrl
    })
  } catch {
    return null
  }
}

/**
 * Lazy-loaded slide thumbnail with PNG snapshot caching.
 *
 * Renders a lightweight placeholder until scrolled into view, then mounts
 * the iframe. After the iframe loads, captures a PNG snapshot and caches it.
 * On subsequent renders (e.g. scrolling back), uses the cached PNG instead
 * of re-mounting the iframe — eliminates font/script reload overhead.
 */
export function LazyThumbnail({
  slide,
  index,
  panelWidth = 96,
}: {
  slide: Slide
  index: number
  panelWidth?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [visible, setVisible] = useState(false)
  const [cachedPng, setCachedPng] = useState<string | null>(null)
  const [captured, setCaptured] = useState(false)

  const cacheKey = hashContent(slide)

  // Check cache on mount / when slide changes
  useEffect(() => {
    const cached = thumbnailCache.get(cacheKey)
    if (cached) {
      setCachedPng(cached)
      setCaptured(true)
    } else {
      setCachedPng(null)
      setCaptured(false)
    }
  }, [cacheKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { root: null, rootMargin: "50px 50px 50px 50px", threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // After iframe loads, capture a PNG snapshot and cache it
  const handleIframeLoad = useCallback(() => {
    if (captured || !iframeRef.current) return
    const slideW = slide.width || CANVAS_WIDTH
    const slideH = slide.height || CANVAS_HEIGHT
    // Delay to let fonts/layout settle
    setTimeout(async () => {
      const png = await captureIframeAsPng(iframeRef.current!, slideW, slideH)
      if (png) {
        thumbnailCache.set(cacheKey, png)
        setCachedPng(png)
        setCaptured(true)
      }
    }, 500)
  }, [captured, cacheKey, slide.width, slide.height])

  const slideW = slide.width || CANVAS_WIDTH
  const slideH = slide.height || CANVAS_HEIGHT
  const scale = panelWidth / slideW

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
    <div
      className="absolute top-0 left-0 origin-top-left"
      style={{
        width: slideW,
        height: slideH,
        // Scale down then translate to center within the parent container.
        // translate must use the SCALED dimensions (panelWidth, slideH*scale),
        // not the original dimensions, to avoid offsetting content off-screen.
        transform: `scale(${scale}) translate(${slideW / 2 - panelWidth / (2 * scale)}px, ${slideH / 2 - (slideH * scale) / (2 * scale)}px)`,
      }}
    >
      {/* If we have a cached PNG, use it — no iframe needed */}
      {cachedPng ? (
        <img
          src={cachedPng}
          alt={`Slide ${index + 1}`}
          className="absolute top-0 left-0"
          style={{ width: slideW, height: slideH }}
        />
      ) : !visible ? (
        // Placeholder — cheap, paints immediately
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: slide.background,
            backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="flex flex-col items-center gap-2 opacity-40"
            style={{ transform: `scale(${slideW / panelWidth})`, transformOrigin: "center" }}
          >
            <FileText className="w-8 h-8 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">
              {index + 1}
            </span>
          </div>
        </div>
      ) : slide.rawHtml ? (
        <iframe
          ref={iframeRef}
          className="absolute top-0 left-0 border-none"
          style={{ width: slideW, height: slideH, pointerEvents: "none" }}
          srcDoc={slide.rawHtml}
          sandbox="allow-same-origin allow-scripts"
          title={`Slide ${index + 1} preview`}
          onLoad={handleIframeLoad}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: slide.background,
            backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {slide.elements.slice().sort((a, b) => a.zIndex - b.zIndex).map(el => (
            <div
              key={el.id}
              className="absolute"
              style={{
                left: el.x, top: el.y, width: el.width, height: el.height,
                background: el.fill && el.fill !== "transparent" ? el.fill : undefined,
                opacity: el.opacity,
              }}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  )
}
