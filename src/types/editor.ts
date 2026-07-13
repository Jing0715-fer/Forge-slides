export type ElementType =
  | "text"
  | "rect"
  | "ellipse"
  | "triangle"
  | "line"
  | "image"
  | "container"

export interface BaseElement {
  id: string
  type: ElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  zIndex: number
  // Group membership — elements with the same groupId move/resize together
  groupId?: string
  // Background / fill
  fill?: string
  stroke?: string
  strokeWidth?: number
  borderRadius?: number
  // Shadow
  shadow?: boolean
  shadowColor?: string
  shadowBlur?: number
  shadowX?: number
  shadowY?: number
  // PPT-style entrance animation. The animation plays once when the slide
  // is shown in presentation mode (and when "Preview Animation" is clicked
  // in the editor). `entrance` selects the effect; `entranceDuration` and
  // `entranceDelay` control timing (ms).
  entrance?: EntranceAnimation
  entranceDuration?: number // ms, default 600
  entranceDelay?: number    // ms, default 0
  // PPT-style exit animation. Plays when leaving the slide in presentation
  // mode (before the next slide's entrance animations begin).
  exit?: ExitAnimation
  exitDuration?: number // ms, default 600
  exitDelay?: number    // ms, default 0
  // PPT-style emphasis animation. Loops continuously while the slide is
  // visible in presentation mode (unlike entrance/exit which play once).
  // Useful for drawing attention to an element (pulsing call-to-action,
  // spinning loader icon, wobbling badge, etc.).
  emphasis?: EmphasisAnimation
  emphasisDuration?: number // ms per loop, default 1000
  // Animation trigger — when the entrance animation plays in presentation mode.
  //   "with-slide" — plays automatically when the slide loads (default)
  //   "with-previous" — plays at the same time as the previous element's animation
  //   "on-click" — plays when the user clicks/advances (space/arrow) in presentation
  animationTrigger?: AnimationTrigger
}

/**
 * Animation trigger types (PowerPoint-style "Start" options).
 * - "with-slide": animation starts automatically when the slide loads (default)
 * - "with-previous": animation starts at the same time as the previous element
 * - "on-click": animation starts when the user clicks to advance
 */
export type AnimationTrigger = "with-slide" | "with-previous" | "on-click"

/**
 * Emphasis animation types — loop continuously while the slide is visible.
 * - "none": no emphasis (default)
 * - "pulse": scale 1 → 1.05 → 1 (subtle attention draw)
 * - "spin-continuous": rotate 0 → 360 forever (loader/spinner)
 * - "wiggle": small rotation oscillation ±5° (playful)
 * - "bounce-continuous": translateY 0 → -8 → 0 (floating)
 * - "glow": opacity + box-shadow pulse (highlight)
 * - "shake": horizontal jitter (error/alert)
 * - "flash": opacity 1 → 0.3 → 1 (blink)
 */
export type EmphasisAnimation =
  | "none"
  | "pulse"
  | "spin-continuous"
  | "wiggle"
  | "bounce-continuous"
  | "glow"
  | "shake"
  | "flash"

/**
 * Entrance animation types (PowerPoint-style).
 * - "none": no animation (default)
 * - "fade": opacity 0 → 1
 * - "slide-up" / "slide-down" / "slide-left" / "slide-right": translate + fade
 * - "zoom": scale 0.6 → 1 + fade
 * - "bounce": translateY with overshoot
 * - "spin": rotate 0 → 360 + fade (playful)
 */
export type EntranceAnimation =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "bounce"
  | "spin"

/**
 * Exit animation types — mirror entrance but reversed (element goes FROM
 * its natural state TO hidden). Plays when leaving a slide in presentation
 * mode. Same type values as EntranceAnimation for consistency; the CSS
 * keyframes are reversed.
 */
export type ExitAnimation = EntranceAnimation

export interface TextElement extends BaseElement {
  type: "text"
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: string // "normal" | "bold" | numeric
  fontStyle: "normal" | "italic"
  textDecoration: "none" | "underline" | "line-through"
  textAlign: "left" | "center" | "right" | "justify"
  color: string
  lineHeight: number
  letterSpacing: number
  verticalAlign: "top" | "middle" | "bottom"
  // If true the text auto-sizes its height to content (like a PPT placeholder)
  autoSize: boolean
  padding: number
  // PPT-style list formatting
  listType?: "none" | "bullet" | "number"
  listStyle?: "disc" | "circle" | "square" | "decimal" | "lower-alpha" | "upper-roman"
  listIndent?: number // px indentation for list items
  // Text wrapping behavior:
  //  - true  → text wraps naturally inside the box (paragraphs, long content)
  //  - false → text stays on one line, no wrapping (headings, labels, short text)
  // When importing HTML, this is auto-detected by comparing the text's natural
  // single-line width to the rendered box width.
  wrap?: boolean
}

export interface ShapeElement extends BaseElement {
  type: "rect" | "ellipse" | "triangle" | "line"
}

export interface ImageElement extends BaseElement {
  type: "image"
  src: string
  alt?: string
  objectFit: "cover" | "contain" | "fill"
}

export interface ContainerElement extends BaseElement {
  type: "container"
  // For raw HTML containers (from imported slides)
  html?: string
  // The CSS class name applied to root
  cssClass?: string
}

export type EditorElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | ContainerElement

export interface Slide {
  id: string
  name: string
  background: string
  backgroundImage?: string | null
  elements: EditorElement[]
  // Speaker notes — shown in presenter view, not on the slide itself
  notes?: string
  // Transition type for presentation mode (overrides global setting if set)
  transition?: "none" | "fade" | "slide" | "zoom" | "inherit"
  // Raw HTML mode: when set, the slide is rendered in an iframe for 100%
  // visual fidelity (no parsing artifacts). The `elements` array is empty.
  rawHtml?: string
  // Per-slide canvas dimensions. Defaults to CANVAS_WIDTH × CANVAS_HEIGHT
  // (1280×720) when unset. Imported AI decks that use larger layouts
  // (e.g. Z.ai artifacts at 1280×900) set these so the canvas renders the
  // full content without clipping.
  width?: number
  height?: number
  // Ordered list of element IDs that have entrance animations. The order
  // determines the sequence in which animations play during presentation
  // (when "sequential" playback is selected in the timeline pane).
  animationOrder?: string[]
  // Playback mode for entrance animations on this slide.
  //   "sequential" — elements animate one after another (in animationOrder)
  //   "together"   — all elements animate at once
  animationPlayback?: "sequential" | "together"
}

// Alignment guide lines shown while dragging / resizing
export interface GuideLine {
  // axis
  axis: "x" | "y"
  // pixel position in canvas space
  position: number
  // start/end in the other axis (for rendering the line)
  start: number
  end: number
}

export interface DragSnapResult {
  guides: GuideLine[]
  // offset to apply to satisfy snapping
  dx: number
  dy: number
}
