/* Tiny orthographic projection helpers for the SVG drawings (Z up). */

const D = Math.PI / 180;
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const scale = (a, k) => a.map((v) => v * k);
export const add = (...vs) => [0, 1, 2].map((i) => vs.reduce((s, v) => s + v[i], 0));
export const norm = (a) => { const n = Math.hypot(...a); return a.map((v) => v / n); };

/** Unit vector from azimuth (from +X toward +Y) and elevation (up from the XY plane), degrees. */
export const fromAzEl = (az, el) => [Math.cos(el * D) * Math.cos(az * D), Math.cos(el * D) * Math.sin(az * D), Math.sin(el * D)];

/** A camera looking at the origin from azimuth/elevation (degrees). */
export function ortho(az, el, s, cx, cy) {
  const a = az * D, e = el * D;
  const rgt = [-Math.sin(a), Math.cos(a), 0];
  const up = [-Math.sin(e) * Math.cos(a), -Math.sin(e) * Math.sin(a), Math.cos(e)];
  const fwd = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
  const P = (v) => [cx + dot(v, rgt) * s, cy - dot(v, up) * s];
  return { P, depth: (v) => dot(v, fwd), O: [cx, cy], s };
}

/** SVG path through points. */
export const path = (pts, close = false) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + (close ? " Z" : "");

/** Points of a circle of radius r around centre c, in the plane spanned by unit vectors u, v, from angle t0 to t1 (rad). */
export function arc3(c, u, v, r, t0, t1, n = 48) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / n;
    return add(c, scale(u, r * Math.cos(t)), scale(v, r * Math.sin(t)));
  });
}
