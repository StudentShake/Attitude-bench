import * as A from './attitude.js';

let pass = 0, fail = 0;
const check = (name, cond, info = '') => {
  if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, info); }
};

const maxDiff = (X, Y) => {
  let m = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(X[r][c] - Y[r][c]));
  return m;
};

// deterministic PRNG so failures are reproducible
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const randQuat = () => A.canonicalQuat(A.normalizeQuat([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]));

console.log('--- quat <-> DCM round trip ---');
for (let n = 0; n < 2000; n++) {
  const q = randQuat();
  const q2 = A.dcmToQuat(A.quatToDCM(q));
  check('quat/dcm', Math.max(...q.map((v, i) => Math.abs(v - q2[i]))) < 1e-9, JSON.stringify([q, q2]));
}

console.log('--- DCM is orthonormal, det +1 ---');
for (let n = 0; n < 500; n++) {
  const C = A.quatToDCM(randQuat());
  const det = C[0][0]*(C[1][1]*C[2][2]-C[1][2]*C[2][1]) - C[0][1]*(C[1][0]*C[2][2]-C[1][2]*C[2][0]) + C[0][2]*(C[1][0]*C[2][1]-C[1][1]*C[2][0]);
  check('orthonormal', A.orthogonalityError(C) < 1e-12);
  check('det+1', Math.abs(det - 1) < 1e-12, String(det));
}

console.log('--- axis-angle round trip ---');
for (let n = 0; n < 2000; n++) {
  const q = randQuat();
  const { axis, angle } = A.quatToAxisAngle(q);
  const q2 = A.axisAngleToQuat(axis, angle);
  check('axisangle', Math.max(...q.map((v, i) => Math.abs(v - q2[i]))) < 1e-9);
}

console.log('--- CRP / MRP / rotvec round trip ---');
for (let n = 0; n < 2000; n++) {
  const q = randQuat();
  const p = A.quatToCRP(q);
  if (p) check('crp', Math.max(...q.map((v, i) => Math.abs(v - A.crpToQuat(p)[i]))) < 1e-8);
  const s = A.quatToMRP(q);
  if (s) check('mrp', Math.max(...q.map((v, i) => Math.abs(v - A.mrpToQuat(s)[i]))) < 1e-8);
  if (s) {
    const sh = A.mrpShadow(s);
    check('mrp shadow same rotation', maxDiff(A.quatToDCM(A.mrpToQuat(sh)), A.quatToDCM(q)) < 1e-8);
  }
  const v = A.quatToRotVec(q);
  check('rotvec', Math.max(...q.map((x, i) => Math.abs(x - A.rotVecToQuat(v)[i]))) < 1e-8);
}

console.log('--- Euler: all 12 sequences, DCM round trip ---');
for (const seq of A.SEQUENCES) {
  let worst = 0;
  for (let n = 0; n < 1500; n++) {
    const C = A.quatToDCM(randQuat());
    const { angles } = A.dcmToEuler(C, seq);
    worst = Math.max(worst, maxDiff(A.eulerToDCM(angles, seq), C));
  }
  check(`euler ${seq.join('-')}`, worst < 1e-9, `worst=${worst.toExponential(2)}`);
  console.log(`  ${seq.join('-')}  ${A.isProper(seq) ? 'proper ' : 'Tait-B '} worst err = ${worst.toExponential(2)}`);
}

console.log('--- Euler: angle-space round trip (away from singularities) ---');
for (const seq of A.SEQUENCES) {
  let worst = 0;
  for (let n = 0; n < 800; n++) {
    const t1 = (rnd() * 2 - 1) * Math.PI * 0.95;
    const t2 = A.isProper(seq) ? 0.2 + rnd() * (Math.PI - 0.4) : (rnd() * 2 - 1) * 1.3;
    const t3 = (rnd() * 2 - 1) * Math.PI * 0.95;
    const { angles } = A.dcmToEuler(A.eulerToDCM([t1, t2, t3], seq), seq);
    const d = Math.max(Math.abs(angles[0] - t1), Math.abs(angles[1] - t2), Math.abs(angles[2] - t3));
    worst = Math.max(worst, d);
  }
  check(`euler angles ${seq.join('-')}`, worst < 1e-8, `worst=${worst.toExponential(2)}`);
}

console.log('--- gimbal lock cases still reproduce the DCM ---');
for (const seq of A.SEQUENCES) {
  const lockVals = A.isProper(seq) ? [0, Math.PI] : [Math.PI / 2, -Math.PI / 2];
  for (const t2 of lockVals) {
    for (const t1 of [0, 0.7, -1.9, 2.8]) {
      for (const t3 of [0, 1.1, -2.2]) {
        const C = A.eulerToDCM([t1, t2, t3], seq);
        const r = A.dcmToEuler(C, seq);
        const err = maxDiff(A.eulerToDCM(r.angles, seq), C);
        check(`lock ${seq.join('-')} t2=${t2.toFixed(2)}`, err < 1e-8 && r.gimbalLock, `err=${err.toExponential(2)} lock=${r.gimbalLock}`);
      }
    }
  }
}

console.log('--- known values sanity check ---');
{
  // 3-2-1 yaw 90 deg: body x should point along inertial y
  const C = A.eulerToDCM([Math.PI / 2, 0, 0], [3, 2, 1]);
  check('yaw90 C[0][1]=1', Math.abs(C[0][1] - 1) < 1e-12, JSON.stringify(C));
  // 180 deg about x
  const q = A.axisAngleToQuat([1, 0, 0], Math.PI);
  const back = A.quatToAxisAngle(A.dcmToQuat(A.quatToDCM(q)));
  check('180deg recovers axis', Math.abs(back.angle - Math.PI) < 1e-7 && Math.abs(Math.abs(back.axis[0]) - 1) < 1e-7, JSON.stringify(back));
  // identity
  check('identity angle 0', A.quatToAxisAngle([1, 0, 0, 0]).angle === 0);
  // CRP singular at 180
  check('crp null at 180', A.quatToCRP(A.axisAngleToQuat([0, 1, 0], Math.PI)) === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
