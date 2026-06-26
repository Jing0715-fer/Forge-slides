"use client"

import React from "react"
import type { EditorElement, TextElement, ShapeElement, ImageElement, ContainerElement } from "@/types/editor"

interface Props {
  element: EditorElement
}

/**
 * Read-only renderer for master elements.
 * Master elements appear on all slides and cannot be selected/edited directly.
 * They render with pointer-events: none so they don't block regular elements.
 */
export function MasterElementView({ element: el }: Props) {
  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: `rotate(${el.rotation}deg)`,
    opacity: el.opacity,
    zIndex: el.zIndex,
    visibility: el.visible ? "visible" : "hidden",
    pointerEvents: "none",
  }

  const shadowStyle: React.CSSProperties = el.shadow
    ? {
        boxShadow: `${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur || 24}px ${el.shadowColor || "rgba(15,23,42,0.15)"}`,
      }
    : {}

  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: el.fill,
    border: el.strokeWidth && el.stroke && el.stroke !== "transparent"
      ? `${el.strokeWidth}px solid ${el.stroke}`
      : "none",
    borderRadius: el.borderRadius,
    ...shadowStyle,
    overflow: "hidden",
  }

  return (
    <div style={wrapperStyle} data-master-element-id={el.id}>
      {renderContent(el, baseStyle)}
    </div>
  )
}

function renderContent(el: EditorElement, baseStyle: React.CSSProperties): React.ReactNode {
  switch (el.type) {
    case "text": {
      const t = el as TextElement
      return (
        <div
          style={{
            ...baseStyle,
            fontSize: t.fontSize,
            fontFamily: t.fontFamily,
            fontWeight: t.fontWeight,
            fontStyle: t.fontStyle,
            textDecoration: t.textDecoration,
            textAlign: t.textAlign,
            color: t.color,
            lineHeight: t.lineHeight,
            letterSpacing: t.letterSpacing,
            padding: t.padding,
            display: "flex",
            flexDirection: "column",
            justifyContent:
              t.verticalAlign === "top"
                ? "flex-start"
                : t.verticalAlign === "bottom"
                  ? "flex-end"
                  : "center",
            background: t.fill,
            border: "none",
            borderRadius: t.borderRadius,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          className="whitespace-pre-wrap break-words"
        >
          {t.text}
        </div>
      )
    }
    case "rect":
      return <div style={baseStyle} />
    case "ellipse":
      return <div style={{ ...baseStyle, borderRadius: "50%" }} />
    case "triangle": {
      const s = el as ShapeElement
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${s.width} ${s.height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <polygon
            points={`${s.width / 2},0 ${s.width},${s.height} 0,${s.height}`}
            fill={s.fill || "#f59e0b"}
            stroke={s.stroke || "transparent"}
            strokeWidth={s.strokeWidth || 0}
          />
        </svg>
      )
    }
    case "line": {
      const s = el as ShapeElement
      return (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: s.height / 2 - (s.strokeWidth || 2) / 2,
            width: "100%",
            height: s.strokeWidth || 2,
            background: s.stroke || "#0f172a",
          }}
        />
      )
    }
    case "image": {
      const i = el as ImageElement
      return (
        <img
          src={i.src}
          alt={i.alt || ""}
          draggable={false}
          style={{
            ...baseStyle,
            objectFit: i.objectFit,
            background: "transparent",
            border: "none",
          }}
        />
      )
    }
    case "container": {
      const c = el as ContainerElement
      return <div style={{ ...baseStyle }} dangerouslySetInnerHTML={{ __html: c.html || "" }} />
    }
  }
}
