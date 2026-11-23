import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { Page } from "../components/SiteChrome.jsx";
import Viewport from "../components/Viewport.jsx";
import { Arrow } from "../components/Icons.jsx";
import { DcmGlyph, EulerGlyph, SarGlyph, QuatGlyph } from "../components/Glyphs.jsx";

const REP_GLYPH = { dcm: DcmGlyph, euler: EulerGlyph, sar: SarGlyph, quat: QuatGlyph };
import { useTheme } from "../lib/theme.js";
import { canonicalQuat, dcmToQuat } from "../lib/attitude.js";
import { EAToQ, quatToQ, QToEA, QToSAR, toCourseQuat } from "../lib/course.js";

const f = (v, p = 2) => { const s = v.toFixed(p); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; };

/** A slow, lazy tumble so the hero is never still. Stops the moment you grab it. */
function useTumble() {
  const [quat, setQuat] = useState(() => canonicalQuat(dcmToQuat(EAToQ(30, 20, 10, [3, 2, 1]))));
  const [held, setHeld] = useState(false);
  const t0 = useRef(0);
  useEffect(() => {
    if (held) return;
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* */ }
    if (reduce) return;
    let raf, last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33) return; // ~30 fps is plenty for a drift
      last = now;
      if (!t0.current) t0.current = now;
      const t = (now - t0.current) / 1000;
      const a = 30 + 50 * Math.sin(t * 0.21);
      const b = 20 + 35 * Math.sin(t * 0.17 + 1.2);
      const g = 10 + 70 * Math.sin(t * 0.13 + 0.4);
      setQuat(canonicalQuat(dcmToQuat(EAToQ(a, b, g, [3, 2, 1]))));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [held]);
  const onDrag = useCallback((dq) => {
    setHeld(true);
    setQuat((p) => {
      const n = dq.clone().multiply(new THREE.Quaternion(p[1], p[2], p[3], p[0])).normalize();
      return canonicalQuat([n.w, n.x, n.y, n.z]);
    });
  }, []);
  return { quat, onDrag };
}

function LiveChips({ quat }) {
  const T = useTheme();
  const Q = useMemo(() => quatToQ(quat), [quat]);
  const ea = QToEA(Q, [3, 2, 1]);
  const sar = QToSAR(Q);
  const q = toCourseQuat(quat);
  const chip = (rep, label, body) => (
    <div className="live-chip" style={{ "--c": T.rep[rep] }}>
      <span className="live-tag">{label}</span>
      <span className="num">{body}</span>
    </div>
  );
  return (
    <div className="live-chips">
      {chip("dcm", "[Q] row 1", `${f(Q[0][0], 3)}  ${f(Q[0][1], 3)}  ${f(Q[0][2], 3)}`)}
      {chip("euler", "α β γ", `${f(ea.alpha, 1)}°  ${f(ea.beta, 1)}°  ${f(ea.gamma, 1)}°`)}
      {chip("sar", "θ", `${f(sar.theta, 1)}°`)}
      {chip("quat", "q", `${f(q[0], 3)}  ${f(q[1], 3)}  ${f(q[2], 3)}  ${f(q[3], 3)}`)}
    </div>
  );
}

const FOUR = [
  { key: "dcm", name: "Direction cosine matrix", sym: "[Q]", n: "9 numbers", line: "Each row is a body axis seen from the inertial frame.", to: "/tutorial/direction-cosine-matrix" },
  { key: "euler", name: "Euler angles", sym: "α β γ", n: "3 numbers + a sequence", line: "Three turns, each about an axis of the frame before.", to: "/tutorial/euler-angles" },
  { key: "sar", name: "Single-axis rotation", sym: "û, θ", n: "4 numbers", line: "Any attitude is one turn about one axis.", to: "/tutorial/single-axis-rotation" },
  { key: "quat", name: "Quaternion", sym: "q", n: "4 numbers", line: "The SAR with half angles. What flight software stores.", to: "/tutorial/quaternions" },
];

export default function Landing() {
  const T = useTheme();
  const { quat, onDrag } = useTumble();

  return (
    <Page>
      <section className="wrap hero">
        <div className="hero-copy rise">
          <h1>
            Spin a spacecraft.<br />
            <span className="hl">Watch the math follow.</span>
          </h1>
          <p className="lede" style={{ margin: "18px 0 26px", maxWidth: 520 }}>
            Attitude Bench shows one orientation four ways at once: the DCM, Euler angles, the single-axis
            rotation and the quaternion. Same notation as AE 426.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/playground" className="btn primary">Open the Playground <Arrow size={17} /></Link>
            <Link to="/tutorial" className="btn">Start the tutorial</Link>
          </div>
        </div>
        <div className="hero-stage rise" style={{ animationDelay: ".08s" }}>
          <div className="scene" style={{ height: "100%" }}>
            <Viewport quat={quat} onDrag={onDrag} gizmo={false} sar={null} autoSpin={0.06}
              view={{ az: 0.7, el: 0.36, dist: 9 }} />
            <LiveChips quat={quat} />
          </div>
        </div>
      </section>

      <section className="wrap" style={{ marginTop: 56 }}>
        <h2>Four ways to write one attitude</h2>
        <p className="dim" style={{ maxWidth: 640, margin: "10px 0 22px" }}>
          They all carry the same information. Each one is handy for a different job, and each colour sticks
          with its representation everywhere on the site.
        </p>
        <div className="four">
          {FOUR.map((r, i) => {
            const G = REP_GLYPH[r.key];
            return (
              <Link key={r.key} to={r.to} className="card four-card rise" style={{ "--c": T.rep[r.key], animationDelay: `${0.05 * i}s` }}>
                <div className="four-top">
                  <G size={58} />
                  <span className="rep-badge">{r.sym}</span>
                </div>
                <h3>{r.name}</h3>
                <p className="dim small" style={{ margin: "6px 0 10px" }}>{r.line}</p>
                <span className="chip" style={{ "--c": T.rep[r.key] }}>{r.n}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="wrap" style={{ marginTop: 56, marginBottom: 20 }}>
        <div className="three">
          <Link to="/tutorial" className="card sect">
            <Pages />
            <div>
              <h3>Tutorial</h3>
              <p className="dim small" style={{ margin: "6px 0 0" }}>Six short chapters in the order the course teaches them, each with something to play with.</p>
            </div>
          </Link>
          <Link to="/playground" className="card sect">
            <Craft />
            <div>
              <h3>Playground</h3>
              <p className="dim small" style={{ margin: "6px 0 0" }}>Drag, type, or press play on a 3-2-1 sequence and watch each turn happen.</p>
            </div>
          </Link>
          <Link to="/test-prep" className="card sect">
            <Ticks />
            <div>
              <h3>Test Prep</h3>
              <p className="dim small" style={{ margin: "6px 0 0" }}>Fresh conversion problems with the full working when you get stuck.</p>
            </div>
          </Link>
        </div>
      </section>
    </Page>
  );
}

/* little section illustrations */

function Pages() {
  return (
    <svg width="74" height="64" viewBox="0 0 74 64" aria-hidden="true">
      <rect x="20" y="6" width="44" height="52" rx="8" fill="var(--cardHi)" stroke="var(--line)" strokeWidth="2" transform="rotate(8 42 32)" />
      <rect x="10" y="6" width="44" height="52" rx="8" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
      {["dcm", "euler", "sar", "quat"].map((k, i) => (
        <g key={k}>
          <circle cx="20" cy={18 + i * 10} r="3.5" fill={`var(--${k})`} />
          <rect x="28" y={15.5 + i * 10} width={18 - (i % 2) * 6} height="5" rx="2.5" fill="var(--line)" />
        </g>
      ))}
    </svg>
  );
}

function Craft() {
  return (
    <svg width="74" height="64" viewBox="0 0 74 64" aria-hidden="true">
      <g transform="rotate(-18 37 32)">
        <rect x="3" y="26" width="22" height="12" rx="2" fill="#2852a8" />
        <rect x="49" y="26" width="22" height="12" rx="2" fill="#2852a8" />
        <path d="M3 32h22M49 32h22M14 26v12M60 26v12" stroke="rgba(170,200,255,.6)" strokeWidth="1" />
        <rect x="27" y="22" width="20" height="20" rx="3" fill="#d8a23a" />
        <path d="M37 22V8" stroke="var(--ax2)" strokeWidth="3" strokeLinecap="round" />
        <path d="M47 32h0" />
      </g>
      <circle cx="37" cy="32" r="27" fill="none" stroke="var(--sar)" strokeWidth="2.5" strokeDasharray="60 200" strokeLinecap="round" transform="rotate(200 37 32)" />
    </svg>
  );
}

function Ticks() {
  return (
    <svg width="74" height="64" viewBox="0 0 74 64" aria-hidden="true">
      <rect x="12" y="6" width="50" height="52" rx="10" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="22" y={16 + i * 13} width="9" height="9" rx="3" fill={i < 2 ? "var(--ax1)" : "var(--line)"} />
          {i < 2 && <path d={`M24 ${20.5 + i * 13}l2 2 3.5 -4`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
          <rect x="36" y={18 + i * 13} width={18 - i * 3} height="5" rx="2.5" fill="var(--line)" />
        </g>
      ))}
    </svg>
  );
}
