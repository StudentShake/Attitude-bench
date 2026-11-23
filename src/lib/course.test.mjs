// Tests for the course-notation adapter. Two kinds of check:
//  1. Slide fixtures: the worked examples from the AE 426 decks, so the
//     numbers a student sees agree with the lecture, not just with the library.
//  2. Independent formulas: the slide's own closed-form matrices, written out
//     longhand in course.js, checked against the library over random attitudes.
import * as A from './attitude.js';
import * as C from './course.js';

let pass = 0, fail = 0;
const check = (name, cond, info = '') => {
  if (cond) pass++; else { fail++; console.log('  FAIL:', name, info); }
};
const maxDiff = (X, Y) => {
  let m = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(X[r][c] - Y[r][c]));
  return m;
};
const vdiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

let seed = 4242;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const randQuat = () => {
  for (;;) {
    const v = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
    const n = Math.hypot(...v);
    if (n > 1e-3 && n <= 1) return A.canonicalQuat(v.map((x) => x / n));
  }
};

console.log('--- 15 Jul worked example: 30/20/10, 3-2-1 ---');
{
  const Q = C.EAToQ(30, 20, 10, [3, 2, 1]);
  const slideQ = [[0.813798, 0.469846, -0.34202], [-0.44097, 0.882564, 0.163176], [0.378522, 0.018028, 0.925417]];
  check('EA -> Q matches slide 25', maxDiff(Q, slideQ) < 1e-6, JSON.stringify(Q));
  const { u, theta } = C.QToSAR(Q);
  check('Q -> SAR axis matches slide 26', vdiff(u, [0.124015437, 0.615638059, 0.778209453]) < 1e-8, JSON.stringify(u));
  check('Q -> SAR angle matches slide 26', Math.abs(theta - 35.81710117) < 1e-7, String(theta));
  const q = C.SARToQuat(u, theta);
  check('SAR -> q matches slide 27', vdiff(q, [0.038134576, 0.189307857, 0.239298338, 0.951548525]) < 1e-8, JSON.stringify(q));
  const back = C.quatToSAR(q);
  check('q -> SAR matches slide 28', vdiff(back.u, u) < 1e-12 && Math.abs(back.theta - theta) < 1e-10);
  check('SAR -> Q matches slide 29', maxDiff(C.SARToQ(u, theta), slideQ) < 1e-6);
  const ea = C.QToEA(Q, [3, 2, 1]);
  check('Q -> EA gives 30/20/10 back (slide 30)',
    Math.abs(ea.alpha - 30) < 1e-9 && Math.abs(ea.beta - 20) < 1e-9 && Math.abs(ea.gamma - 10) < 1e-9, JSON.stringify(ea));
  check('library quaternion in course order matches slide 27',
    vdiff(C.toCourseQuat(A.dcmToQuat(Q)), [0.038134576, 0.189307857, 0.239298338, 0.951548525]) < 1e-8);
}

console.log('--- 23 Jul corrected DCM -> SAR, θ = 168.54° ---');
{
  const u0 = [0.574, -0.721, 0.388];
  const n = Math.hypot(...u0);
  const u = u0.map((v) => v / n);
  const Q = C.SARToQ(u, 168.54);
  check('Q12 = -0.742 for the correct axis', Math.abs(Q[0][1] - -0.742) < 1e-3, String(Q[0][1]));
  const flipped = C.SARToQ([u[0], -u[1], u[2]], 168.54);
  check('Q12 = +0.897 for the sign-lost axis (old formula)', Math.abs(flipped[0][1] - 0.897) < 2e-3, String(flipped[0][1]));
  const r = C.QToSAR(Q);
  check('23 Jul formulas recover the axis with its signs', vdiff(r.u, u) < 1e-9, JSON.stringify(r.u));
  check('23 Jul formulas recover θ', Math.abs(r.theta - 168.54) < 1e-9, String(r.theta));
}

console.log('--- errata 2: quaternion -> SAR keeps axis signs ---');
{
  const q = C.SARToQuat([0, -1, 0], 90);
  check('q for -y, 90°', vdiff(q, [0, -Math.SQRT1_2, 0, Math.SQRT1_2]) < 1e-12, JSON.stringify(q));
  const r = C.quatToSAR(q);
  check('axis comes back as -y', vdiff(r.u, [0, -1, 0]) < 1e-12 && Math.abs(r.theta - 90) < 1e-10, JSON.stringify(r));
  const r2 = C.quatToSAR(q.map((v) => -v));
  check('-q gives the same SAR', vdiff(r2.u, [0, -1, 0]) < 1e-12 && Math.abs(r2.theta - 90) < 1e-10);
}

console.log('--- 15 Jul sensor-shift example ---');
{
  const QBI = [[0.7712, 0.6337, 0.0593], [-0.6130, 0.7146, 0.3368], [0.1710, -0.2961, 0.9396]];
  const rI = [2.17, 4.06, 4.77];
  const QT = A.transpose(QBI);
  const rB = QT.map((row) => row[0] * rI[0] + row[1] * rI[1] + row[2] * rI[2]);
  check('r12|B = Qᵀ r12|I = [0, 2.86, 5.98]', vdiff(rB, [0.0004, 2.864, 5.978]) < 2e-3, JSON.stringify(rB));
}

console.log('--- slide SAR -> DCM formula agrees with the library (2000 random) ---');
for (let k = 0; k < 2000; k++) {
  const qLib = randQuat();
  const { axis, angle } = A.quatToAxisAngle(qLib);
  check('SAR matrix', maxDiff(C.SARToQ(axis, angle * A.DEG), A.quatToDCM(qLib)) < 1e-12);
}

console.log('--- 23 Jul DCM -> SAR agrees with the library (2000 random) ---');
for (let k = 0; k < 2000; k++) {
  const qLib = randQuat();
  const { axis, angle } = A.quatToAxisAngle(qLib);
  const r = C.QToSAR(A.quatToDCM(qLib));
  check('SAR from Q', Math.abs(r.theta - angle * A.DEG) < 1e-7 && vdiff(r.u, axis) < 1e-6,
    JSON.stringify([r, axis, angle * A.DEG]));
}

console.log('--- SAR <-> course quaternion round trip (2000 random) ---');
for (let k = 0; k < 2000; k++) {
  const qc = C.toCourseQuat(randQuat());
  const r = C.quatToSAR(qc);
  check('quat/SAR', vdiff(C.SARToQuat(r.u, r.theta), qc) < 1e-12);
}

console.log('--- course quaternion ordering round trip and q4 ≥ 0 (2000 random) ---');
for (let k = 0; k < 2000; k++) {
  const qLib = randQuat();
  const qc = C.toCourseQuat(qLib);
  check('order', vdiff(C.fromCourseQuat(qc), qLib) < 1e-15 && qc[3] >= 0);
}

console.log('--- slide 3-2-1 closed form agrees with EAToQ (1000 random) ---');
for (let k = 0; k < 1000; k++) {
  const a = rnd() * 360, b = rnd() * 178 - 89, g = rnd() * 360;
  check('Q321', maxDiff(C.slideQ321(a, b, g), C.EAToQ(a, b, g, [3, 2, 1])) < 1e-12);
}

console.log('--- QToEA ranges and round trip, all 12 sequences (300 each) ---');
for (const seq of A.SEQUENCES) {
  let ok = true, info = '';
  for (let k = 0; k < 300; k++) {
    const Q = A.quatToDCM(randQuat());
    const ea = C.QToEA(Q, seq);
    const inRange = ea.alpha >= 0 && ea.alpha < 360 && ea.gamma >= 0 && ea.gamma < 360 &&
      (A.isProper(seq) ? ea.beta >= 0 && ea.beta <= 180 : ea.beta >= -90 && ea.beta <= 90);
    const err = maxDiff(C.EAToQ(ea.alpha, ea.beta, ea.gamma, seq), Q);
    if (!inRange || err > 1e-9) { ok = false; info = JSON.stringify({ ea, err }); }
  }
  check(`EA ${seq.join('-')}`, ok, info);
}

console.log('--- edge cases ---');
{
  check('identity: θ = 0, no axis', C.QToSAR(A.quatToDCM([1, 0, 0, 0])).u === null);
  for (const ax of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, -1, 0], [0.6, -0.8, 0], [-0.48, 0.6, -0.64]]) {
    const r = C.QToSAR(C.SARToQ(ax, 180));
    const big = [0, 1, 2].reduce((b, i) => (Math.abs(ax[i]) > Math.abs(ax[b]) ? i : b), 0);
    const want = ax[big] < 0 ? ax.map((v) => -v) : ax;
    check(`180° about ${JSON.stringify(ax)}`, Math.abs(r.theta - 180) < 1e-9 && vdiff(r.u, want) < 1e-9, JSON.stringify(r));
    const qc = C.toCourseQuat(A.dcmToQuat(C.SARToQ(ax, 180)));
    check(`180° quaternion tie-break ${JSON.stringify(ax)}`, vdiff(qc, [...want, 0]) < 1e-9, JSON.stringify(qc));
  }
  for (const th of [179.99, 179.9999, 0.001]) {
    const ax = [0.267, -0.535, 0.802].map((v) => v / Math.hypot(0.267, -0.535, 0.802));
    const r = C.QToSAR(C.SARToQ(ax, th));
    check(`θ = ${th}° keeps axis sign`, Math.abs(r.theta - th) < 1e-6 && vdiff(r.u, ax) < 1e-4, JSON.stringify(r));
  }
  check('wrap360(-30) = 330', Math.abs(C.wrap360(-30) - 330) < 1e-12);
  check('wrap360(360) = 0', C.wrap360(360) === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
