import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useTheme } from "../lib/theme.js";
import { meshQuat } from "../lib/course.js";

/* ============================================================================
   3D VIEWPORT
   Inertial frame = three.js world, Z up (like ECI, north pole up).
   Renders on demand: nothing redraws unless something changed.

   Controls
     left drag / one finger    turn the spacecraft (if onDrag is given,
                               otherwise it looks around)
     right or middle drag,
     two fingers               look around
     wheel / pinch             zoom
     corner triad              tap an axis to look down it, centre for iso
   ========================================================================== */

const D2R = Math.PI / 180;
const ISO = { az: 45 * D2R, el: 35.264 * D2R };
const START = { az: 38 * D2R, el: 22 * D2R, dist: 9.6 };
const EL_LIMIT = 89.4 * D2R;
const DIST_MIN = 3.4, DIST_MAX = 22;
const ARC_SEG = 48;
const EMPTY = [];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const UNIT = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

/* ---------- text labels as sprites ---------- */

/**
 * Paint a sprite label. Plain labels are italic axis letters with a subscript;
 * badges sit on a filled pill so they read as "annotation", not "axis".
 */
function paintLabel(sprite, { text, sub = "", prefix = "", color, badge = null, mono = false }) {
  const cv = sprite.userData.canvas;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, cv.width, cv.height);
  const H = cv.height;
  const main = mono ? "500 60px 'DM Mono', ui-monospace, monospace" : "italic 700 76px 'Times New Roman', Georgia, serif";
  const subF = "700 44px 'DM Sans Variable', system-ui, sans-serif";
  const preF = "600 50px 'DM Sans Variable', system-ui, sans-serif";
  g.font = preF; const wp = prefix ? g.measureText(prefix).width + 12 : 0;
  g.font = main; const w = g.measureText(text).width;
  g.font = subF; const ws = sub ? g.measureText(sub).width + 3 : 0;
  const total = wp + w + ws;
  let x0 = (cv.width - total) / 2;
  if (badge) {
    const pad = 22, bh = 92, bw = Math.min(cv.width - 4, total + pad * 2);
    const bx = (cv.width - bw) / 2, by = (H - bh) / 2;
    g.fillStyle = badge;
    g.beginPath();
    g.roundRect(bx, by, bw, bh, bh / 2);
    g.fill();
  }
  g.fillStyle = color;
  g.textBaseline = "middle";
  if (prefix) { g.font = preF; g.fillText(prefix, x0, H / 2 + 2); x0 += wp; }
  g.font = main; g.fillText(text, x0, H / 2 - (mono ? 0 : 4));
  if (sub) { g.font = subF; g.fillText(sub, x0 + w + 3, H / 2 + 20); }
  sprite.material.map.needsUpdate = true;
}

function makeLabel(scale = 0.42, wide = false) {
  const canvas = document.createElement("canvas");
  canvas.width = wide ? 448 : 224; canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale * (canvas.width / 128), scale, 1);
  s.renderOrder = 10;
  s.userData.canvas = canvas;
  return s;
}

const withAlpha = (hex, a) => {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${a})`;
};

/* ---------- geometry helpers ---------- */

function dashedAxis(len, mat) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(len, 0, 0)]);
  const l = new THREE.Line(g, mat);
  l.computeLineDistances();
  return l;
}

/** Arrow along +y of its own group, from the origin. */
function solidArrow(len, radius, mat) {
  const grp = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 14), mat);
  shaft.position.y = len / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.4, radius * 10, 18), mat);
  head.position.y = len + radius * 5;
  grp.add(shaft, head);
  grp.userData = { shaft, head };
  return grp;
}

function panelTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#1f3f86"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "rgba(170, 200, 255, .55)"; g.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildCraft(themed) {
  const body = new THREE.Group();

  const busMat = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.38 });
  const foilMat = new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.5 });
  themed.bus = busMat; themed.foil = foilMat;
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.0), busMat);
  body.add(bus);
  // a darker band so the top and bottom read differently
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.02, 0.16), foilMat);
  band.position.z = -0.3;
  body.add(band);

  // solar wings along ±y (the array boom is body y)
  const tex = panelTexture();
  const panelMat = new THREE.MeshStandardMaterial({
    map: tex, metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide,
    emissive: 0x0b1a3a, emissiveIntensity: 0.5,
  });
  const frameMat = new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.4 });
  themed.frame = frameMat;
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.03), panelMat);
    p.position.set(0, s * 1.62, 0);
    body.add(p);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10), frameMat);
    boom.position.set(0, s * 0.68, 0);
    body.add(boom);
  });

  // high-gain dish on +x (boresight = body x)
  const dishMat = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.55, side: THREE.DoubleSide });
  themed.dish = dishMat;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 12, 0, Math.PI * 2, 0, 0.75), dishMat);
  dish.rotation.z = Math.PI / 2;
  dish.position.set(0.97, 0, 0);
  dish.scale.set(1, 0.55, 1);
  body.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), frameMat);
  feed.rotation.z = Math.PI / 2;
  feed.position.set(0.82, 0, 0);
  body.add(feed);

  // star tracker baffle on +z
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 16), frameMat);
  st.rotation.x = Math.PI / 2;
  st.position.set(-0.22, 0.2, 0.62);
  body.add(st);

  // everything above is "the craft"; an outline of it is used for the see-through mode
  const meshes = body.children.slice();
  const outlineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
  const outline = new THREE.Group();
  meshes.forEach((m) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), outlineMat);
    e.position.copy(m.position); e.rotation.copy(m.rotation); e.scale.copy(m.scale);
    outline.add(e);
  });
  outline.visible = false;
  body.add(outline);
  themed.craftMeshes = meshes;
  themed.outline = outline;
  themed.outlineMat = outlineMat;

  return body;
}

/* ---------- the gizmo (Fluent-style corner triad) ---------- */

function buildGizmo(container, onPick) {
  const NS = "http://www.w3.org/2000/svg";
  const wrap = document.createElement("div");
  wrap.className = "vp-gizmo";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "-50 -50 100 100");
  svg.setAttribute("width", "100");
  svg.setAttribute("height", "100");
  wrap.appendChild(svg);

  const bg = document.createElementNS(NS, "circle");
  bg.setAttribute("r", "46");
  bg.setAttribute("class", "vp-gizmo-bg");
  svg.appendChild(bg);

  const items = [];
  const NAMES = ["X", "Y", "Z"];
  for (let i = 0; i < 3; i++) {
    for (const sign of [1, -1]) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "vp-gizmo-axis");
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      const label = `${sign > 0 ? "+" : "−"}${NAMES[i]}`;
      g.setAttribute("aria-label", `Look from ${label}`);
      const t = document.createElementNS(NS, "title");
      t.textContent = `Look from ${label}`;
      g.appendChild(t);
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", "0"); line.setAttribute("y1", "0");
      line.setAttribute("stroke", `var(--ax${i})`);
      line.setAttribute("stroke-width", sign > 0 ? "3" : "2");
      line.setAttribute("stroke-linecap", "round");
      if (sign < 0) line.setAttribute("stroke-dasharray", "2 4");
      const hit = document.createElementNS(NS, "circle");
      hit.setAttribute("r", "14");
      hit.setAttribute("fill", "transparent");
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("r", sign > 0 ? "10" : "6.5");
      if (sign > 0) {
        dot.setAttribute("fill", `var(--ax${i})`);
      } else {
        dot.setAttribute("fill", "var(--card)");
        dot.setAttribute("stroke", `var(--ax${i})`);
        dot.setAttribute("stroke-width", "2");
      }
      const txt = document.createElementNS(NS, "text");
      txt.textContent = sign > 0 ? NAMES[i] : "";
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("dominant-baseline", "central");
      txt.setAttribute("class", "vp-gizmo-txt");
      g.append(line, hit, dot, txt);
      const dir = UNIT[i].clone().multiplyScalar(sign);
      const pick = (e) => { e.stopPropagation(); onPick(dir); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(e); } });
      items.push({ g, line, hit, dot, txt, dir });
      svg.appendChild(g);
    }
  }

  const center = document.createElementNS(NS, "g");
  center.setAttribute("class", "vp-gizmo-axis");
  center.setAttribute("role", "button");
  center.setAttribute("tabindex", "0");
  center.setAttribute("aria-label", "Isometric view");
  const ct = document.createElementNS(NS, "title");
  ct.textContent = "Isometric view";
  const cc = document.createElementNS(NS, "circle");
  cc.setAttribute("r", "6");
  cc.setAttribute("class", "vp-gizmo-center");
  center.append(ct, cc);
  center.addEventListener("click", (e) => { e.stopPropagation(); onPick(null); });
  center.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(null); } });
  svg.appendChild(center);

  container.appendChild(wrap);

  const R = 31;
  const v = new THREE.Vector3();
  function update(camera) {
    const order = items.map((it) => {
      v.copy(it.dir).transformDirection(camera.matrixWorldInverse);
      return { it, x: v.x * R, y: -v.y * R, z: v.z };
    });
    order.sort((a, b) => a.z - b.z);
    for (const { it, x, y, z } of order) {
      it.line.setAttribute("x2", x.toFixed(2));
      it.line.setAttribute("y2", y.toFixed(2));
      it.hit.setAttribute("cx", x.toFixed(2)); it.hit.setAttribute("cy", y.toFixed(2));
      it.dot.setAttribute("cx", x.toFixed(2)); it.dot.setAttribute("cy", y.toFixed(2));
      it.txt.setAttribute("x", x.toFixed(2)); it.txt.setAttribute("y", y.toFixed(2));
      it.g.style.opacity = z < -0.2 ? "0.55" : "1";
      svg.insertBefore(it.g, center);
    }
  }
  return { wrap, update };
}

/* ============================================================================
   COMPONENT
   ========================================================================== */

/**
 * @param quat      library quaternion (scalar first, inertial -> body)
 * @param onDrag    (dq: THREE.Quaternion) => void, world-frame increment
 * @param highlight body axis index to emphasise, or null
 * @param sar       { axis:[3], angle (rad) } to draw the Euler axis and θ arc
 * @param ghosts    [{ quat, mark }] intermediate frames, drawn dashed
 * @param spin      { axis:[3] world, color, arcFrom:[3] world, angle (rad) } active step
 * @param autoSpin  camera drift in rad/s (landing hero)
 */
export default function Viewport({
  quat, onDrag, highlight = null, showInertial = true, sar = null,
  ghosts = EMPTY, spin = null, gizmo = true, autoSpin = 0, labels = true,
  onInteract, view = START, showBody = true, projections = EMPTY, craft = "solid",
}) {
  const T = useTheme();
  const mountRef = useRef(null);
  const S = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const s = S.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const el = renderer.domElement;
    Object.assign(el.style, { display: "block", touchAction: "none", cursor: onDrag ? "grab" : "move", userSelect: "none" });
    mount.appendChild(el);

    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(5, -3, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    camera.add(fill);
    fill.position.set(0, 0, 1);
    scene.add(camera);

    const themed = { inertial: [], body: [], ghost: [], labelsI: [], labelsB: [], labelsG: [] };

    /* inertial triad: dashed, faint, fixed */
    const inertial = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const m = new THREE.LineDashedMaterial({ dashSize: 0.09, gapSize: 0.08, transparent: true, opacity: 0.6 });
      themed.inertial.push(m);
      const line = dashedAxis(2.75, m);
      line.quaternion.setFromUnitVectors(UNIT[0], UNIT[i]);
      inertial.add(line);
      const lab = makeLabel(0.34);
      lab.position.copy(UNIT[i]).multiplyScalar(2.98);
      themed.labelsI.push(lab);
      inertial.add(lab);
    }
    scene.add(inertial);

    /* spacecraft + body triad */
    const body = buildCraft(themed);
    const bodyTriad = new THREE.Group();
    body.add(bodyTriad);
    const bodyAxes = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.MeshBasicMaterial({ transparent: true });
      themed.body.push(m);
      const a = solidArrow(2.25, 0.028, m);
      a.quaternion.setFromUnitVectors(UNIT[1], UNIT[i]);
      bodyTriad.add(a);
      bodyAxes.push(a);
      const lab = makeLabel(0.42);
      lab.position.copy(UNIT[i]).multiplyScalar(2.85);
      themed.labelsB.push(lab);
      bodyTriad.add(lab);
    }
    scene.add(body);

    /* ghost (intermediate) frames */
    const ghostGroups = [0, 1].map(() => {
      const g = new THREE.Group();
      const labs = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.LineDashedMaterial({ dashSize: 0.12, gapSize: 0.07, transparent: true, opacity: 0.85 });
        themed.ghost.push({ m, i });
        const line = dashedAxis(2.45, m);
        line.quaternion.setFromUnitVectors(UNIT[0], UNIT[i]);
        g.add(line);
        const lab = makeLabel(0.27);
        lab.position.copy(UNIT[i]).multiplyScalar(1.85);
        labs.push(lab);
        g.add(lab);
      }
      g.userData = { labs, mark: null };
      g.visible = false;
      scene.add(g);
      return g;
    });

    /* SAR axis (amber rod) + θ arc */
    const sarMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    themed.sar = sarMat;
    const sarRod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 7, 10), sarMat);
    scene.add(sarRod);
    const mkArc = (mat) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(Array.from({ length: ARC_SEG + 1 }, () => new THREE.Vector3())),
        mat);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 14), new THREE.MeshBasicMaterial());
      scene.add(line, head);
      return { line, head };
    };
    const sarArcMat = new THREE.LineBasicMaterial();
    themed.sarArc = sarArcMat;
    const sarArc = mkArc(sarArcMat);

    /* active rotation axis for a played step */
    const spinMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    const spinGlowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false });
    const spinRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7.2, 12), spinMat);
    const spinGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7.2, 16), spinGlowMat);
    scene.add(spinRod, spinGlow);
    const spinArcMat = new THREE.LineBasicMaterial();
    const spinArc = mkArc(spinArcMat);
    const spinLabel = makeLabel(0.3, true);
    spinLabel.visible = false;
    scene.add(spinLabel);

    /* projections: where the numbers of a vector live on a frame's axes */
    const proj = [0, 1, 2].map(() => [0, 1, 2].map(() => {
      const segMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthTest: false });
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 10), segMat);
      seg.renderOrder = 5;
      const dropMat = new THREE.LineDashedMaterial({ dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.9, depthTest: false });
      const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), dropMat);
      drop.renderOrder = 5;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), segMat);
      dot.renderOrder = 6;
      const lab = makeLabel(0.38, true);
      [seg, drop, dot, lab].forEach((o) => { o.visible = false; scene.add(o); });
      return { seg, segMat, drop, dropMat, dot, lab, key: "" };
    }));

    /* camera orbit */
    const orbit = { az: view.az, el: view.el, dist: view.dist };
    const place = () => {
      const ce = Math.cos(orbit.el);
      camera.position.set(orbit.dist * ce * Math.cos(orbit.az), orbit.dist * ce * Math.sin(orbit.az), orbit.dist * Math.sin(orbit.el));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    };
    place();

    /* render on demand */
    let raf = 0, tween = null, lastT = 0, visible = true;
    const frame = (now) => {
      raf = 0;
      let again = false;
      if (tween) {
        const k = clamp((now - tween.t0) / tween.dur, 0, 1), e = ease(k);
        orbit.az = tween.from.az + tween.daz * e;
        orbit.el = tween.from.el + (tween.to.el - tween.from.el) * e;
        place();
        if (k < 1) again = true; else tween = null;
      }
      if (s.autoSpin && visible && !s.dragging) {
        const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
        orbit.az += s.autoSpin * dt;
        place();
        again = true;
      }
      lastT = now;
      if (gizmoApi) gizmoApi.update(camera);
      renderer.render(scene, camera);
      if (again) raf = requestAnimationFrame(frame);
      else lastT = 0;
    };
    const invalidate = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const snapTo = (dir) => {
      let to;
      if (!dir) to = { ...ISO };
      else if (Math.abs(dir.z) > 0.99) to = { az: orbit.az, el: Math.sign(dir.z) * EL_LIMIT };
      else to = { az: Math.atan2(dir.y, dir.x), el: Math.asin(clamp(dir.z, -1, 1)) };
      tween = { t0: performance.now(), dur: 520, from: { az: orbit.az, el: orbit.el }, to, daz: wrapPi(to.az - orbit.az) };
      s.onInteract && s.onInteract();
      invalidate();
    };

    let gizmoApi = null;
    if (gizmo) gizmoApi = buildGizmo(mount, snapTo);

    /* pointer handling */
    const pts = new Map();
    let mode = null, pinch0 = 0, dist0 = 0;
    const right = new THREE.Vector3(), upv = new THREE.Vector3();

    const down = (e) => {
      if (e.button === 1) e.preventDefault();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      tween = null;
      s.dragging = true;
      if (pts.size >= 2) {
        mode = "two";
        const [a, b] = [...pts.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        dist0 = orbit.dist;
      } else if (e.button === 2 || e.button === 1 || e.shiftKey || !s.onDrag) {
        mode = "look"; el.style.cursor = "move";
      } else {
        mode = "turn"; el.style.cursor = "grabbing";
      }
      s.onInteract && s.onInteract();
    };
    const move = (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (mode === "two") {
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        orbit.dist = clamp(dist0 * (pinch0 / d), DIST_MIN, DIST_MAX);
        orbit.az -= (dx / pts.size) * 0.008;
        orbit.el = clamp(orbit.el + (dy / pts.size) * 0.008, -EL_LIMIT, EL_LIMIT);
        place(); invalidate();
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      if (mode === "look") {
        orbit.az -= dx * 0.008;
        orbit.el = clamp(orbit.el + dy * 0.008, -EL_LIMIT, EL_LIMIT);
        place(); invalidate();
      } else if (mode === "turn" && s.onDrag) {
        right.setFromMatrixColumn(camera.matrixWorld, 0);
        upv.setFromMatrixColumn(camera.matrixWorld, 1);
        const dq = new THREE.Quaternion().setFromAxisAngle(upv, dx * 0.009)
          .multiply(new THREE.Quaternion().setFromAxisAngle(right, dy * 0.009));
        s.onDrag(dq);
      }
    };
    const up = (e) => {
      pts.delete(e.pointerId);
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (pts.size === 0) {
        mode = null; s.dragging = false;
        el.style.cursor = s.onDrag ? "grab" : "move";
        invalidate();
      } else if (pts.size === 1) {
        mode = "look";
      }
    };
    const wheel = (e) => {
      e.preventDefault();
      orbit.dist = clamp(orbit.dist * Math.exp(e.deltaY * 0.0012), DIST_MIN, DIST_MAX);
      place(); invalidate();
    };
    const noMenu = (e) => e.preventDefault();
    const noMiddle = (e) => { if (e.button === 1) e.preventDefault(); };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", noMenu);
    el.addEventListener("mousedown", noMiddle);
    el.addEventListener("auxclick", noMiddle);

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the whole craft in frame on narrow screens
      camera.fov = w / h < 0.9 ? 50 : 38;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) invalidate(); });
    io.observe(mount);

    Object.assign(s, {
      scene, camera, renderer, body, bodyAxes, bodyTriad, inertial, ghostGroups, sarRod, sarArc,
      spinRod, spinGlow, spinMat, spinGlowMat, spinArc, spinArcMat, spinLabel, proj, themed, invalidate,
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", noMenu);
      el.removeEventListener("mousedown", noMiddle);
      el.removeEventListener("auxclick", noMiddle);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
      renderer.dispose();
      el.remove();
      if (gizmoApi) gizmoApi.wrap.remove();
      S.current = {};
    };
    // the scene is built once; everything else is pushed in by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { S.current.onDrag = onDrag; }, [onDrag]);
  useEffect(() => { S.current.onInteract = onInteract; }, [onInteract]);
  useEffect(() => { S.current.autoSpin = autoSpin; S.current.invalidate && S.current.invalidate(); }, [autoSpin]);

  /* colours */
  useEffect(() => {
    const s = S.current;
    if (!s.themed) return;
    const th = s.themed;
    th.inertial.forEach((m, i) => m.color.set(T.axis[i]));
    th.body.forEach((m, i) => m.color.set(T.axis[i]));
    th.ghost.forEach(({ m, i }) => m.color.set(T.inter[i]));
    th.outlineMat.color.set(T.mode === "dark" ? 0xc9d4ea : 0x5a6378);
    th.bus.color.setHex(T.craft.bus);
    th.foil.color.setHex(T.craft.foil);
    th.frame.color.setHex(T.craft.frame);
    th.dish.color.setHex(T.craft.dish);
    th.sar.color.set(T.rep.sar);
    th.sarArc.color.set(T.rep.sar);
    s.sarArc.head.material.color.set(T.rep.sar);
    const paintAll = () => {
      if (!S.current.themed) return;
      th.labelsI.forEach((l, i) => paintLabel(l, { text: "XYZ"[i], color: T.inertial }));
      th.labelsB.forEach((l, i) => paintLabel(l, { text: "xyz"[i], sub: "B", color: T.axis[i] }));
      s.ghostGroups.forEach((g) => { g.userData.mark = null; });
      s.proj.forEach((set) => set.forEach((p) => { p.key = ""; }));
      s.spinKey = "";
      s.invalidate();
    };
    paintAll();
    // canvas text uses whatever font is loaded right now; repaint once the web fonts arrive
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(paintAll);
  }, [T]);

  /* attitude */
  useEffect(() => {
    const s = S.current;
    if (!s.body) return;
    const [x, y, z, w] = meshQuat(quat);
    s.body.quaternion.set(x, y, z, w);
    s.invalidate();
  }, [quat]);

  /* SAR axis and arc */
  useEffect(() => {
    const s = S.current;
    if (!s.sarRod) return;
    const on = !!(sar && sar.angle > 1e-4);
    s.sarRod.visible = on;
    s.sarArc.line.visible = on;
    s.sarArc.head.visible = on;
    if (on) {
      const n = new THREE.Vector3(...sar.axis).normalize();
      s.sarRod.quaternion.setFromUnitVectors(UNIT[1], n);
      drawArc(s.sarArc, n, null, sar.angle, 1.05);
    }
    s.invalidate();
  }, [sar]);

  /* intermediate frames */
  useEffect(() => {
    const s = S.current;
    if (!s.ghostGroups) return;
    s.ghostGroups.forEach((g, k) => {
      const gh = ghosts[k];
      g.visible = !!gh;
      if (!gh) return;
      const [x, y, z, w] = meshQuat(gh.quat);
      g.quaternion.set(x, y, z, w);
      if (g.userData.mark !== gh.mark) {
        g.userData.labs.forEach((l, i) => paintLabel(l, {
          text: "xyz"[i], sub: gh.mark || "", color: T.mode === "dark" ? "#0D1322" : "#ffffff", badge: withAlpha(T.inter[i], 0.92),
        }));
        g.userData.mark = gh.mark;
      }
    });
    s.invalidate();
  }, [ghosts, T]);

  /* active step axis */
  useEffect(() => {
    const s = S.current;
    if (!s.spinRod) return;
    const on = !!spin;
    s.spinRod.visible = on;
    s.spinGlow.visible = on;
    s.spinArc.line.visible = on && Math.abs(spin.angle) > 1e-3;
    s.spinArc.head.visible = s.spinArc.line.visible;
    if (on) {
      const n = new THREE.Vector3(...spin.axis).normalize();
      s.spinRod.quaternion.setFromUnitVectors(UNIT[1], n);
      s.spinGlow.quaternion.copy(s.spinRod.quaternion);
      s.spinMat.color.set(spin.color);
      s.spinGlowMat.color.set(spin.color);
      s.spinArcMat.color.set(spin.color);
      s.spinArc.head.material.color.set(spin.color);
      if (s.spinArc.line.visible) drawArc(s.spinArc, n, spin.arcFrom, spin.angle, 1.55);
      s.spinLabel.visible = !!spin.label;
      if (spin.label) {
        const key = `${spin.label.letter}${spin.label.sub}${spin.color}${T.mode}`;
        if (s.spinKey !== key) {
          paintLabel(s.spinLabel, { prefix: "about", text: spin.label.letter, sub: spin.label.sub, color: T.mode === "dark" ? "#0D1322" : "#ffffff", badge: spin.color });
          s.spinKey = key;
        }
        // put the tag on whichever end of the rod sits higher on screen, so it stays in view
        s.spinLabel.position.copy(n).multiplyScalar(n.z >= -0.05 ? 3.3 : -3.3);
      }
    } else {
      s.spinLabel.visible = false;
    }
    s.invalidate();
  }, [spin, T]);

  /* spacecraft: solid, see-through outline, or hidden */
  useEffect(() => {
    const s = S.current;
    if (!s.themed || !s.themed.craftMeshes) return;
    const ghost = craft === "ghost";
    s.themed.craftMeshes.forEach((m) => {
      m.visible = craft !== "hidden";
      const mat = m.material;
      mat.transparent = ghost;
      mat.opacity = ghost ? 0.1 : 1;
      mat.depthWrite = !ghost;
      mat.needsUpdate = true;
    });
    s.themed.outline.visible = ghost;
    s.invalidate();
  }, [craft]);

  /* projections: drop lines from a vector's tip onto a frame's axes */
  useEffect(() => {
    const s = S.current;
    if (!s.proj) return;
    const bodyQ = s.body.quaternion;
    s.proj.forEach((set, k) => {
      const pr = projections[k];
      set.forEach((p, j) => {
        const on = !!pr;
        [p.seg, p.drop, p.dot, p.lab].forEach((o) => { o.visible = on; });
        if (!on) return;
        const L = pr.length || 2.25;
        const axis = UNIT[j].clone();
        if (pr.frame === "body") axis.applyQuaternion(bodyQ);
        const v = new THREE.Vector3(...pr.vec);
        const val = v.dot(axis);
        const tip = v.clone().multiplyScalar(L);
        const foot = axis.clone().multiplyScalar(val * L);
        const col = pr.color || T.axis[j];
        p.segMat.color.set(col);
        p.dropMat.color.set(col);
        p.segMat.opacity = pr.faint ? 0.55 : 0.95;
        const len = Math.abs(val * L);
        p.seg.visible = len > 1e-3;
        if (p.seg.visible) {
          p.seg.scale.set(pr.faint ? 0.8 : 1, len, pr.faint ? 0.8 : 1);
          p.seg.position.copy(foot).multiplyScalar(0.5);
          p.seg.quaternion.setFromUnitVectors(UNIT[1], foot.clone().normalize());
        }
        p.dot.position.copy(foot);
        p.drop.geometry.setFromPoints([tip, foot]);
        p.drop.geometry.attributes.position.needsUpdate = true;
        p.drop.computeLineDistances();
        p.drop.geometry.computeBoundingSphere();
        // label sits just outside the foot, away from the origin
        const out = foot.clone().add(axis.clone().multiplyScalar(Math.sign(val || 1) * (0.42 + 0.12 * k)));
        p.lab.position.copy(out);
        p.lab.visible = pr.labels !== false;
        const text = (Math.abs(val) < 5e-4 ? 0 : val).toFixed(pr.digits ?? 3);
        const key = `${text}|${col}|${T.mode}`;
        if (p.key !== key) {
          paintLabel(p.lab, { text, mono: true, color: T.mode === "dark" ? "#0D1322" : "#ffffff", badge: withAlpha(col, pr.faint ? 0.7 : 0.92) });
          p.key = key;
        }
      });
    });
    s.invalidate();
  }, [projections, quat, T]);

  /* highlight + inertial visibility */
  useEffect(() => {
    const s = S.current;
    if (!s.bodyAxes) return;
    s.bodyAxes.forEach((a, i) => {
      const on = highlight === null || highlight === i;
      s.themed.body[i].opacity = on ? 1 : 0.2;
      const k = highlight === i ? 1.9 : 1;
      a.userData.shaft.scale.set(k, 1, k);
      a.userData.head.scale.set(k, k, k);
    });
    s.inertial.visible = showInertial;
    s.bodyTriad.visible = showBody;
    s.themed.labelsB.forEach((l) => { l.visible = labels; });
    s.themed.labelsI.forEach((l) => { l.visible = labels; });
    s.invalidate();
  }, [highlight, showInertial, showBody, labels]);

  return <div ref={mountRef} className="vp-mount" />;
}

/** Arc of `angle` radians about unit n, radius r, starting at `from` (or any perpendicular). */
function drawArc(arc, n, from, angle, r) {
  let v0;
  if (from) {
    v0 = new THREE.Vector3(...from);
    v0.addScaledVector(n, -v0.dot(n));
  }
  if (!v0 || v0.lengthSq() < 1e-8) {
    const ref = Math.abs(n.z) > 0.9 ? UNIT[0] : UNIT[2];
    v0 = new THREE.Vector3().crossVectors(ref, n);
  }
  v0.normalize().multiplyScalar(r);
  const pts = [];
  for (let i = 0; i <= ARC_SEG; i++) pts.push(v0.clone().applyAxisAngle(n, (angle * i) / ARC_SEG));
  arc.line.geometry.setFromPoints(pts);
  arc.line.geometry.attributes.position.needsUpdate = true;
  arc.line.geometry.computeBoundingSphere();
  const end = pts[ARC_SEG];
  const tan = new THREE.Vector3().crossVectors(n, end).normalize().multiplyScalar(Math.sign(angle) || 1);
  arc.head.position.copy(end);
  arc.head.quaternion.setFromUnitVectors(UNIT[1], tan);
}
