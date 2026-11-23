import { useState, useEffect, useMemo } from "react";
import Viewport from "./Viewport.jsx";
import { Play, Pause, Reset } from "./Icons.jsx";
import { useTheme } from "../lib/theme.js";
import { SEQUENCES, isProper } from "../lib/attitude.js";
import { seqName, SEQ_NICKNAME, quatToSAR, toCourseQuat } from "../lib/course.js";
import { eulerFrame, sarFrame } from "../lib/director.js";

const GREEK = ["α", "β", "γ"];

function axisLabel(seq, k) {
  const a = seq[k] - 1;
  return k === 0 ? { letter: "XYZ"[a], sub: "" } : { letter: "xyz"[a], sub: String(k) };
}

export function AxisName({ seq, k }) {
  const { letter, sub } = axisLabel(seq, k);
  return <span className="m">{letter}{sub && <sub style={{ fontStyle: "normal", fontSize: "0.7em" }}>{sub}</sub>}</span>;
}

/**
 * A self-contained "watch the sequence" scene for the tutorial.
 * mode "euler" builds the attitude one rotation at a time; mode "both" adds
 * a button that does the same attitude as one SAR turn.
 */
export default function SequencePlayer({ initial = [30, 20, 10], seqIndex = 5, editable = true, withSAR = false, height = 420 }) {
  const T = useTheme();
  const [si, setSi] = useState(seqIndex);
  const [ang, setAng] = useState(initial);
  const [mode, setMode] = useState("euler");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const seq = SEQUENCES[si];
  const tMax = mode === "euler" ? 3 : 1;
  const msPerUnit = mode === "euler" ? 1800 : 2600;

  const euler = useMemo(() => eulerFrame(seq, ang, mode === "euler" ? t : 3), [seq, ang, t, mode]);
  const sarInfo = useMemo(() => {
    // the single turn that lands on the same attitude, from the end state
    const r = quatToSAR(toCourseQuat(eulerFrame(seq, ang, 3).quat));
    return r.u ? r : null;
  }, [seq, ang]);
  const sar = useMemo(() => (mode === "sar" && sarInfo ? sarFrame(sarInfo.u, sarInfo.theta, t) : null), [mode, sarInfo, t]);
  const frame = mode === "sar" && sar ? sar : euler;

  useEffect(() => {
    if (!playing) return;
    let raf;
    const t0 = performance.now() - t * msPerUnit;
    const tick = (now) => {
      const nt = Math.min(tMax, (now - t0) / msPerUnit);
      setT(nt);
      if (nt < tMax) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mode]);

  const play = () => {
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* */ }
    if (reduce) { setT(tMax); return; }
    if (t >= tMax - 1e-6) setT(0);
    setPlaying((p) => !p);
  };

  const spin = frame.spin
    ? { ...frame.spin, color: mode === "sar" ? T.rep.sar : T.axis[frame.spin.axisIndex] }
    : null;

  const k = mode === "euler" ? euler.step : null;
  let caption;
  if (mode === "euler") {
    caption = t <= 0 ? <>Press play to build it one turn at a time</> : k < 3
      ? <>Step {k + 1}: <span className="m">{GREEK[k]}</span> = {euler.part[k].toFixed(1)}° about <AxisName seq={seq} k={k} /></>
      : <>Done: <span className="m">α β γ</span> = {ang.map((a) => `${a}°`).join(", ")}</>;
  } else {
    caption = !sarInfo ? <>No rotation to do</> : t <= 0 ? <>Press play for the single turn</> : t < 1 ? <>One turn: <span className="m">θ</span> = {sar ? sar.theta.toFixed(1) : 0}° about <span className="m">û</span></> : <>Same attitude in one turn of {sarInfo.theta.toFixed(1)}°</>;
  }
  const capColor = mode === "sar" ? T.rep.sar : k < 3 && t > 0 ? T.axis[seq[k] - 1] : T.rep.euler;

  return (
    <div>
      <div className="scene" style={{ height: `clamp(300px, 60vw, ${height}px)` }}>
        <Viewport quat={frame.quat} spin={spin} ghosts={mode === "euler" ? euler.ghosts : []}
          view={{ az: 0.62, el: 0.4, dist: 9.4 }} />
        <div className="caption" style={{ "--c": capColor }}>{caption}</div>
      </div>

      <div className="panel" style={{ marginTop: 10 }}>
        {withSAR && (
          <div className="seg" role="group" aria-label="Route" style={{ marginBottom: 12 }}>
            <button type="button" aria-pressed={mode === "euler"} style={{ "--c": T.rep.euler }}
              onClick={() => { setPlaying(false); setMode("euler"); setT(0); }}>Three Euler turns</button>
            <button type="button" aria-pressed={mode === "sar"} style={{ "--c": T.rep.sar }}
              onClick={() => { setPlaying(false); setMode("sar"); setT(0); }}>One SAR turn</button>
          </div>
        )}
        {mode === "euler" && (
          <div className="steps" style={{ marginBottom: 12 }}>
            {[0, 1, 2].map((j) => (
              <button key={j} type="button" className={`step${k === j && t > 0 ? " on" : ""}${k > j ? " done" : ""}`}
                style={{ "--c": T.axis[seq[j] - 1] }} onClick={() => { setPlaying(false); setT(j + 1); }}>
                <b>{GREEK[j]}</b> about <AxisName seq={seq} k={j} />
              </button>
            ))}
          </div>
        )}
        <div className="player-row">
          <button type="button" className="icon-btn" onClick={play} aria-label={playing ? "Pause" : "Play"}
            style={{ background: "var(--primary)", color: "var(--onPrimary)", borderColor: "transparent" }}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <input type="range" className="slider" min={0} max={tMax} step={0.001} value={t}
            style={{ "--c": mode === "sar" ? T.rep.sar : T.rep.euler }}
            onChange={(e) => { setPlaying(false); setT(+e.target.value); }} aria-label="Scrub" />
          <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setT(0); }} aria-label="Back to the start">
            <Reset size={16} />
          </button>
        </div>
        {editable && mode === "euler" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, alignItems: "flex-end" }}>
            <label>
              <div className="lbl">Sequence</div>
              <select className="field" style={{ width: 170 }} value={si}
                onChange={(e) => { setPlaying(false); setSi(+e.target.value); setT(0); }}>
                {SEQUENCES.map((s, i) => (
                  <option key={i} value={i}>{seqName(s)}{SEQ_NICKNAME[seqName(s)] ? ` · ${SEQ_NICKNAME[seqName(s)]}` : ""}</option>
                ))}
              </select>
            </label>
            {[0, 1, 2].map((j) => (
              <label key={j} style={{ flex: "1 1 80px" }}>
                <div className="lbl" style={{ color: T.axis[seq[j] - 1] }}><span className="m">{GREEK[j]}</span> {ang[j]}°</div>
                <input type="range" className="slider" style={{ "--c": T.axis[seq[j] - 1] }}
                  min={j === 1 ? (isProper(seq) ? 0 : -90) : -180} max={j === 1 ? (isProper(seq) ? 180 : 90) : 180} step={1}
                  value={ang[j]} aria-label={GREEK[j]}
                  onChange={(e) => { setPlaying(false); const a = ang.slice(); a[j] = +e.target.value; setAng(a); setT(3); }} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
