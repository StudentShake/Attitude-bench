/* Chapter registry, in the order AE 426 teaches it. The sidebar, the routes
   and the prev/next links all read from here. */

export const CHAPTERS = [
  { n: 1, slug: "what-is-attitude", title: "What is attitude?", blurb: "Two frames and the gap between them", color: "primary", ready: true },
  { n: 2, slug: "direction-cosine-matrix", title: "The DCM", blurb: "Nine numbers, rows are body axes", color: "dcm", ready: true },
  { n: 3, slug: "euler-angles", title: "Euler angles", blurb: "Three turns in a set order", color: "euler", ready: true },
  { n: 4, slug: "single-axis-rotation", title: "Single-axis rotation", blurb: "One turn about one axis", color: "sar", ready: true },
  { n: 5, slug: "quaternions", title: "Quaternions", blurb: "Half angles, four numbers", color: "quat", ready: true },
  { n: 6, slug: "converting", title: "Converting between them", blurb: "EA → DCM → SAR → q and back", color: "primary", ready: true },
  { n: 7, slug: "attitude-determination", title: "Attitude determination", blurb: "Measured vectors to [Q]", color: "faint", ready: false },
  { n: 8, slug: "star-trackers", title: "Star trackers", blurb: "Pixels to RA, Dec and roll", color: "faint", ready: false },
];

export const chapterBySlug = (slug) => CHAPTERS.find((c) => c.slug === slug) || null;

export function neighbours(slug) {
  const ready = CHAPTERS.filter((c) => c.ready);
  const i = ready.findIndex((c) => c.slug === slug);
  return { prev: i > 0 ? ready[i - 1] : null, next: i >= 0 && i < ready.length - 1 ? ready[i + 1] : null };
}
