/* ============================================================================
   CHAPTER REGISTRY
   The sidebar, the routes and the prev/next footer all read from this list.
   To add a chapter: write the component, then flip `ready` and point `element`
   at it in App.jsx.
   ========================================================================== */

export const CHAPTERS = [
  {
    n: 1,
    slug: "what-is-attitude",
    title: "What is Attitude?",
    blurb: "Frames, why pointing matters, and how attitude differs from orbit.",
    ready: true,
  },
  {
    n: 2,
    slug: "direction-cosine-matrix",
    title: "The Direction Cosine Matrix",
    blurb: "Nine numbers, six constraints, and why the rows are the body axes.",
    ready: false,
  },
  {
    n: 3,
    slug: "euler-angles",
    title: "Euler Angles",
    blurb: "Twelve sequences, intrinsic vs extrinsic, and the gimbal-lock cliff.",
    ready: false,
  },
  {
    n: 4,
    slug: "principal-rotation",
    title: "Euler's Theorem",
    blurb: "Any attitude is one turn about one axis.",
    ready: false,
  },
  {
    n: 5,
    slug: "quaternions",
    title: "Quaternions",
    blurb: "Four numbers, no singularities, one double cover.",
    ready: false,
  },
  {
    n: 6,
    slug: "rodrigues-parameters",
    title: "CRP and MRP",
    blurb: "Three-parameter sets, and the price they charge for it.",
    ready: false,
  },
];

export const READY = CHAPTERS.filter((c) => c.ready);

export const chapterBySlug = (slug) => CHAPTERS.find((c) => c.slug === slug) || null;

/** Neighbours in reading order, whether or not they're written yet. */
export function neighbours(slug) {
  const i = CHAPTERS.findIndex((c) => c.slug === slug);
  return {
    prev: i > 0 ? CHAPTERS[i - 1] : null,
    next: i >= 0 && i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null,
  };
}
