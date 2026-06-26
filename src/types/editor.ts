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
}

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
