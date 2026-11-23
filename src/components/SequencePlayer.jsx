import { useState, useEffect, useMemo, useRef } from "react";
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

const reduceMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

/**
 * "Watch the sequence" scene for the tutorial.
 * - Euler mode builds the attitude one rotation at a time; each step chip plays just that step.
 * - With withSAR, a second route does the same attitude as one turn. Each route
 *   remembers where you left it, so you can flip between the two finished states.
 * - seqIndex / onSeq make the sequence controllable from outside; bump playKey to auto-play.
 */
export default function SequencePlayer({
  initial = [30, 20, 10], seqIndex, onSeq, playKey = 0, editable = true, withSAR = false, height = 420,
}) {
  const T = useTheme();
  const [ownSi, setOwnSi] = useState(5);
  const si = seqIndex ?? ownSi;
  const setSi = (i) => (onSeq ? onSeq(i) : setOwnSi(i));
  const [ang, setAng] = useState(initial);
  const [mode, setMode] = useState("euler");
  const [times, setTimes] = useState({ euler: 0, sar: 0 });
  const [playing, setPlaying] = useState(false);
  const [stopAt, setStopAt] = useState(null);
  const t = times[mode];
  const setT = (v) => setTimes((tt) => ({ ...tt, [mode]: v }));
  const seq = SEQUENCES[si];
  const tMax = mode === "euler" ? 3 : 1;
  const msPerUnit = mode === "euler" ? 1800 : 2600;

  const euler = useMemo(() => eulerFrame(seq, ang, mode === "euler" ? t : 3), [seq, ang, t, mode]);
  const sarInfo = useMemo(() => {
    const r = quatToSAR(toCourseQuat(eulerFrame(seq, ang, 3).quat));
    return r.u ? r : null;
  }, [seq, ang]);
  const sar = useMemo(() => (mode === "sar" && sarInfo ? sarFrame(sarInfo.u, sarInfo.theta, t) : null), [mode, sarInfo, t]);
  const frame = mode === "sar" && sar ? sar : euler;

  /* restart from the top when the parent asks (a sequence chip was tapped) */
  const [seenKey, setSeenKey] = useState(playKey);
  const [runId, setRunId] = useState(0);
  if (seenKey !== playKey) {
    setSeenKey(playKey);
    setMode("euler");
    setStopAt(null);
    const instant = reduceMotion();
    setTimes((tt) => ({ ...tt, euler: instant ? 3 : 0 }));
    setPlaying(!instant);
    setRunId((r) => r + 1);
  }

  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    if (!playing) return;
    let raf;
    const end = stopAt ?? tMax;
    const t0 = performance.now() - tRef.current * msPerUnit;
    const m = mode;
    const tick = (now) => {
      const nt = Math.min(end, (now - t0) / msPerUnit);
      setTimes((tt) => ({ ...tt, [m]: nt }));
      if (nt < end) raf = requestAnimationFrame(tick);
      else { setPlaying(false); setStopAt(null); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, mode, stopAt, tMax, msPerUnit, runId]);

  const play = () => {
    if (reduceMotion()) { setT(tMax); return; }
    setStopAt(null);
    if (t >= tMax - 1e-6) { tRef.current = 0; setT(0); }
    setPlaying((p) => !p);
  };

  /** Tapping a step chip plays just that step. */
  const playStep = (j) => {
    if (reduceMotion()) { setT(j + 1); return; }
    setPlaying(false);
    tRef.current = j;
    setT(j);
    setStopAt(j + 1);
    requestAnimationFrame(() => setPlaying(true));
  };

  const spin = frame.spin
    ? {
      ...frame.spin,
      color: mode === "sar" ? T.rep.sar : T.axis[frame.spin.axisIndex],
      label: mode === "sar" ? { letter: "û", sub: "" } : frame.spin.label,
    }
    : null;

  const k = mode === "euler" ? euler.step : null;
  let caption;
  if (mode === "euler") {
    caption = t <= 0 ? <>Press play to build it one turn at a time</> : k < 3
      ? <>Step {k + 1}: <span className="m">{GREEK[k]}</span> = {euler.part[k].toFixed(1)}° about <AxisName seq={seq} k={k} /></>
      : <>Done: <span className="m">α β γ</span> = {ang.map((a) => `${a}°`).join(", ")}</>;
  } else {
    caption = !sarInfo ? <>No rotation to do</> : t <= 0 ? <>Press play for the single turn</> : t < 1
      ? <>One turn: <span className="m">θ</span> = {sar ? sar.theta.toFixed(1) : 0}° about <span className="m">û</span></>
      : <>Same attitude in one turn of {sarInfo.theta.toFixed(1)}°</>;
  }
  const capColor = mode === "sar" ? T.rep.sar : k < 3 && t > 0 ? T.axis[seq[k] - 1] : T.rep.euler;

  return (
    <div>
      <div className="scene" style={{ height: `clamp(300px, 60vw, ${height}px)` }}>
        <Viewport quat={frame.quat} spin={spin} ghosts={mode === "euler" ? euler.ghosts : undefined}
          view={{ az: 0.62, el: 0.4, dist: 9.8 }} />
        <div className="caption" style={{ "--c": capColor }}>{caption}</div>
      </div>

      <div className="panel" style={{ marginTop: 10 }}>
        {withSAR && (
          <div className="seg" role="group" aria-label="Route" style={{ marginBottom: 12 }}>
            <button type="button" aria-pressed={mode === "euler"} style={{ "--c": T.rep.euler }}
              onClick={() => { setPlaying(false); setStopAt(null); setMode("euler"); }}>Three Euler turns</button>
            <button type="button" aria-pressed={mode === "sar"} style={{ "--c": T.rep.sar }}
              onClick={() => { setPlaying(false); setStopAt(null); setMode("sar"); }}>One SAR turn</button>
          </div>
        )}
        {mode === "euler" && (
          <div className="steps" style={{ marginBottom: 12 }}>
            {[0, 1, 2].map((j) => (
              <button key={j} type="button"
                className={`step${t > 0 && k === j ? " on" : ""}${t > 0 && k > j ? " done" : ""}`}
                style={{ "--c": T.axis[seq[j] - 1] }} onClick={() => playStep(j)}
                title={`Play just the ${GREEK[j]} turn`}>
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
            onChange={(e) => { setPlaying(false); setStopAt(null); setT(+e.target.value); }} aria-label="Scrub" />
          <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setStopAt(null); setT(0); }} aria-label="Back to the start">
            <Reset size={16} />
          </button>
        </div>
        {editable && mode === "euler" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, alignItems: "flex-end" }}>
            <label>
              <div className="lbl">Sequence</div>
              <select className="field" style={{ width: 170 }} value={si}
                onChange={(e) => { setPlaying(false); setSi(+e.target.value); setTimes((tt) => ({ ...tt, euler: 0 })); }}>
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
                  onChange={(e) => { setPlaying(false); const a = ang.slice(); a[j] = +e.target.value; setAng(a); setTimes((tt) => ({ ...tt, euler: 3 })); }} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
