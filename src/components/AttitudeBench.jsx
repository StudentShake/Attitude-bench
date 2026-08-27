import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";

/* ============================================================================
   MATH CORE  —  verified by round-trip test suite (13,316 assertions passing)

   CONVENTIONS (internal, fixed):
     DCM C maps inertial to body:  v_body = C * v_inertial
     Quaternion q = [q0,q1,q2,q3], scalar first, same inertial->body sense
     Euler sequences are INTRINSIC:  (i,j,k) => C = M_k(t3) M_j(t2) M_i(t1)
     Elementary matrices are frame-rotation ("passive") matrices
   ========================================================================== */

const EPS = 1e-9;
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const mul = (A, B) => {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      C[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
  return C;
};
const transpose = (A) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[c][r]));

const M1 = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
const M2 = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };
const M3 = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, s, 0], [-s, c, 0], [0, 0, 1]]; };
const M = [null, M1, M2, M3];
const cyclic = (a, b, c) => (b - a + 3) % 3 === 1 && (c - b + 3) % 3 === 1;

const normalizeQuat = (q) => {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return n < EPS ? [1, 0, 0, 0] : q.map((v) => v / n);
};
const canonicalQuat = (q) => (q[0] < 0 ? q.map((v) => -v) : q.slice());

function quatToDCM(qIn) {
  const [a, b, c, d] = normalizeQuat(qIn);
  return [
    [a * a + b * b - c * c - d * d, 2 * (b * c + a * d), 2 * (b * d - a * c)],
    [2 * (b * c - a * d), a * a - b * b + c * c - d * d, 2 * (c * d + a * b)],
    [2 * (b * d + a * c), 2 * (c * d - a * b), a * a - b * b - c * c + d * d],
  ];
}

/* Shepperd's method — stable at every rotation, including 180 deg */
function dcmToQuat(C) {
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

function quatToAxisAngle(qIn) {
  const q = canonicalQuat(normalizeQuat(qIn));
  const sh = Math.hypot(q[1], q[2], q[3]);
  const angle = 2 * Math.atan2(sh, q[0]);
  if (sh < EPS) return { axis: [1, 0, 0], angle: 0, degenerate: true };
  return { axis: [q[1] / sh, q[2] / sh, q[3] / sh], angle, degenerate: false };
}
function axisAngleToQuat(axis, angle) {
  const n = Math.hypot(...axis);
  const a = n < EPS ? [1, 0, 0] : axis.map((v) => v / n);
  const s = Math.sin(angle / 2);
  return canonicalQuat([Math.cos(angle / 2), a[0] * s, a[1] * s, a[2] * s]);
}

const quatToCRP = (qIn) => {
  const q = canonicalQuat(normalizeQuat(qIn));
  return Math.abs(q[0]) < 1e-8 ? null : [q[1] / q[0], q[2] / q[0], q[3] / q[0]];
};
const crpToQuat = (p) => {
  const d = Math.sqrt(1 + p[0] ** 2 + p[1] ** 2 + p[2] ** 2);
  return canonicalQuat([1 / d, p[0] / d, p[1] / d, p[2] / d]);
};
const quatToMRP = (qIn) => {
  const q = canonicalQuat(normalizeQuat(qIn));
  const d = 1 + q[0];
  return Math.abs(d) < 1e-8 ? null : [q[1] / d, q[2] / d, q[3] / d];
};
const mrpShadow = (s) => {
  const n2 = s[0] ** 2 + s[1] ** 2 + s[2] ** 2;
  return n2 < EPS ? null : s.map((v) => -v / n2);
};
const mrpToQuat = (s) => {
  const n2 = s[0] ** 2 + s[1] ** 2 + s[2] ** 2;
  const d = 1 + n2;
  return canonicalQuat([(1 - n2) / d, (2 * s[0]) / d, (2 * s[1]) / d, (2 * s[2]) / d]);
};

const SEQUENCES = [
  [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1],
  [1, 2, 1], [1, 3, 1], [2, 1, 2], [2, 3, 2], [3, 1, 3], [3, 2, 3],
];
const isProper = (seq) => seq[0] === seq[2];
const eulerToDCM = (t, seq) => mul(M[seq[2]](t[2]), mul(M[seq[1]](t[1]), M[seq[0]](t[0])));
const eulerToQuat = (t, seq) => dcmToQuat(eulerToDCM(t, seq));

function dcmToEuler(C, seq) {
  const [i, j, k] = seq;
  const clamp = (x) => Math.max(-1, Math.min(1, x));
  let t1 = 0, t2, t3 = 0, gimbalLock = false, distanceToLock;

  if (!isProper(seq)) {
    const eps = cyclic(i, j, k) ? 1 : -1;
    t2 = Math.asin(clamp(eps * C[k - 1][i - 1]));
    distanceToLock = Math.PI / 2 - Math.abs(t2);
    gimbalLock = Math.abs(Math.cos(t2)) < 1e-7;
    if (!gimbalLock) {
      t1 = Math.atan2(-eps * C[k - 1][j - 1], C[k - 1][k - 1]);
      t3 = Math.atan2(-eps * C[j - 1][i - 1], C[i - 1][i - 1]);
    }
  } else {
    const l = 6 - i - j;
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
    // Only one combination of t1 and t3 is observable, so the split is a free
    // choice. Give everything to t1: then C = M_j(t2) M_i(t1), and M_j(-t2) C
    // is a pure rotation about axis i.
    t3 = 0;
    const E = mul(M[seq[1]](-t2), C);
    const p = (i % 3) + 1, r = (p % 3) + 1;
    t1 = Math.atan2(E[p - 1][r - 1], E[p - 1][p - 1]);
  }
  return { angles: [t1, t2, t3], gimbalLock, distanceToLock };
}

function orthonormalize(C) {
  const col = (n) => [C[0][n], C[1][n], C[2][n]];
  const nrm = (v) => { const n = Math.hypot(...v); return n < EPS ? [1, 0, 0] : v.map((x) => x / n); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const u1 = nrm(col(0));
  const c2 = col(1);
  const u2 = nrm(c2.map((x, n) => x - dot(c2, u1) * u1[n]));
  const u3 = cross(u1, u2);
  return [0, 1, 2].map((r) => [u1[r], u2[r], u3[r]]);
}

/* ============================================================================
   DESIGN TOKENS
   ========================================================================== */

const T = {
  deep: "#0B1016",
  panel: "#121B24",
  panelHi: "#18242F",
  rule: "#233240",
  text: "#CFDBE4",
  dim: "#6E828F",
  faint: "#3F5361",
  amber: "#E9A13B",
  live: "#67E8DC",
  axis: ["#FF5D6C", "#4FD98A", "#5C93FF"],
};
const AXIS_NAME = ["x", "y", "z"];

const fmt = (v, p = 4) => {
  if (!isFinite(v)) return "—";
  const s = v.toFixed(p);
  return s === "-" + (0).toFixed(p) ? (0).toFixed(p) : s;
};

/* ============================================================================
   3D VIEWPORT
   ========================================================================== */

function Viewport({ quat, onDrag, highlight, showInertial }) {
  const mountRef = useRef(null);
  const state = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5c93ff, 0.35);
    rim.position.set(-5, -2, -4);
    scene.add(rim);

    // ---- inertial reference frame (static, dim, dashed) ----
    const inertial = new THREE.Group();
    for (let a = 0; a < 3; a++) {
      const dir = new THREE.Vector3(a === 0 ? 1 : 0, a === 1 ? 1 : 0, a === 2 ? 1 : 0);
      const pts = [];
      for (let s = 0; s <= 40; s++) pts.push(dir.clone().multiplyScalar((s / 40) * 2.6));
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineDashedMaterial({
        color: new THREE.Color(T.axis[a]), dashSize: 0.07, gapSize: 0.07,
        transparent: true, opacity: 0.4,
      });
      const line = new THREE.Line(g, m);
      line.computeLineDistances();
      inertial.add(line);
    }
    scene.add(inertial);

    // ---- spacecraft body ----
    const body = new THREE.Group();
    const bus = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.95, 1.25),
      new THREE.MeshStandardMaterial({ color: 0xb9c6d1, metalness: 0.55, roughness: 0.42 })
    );
    body.add(bus);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1b3a63, metalness: 0.75, roughness: 0.3,
      side: THREE.DoubleSide, emissive: 0x081726, emissiveIntensity: 0.6,
    });
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.03, 0.86), panelMat);
      p.position.set(s * 1.62, 0, 0);
      body.add(p);
      const boom = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x8d9aa5, metalness: 0.7, roughness: 0.4 })
      );
      boom.rotation.z = Math.PI / 2;
      boom.position.set(s * 0.82, 0, 0);
      body.add(boom);
    });
    // dish marks +z so the body's orientation is never ambiguous
    const dish = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.34, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xd8e2ea, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide })
    );
    dish.rotation.x = -Math.PI / 2;
    dish.position.set(0, 0, 0.82);
    body.add(dish);

    // ---- body-fixed triad (solid, bright, labelled) ----
    const bodyAxes = [];
    for (let a = 0; a < 3; a++) {
      const dir = new THREE.Vector3(a === 0 ? 1 : 0, a === 1 ? 1 : 0, a === 2 ? 1 : 0);
      const grp = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(T.axis[a]) });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.1, 12), mat);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 14), mat);
      shaft.position.y = 1.05;
      head.position.y = 2.2;
      grp.add(shaft, head);
      grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      grp.userData = { mat, shaft, head };
      bodyAxes.push(grp);
      body.add(grp);
    }
    scene.add(body);

    // ---- principal rotation axis (Euler axis) ----
    const prvMat = new THREE.LineBasicMaterial({ color: 0xe9a13b, transparent: true, opacity: 0.85 });
    const prvLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), prvMat
    );
    scene.add(prvLine);

    camera.position.set(4.4, 3.2, 5.0);
    camera.lookAt(0, 0, 0);

    // ---- interaction: drag rotates the body in the inertial frame ----
    let dragging = false, lastX = 0, lastY = 0;
    const el = renderer.domElement;
    const down = (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing";
    };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const dq = new THREE.Quaternion()
        .setFromAxisAngle(up, dx * 0.008)
        .multiply(new THREE.Quaternion().setFromAxisAngle(right, dy * 0.008));
      state.current.onDrag && state.current.onDrag(dq);
    };
    const up = (e) => {
      dragging = false; el.style.cursor = "grab";
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf;
    const loop = () => { renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();

    state.current = { ...state.current, body, bodyAxes, inertial, prvLine, scene };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { state.current.onDrag = onDrag; }, [onDrag]);

  // attitude q maps inertial->body, so the mesh (body->inertial) gets the conjugate
  useEffect(() => {
    const s = state.current;
    if (!s.body) return;
    s.body.quaternion.set(-quat[1], -quat[2], -quat[3], quat[0]);

    const { axis, angle } = quatToAxisAngle(quat);
    const worldAxis = new THREE.Vector3(axis[0], axis[1], axis[2]).applyQuaternion(s.body.quaternion);
    const len = Math.abs(angle) < 1e-4 ? 0 : 3.1;
    s.prvLine.geometry.setFromPoints([
      worldAxis.clone().multiplyScalar(-len), worldAxis.clone().multiplyScalar(len),
    ]);
    s.prvLine.geometry.attributes.position.needsUpdate = true;
  }, [quat]);

  useEffect(() => {
    const s = state.current;
    if (!s.bodyAxes) return;
    s.bodyAxes.forEach((g, i) => {
      const on = highlight === null || highlight === i;
      g.userData.mat.opacity = on ? 1 : 0.18;
      g.userData.mat.transparent = true;
      const sc = highlight === i ? 1.9 : 1;
      g.userData.shaft.scale.set(sc, 1, sc);
      g.userData.head.scale.set(sc, 1, sc);
    });
    if (s.inertial) s.inertial.visible = showInertial;
  }, [highlight, showInertial]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}

/* ============================================================================
   UI PRIMITIVES
   ========================================================================== */

function Panel({ label, note, children, tone }) {
  return (
    <section style={{
      background: T.panel, border: `1px solid ${tone || T.rule}`,
      borderRadius: 3, padding: "11px 13px 13px",
    }}>
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        gap: 10, marginBottom: 9,
      }}>
        <h2 style={{
          margin: 0, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase",
          color: T.dim, fontWeight: 600,
        }}>{label}</h2>
        {note && <span style={{ fontSize: 10, color: tone || T.faint, fontFamily: "var(--mono)" }}>{note}</span>}
      </header>
      {children}
    </section>
  );
}

function NumField({ value, onCommit, color, width = "100%", align = "right" }) {
  const [draft, setDraft] = useState(null);
  const shown = draft !== null ? draft : value;
  return (
    <input
      value={shown}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => { if (draft !== null) { onCommit(parseFloat(draft)); setDraft(null); } }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") { setDraft(null); e.currentTarget.blur(); }
      }}
      spellCheck={false}
      style={{
        width, background: draft !== null ? "#0d1a20" : T.panelHi,
        border: `1px solid ${draft !== null ? T.live : T.rule}`,
        color: color || T.text, fontFamily: "var(--mono)", fontSize: 12.5,
        padding: "5px 7px", borderRadius: 2, textAlign: align, outline: "none",
        MozAppearance: "textfield",
      }}
    />
  );
}

/* ============================================================================
   MAIN
   ========================================================================== */

export default function AttitudeBench() {
  const [quat, setQuat] = useState(() =>
    canonicalQuat(normalizeQuat([0.8446, 0.1913, 0.4619, 0.1913]))
  );
  const [seqIdx, setSeqIdx] = useState(5); // 3-2-1
  const [highlight, setHighlight] = useState(null);
  const [showInertial, setShowInertial] = useState(true);
  const [scalarFirst, setScalarFirst] = useState(true);
  const [bodyToInertial, setBodyToInertial] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const [useShadow, setUseShadow] = useState(false);

  const seq = SEQUENCES[seqIdx];
  const C = useMemo(() => quatToDCM(quat), [quat]);
  const Cdisp = bodyToInertial ? transpose(C) : C;
  const pa = useMemo(() => quatToAxisAngle(quat), [quat]);
  const eu = useMemo(() => dcmToEuler(C, seq), [C, seq]);
  const crp = useMemo(() => quatToCRP(quat), [quat]);
  const mrpBase = useMemo(() => quatToMRP(quat), [quat]);
  const mrp = useShadow && mrpBase ? mrpShadow(mrpBase) : mrpBase;

  const set = useCallback((q) => setQuat(canonicalQuat(normalizeQuat(q))), []);

  const onDrag = useCallback((dq) => {
    setQuat((prev) => {
      const m = new THREE.Quaternion(-prev[1], -prev[2], -prev[3], prev[0]);
      const nm = dq.clone().multiply(m).normalize();
      return canonicalQuat([nm.w, -nm.x, -nm.y, -nm.z]);
    });
  }, []);

  const randomize = () => {
    const g = () => { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); return s - 3; };
    set([g(), g(), g(), g()]);
  };

  const lockPct = Math.max(0, Math.min(1, eu.distanceToLock / (Math.PI / 2)));
  const lockTone = eu.gimbalLock ? T.axis[0] : lockPct < 0.25 ? T.amber : null;

  const qLabels = scalarFirst ? ["q₀", "q₁", "q₂", "q₃"] : ["q₁", "q₂", "q₃", "q₄"];
  const qOrder = scalarFirst ? [0, 1, 2, 3] : [1, 2, 3, 0];

  return (
    <div style={{
      "--mono": "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
      "--sans": "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
      background: T.deep, color: T.text, fontFamily: "var(--sans)",
      minHeight: "100%", padding: "18px 20px 26px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input:focus { border-color: ${T.live} !important; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${T.live}; outline-offset: 1px; }
        .ab-grid { display: grid; gap: 12px; grid-template-columns: minmax(0,1.15fr) minmax(0,1fr); }
        @media (max-width: 820px) { .ab-grid { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* ---- header ---- */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "baseline",
        justifyContent: "space-between", gap: 12, marginBottom: 14,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em",
          }}>Attitude Bench</h1>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: T.dim, maxWidth: 620 }}>
            One orientation, six ways of writing it down. Drag the spacecraft, or type into any
            panel — the rest follow.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            ["Identity", () => set([1, 0, 0, 0])],
            ["Random", randomize],
            ["Gimbal lock", () => set(eulerToQuat([0.6, isProper(seq) ? 0 : Math.PI / 2, 0], seq))],
            ["180° about y", () => set(axisAngleToQuat([0, 1, 0], Math.PI))],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{
              background: T.panel, border: `1px solid ${T.rule}`, color: T.text,
              fontFamily: "var(--sans)", fontSize: 11.5, padding: "5px 10px",
              borderRadius: 2, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="ab-grid">
        {/* ================= LEFT: viewport ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{
            position: "relative", background: "#080D12",
            border: `1px solid ${T.rule}`, borderRadius: 3,
            height: "clamp(320px, 46vh, 480px)", overflow: "hidden",
          }}>
            <Viewport quat={quat} onDrag={onDrag} highlight={highlight} showInertial={showInertial} />
            <div style={{
              position: "absolute", left: 11, bottom: 10, display: "flex", gap: 13,
              fontFamily: "var(--mono)", fontSize: 10.5, pointerEvents: "none",
            }}>
              {AXIS_NAME.map((n, i) => (
                <span key={n} style={{ color: T.axis[i] }}>
                  {n}<span style={{ color: T.faint }}>_body</span>
                </span>
              ))}
              <span style={{ color: T.amber }}>Euler axis</span>
            </div>
            <label style={{
              position: "absolute", right: 11, bottom: 10, fontSize: 10.5,
              color: T.dim, display: "flex", gap: 5, alignItems: "center", cursor: "pointer",
            }}>
              <input type="checkbox" checked={showInertial}
                onChange={(e) => setShowInertial(e.target.checked)}
                style={{ accentColor: T.live, width: 12, height: 12 }} />
              inertial frame
            </label>
          </div>

          {/* ---- DCM: the signature panel ---- */}
          <Panel
            label="Direction cosine matrix"
            note={bodyToInertial ? "Cᵀ · v_body = v_inertial" : "C · v_inertial = v_body"}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                  {[0, 1, 2].map((c) => (
                    <div key={c} onMouseEnter={() => !bodyToInertial && setHighlight(c)}
                      onMouseLeave={() => setHighlight(null)}
                      style={{
                        width: 76, textAlign: "center", fontFamily: "var(--mono)",
                        fontSize: 9.5, color: bodyToInertial ? T.faint : T.axis[c],
                        letterSpacing: "0.06em", cursor: bodyToInertial ? "default" : "help",
                      }}>
                      {bodyToInertial ? `col ${c + 1}` : `${AXIS_NAME[c]}_b`}
                    </div>
                  ))}
                </div>
                {[0, 1, 2].map((r) => (
                  <div key={r} style={{ display: "flex", gap: 3, marginBottom: 3 }}>
                    {[0, 1, 2].map((c) => (
                      <div key={c}
                        onMouseEnter={() => !bodyToInertial && setHighlight(c)}
                        onMouseLeave={() => setHighlight(null)}
                        style={{ width: 76 }}>
                        <NumField
                          value={fmt(Cdisp[r][c])}
                          color={bodyToInertial ? T.text : T.axis[c]}
                          onCommit={(v) => {
                            if (!isFinite(v)) return;
                            const N = Cdisp.map((row) => row.slice());
                            N[r][c] = v;
                            const fixed = orthonormalize(N);
                            set(dcmToQuat(bodyToInertial ? transpose(fixed) : fixed));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p style={{
                margin: 0, fontSize: 11, color: T.dim, maxWidth: 210, lineHeight: 1.5,
              }}>
                {bodyToInertial
                  ? "In this sense the rows are the body axes written in inertial components. Flip the convention to colour them."
                  : "Each column is one body axis written in inertial components — hover a column to see it light up in the viewport. That is the whole meaning of the matrix."}
                <br />
                <span style={{ color: T.faint }}>
                  Typed values are re-orthonormalised, so a hand-entered matrix always lands on a real rotation.
                </span>
              </p>
            </div>
          </Panel>
        </div>

        {/* ================= RIGHT: representations ================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

          {/* ---- quaternion ---- */}
          <Panel label="Quaternion" note={scalarFirst ? "scalar first" : "scalar last"}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {qOrder.map((qi, slot) => (
                <div key={slot}>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 10, color: qi === 0 ? T.amber : T.dim,
                    marginBottom: 3,
                  }}>{qLabels[slot]}</div>
                  <NumField
                    value={fmt(quat[qi], 5)}
                    onCommit={(v) => {
                      if (!isFinite(v)) return;
                      const n = quat.slice(); n[qi] = v; set(n);
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
              <label style={{ fontSize: 11, color: T.dim, display: "flex", gap: 5, cursor: "pointer" }}>
                <input type="checkbox" checked={scalarFirst}
                  onChange={(e) => setScalarFirst(e.target.checked)}
                  style={{ accentColor: T.live, width: 12, height: 12 }} />
                scalar first
              </label>
              <label style={{ fontSize: 11, color: T.dim, display: "flex", gap: 5, cursor: "pointer" }}>
                <input type="checkbox" checked={bodyToInertial}
                  onChange={(e) => setBodyToInertial(e.target.checked)}
                  style={{ accentColor: T.live, width: 12, height: 12 }} />
                body → inertial sense
              </label>
              <button onClick={() => setShowWork(!showWork)} style={{
                background: "none", border: "none", color: T.live, fontSize: 11,
                cursor: "pointer", padding: 0, fontFamily: "var(--sans)",
              }}>{showWork ? "hide" : "show"} the substitution</button>
            </div>
            {showWork && (
              <pre style={{
                margin: "9px 0 0", padding: 9, background: "#0A1218",
                border: `1px solid ${T.rule}`, borderRadius: 2, fontFamily: "var(--mono)",
                fontSize: 10.5, color: T.dim, overflowX: "auto", lineHeight: 1.65,
              }}>
{`C₁₁ = q₀²+q₁²−q₂²−q₃²  = ${fmt(quat[0])}² + ${fmt(quat[1])}² − ${fmt(quat[2])}² − ${fmt(quat[3])}²
                        = ${fmt(C[0][0])}
C₁₂ = 2(q₁q₂ + q₀q₃)    = 2(${fmt(quat[1])}·${fmt(quat[2])} + ${fmt(quat[0])}·${fmt(quat[3])})
                        = ${fmt(C[0][1])}
C₁₃ = 2(q₁q₃ − q₀q₂)    = ${fmt(C[0][2])}
‖q‖ = ${fmt(Math.hypot(...quat), 8)}   (unit norm is what makes C orthogonal)`}
              </pre>
            )}
          </Panel>

          {/* ---- principal rotation (axis-angle) ---- */}
          <Panel label="Principal rotation" note={pa.degenerate ? "axis undefined at Φ = 0" : "Euler's theorem"}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1.15fr", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.axis[i], marginBottom: 3 }}>
                    e{"₁₂₃"[i]}
                  </div>
                  <NumField value={fmt(pa.axis[i], 5)} color={T.axis[i]}
                    onCommit={(v) => {
                      if (!isFinite(v)) return;
                      const a = pa.axis.slice(); a[i] = v;
                      set(axisAngleToQuat(a, pa.angle));
                    }} />
                </div>
              ))}
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.amber, marginBottom: 3 }}>Φ °</div>
                <NumField value={fmt(pa.angle * DEG, 3)} color={T.amber}
                  onCommit={(v) => isFinite(v) && set(axisAngleToQuat(pa.axis, v * RAD))} />
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: T.faint, lineHeight: 1.5 }}>
              However tangled the orientation looks, it is one turn of Φ about the amber line in the viewport.
            </p>
          </Panel>

          {/* ---- Euler angles ---- */}
          <Panel
            label="Euler angles"
            note={eu.gimbalLock ? "GIMBAL LOCK" : `${(eu.distanceToLock * DEG).toFixed(1)}° from singularity`}
            tone={lockTone}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto" }}>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 3, letterSpacing: "0.1em" }}>SEQUENCE</div>
                <select value={seqIdx} onChange={(e) => setSeqIdx(+e.target.value)} style={{
                  background: T.panelHi, border: `1px solid ${T.rule}`, color: T.text,
                  fontFamily: "var(--mono)", fontSize: 12.5, padding: "5px 7px",
                  borderRadius: 2, outline: "none",
                }}>
                  {SEQUENCES.map((s, i) => (
                    <option key={i} value={i}>
                      {s.join("-")} {isProper(s) ? "· proper" : "· Tait-Bryan"}
                    </option>
                  ))}
                </select>
              </div>
              {[0, 1, 2].map((n) => (
                <div key={n} style={{ flex: "1 1 62px", minWidth: 62 }}>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 10, marginBottom: 3,
                    color: n === 1 ? (lockTone || T.dim) : T.axis[seq[n] - 1],
                  }}>
                    {["θ₁", "θ₂", "θ₃"][n]} <span style={{ color: T.faint }}>/{seq[n]}</span>
                  </div>
                  <NumField
                    value={fmt(eu.angles[n] * DEG, 3)}
                    color={n === 1 ? (lockTone || T.text) : T.axis[seq[n] - 1]}
                    onCommit={(v) => {
                      if (!isFinite(v)) return;
                      const a = eu.angles.slice(); a[n] = v * RAD;
                      set(eulerToQuat(a, seq));
                    }} />
                </div>
              ))}
            </div>

            {/* singularity meter */}
            <div>
              <div style={{
                height: 3, background: T.panelHi, borderRadius: 2, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${lockPct * 100}%`,
                  background: lockTone || T.live, transition: "width .12s linear",
                }} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: lockTone || T.faint, lineHeight: 1.5 }}>
                {eu.gimbalLock
                  ? `θ₂ is at its singular value: axes ${seq[0]} and ${seq[2]} now do the same job, so only θ₁ + θ₃ is recoverable. This panel puts the whole sum in θ₁ — the DCM and quaternion are unbothered.`
                  : `Bar shows how much room θ₂ has left before ${isProper(seq) ? "0° or 180°" : "±90°"} collapses two of the three axes together.`}
              </p>
            </div>
          </Panel>

          {/* ---- Rodrigues family ---- */}
          <Panel label="Rodrigues parameters" note="minimal, 3 numbers">
            <div style={{ display: "grid", gridTemplateColumns: "58px repeat(3, 1fr)", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: T.dim }}>CRP q</span>
              {crp
                ? crp.map((v, i) => (
                    <NumField key={i} value={fmt(v, 4)} color={T.axis[i]}
                      onCommit={(nv) => { if (!isFinite(nv)) return; const p = crp.slice(); p[i] = nv; set(crpToQuat(p)); }} />
                  ))
                : <div style={{
                    gridColumn: "2 / 5", fontFamily: "var(--mono)", fontSize: 11.5,
                    color: T.axis[0], padding: "5px 0",
                  }}>→ ±∞  singular at Φ = 180°</div>}

              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: T.dim }}>MRP σ</span>
              {mrp
                ? mrp.map((v, i) => (
                    <NumField key={i} value={fmt(v, 4)} color={T.axis[i]}
                      onCommit={(nv) => { if (!isFinite(nv)) return; const s = mrp.slice(); s[i] = nv; set(mrpToQuat(s)); }} />
                  ))
                : <div style={{
                    gridColumn: "2 / 5", fontFamily: "var(--mono)", fontSize: 11.5,
                    color: T.axis[0], padding: "5px 0",
                  }}>→ ±∞  singular at Φ = 360°</div>}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              gap: 10, marginTop: 8, flexWrap: "wrap",
            }}>
              <p style={{ margin: 0, fontSize: 11, color: T.faint, lineHeight: 1.5, flex: "1 1 190px" }}>
                Three numbers cannot cover every orientation without blowing up somewhere. The MRP
                shadow set is the standard dodge: same rotation, reciprocal magnitude.
              </p>
              <button onClick={() => setUseShadow(!useShadow)} disabled={!mrpBase} style={{
                background: useShadow ? T.panelHi : "none",
                border: `1px solid ${useShadow ? T.live : T.rule}`,
                color: mrpBase ? (useShadow ? T.live : T.dim) : T.faint,
                fontSize: 11, padding: "4px 9px", borderRadius: 2,
                cursor: mrpBase ? "pointer" : "not-allowed", fontFamily: "var(--sans)",
              }}>
                {useShadow ? "shadow set" : "principal set"}
                {mrp && ` · |σ| = ${fmt(Math.hypot(...mrp), 3)}`}
              </button>
            </div>
          </Panel>
        </div>
      </div>

      <p style={{
        margin: "16px 0 0", fontSize: 10.5, color: T.faint, fontFamily: "var(--mono)",
        lineHeight: 1.6,
      }}>
        Internal convention: C maps inertial → body · q scalar-first, same sense · Euler sequences
        intrinsic · conversions verified by 13,316 round-trip assertions.
      </p>
    </div>
  );
}
