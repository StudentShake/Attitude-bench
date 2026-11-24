/**
 * practice.js — generated conversion problems for Test Prep.
 * Every answer key comes from course.js, so it uses the same verified math
 * and the same notation as the rest of the site.
 */
import { EAToQ, QToEA, QToSAR, SARToQuat, quatToSAR, SARToQ, wrap360 } from "./course.js";

export const TYPES = [
  { key: "ea-dcm", from: "euler", to: "dcm", label: "EA → DCM" },
  { key: "dcm-ea", from: "dcm", to: "euler", label: "DCM → EA" },
  { key: "dcm-sar", from: "dcm", to: "sar", label: "DCM → SAR" },
  { key: "sar-quat", from: "sar", to: "quat", label: "SAR → QUAT" },
  { key: "quat-sar", from: "quat", to: "sar", label: "QUAT → SAR" },
  { key: "sar-dcm", from: "sar", to: "dcm", label: "SAR → DCM" },
  // with a stop (or two) in between: `via` is the route the working takes
  { key: "ea-sar", from: "euler", to: "sar", label: "EA → SAR", via: ["dcm"] },
  { key: "sar-ea", from: "sar", to: "euler", label: "SAR → EA", via: ["dcm"] },
  { key: "dcm-quat", from: "dcm", to: "quat", label: "DCM → QUAT", via: ["sar"] },
  { key: "quat-dcm", from: "quat", to: "dcm", label: "QUAT → DCM", via: ["sar"] },
  { key: "ea-quat", from: "euler", to: "quat", label: "EA → QUAT", via: ["dcm", "sar"] },
  { key: "quat-ea", from: "quat", to: "euler", label: "QUAT → EA", via: ["sar", "dcm"] },
];
export const isJump = (key) => !!TYPES.find((t) => t.key === key)?.via;

/* ---------- reproducible problems: a type and a seed make a short code for links ---------- */

/** mulberry32: a small seeded generator, so the same code always gives the same numbers. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const newSeed = () => Math.floor(Math.random() * 4294967296) >>> 0;
export const problemCode = (type, seed) => `${type}.${(seed >>> 0).toString(36)}`;
export function parseCode(code) {
  const m = /^([a-z]+-[a-z]+)\.([0-9a-z]{1,7})$/.exec(String(code || "").trim().toLowerCase());
  if (!m || !TYPES.some((t) => t.key === m[1])) return null;
  const seed = parseInt(m[2], 36);
  return isFinite(seed) && seed <= 4294967295 ? { type: m[1], seed } : null;
}
/** The problem a code stands for. */
export const problemFrom = (type, seed) => ({ ...makeProblem(type, seeded(seed)), seed });

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
const step = (lo, hi, s, rnd) => lo + s * Math.floor(rnd() * ((hi - lo) / s + 1));
const r4 = (v) => Math.round(v * 1e4) / 1e4;

function randEA(rnd) {
  // keep β away from ±90° so the problem is well conditioned
  return [step(0, 355, 5, rnd), step(-75, 75, 5, rnd) || 15, step(0, 355, 5, rnd)];
}
function randAxis(rnd) {
  for (;;) {
    const v = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
    const n = Math.hypot(...v);
    if (n > 0.3 && n < 1) return v.map((x) => r4(x / n));
  }
}
const norm = (u) => { const n = Math.hypot(...u); return u.map((v) => v / n); };

/* field kinds: "deg" compared mod 360 for α/γ, plain for others; "num" for components */
const angleField = (id, label, value, wrap = false) => ({ id, label, value, kind: "deg", wrap });
const numField = (id, label, value, color) => ({ id, label, value, kind: "num", color });
const sarFields = (sar) => [numField("ux", "u_x", sar.u[0], 0), numField("uy", "u_y", sar.u[1], 1), numField("uz", "u_z", sar.u[2], 2), angleField("theta", "θ", sar.theta)];
const quatFields = (q) => [0, 1, 2, 3].map((i) => numField(`q${i + 1}`, `q_${i + 1}`, q[i], i < 3 ? i : "q"));
const eaFields = (ea) => [angleField("alpha", "α", ea.alpha, true), angleField("beta", "β", ea.beta), angleField("gamma", "γ", ea.gamma, true)];
const twoCells = (Q, rnd) => {
  const cells = [[0, 1], [1, 2], [2, 0], [0, 0], [1, 0], [2, 2]];
  const a = pick(cells, rnd), b = pick(cells.filter((c) => c !== a), rnd);
  return [a, b].map(([r, c]) => numField(`Q${r + 1}${c + 1}`, `Q${r + 1}${c + 1}`, Q[r][c], r));
};
/* an attitude from random 3-2-1 angles, with a well-defined axis (10° < θ < 170°) */
function randAttitude(rnd) {
  for (;;) {
    const ea = randEA(rnd);
    const Q = EAToQ(...ea, [3, 2, 1]);
    const sar = QToSAR(Q);
    if (sar.u && sar.theta > 10 && sar.theta < 170) return { ea, Q, sar };
  }
}
/* a random SAR whose 3-2-1 angles stay clear of β = ±90° */
function randSARForEA(rnd) {
  for (;;) {
    const u = randAxis(rnd), theta = step(10, 170, 1, rnd);
    const Q = SARToQ(norm(u), theta);
    const ea = QToEA(Q, [3, 2, 1]);
    if (Math.abs(ea.beta) < 80) return { u, theta, Q, ea };
  }
}

export function makeProblem(type, rnd = Math.random) {
  const seq = [3, 2, 1];
  switch (type) {
    case "ea-dcm": {
      const ea = randEA(rnd);
      const Q = EAToQ(...ea, seq);
      const cells = [];
      const all = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
      while (cells.length < 3) { const c = pick(all, rnd); if (!cells.some((x) => x[0] === c[0] && x[1] === c[1])) cells.push(c); }
      return {
        type, given: { ea }, Q,
        ask: cells.map(([r, c]) => numField(`Q${r + 1}${c + 1}`, `Q${r + 1}${c + 1}`, Q[r][c], r)),
      };
    }
    case "dcm-ea": {
      const ea = randEA(rnd);
      const Q = EAToQ(...ea, seq).map((row) => row.map(r4));
      const back = QToEA(EAToQ(...ea, seq), seq);
      return {
        type, given: { Q }, ea: back,
        ask: [angleField("alpha", "α", back.alpha, true), angleField("beta", "β", back.beta), angleField("gamma", "γ", back.gamma, true)],
      };
    }
    case "dcm-sar": {
      const ea = randEA(rnd);
      const Qx = EAToQ(...ea, seq);
      const Q = Qx.map((row) => row.map(r4));
      const sar = QToSAR(Qx);
      if (!sar.u || sar.theta > 175) return makeProblem(type, rnd);
      return {
        type, given: { Q }, sar,
        ask: [numField("ux", "u_x", sar.u[0], 0), numField("uy", "u_y", sar.u[1], 1), numField("uz", "u_z", sar.u[2], 2), angleField("theta", "θ", sar.theta)],
      };
    }
    case "sar-quat": {
      const u = randAxis(rnd), theta = step(10, 170, 1, rnd);
      const q = SARToQuat(norm(u), theta);
      return {
        type, given: { u, theta }, q,
        ask: [0, 1, 2, 3].map((i) => numField(`q${i + 1}`, `q_${i + 1}`, q[i], i < 3 ? i : "q")),
      };
    }
    case "quat-sar": {
      const u = randAxis(rnd), theta = step(10, 170, 1, rnd);
      const q = SARToQuat(norm(u), theta).map(r4);
      const sar = quatToSAR(q);
      return {
        type, given: { q }, sar,
        ask: [numField("ux", "u_x", sar.u[0], 0), numField("uy", "u_y", sar.u[1], 1), numField("uz", "u_z", sar.u[2], 2), angleField("theta", "θ", sar.theta)],
      };
    }
    case "sar-dcm": {
      const u = randAxis(rnd), theta = step(10, 170, 1, rnd);
      const Q = SARToQ(norm(u), theta);
      const cells = [[0, 1], [1, 2], [2, 0], [0, 0], [1, 0], [2, 2]];
      const a = pick(cells, rnd), b = pick(cells.filter((c) => c !== a), rnd);
      return {
        type, given: { u, theta }, Q,
        ask: [a, b].map(([r, c]) => numField(`Q${r + 1}${c + 1}`, `Q${r + 1}${c + 1}`, Q[r][c], r)),
      };
    }
    /* ---- with a stop in between ---- */
    case "ea-sar": {
      const { ea, Q, sar } = randAttitude(rnd);
      return { type, given: { ea }, Q, sar, ask: sarFields(sar) };
    }
    case "ea-quat": {
      const { ea, Q, sar } = randAttitude(rnd);
      const q = SARToQuat(sar.u, sar.theta);
      return { type, given: { ea }, Q, sar, q, ask: quatFields(q) };
    }
    case "dcm-quat": {
      const { Q: Qx, sar } = randAttitude(rnd);
      const q = SARToQuat(sar.u, sar.theta);
      return { type, given: { Q: Qx.map((row) => row.map(r4)) }, sar, q, ask: quatFields(q) };
    }
    case "quat-dcm": {
      const u = randAxis(rnd), theta = step(10, 170, 1, rnd);
      const q = SARToQuat(norm(u), theta).map(r4);
      const sar = quatToSAR(q);
      const Q = SARToQ(sar.u, sar.theta);
      return { type, given: { q }, sar, Q, ask: twoCells(Q, rnd) };
    }
    case "sar-ea": {
      const { u, theta, Q, ea } = randSARForEA(rnd);
      return { type, given: { u, theta }, Q, ea, ask: eaFields(ea) };
    }
    case "quat-ea": {
      for (;;) {
        const u = randAxis(rnd), theta = step(10, 170, 1, rnd);
        const q = SARToQuat(norm(u), theta).map(r4);
        const sar = quatToSAR(q);
        const Q = SARToQ(sar.u, sar.theta);
        const ea = QToEA(Q, [3, 2, 1]);
        if (Math.abs(ea.beta) < 80) return { type, given: { q }, sar, Q, ea, ask: eaFields(ea) };
      }
    }
    default:
      return makeProblem("ea-dcm", rnd);
  }
}

export const TOL = { deg: 0.15, num: 0.003 };

export function grade(field, input) {
  const v = parseFloat(String(input).replace("−", "-"));
  if (!isFinite(v)) return { ok: false, empty: String(input).trim() === "" };
  if (field.kind === "deg") {
    const d = field.wrap ? Math.abs(((wrap360(v) - wrap360(field.value) + 540) % 360) - 180) : Math.abs(v - field.value);
    return { ok: d <= TOL.deg, v };
  }
  return { ok: Math.abs(v - field.value) <= TOL.num, v };
}

/**
 * Guess the slip behind a wrong answer, from the mistakes that show up on quizzes.
 * Returns a short hint or null.
 */
export function diagnose(p, answers) {
  const num = (id) => parseFloat(String(answers[id] ?? "").replace("−", "-"));
  const near = (a, b, t) => isFinite(a) && Math.abs(a - b) <= t;
  const off180 = (x, t) => isFinite(x) && Math.abs(((wrap360(x) - wrap360(t) + 540) % 360) - 180) > 179.8;
  const cellSwap = () => {
    for (const f of p.ask) {
      const r = +f.id[1] - 1, c = +f.id[2] - 1;
      if (r !== c && near(num(f.id), p.Q[c][r], TOL.num) && !near(num(f.id), f.value, TOL.num))
        return `Your ${f.id} matches Q${c + 1}${r + 1}. Rows and columns swapped? Row i is the new axis i.`;
    }
    return null;
  };
  const signLoss = () => {
    const u = ["ux", "uy", "uz"].map(num);
    const absMatch = u.every((x, i) => near(x, Math.abs(p.sar.u[i]), TOL.num));
    const signed = u.every((x, i) => near(x, p.sar.u[i], TOL.num));
    if (absMatch && !signed) return "Every component of your axis came out positive, but some should be negative. Divide by 2 sin θ (or sin(θ/2)) instead of squaring and taking roots, so the signs survive.";
    return null;
  };
  const quatSlips = (fullAngle) => {
    const q = [0, 1, 2, 3].map((i) => num(`q${i + 1}`));
    if (q.every((x, i) => near(x, -p.q[i], TOL.num)) && !q.every((x, i) => near(x, p.q[i], TOL.num)))
      return "That's −q. It's the same attitude, but the course keeps q₄ ≥ 0, so flip every sign.";
    if (near(q[0], p.q[3], TOL.num) && near(q[1], p.q[0], TOL.num)) return "Looks like scalar first. The course puts the scalar last, as q₄.";
    if (q.every((x, i) => near(x, fullAngle[i], TOL.num))) return "Halve the angle: q uses sin(θ/2) and cos(θ/2).";
    return null;
  };
  const quadrant = () => (off180(num("alpha"), p.ea.alpha) || off180(num("gamma"), p.ea.gamma)
    ? "Off by 180°. tan⁻¹ can't see the quadrant, so check the signs of the two entries (or use atan2)."
    : null);
  switch (p.type) {
    case "ea-dcm":
    case "sar-dcm":
    case "quat-dcm":
      return cellSwap();
    case "dcm-ea":
    case "sar-ea":
    case "quat-ea":
      return quadrant();
    case "dcm-sar":
    case "ea-sar":
      return signLoss();
    case "quat-sar":
      return signLoss() || (near(num("theta"), p.sar.theta / 2, TOL.deg) ? "θ is twice cos⁻¹(q₄). You found the half angle." : null);
    case "sar-quat":
      return quatSlips(SARToQuat(norm(p.given.u), p.given.theta * 2));
    case "ea-quat":
    case "dcm-quat":
      return quatSlips(SARToQuat(p.sar.u, p.sar.theta * 2));
    default:
      return null;
  }
}
