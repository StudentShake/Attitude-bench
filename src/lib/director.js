/**
 * director.js — animations as pure functions of time.
 *
 * Every state(t) here is built from the verified library (partial Euler angles
 * through EAToQ, partial θ through the SAR quaternion), so whatever the cards
 * read off a frame of an animation is real math, and scrubbing is free.
 */
import { dcmToQuat, canonicalQuat, normalizeQuat, RAD } from "./attitude.js";
import { EAToQ, SARToQuat, fromCourseQuat, meshQuat, rotateByXYZW } from "./course.js";

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const wrap180 = (d) => { const a = ((d + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };

const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const quatOfEA = (a, b, g, seq) => canonicalQuat(dcmToQuat(EAToQ(a, b, g, seq)));

/**
 * One frame of an Euler sequence being built, one rotation at a time.
 * t runs 0 → 3; step k (0, 1, 2) occupies [k, k+1].
 * @param angles [α, β, γ] in degrees (any range; α and γ animate the short way)
 */
export function eulerFrame(seq, angles, t) {
  const target = [wrap180(angles[0]), angles[1], wrap180(angles[2])];
  const s = [0, 1, 2].map((k) => easeInOut(clamp01(t - k)));
  const part = target.map((v, k) => v * s[k]);
  const quat = quatOfEA(part[0], part[1], part[2], seq);

  const k = Math.min(2, Math.floor(Math.max(0, t)));
  const done = t >= 3 - 1e-9;
  // the frame the current step starts from: the previous steps, fully applied
  const before = [0, 1, 2].map((j) => (j < k ? target[j] : 0));
  const prevQuat = quatOfEA(before[0], before[1], before[2], seq);
  const m = meshQuat(prevQuat);
  const a = seq[k] - 1;
  const spin = done ? null : {
    axisIndex: a,
    axis: rotateByXYZW(m, E[a]),
    arcFrom: rotateByXYZW(m, E[(a + 1) % 3]),
    angle: part[k] * RAD,
  };
  const ghosts = !done && k >= 1 ? [{ quat: prevQuat, mark: String(k) }] : [];
  return { quat, step: done ? 3 : k, spin, ghosts, part };
}

/** One frame of the single turn: θ grows from 0 about a fixed û. t runs 0 → 1. */
export function sarFrame(u, thetaDeg, t) {
  const th = thetaDeg * easeInOut(clamp01(t));
  const quat = canonicalQuat(normalizeQuat(fromCourseQuat(SARToQuat(u, th))));
  const done = t >= 1 - 1e-9;
  return { quat, theta: th, spin: done ? null : { axis: u, angle: th * RAD } };
}

/** Shortest-path interpolation between two library quaternions (display only). */
export function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { d = -d; bb = b.map((v) => -v); }
  if (d > 0.9995) return canonicalQuat(normalizeQuat(a.map((v, i) => v + (bb[i] - v) * t)));
  const th = Math.acos(d), sn = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / sn, wb = Math.sin(t * th) / sn;
  return canonicalQuat(a.map((v, i) => wa * v + wb * bb[i]));
}
