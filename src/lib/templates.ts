import type { Slide } from "@/types/editor"
import { createTextElement, createShapeElement } from "@/store/editor-store"
import { v4 as uuid } from "uuid"

export interface SlideTemplate {
  id: string
  name: string
  description: string
  thumbnail: { bg: string; elements: { x: number; y: number; w: number; h: number; color: string; type: "rect" | "text" | "circle" }[] }
  build: () => Slide
}

const CANVAS_W = 1280
const CANVAS_H = 720

function blankSlide(background: string): Slide {
  return {
    id: uuid(),
    name: "Slide",
    background,
    elements: [],
  }
}

export const TEMPLATES: SlideTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty slide",
    thumbnail: { bg: "#ffffff", elements: [] },
    build: () => blankSlide("#ffffff"),
  },
  {
    id: "title",
    name: "Title Slide",
    description: "Big title + subtitle centered",
    thumbnail: {
      bg: "#0f172a",
      elements: [
        { x: 10, y: 30, w: 80, h: 14, color: "#ffffff", type: "text" },
        { x: 25, y: 50, w: 50, h: 8, color: "#94a3b8", type: "text" },
      ],
    },
    build: () => {
      const slide = blankSlide("#0f172a")
      slide.elements = [
        createTextElement({
          x: 140, y: 240, width: 1000, height: 120,
          text: "Presentation Title",
          fontSize: 72, fontWeight: "700", color: "#ffffff",
          textAlign: "center", verticalAlign: "middle",
          name: "Title",
        }),
        createTextElement({
          x: 240, y: 380, width: 800, height: 56,
          text: "Subtitle or tagline goes here",
          fontSize: 24, fontWeight: "400", color: "#94a3b8",
          textAlign: "center", verticalAlign: "middle",
          name: "Subtitle",
        }),
      ].map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
  {
    id: "title-content",
    name: "Title + Content",
    description: "Title at top, content area below",
    thumbnail: {
      bg: "#ffffff",
      elements: [
        { x: 8, y: 8, w: 60, h: 12, color: "#0f172a", type: "text" },
        { x: 8, y: 28, w: 84, h: 60, color: "#f1f5f9", type: "rect" },
      ],
    },
    build: () => {
      const slide = blankSlide("#ffffff")
      slide.elements = [
        createTextElement({
          x: 80, y: 60, width: 1120, height: 72,
          text: "Slide Title",
          fontSize: 40, fontWeight: "700", color: "#0f172a",
          textAlign: "left", verticalAlign: "middle",
          name: "Title",
        }),
        createTextElement({
          x: 80, y: 180, width: 1120, height: 460,
          text: "Add your content here.\n\nUse the text tools to format this area. You can add bullet points, paragraphs, or any text content.",
          fontSize: 20, fontWeight: "400", color: "#334155",
          textAlign: "left", verticalAlign: "top", lineHeight: 1.6,
          name: "Content",
        }),
      ].map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
  {
    id: "two-column",
    name: "Two Column",
    description: "Title + two content columns",
    thumbnail: {
      bg: "#ffffff",
      elements: [
        { x: 8, y: 6, w: 60, h: 10, color: "#0f172a", type: "text" },
        { x: 6, y: 24, w: 40, h: 60, color: "#e0e7ff", type: "rect" },
        { x: 52, y: 24, w: 40, h: 60, color: "#fef3c7", type: "rect" },
      ],
    },
    build: () => {
      const slide = blankSlide("#ffffff")
      slide.elements = [
        createTextElement({
          x: 80, y: 50, width: 1120, height: 64,
          text: "Two Column Layout",
          fontSize: 36, fontWeight: "700", color: "#0f172a",
          textAlign: "left", verticalAlign: "middle",
          name: "Title",
        }),
        createShapeElement("rect", {
          x: 80, y: 150, width: 540, height: 480,
          fill: "#eef2ff", borderRadius: 16, shadow: true,
          name: "Left Card",
        }),
        createShapeElement("rect", {
          x: 660, y: 150, width: 540, height: 480,
          fill: "#fef3c7", borderRadius: 16, shadow: true,
          name: "Right Card",
        }),
        createTextElement({
          x: 110, y: 180, width: 480, height: 48,
          text: "Left Column",
          fontSize: 24, fontWeight: "600", color: "#1e293b",
          name: "Left Title",
        }),
        createTextElement({
          x: 690, y: 180, width: 480, height: 48,
          text: "Right Column",
          fontSize: 24, fontWeight: "600", color: "#1e293b",
          name: "Right Title",
        }),
        createTextElement({
          x: 110, y: 240, width: 480, height: 360,
          text: "Add content for the left column here.",
          fontSize: 18, color: "#475569", lineHeight: 1.6, verticalAlign: "top",
          name: "Left Body",
        }),
        createTextElement({
          x: 690, y: 240, width: 480, height: 360,
          text: "Add content for the right column here.",
          fontSize: 18, color: "#475569", lineHeight: 1.6, verticalAlign: "top",
          name: "Right Body",
        }),
      ].map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
  {
    id: "three-cards",
    name: "Three Cards",
    description: "Title + three feature cards",
    thumbnail: {
      bg: "#ffffff",
      elements: [
        { x: 8, y: 6, w: 60, h: 10, color: "#0f172a", type: "text" },
        { x: 6, y: 26, w: 26, h: 55, color: "#e0e7ff", type: "rect" },
        { x: 37, y: 26, w: 26, h: 55, color: "#cffafe", type: "rect" },
        { x: 68, y: 26, w: 26, h: 55, color: "#fef3c7", type: "rect" },
      ],
    },
    build: () => {
      const slide = blankSlide("#ffffff")
      const colors = [
        { fill: "#eef2ff", stroke: "#c7d2fe", title: "Feature One", body: "Describe the first feature." },
        { fill: "#ecfeff", stroke: "#a5f3fc", title: "Feature Two", body: "Describe the second feature." },
        { fill: "#fef3c7", stroke: "#fde68a", title: "Feature Three", body: "Describe the third feature." },
      ]
      const elements: any[] = [
        createTextElement({
          x: 80, y: 50, width: 1120, height: 64,
          text: "Three Feature Cards",
          fontSize: 36, fontWeight: "700", color: "#0f172a",
          textAlign: "center", verticalAlign: "middle",
          name: "Title",
        }),
      ]
      colors.forEach((c, i) => {
        const x = 80 + i * 400
        elements.push(
          createShapeElement("rect", {
            x, y: 160, width: 360, height: 440,
            fill: c.fill, stroke: c.stroke, strokeWidth: 1,
            borderRadius: 16, shadow: true,
            name: `Card ${i + 1}`,
          }),
          createTextElement({
            x: x + 24, y: 200, width: 312, height: 44,
            text: c.title, fontSize: 22, fontWeight: "600", color: "#1e293b",
            name: `Title ${i + 1}`,
          }),
          createTextElement({
            x: x + 24, y: 260, width: 312, height: 320,
            text: c.body, fontSize: 16, color: "#475569", lineHeight: 1.6, verticalAlign: "top",
            name: `Body ${i + 1}`,
          }),
        )
      })
      slide.elements = elements.map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
  {
    id: "section",
    name: "Section Divider",
    description: "Large centered section title",
    thumbnail: {
      bg: "#1e293b",
      elements: [
        { x: 15, y: 40, w: 70, h: 18, color: "#ffffff", type: "text" },
        { x: 35, y: 62, w: 30, h: 6, color: "#f59e0b", type: "rect" },
      ],
    },
    build: () => {
      const slide = blankSlide("#1e293b")
      slide.elements = [
        createTextElement({
          x: 100, y: 280, width: 1080, height: 100,
          text: "Section Title",
          fontSize: 64, fontWeight: "700", color: "#ffffff",
          textAlign: "center", verticalAlign: "middle",
          name: "Section Title",
        }),
        createShapeElement("rect", {
          x: 540, y: 400, width: 200, height: 6,
          fill: "#f59e0b", name: "Divider",
        }),
      ].map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
  {
    id: "quote",
    name: "Quote",
    description: "Large quote with attribution",
    thumbnail: {
      bg: "#fafafa",
      elements: [
        { x: 10, y: 30, w: 80, h: 20, color: "#1e293b", type: "text" },
        { x: 35, y: 65, w: 30, h: 8, color: "#64748b", type: "text" },
      ],
    },
    build: () => {
      const slide = blankSlide("#fafafa")
      slide.elements = [
        createTextElement({
          x: 120, y: 200, width: 1040, height: 240,
          text: "\u201CThe best way to predict the future is to create it.\u201D",
          fontSize: 44, fontWeight: "300", color: "#0f172a",
          textAlign: "center", verticalAlign: "middle", lineHeight: 1.4,
          fontStyle: "italic",
          name: "Quote",
        }),
        createTextElement({
          x: 340, y: 480, width: 600, height: 48,
          text: "\u2014 Peter Drucker",
          fontSize: 22, fontWeight: "500", color: "#64748b",
          textAlign: "center", verticalAlign: "middle",
          name: "Attribution",
        }),
      ].map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
  {
    id: "dark-gradient",
    name: "Dark Gradient",
    description: "Dark gradient with title",
    thumbnail: {
      bg: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      elements: [
        { x: 10, y: 35, w: 70, h: 18, color: "#ffffff", type: "text" },
        { x: 15, y: 60, w: 50, h: 8, color: "#e0e7ff", type: "text" },
      ],
    },
    build: () => {
      const slide = blankSlide("linear-gradient(135deg, #6366f1, #8b5cf6)")
      slide.elements = [
        createTextElement({
          x: 100, y: 260, width: 1080, height: 120,
          text: "Gradient Title",
          fontSize: 64, fontWeight: "700", color: "#ffffff",
          textAlign: "center", verticalAlign: "middle",
          name: "Title",
        }),
        createTextElement({
          x: 240, y: 400, width: 800, height: 56,
          text: "Subtitle on a beautiful gradient background",
          fontSize: 22, fontWeight: "400", color: "#e0e7ff",
          textAlign: "center", verticalAlign: "middle",
          name: "Subtitle",
        }),
      ].map((el, i) => ({ ...el, zIndex: i }))
      return slide
    },
  },
]
