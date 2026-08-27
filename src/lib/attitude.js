/**
 * attitude.js — conversions between attitude representations.
 *
 * CONVENTIONS (fixed internally; the UI transposes/reorders at the display layer)
 *   - DCM `C` maps inertial to body:  v_body = C * v_inertial
 *   - Quaternion `q = [q0, q1, q2, q3]`, SCALAR FIRST, same inertial->body sense
 *   - Euler sequences are INTRINSIC (successive body axes):
 *       sequence (i, j, k)  =>  C = M_k(t3) * M_j(t2) * M_i(t1)
 *   - Elementary matrices are frame-rotation ("passive") matrices:
 *       M1(a) = [[1,0,0],[0,c,s],[0,-s,c]]
 *   - Angles in radians everywhere. Convert at the boundary.
 */

const EPS = 1e-9;

/* ---------- small matrix helpers ---------- */

export const mul = (A, B) => {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      C[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
  return C;
};

export const transpose = (A) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[c][r]));

export const M1 = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[1, 0, 0], [0, c, s], [0, -s, c]];
};
export const M2 = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
};
export const M3 = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
};
const M = [null, M1, M2, M3];

/** true if (a,b,c) is a cyclic permutation of (1,2,3) */
const cyclic = (a, b, c) => (b - a + 3) % 3 === 1 && (c - b + 3) % 3 === 1;

/* ---------- quaternion <-> DCM ---------- */

export function normalizeQuat(q) {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  if (n < EPS) return [1, 0, 0, 0];
  return q.map((v) => v / n);
}

/** Force the scalar part non-negative (q and -q are the same rotation). */
export function canonicalQuat(q) {
  return q[0] < 0 ? q.map((v) => -v) : q.slice();
}

export function quatToDCM(qIn) {
  const [q0, q1, q2, q3] = normalizeQuat(qIn);
  return [
    [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 + q0 * q3), 2 * (q1 * q3 - q0 * q2)],
    [2 * (q1 * q2 - q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 + q0 * q1)],
    [2 * (q1 * q3 + q0 * q2), 2 * (q2 * q3 - q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3],
  ];
}

/** Shepperd's method — numerically stable for every rotation, including 180 deg. */
export function dcmToQuat(C) {
  const tr = C[0][0] + C[1][1] + C[2][2];
  const cands = [tr, C[0][0], C[1][1], C[2][2]];
  let best = 0;
  for (let i = 1; i < 4; i++) if (cands[i] > cands[best]) best = i;

  let q;
  if (best === 0) {
    const s = Math.sqrt(1 + tr) * 2;
    q = [s / 4, (C[1][2] - C[2][1]) / s, (C[2][0] - C[0][2]) / s, (C[0][1] - C[1][0]) / s];
  } else if (best === 1) {
    const s = Math.sqrt(1 + C[0][0] - C[1][1] - C[2][2]) * 2;
    q = [(C[1][2] - C[2][1]) / s, s / 4, (C[0][1] + C[1][0]) / s, (C[2][0] + C[0][2]) / s];
  } else if (best === 2) {
    const s = Math.sqrt(1 - C[0][0] + C[1][1] - C[2][2]) * 2;
    q = [(C[2][0] - C[0][2]) / s, (C[0][1] + C[1][0]) / s, s / 4, (C[1][2] + C[2][1]) / s];
  } else {
    const s = Math.sqrt(1 - C[0][0] - C[1][1] + C[2][2]) * 2;
    q = [(C[0][1] - C[1][0]) / s, (C[2][0] + C[0][2]) / s, (C[1][2] + C[2][1]) / s, s / 4];
  }
  return canonicalQuat(normalizeQuat(q));
}

/* ---------- principal rotation vector (axis-angle) ---------- */

/** @returns {{axis: number[], angle: number}} angle in [0, pi] */
export function quatToAxisAngle(qIn) {
  const q = canonicalQuat(normalizeQuat(qIn));
  const sinHalf = Math.hypot(q[1], q[2], q[3]);
  const angle = 2 * Math.atan2(sinHalf, q[0]);
  if (sinHalf < EPS) return { axis: [1, 0, 0], angle: 0 }; // identity: axis undefined
  return { axis: [q[1] / sinHalf, q[2] / sinHalf, q[3] / sinHalf], angle };
}

export function axisAngleToQuat(axis, angle) {
  const n = Math.hypot(...axis);
  const a = n < EPS ? [1, 0, 0] : axis.map((v) => v / n);
  const s = Math.sin(angle / 2);
  return canonicalQuat([Math.cos(angle / 2), a[0] * s, a[1] * s, a[2] * s]);
}

/* ---------- Rodrigues parameters ---------- */

/** Classical Rodrigues params (Gibbs vector). Singular at 180 deg. */
export function quatToCRP(qIn) {
  const q = canonicalQuat(normalizeQuat(qIn));
  if (Math.abs(q[0]) < 1e-8) return null; // singular
  return [q[1] / q[0], q[2] / q[0], q[3] / q[0]];
}

export function crpToQuat(p) {
  const d = Math.sqrt(1 + p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
  return canonicalQuat([1 / d, p[0] / d, p[1] / d, p[2] / d]);
}

/** Modified Rodrigues params. Singular at 360 deg; shadow set covers it. */
export function quatToMRP(qIn) {
  const q = canonicalQuat(normalizeQuat(qIn));
  const d = 1 + q[0];
  if (Math.abs(d) < 1e-8) return null;
  return [q[1] / d, q[2] / d, q[3] / d];
}

/** The shadow set: same orientation, magnitude 1/|s|. Switch when |s| > 1. */
export function mrpShadow(s) {
  const n2 = s[0] * s[0] + s[1] * s[1] + s[2] * s[2];
  if (n2 < EPS) return null;
  return s.map((v) => -v / n2);
}

export function mrpToQuat(s) {
  const n2 = s[0] * s[0] + s[1] * s[1] + s[2] * s[2];
  const d = 1 + n2;
  return canonicalQuat([(1 - n2) / d, (2 * s[0]) / d, (2 * s[1]) / d, (2 * s[2]) / d]);
}

/* ---------- rotation vector (exponential map / so(3)) ---------- */

export function quatToRotVec(q) {
  const { axis, angle } = quatToAxisAngle(q);
  return axis.map((v) => v * angle);
}

export function rotVecToQuat(v) {
  const angle = Math.hypot(...v);
  if (angle < EPS) return [1, 0, 0, 0];
  return axisAngleToQuat(v, angle);
}

/* ---------- Euler angles: all 12 intrinsic sequences ---------- */

export const SEQUENCES = [
  [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1], // Tait-Bryan
  [1, 2, 1], [1, 3, 1], [2, 1, 2], [2, 3, 2], [3, 1, 3], [3, 2, 3], // proper Euler
];

export const isProper = (seq) => seq[0] === seq[2];

/** C = M_k(t3) * M_j(t2) * M_i(t1) */
export function eulerToDCM(angles, seq) {
  const [i, j, k] = seq;
  return mul(M[k](angles[2]), mul(M[j](angles[1]), M[i](angles[0])));
}

export const eulerToQuat = (angles, seq) => dcmToQuat(eulerToDCM(angles, seq));

/**
 * Extract Euler angles from a DCM for any of the 12 sequences.
 * @returns {{angles: number[], gimbalLock: boolean, distanceToLock: number}}
 *   distanceToLock is in radians: how far the middle angle sits from its singularity.
 */
export function dcmToEuler(C, seq) {
  const [i, j, k] = seq;
  const clamp = (x) => Math.max(-1, Math.min(1, x));
  let t1, t2, t3, gimbalLock = false, distanceToLock;

  if (!isProper(seq)) {
    // Tait-Bryan: middle angle singular at +/- 90 deg
    const eps = cyclic(i, j, k) ? 1 : -1;
    t2 = Math.asin(clamp(eps * C[k - 1][i - 1]));
    distanceToLock = Math.PI / 2 - Math.abs(t2);
    gimbalLock = Math.abs(Math.cos(t2)) < 1e-7;
    if (!gimbalLock) {
      t1 = Math.atan2(-eps * C[k - 1][j - 1], C[k - 1][k - 1]);
      t3 = Math.atan2(-eps * C[j - 1][i - 1], C[i - 1][i - 1]);
    }
  } else {
    // Proper Euler: middle angle singular at 0 and 180 deg
    const l = 6 - i - j; // the axis the sequence never uses
    const eps = cyclic(i, j, l) ? 1 : -1;
    t2 = Math.acos(clamp(C[i - 1][i - 1]));
    distanceToLock = Math.min(t2, Math.PI - t2);
    gimbalLock = Math.abs(Math.sin(t2)) < 1e-7;
    if (!gimbalLock) {
      t1 = Math.atan2(C[i - 1][j - 1], -eps * C[i - 1][l - 1]);
      t3 = Math.atan2(C[j - 1][i - 1], eps * C[l - 1][i - 1]);
    }
  }

  if (gimbalLock) {
    // At the singularity only one combination of t1 and t3 is observable, so the
    // split is a free choice. Convention: hand everything to t1 and set t3 = 0.
    // Then C = M_j(t2) * M_i(t1), so M_j(-t2) * C is a pure rotation about axis i
    // and t1 falls straight out of it.
    t3 = 0;
    const E = mul(M[j](-t2), C);
    const p = (i % 3) + 1;        // next axis, cyclically
    const qx = (p % 3) + 1;       // and the one after that
    t1 = Math.atan2(E[p - 1][qx - 1], E[p - 1][p - 1]);
  }

  return { angles: [t1, t2, t3], gimbalLock, distanceToLock };
}

export const quatToEuler = (q, seq) => dcmToEuler(quatToDCM(q), seq);

/* ---------- utilities ---------- */

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;

/** Nearest-orthogonal projection, so hand-typed DCMs still work. */
export function orthonormalize(C) {
  const col = (n) => [C[0][n], C[1][n], C[2][n]];
  const norm = (v) => { const n = Math.hypot(...v); return n < EPS ? [0, 0, 0] : v.map((x) => x / n); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b, s) => a.map((x, idx) => x - s * b[idx]);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  let u1 = norm(col(0));
  let u2 = norm(sub(col(1), u1, dot(col(1), u1)));
  let u3 = cross(u1, u2);
  return [0, 1, 2].map((r) => [u1[r], u2[r], u3[r]]);
}

/** How far a matrix is from being a valid rotation. Useful for grading answers. */
export function orthogonalityError(C) {
  const P = mul(C, transpose(C));
  let e = 0;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(P[r][c] - (r === c ? 1 : 0)));
  return e;
}
