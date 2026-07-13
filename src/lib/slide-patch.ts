import type { Slide } from "@/types/editor"

/**
 * Patch a slide's rawHtml to include CSS overrides that force all
 * animation-gated elements visible. This fixes projects where slides 2+
 * show only background (text invisible) because:
 * 1. `.reveal` elements start at `opacity: 0` and only become visible
 *    when the parent `.slide` has the `.visible` class (which the
 *    single-slide editor iframe doesn't add).
 * 2. Various other CSS animation-gating patterns (AOS, scroll-reveal, etc.)
 *
 * The override forces ALL elements inside the slide section to be visible.
 * Idempotent — if already patched, returns the slide unchanged.
 */
export function patchSlideRawHtml(slide: Slide): Slide {
  if (!slide.rawHtml) return slide
  // Check if the rawHtml already has the nuclear override
  if (slide.rawHtml.includes("Force reveal") && slide.rawHtml.includes("visibility: visible !important")) {
    return slide // already patched
  }
  // Inject the override before </style> or </head>
  const override = `
  /* Auto-patched: Force slide section visible + displayed.
     Only override display on the SECTION itself, not children. */
  section, .slide {
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
  }
  /* Force reveal/animation-gated elements visible — opacity/transform only */
  .reveal, .bar, .animate-in, [data-animate], .step,
  .fade-in, .slide-up, .slide-down, .slide-left, .slide-right,
  .zoom-in, .bounce-in, .flip-in, .roll-in, .rotate-in,
  .aos-init, .aos-animate, [data-aos],
  .scroll-animate, .scroll-reveal, .scroll-fade,
  .stagger, .stagger-in,
  .anim, .animated, .animation,
  [data-scroll], [data-animation],
  .page-content, .slide-content {
    opacity: 1 !important;
    transform: none !important;
    visibility: visible !important;
    clip-path: none !important;
    filter: none !important;
  }
  /* Force visibility on ALL descendants — visibility ONLY, not display */
  section, section *, .slide, .slide * {
    visibility: visible !important;
  }
  .skip-link, .deck-controls, [aria-hidden="true"] {
    display: none !important;
  }`
  let patched = slide.rawHtml
  // Try to inject before the last </style>
  const lastStyleClose = patched.lastIndexOf("</style>")
  if (lastStyleClose >= 0) {
    patched = patched.slice(0, lastStyleClose) + override + patched.slice(lastStyleClose)
  } else {
    // No </style> found — inject before </head>
    patched = patched.replace("</head>", `<style>${override}\n</style>\n</head>`)
  }
  return { ...slide, rawHtml: patched }
}
