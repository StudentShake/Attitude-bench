import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import Viewport from "./Viewport.jsx";
import NumField from "./NumField.jsx";
import Spoiler from "./Spoiler.jsx";
import { RepCard, Label } from "./RepCard.jsx";
import { Reset, Dice, Play, Pause, Flip } from "./Icons.jsx";
import { SEQUENCES, isProper, canonicalQuat, normalizeQuat, orthonormalize, dcmToQuat } from "../lib/attitude.js";
import {
  quatToQ, QToEA, EAToQ, QToSAR, SARToQuat, toCourseQuat, fromCourseQuat, SEQ_NICKNAME, seqName,
} from "../lib/course.js";
import { eulerFrame, sarFrame, slerp } from "../lib/director.js";
import { useTheme } from "../lib/theme.js";

/* ============================================================================
   PLAYGROUND
   One attitude, held as a library quaternion. Every card is derived from it
   through course.js, and every card can set it.
   ========================================================================== */

const fmt = (v, p = 4) => {
  if (!isFinite(v)) return "—";
  const s = v.toFixed(p);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
};

const SEQ_321 = 5; // index of [3, 2, 1] in SEQUENCES
// The 15 Jul slide example (α 30°, β 20°, γ 10°, 3-2-1), so the first numbers
// anyone sees are the ones on the slide.
const START = canonicalQuat(dcmToQuat(EAToQ(30, 20, 10, [3, 2, 1])));
const IDENTITY = [1, 0, 0, 0];

const reduceMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};
const coarse = () => {
  try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
};

/** Which axis a step turns about, in the slides' frame names: Z, then y₁, then x₂. */
function stepAxisName(seq, k) {
  const a = seq[k] - 1;
  if (k === 0) return { letter: "XYZ"[a], sub: "" };
  return { letter: "xyz"[a], sub: String(k) };
}

function AxisName({ seq, k }) {
  const { letter, sub } = stepAxisName(seq, k);
  return <span className="m">{letter}{sub && <sub style={{ fontStyle: "normal", fontSize: "0.7em" }}>{sub}</sub>}</span>;
}

const GREEK = ["α", "β", "γ"];

/* ---------- URL state, so a link reproduces the attitude ---------- */

function readURL() {
  try {
    const p = new URLSearchParams(window.location.search);
    const out = {};
    const q = p.get("q");
    if (q) {
      const c = q.split(",").map(Number);
      if (c.length === 4 && c.every(isFinite) && Math.hypot(...c) > 1e-6) {
        out.quat = canonicalQuat(normalizeQuat(fromCourseQuat(c)));
      }
    }
    const s = p.get("seq");
    if (s) {
      const i = SEQUENCES.findIndex((x) => x.join("") === s);
      if (i >= 0) out.seqIdx = i;
    }
    return out;
  } catch {
    return {};
  }
}

/* ============================================================================ */

export default function AttitudeBench() {
  const T = useTheme();
  const [init] = useState(readURL);
  const [quat, setQuatRaw] = useState(init.quat || START);
  const [seqIdx, setSeqIdx] = useState(init.seqIdx ?? SEQ_321);
  const [highlight, setHighlight] = useState(null);
  const [showInertial, setShowInertial] = useState(true);
  const [showSAR, setShowSAR] = useState(true);
  const [hidden, setHidden] = useState({ dcm: false, euler: false, sar: false, quat: false });
  const [flipSign, setFlipSign] = useState(false);
  const [anim, setAnim] = useState(null);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCoarse] = useState(coarse);

  const seq = SEQUENCES[seqIdx];

  /* ---------- animation ---------- */

  const frame = useMemo(() => {
    if (!anim) return null;
    if (anim.kind === "euler") return eulerFrame(anim.seq, anim.angles, anim.t);
    if (anim.kind === "sar") return sarFrame(anim.u, anim.theta, anim.t);
    return { quat: slerp(anim.from, anim.to, anim.t) };
  }, [anim]);

  const shown = frame ? frame.quat : quat;
  const shownRef = useRef(shown);
  useEffect(() => { shownRef.current = shown; }, [shown]);

  useEffect(() => {
    if (!anim || !anim.playing) return;
    let raf;
    const t0 = performance.now() - anim.t * anim.msPerUnit;
    const tick = (now) => {
      const t = Math.min(anim.tMax, (now - t0) / anim.msPerUnit);
      const end = t >= anim.tMax;
      setAnim((a) => (a && a.id === anim.id ? (end && a.kind === "slerp" ? null : { ...a, t, playing: !end }) : a));
      if (!end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // restart only when a new animation starts or play/pause flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim?.id, anim?.playing]);

  const start = useCallback((a) => {
    const instant = reduceMotion();
    setAnim({ ...a, id: Math.random(), t: instant ? a.tMax : 0, playing: !instant });
  }, []);

  /** Set the attitude directly (typing, dragging). Stops any animation. */
  const setQuat = useCallback((q) => {
    setAnim(null);
    setQuatRaw(canonicalQuat(normalizeQuat(q)));
  }, []);

  /** Glide to an attitude (Reset, Random). */
  const glideTo = useCallback((to) => {
    const from = shownRef.current;
    const target = canonicalQuat(normalizeQuat(to));
    setQuatRaw(target);
    start({ kind: "slerp", from, to: target, tMax: 1, msPerUnit: 900 });
  }, [start]);

  const onDrag = useCallback((dq) => {
    const p = shownRef.current;
    const m = new THREE.Quaternion(p[1], p[2], p[3], p[0]);
    const n = dq.clone().multiply(m).normalize();
    setAnim(null);
    setQuatRaw(canonicalQuat([n.w, n.x, n.y, n.z]));
  }, []);

  const randomize = () => {
    // uniform over all attitudes (Gaussian 4-vector, normalised)
    const g = () => { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); return s - 3; };
    glideTo([g(), g(), g(), g()]);
  };

  /* ---------- derived, all in course notation ---------- */

  const Q = useMemo(() => quatToQ(shown), [shown]);
  const ea = useMemo(() => QToEA(Q, seq), [Q, seq]);
  const sar = useMemo(() => QToSAR(Q), [Q]);
  const qc = useMemo(() => {
    const c = toCourseQuat(shown);
    return flipSign ? c.map((v) => -v) : c;
  }, [shown, flipSign]);
  const resetKey = useMemo(() => quat.join(","), [quat]);

  /* keep the URL in step (not while something is moving) */
  useEffect(() => {
    if (anim && anim.playing) return;
    const id = setTimeout(() => {
      try {
        const c = toCourseQuat(quat).map((v) => v.toFixed(6)).join(",");
        const url = `${window.location.pathname}?q=${c}${seqIdx !== SEQ_321 ? `&seq=${seq.join("")}` : ""}`;
        window.history.replaceState(null, "", url);
      } catch { /* sandboxed frame: no URL, no problem */ }
    }, 300);
    return () => clearTimeout(id);
  }, [quat, seqIdx, seq, anim]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  /* ---------- what the 3D view shows ---------- */

  const playing = anim && anim.kind !== "slerp";
  const eulerAnim = anim && anim.kind === "euler" ? anim : null;
  const sarAnim = anim && anim.kind === "sar" ? anim : null;

  const spin = useMemo(() => {
    if (!frame || !frame.spin) return null;
    if (sarAnim) return { ...frame.spin, color: T.rep.sar };
    return { ...frame.spin, color: T.axis[frame.spin.axisIndex] };
  }, [frame, sarAnim, T]);

  const sarProp = useMemo(() => {
    if (!showSAR || playing || !sar.u) return null;
    return { axis: sar.u, angle: (sar.theta * Math.PI) / 180 };
  }, [showSAR, playing, sar]);

  const ghosts = frame && frame.ghosts ? frame.ghosts : [];

  /* ---------- caption over the scene while a scene plays ---------- */

  let caption = null;
  if (eulerAnim && frame) {
    const k = frame.step;
    if (k < 3) {
      const ax = eulerAnim.seq;
      caption = (
        <div className="caption" style={{ "--c": T.axis[ax[k] - 1] }}>
          Step {k + 1} of 3: <span className="m">{GREEK[k]}</span> = {fmt(frame.part[k], 1)}° about <AxisName seq={ax} k={k} />
        </div>
      );
    } else {
      caption = <div className="caption" style={{ "--c": T.rep.euler }}>Done. Three turns, one attitude.</div>;
    }
  } else if (sarAnim && frame) {
    caption = (
      <div className="caption" style={{ "--c": T.rep.sar }}>
        {anim.t < 1
          ? <>One turn about <span className="m">û</span>: <span className="m">θ</span> = {fmt(frame.theta, 1)}°</>
          : <>Same attitude, one turn of {fmt(sarAnim.theta, 1)}°</>}
      </div>
    );
  }

  const interact = useCallback(() => setTouched(true), []);

  /* ============================== render ============================== */

  return (
    <div className="wrap pg">
      <div className="pg-head">
        <div>
          <h1>Playground</h1>
          <p className="lede" style={{ margin: "8px 0 0", maxWidth: 620 }}>
            Grab the spacecraft and turn it. All four cards follow along, and you can type into any of them.
          </p>
        </div>
        <button type="button" className="btn sm" onClick={copyLink}>
          {copied ? "Link copied" : "Copy link to this attitude"}
        </button>
      </div>

      <div className="pg-grid">
        {/* ------------------------------ stage ------------------------------ */}
        <div className="pg-stage">
          <div className="scene pg-view">
            <Viewport
              quat={shown} onDrag={onDrag} highlight={highlight} showInertial={showInertial}
              sar={sarProp} ghosts={ghosts} spin={spin} onInteract={interact}
            />
            <div className="scene-ui" style={{ left: 12, top: 12 }}>
              <button type="button" className="btn sm" onClick={() => glideTo(IDENTITY)}
                title="Line the body frame back up with the inertial frame">
                <Reset size={17} /> Reset
              </button>
              <button type="button" className="btn sm" onClick={randomize} title="Spin to a random attitude">
                <Dice size={17} /> Random
              </button>
            </div>
            {caption}
            <div className="scene-hint" style={{ opacity: touched ? 0 : 1 }}>
              {isCoarse ? "Drag to turn it. Two fingers to look around." : "Drag to turn it. Right-drag to look around."}
            </div>
          </div>

          <div className="legend" style={{ padding: "2px 4px" }}>
            <span><i className="swatch-line" style={{ "--c": T.axis[0] }} /><i className="swatch-line" style={{ "--c": T.axis[1], marginLeft: -4 }} /><i className="swatch-line" style={{ "--c": T.axis[2], marginLeft: -4 }} /> body frame <span className="m">B</span></span>
            <button type="button" className="toggle" aria-pressed={showInertial} style={{ "--c": T.inertial }}
              onClick={() => setShowInertial((v) => !v)}>
              <i className="swatch-line dashed" style={{ "--c": T.inertial }} /> inertial frame <span className="m">XYZ</span>
            </button>
            <button type="button" className="toggle" aria-pressed={showSAR} style={{ "--c": T.rep.sar }}
              onClick={() => setShowSAR((v) => !v)}>
              <span className="sw" /> SAR axis and <span className="m">θ</span>
            </button>
            <span className="faint tiny">Tap an axis in the corner to look down it.</span>
          </div>
        </div>

        {/* ------------------------------ cards ------------------------------ */}
        <div className="pg-cards">

          {/* DCM */}
          <RepCard rep="dcm" symbol="[Q]" title="Direction cosine matrix"
            note={<>Maps inertial to body: <span className="m">v</span>|<sub>B</sub> = [Q] <span className="m">v</span>|<sub>I</sub></>}
            hidden={hidden.dcm} onHide={(h) => setHidden((s) => ({ ...s, dcm: h }))}>
            <Spoiler hidden={hidden.dcm} resetKey={resetKey}>
              <div style={{ display: "grid", gridTemplateColumns: "34px repeat(3, minmax(0, 1fr))", gap: 8, alignItems: "center" }}>
                <span />
                {["X", "Y", "Z"].map((n) => (
                  <div key={n} className="faint tiny" style={{ textAlign: "center", fontWeight: 600 }}>
                    along <span className="m">{n}</span>
                  </div>
                ))}
                {[0, 1, 2].map((r) => (
                  <RowCells key={r} r={r} Q={Q} T={T} setHighlight={setHighlight}
                    onCommit={(c, v) => {
                      const N = Q.map((row) => row.slice());
                      N[r][c] = v;
                      setQuat(dcmToQuat(orthonormalize(N)));
                    }} />
                ))}
              </div>
            </Spoiler>
            <p className="note">
              Each row is one body axis written in inertial coordinates. Hover a row to light that axis up.
            </p>
          </RepCard>

          {/* Euler angles */}
          <RepCard rep="euler" symbol="α β γ" title="Euler angles"
            note={<>Sequence {seqName(seq)}{SEQ_NICKNAME[seqName(seq)] ? ` (${SEQ_NICKNAME[seqName(seq)]})` : ""}</>}
            hidden={hidden.euler} onHide={(h) => setHidden((s) => ({ ...s, euler: h }))}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
              <label style={{ flex: "0 0 auto" }}>
                <Label>Sequence</Label>
                <select className="field" style={{ width: 190 }} value={seqIdx}
                  onChange={(e) => { setAnim(null); setSeqIdx(+e.target.value); }}>
                  {SEQUENCES.map((s, i) => (
                    <option key={i} value={i}>
                      {s.join("-")}{SEQ_NICKNAME[s.join("-")] ? ` · ${SEQ_NICKNAME[s.join("-")]}` : isProper(s) ? " · symmetric" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Spoiler hidden={hidden.euler} resetKey={resetKey}>
              <div className="grid3">
                {[0, 1, 2].map((k) => {
                  const val = [ea.alpha, ea.beta, ea.gamma][k];
                  const col = T.axis[seq[k] - 1];
                  return (
                    <div key={k}>
                      <Label color={col}>
                        <span className="m">{GREEK[k]}</span> <span className="faint" style={{ fontWeight: 500 }}>about</span> <AxisName seq={seq} k={k} />
                      </Label>
                      <NumField value={fmt(val, 2)} color={col} suffix="°" label={`${GREEK[k]} in degrees`}
                        onCommit={(v) => {
                          const a = [ea.alpha, ea.beta, ea.gamma];
                          a[k] = v;
                          setQuat(dcmToQuat(EAToQ(a[0], a[1], a[2], seq)));
                        }} />
                    </div>
                  );
                })}
              </div>
            </Spoiler>

            <div className="player">
              {!eulerAnim ? (
                <div className="player-row" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="btn sm primary" onClick={() =>
                    start({ kind: "euler", seq, angles: [ea.alpha, ea.beta, ea.gamma], tMax: 3, msPerUnit: 1800 })}>
                    <Play size={15} /> Watch the {seqName(seq)} sequence
                  </button>
                  <span className="dim small">Builds this attitude one rotation at a time.</span>
                </div>
              ) : (
                <EulerPlayer anim={eulerAnim} frame={frame} T={T}
                  onToggle={() => setAnim((a) => (a.t >= a.tMax ? { ...a, t: 0, playing: true, id: Math.random() } : { ...a, playing: !a.playing }))}
                  onScrub={(t) => setAnim((a) => ({ ...a, t, playing: false }))}
                  onClose={() => setAnim(null)} />
              )}
            </div>
          </RepCard>

          {/* SAR */}
          <RepCard rep="sar" symbol="û, θ" title="Single-axis rotation"
            note="One turn of θ about the Euler axis û"
            hidden={hidden.sar} onHide={(h) => setHidden((s) => ({ ...s, sar: h }))}>
            <Spoiler hidden={hidden.sar} resetKey={resetKey}>
              <div className="grid4">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <Label color={T.axis[i]}><span className="m">u</span><sub>{"xyz"[i]}</sub></Label>
                    <NumField value={sar.u ? fmt(sar.u[i], 4) : "—"} color={T.axis[i]} label={`u ${"xyz"[i]}`}
                      onCommit={(v) => {
                        const u = sar.u ? sar.u.slice() : [1, 0, 0];
                        u[i] = v;
                        if (Math.hypot(...u) < 1e-9) return;
                        setQuat(fromCourseQuat(SARToQuat(u, sar.theta)));
                      }} />
                  </div>
                ))}
                <div>
                  <Label color={T.rep.sar}><span className="m">θ</span></Label>
                  <NumField value={fmt(sar.theta, 2)} color={T.rep.sar} suffix="°" label="theta in degrees"
                    onCommit={(v) => setQuat(fromCourseQuat(SARToQuat(sar.u || [0, 0, 1], v)))} />
                </div>
              </div>
            </Spoiler>
            {!sar.u && <p className="note">No rotation yet, so there's no axis to show. Turn the spacecraft a little.</p>}
            <div className="player">
              {!sarAnim ? (
                <div className="player-row" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="btn sm primary" disabled={!sar.u}
                    onClick={() => start({ kind: "sar", u: sar.u, theta: sar.theta, tMax: 1, msPerUnit: 2600 })}>
                    <Play size={15} /> Do it in one turn
                  </button>
                  <span className="dim small">Same attitude as the three Euler rotations.</span>
                </div>
              ) : (
                <div className="player-row">
                  <button type="button" className="icon-btn" aria-label={anim.playing ? "Pause" : "Play"}
                    onClick={() => setAnim((a) => (a.t >= a.tMax ? { ...a, t: 0, playing: true, id: Math.random() } : { ...a, playing: !a.playing }))}>
                    {anim.playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <input type="range" className="slider" style={{ "--c": T.rep.sar }} min={0} max={1} step={0.001}
                    value={anim.t} aria-label="Scrub the turn"
                    onChange={(e) => setAnim((a) => ({ ...a, t: +e.target.value, playing: false }))} />
                  <button type="button" className="btn sm" onClick={() => setAnim(null)}>Done</button>
                </div>
              )}
            </div>
          </RepCard>

          {/* Quaternion */}
          <RepCard rep="quat" symbol="q" title="Quaternion"
            note={<>Scalar last: <span className="m">q</span> = [ <span className="m">û</span> sin(<span className="m">θ</span>/2) ; cos(<span className="m">θ</span>/2) ]</>}
            hidden={hidden.quat} onHide={(h) => setHidden((s) => ({ ...s, quat: h }))}>
            <Spoiler hidden={hidden.quat} resetKey={resetKey}>
              <div className="grid4">
                {[0, 1, 2, 3].map((i) => {
                  const col = i < 3 ? T.axis[i] : T.rep.quat;
                  const v = qc[i];
                  return (
                    <div key={i} style={{ "--c": col }}>
                      <Label color={col}><span className="m">q</span><sub>{i + 1}</sub>{i === 3 && <span className="faint" style={{ fontWeight: 500 }}> scalar</span>}</Label>
                      <NumField value={fmt(v, 4)} color={col} label={`q${i + 1}`}
                        onCommit={(nv) => {
                          const c = qc.slice();
                          c[i] = nv;
                          setQuat(fromCourseQuat(c));
                        }} />
                      <div className="qbar" aria-hidden="true">
                        <i style={{ left: `${50 + Math.min(0, v) * 50}%`, width: `${Math.abs(v) * 50}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Spoiler>
            <div className="player-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
              <button type="button" className="btn sm" onClick={() => setFlipSign((f) => !f)} aria-pressed={flipSign}>
                <Flip size={16} /> {flipSign ? "Back to +q" : "Flip to −q"}
              </button>
              <span className="dim small">
                {flipSign ? "Every sign flipped and the spacecraft didn't move. q and −q are the same attitude." : "Try it and watch the spacecraft."}
              </span>
            </div>
          </RepCard>
        </div>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function RowCells({ r, Q, T, setHighlight, onCommit }) {
  const col = T.axis[r];
  return (
    <>
      <div className="rowlab" style={{ color: col }}
        onMouseEnter={() => setHighlight(r)} onMouseLeave={() => setHighlight(null)}
        title={`Row ${r + 1}: the body ${"xyz"[r]} axis`}>
        {"xyz"[r]}<sub>B</sub>
      </div>
      {[0, 1, 2].map((c) => (
        <div key={c} onMouseEnter={() => setHighlight(r)} onMouseLeave={() => setHighlight(null)}>
          <NumField value={fmt(Q[r][c], 4)} color={col} label={`Q${r + 1}${c + 1}`} onCommit={(v) => onCommit(c, v)} />
        </div>
      ))}
    </>
  );
}

function EulerPlayer({ anim, frame, T, onToggle, onScrub, onClose }) {
  const k = frame.step;
  return (
    <div>
      <div className="steps" style={{ marginBottom: 10 }}>
        {[0, 1, 2].map((j) => (
          <button key={j} type="button" className={`step${k === j ? " on" : ""}${k > j ? " done" : ""}`}
            style={{ "--c": T.axis[anim.seq[j] - 1] }} onClick={() => onScrub(j + 1)}>
            <b>{GREEK[j]}</b> about <AxisName seq={anim.seq} k={j} />
          </button>
        ))}
      </div>
      <div className="player-row">
        <button type="button" className="icon-btn" aria-label={anim.playing ? "Pause" : "Play"} onClick={onToggle}>
          {anim.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input type="range" className="slider" style={{ "--c": T.rep.euler }} min={0} max={3} step={0.001}
          value={anim.t} onChange={(e) => onScrub(+e.target.value)} aria-label="Scrub the sequence" />
        <button type="button" className="btn sm" onClick={onClose}>Done</button>
      </div>
      <p className="note">
        Each turn happens about an axis of the frame you just made. The dashed triad is the frame from the step before.
      </p>
    </div>
  );
}
