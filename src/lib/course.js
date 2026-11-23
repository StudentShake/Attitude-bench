/**
 * course.js — the AE 426 (Prof. Lovell / Curtis) notation on top of attitude.js.
 *
 * The UI only talks to the engine through this file, so everything a student
 * sees is in the course's own conventions:
 *
 *   [Q]  maps frame 1 to frame 2:  v|2 = Q v|1   (here: inertial -> body)
 *        row i of Q is body axis i written in inertial coordinates.
 *        This is the same matrix as the library's C, so no transpose is needed.
 *   α β γ  1st, 2nd, 3rd rotation of a sequence. 3-2-1 is Q = R1(γ) R2(β) R3(α).
 *        Slide ranges: 0 ≤ α, γ < 360°.
 *   SAR  Euler axis û and principal angle θ in [0°, 180°], from the corrected
 *        23 Jul formulas (γ = +2 sin θ keeps every axis sign).
 *   q    scalar LAST: q = [û sin(θ/2); cos(θ/2)], q4 ≥ 0.
 *        The library is scalar first, so this file reorders and nothing else.
 *
 * Angles in and out of this file are DEGREES. The library stays in radians.
 */

import {
  quatToDCM, dcmToQuat, eulerToDCM, dcmToEuler, normalizeQuat, canonicalQuat,
  isProper, DEG, RAD,
} from "./attitude.js";

const clamp1 = (x) => Math.max(-1, Math.min(1, x));
const norm3 = (v) => Math.hypot(v[0], v[1], v[2]);

/** Put an angle in [0, 360), and snap 359.9999999 to 0 so it never prints as 360.00. */
export function wrap360(deg) {
  let a = ((deg % 360) + 360) % 360;
  if (a > 360 - 1e-9) a = 0;
  return a;
}

/* ---------- quaternion ordering ---------- */

/** Library [q0 q1 q2 q3] (scalar first) -> course [q1 q2 q3 q4] (scalar last). */
export function toCourseQuat(qLib) {
  const q = canonicalQuat(normalizeQuat(qLib));
  let c = [q[1], q[2], q[3], q[0]];
  // At exactly 180° both signs have q4 = 0. Use the same tie-break as SAR:
  // the largest vector component comes out positive.
  if (Math.abs(c[3]) < 1e-12) {
    const big = [0, 1, 2].reduce((b, i) => (Math.abs(c[i]) > Math.abs(c[b]) ? i : b), 0);
    if (c[big] < 0) c = c.map((v) => -v);
  }
  return c;
}

/** Course [q1 q2 q3 q4] -> library [q0 q1 q2 q3]. */
export const fromCourseQuat = (c) => [c[3], c[0], c[1], c[2]];

/* ---------- DCM ---------- */

/** [Q] for a library quaternion. Same matrix as the library's C. */
export const quatToQ = (qLib) => quatToDCM(qLib);

/** Library quaternion for a [Q]. */
export const qFromQ = (Q) => dcmToQuat(Q);

/* ---------- Euler angles ---------- */

/** α, β, γ (degrees) for a sequence like [3, 2, 1], with the slide ranges. */
export function QToEA(Q, seq) {
  const { angles } = dcmToEuler(Q, seq);
  return {
    alpha: wrap360(angles[0] * DEG),
    beta: angles[1] * DEG,
    gamma: wrap360(angles[2] * DEG),
  };
}

/** [Q] for α, β, γ in degrees. For 3-2-1 this is R1(γ) R2(β) R3(α). */
export const EAToQ = (alpha, beta, gamma, seq) =>
  eulerToDCM([alpha * RAD, beta * RAD, gamma * RAD], seq);

/** The slide's closed-form 3-2-1 matrix (14 Jul slide 10), written out longhand. */
export function slideQ321(alphaDeg, betaDeg, gammaDeg) {
  const [a, b, g] = [alphaDeg * RAD, betaDeg * RAD, gammaDeg * RAD];
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const cg = Math.cos(g), sg = Math.sin(g);
  return [
    [ca * cb, sa * cb, -sb],
    [ca * sb * sg - sa * cg, sa * sb * sg + ca * cg, cb * sg],
    [ca * sb * cg + sa * sg, sa * sb * cg - ca * sg, cb * cg],
  ];
}

/* ---------- single-axis rotation (SAR) ---------- */

/**
 * DCM -> SAR with the corrected 23 Jul formulas.
 *   θ = acos((Q11 + Q22 + Q33 − 1) / 2),  0 ≤ θ ≤ 180°
 *   û = (Q23 − Q32, Q31 − Q13, Q12 − Q21) / γ,  γ = +2 sin θ
 * θ = 0: no rotation, so no axis (u = null).
 * θ near 180°: sin θ → 0 and the formula runs out of digits, so the axis comes
 * from the symmetric part instead. At exactly 180° ±û are the same rotation;
 * the largest component is made positive.
 * @returns {{u: number[] | null, theta: number}} theta in degrees
 */
export function QToSAR(Q) {
  const c = clamp1((Q[0][0] + Q[1][1] + Q[2][2] - 1) / 2);
  const w = [Q[1][2] - Q[2][1], Q[2][0] - Q[0][2], Q[0][1] - Q[1][0]];
  // Same angle as the slide's acos(c), since |w| = 2 sin θ. atan2 keeps full
  // precision near 0° and 180°, where acos runs out of digits.
  const theta = Math.atan2(norm3(w) / 2, c);
  if (theta < 1e-7) return { u: null, theta: 0 };
  const s = Math.sin(theta);

  if (s > 1e-4) {
    const gam = 2 * s;
    const u = w.map((v) => v / gam);
    const n = norm3(u);
    return { u: u.map((v) => v / n), theta: theta * DEG };
  }

  // near 180°: (Q + Qᵀ)/2 = (1 − cos θ) û ûᵀ + cos θ I
  const k = 1 - c;
  const B = (i, j) => (Q[i][j] + Q[j][i]) / 2;
  const i0 = [0, 1, 2].reduce((b, i) => (B(i, i) > B(b, b) ? i : b), 0);
  const ui = Math.sqrt(Math.max(0, (B(i0, i0) - c) / k));
  let u = [0, 1, 2].map((j) => (j === i0 ? ui : B(i0, j) / (k * ui)));
  const n = norm3(u);
  u = u.map((v) => v / n);

  const d = u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
  if (Math.abs(d) > 1e-12) {
    if (d < 0) u = u.map((v) => -v);
  } else {
    const big = [0, 1, 2].reduce((b, j) => (Math.abs(u[j]) > Math.abs(u[b]) ? j : b), 0);
    if (u[big] < 0) u = u.map((v) => -v);
  }
  return { u, theta: theta * DEG };
}

/** The slide's SAR -> DCM matrix (14 Jul slide 12), written out longhand. */
export function SARToQ(u, thetaDeg) {
  const n = norm3(u);
  const [x, y, z] = n < 1e-12 ? [1, 0, 0] : u.map((v) => v / n);
  const t = thetaDeg * RAD, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [
    [x * x * k + c, x * y * k + z * s, x * z * k - y * s],
    [x * y * k - z * s, y * y * k + c, y * z * k + x * s],
    [x * z * k + y * s, y * z * k - x * s, z * z * k + c],
  ];
}

/** SAR -> course quaternion: q = [û sin(θ/2); cos(θ/2)]. */
export function SARToQuat(u, thetaDeg) {
  const n = norm3(u);
  const [x, y, z] = n < 1e-12 ? [1, 0, 0] : u.map((v) => v / n);
  const h = (thetaDeg * RAD) / 2, s = Math.sin(h);
  return [x * s, y * s, z * s, Math.cos(h)];
}

/**
 * Course quaternion -> SAR, sign-safe (see errata 2: the slide's square-root
 * form loses axis signs). Uses the q4 ≥ 0 representative, so θ is in [0, 180°].
 */
export function quatToSAR(qc) {
  let q = qc.slice();
  const n4 = Math.hypot(...q);
  q = q.map((v) => v / n4);
  if (q[3] < 0) q = q.map((v) => -v);
  const sv = norm3(q);
  if (sv < 1e-12) return { u: null, theta: 0 };
  return { u: [q[0] / sv, q[1] / sv, q[2] / sv], theta: 2 * Math.atan2(sv, q[3]) * DEG };
}

/* ---------- names ---------- */

export const seqName = (seq) => seq.join("-");
export const seqKind = (seq) => (isProper(seq) ? "symmetric" : "asymmetric");

/** Slide nicknames (14 Jul slide 9). */
export const SEQ_NICKNAME = { "3-2-1": "yaw, pitch, roll", "3-1-3": "classical Euler" };

/* ---------- drawing ---------- */

/**
 * Quaternion for the 3D model, in three.js [x, y, z, w] order.
 * The model is drawn in inertial coordinates, so it needs the ACTIVE rotation
 * that carries the inertial axes onto the body axes. That rotation is Qᵀ, and
 * for the library's quaternion it is q itself (not its conjugate): rotating
 * x̂ by it lands on row 1 of [Q]. course.test.mjs checks this.
 */
export const meshQuat = (qLib) => {
  const q = normalizeQuat(qLib);
  return [q[1], q[2], q[3], q[0]];
};

/** Rotate v by a unit quaternion in [x, y, z, w] order (active, Hamilton). */
export function rotateByXYZW(qx, v) {
  const [x, y, z, w] = qx;
  // t = 2 (q_vec × v);  v' = v + w t + q_vec × t
  const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
  return [
    v[0] + w * t[0] + (y * t[2] - z * t[1]),
    v[1] + w * t[1] + (z * t[0] - x * t[2]),
    v[2] + w * t[2] + (x * t[1] - y * t[0]),
  ];
}
