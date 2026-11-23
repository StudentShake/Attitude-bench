import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/SiteChrome.jsx";
import { Check, Cross, Arrow } from "../components/Icons.jsx";
import { Mat } from "./tutorial/kit.jsx";
import { useTheme } from "../lib/theme.js";
import { TYPES, makeProblem, grade, diagnose } from "../lib/practice.js";

const KEY = "attitude-bench:practice";
const f = (v, p = 4) => { const s = v.toFixed(p); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; };

function loadTally() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

/* ---------- what you're given ---------- */

function Given({ p }) {
  const T = useTheme();
  const g = p.given;
  if (g.ea) return (
    <div className="given">
      <span className="chip" style={{ "--c": T.rep.euler }}>3-2-1</span>
      <span className="m">α</span> = {g.ea[0]}°, <span className="m">β</span> = {g.ea[1]}°, <span className="m">γ</span> = {g.ea[2]}°
    </div>
  );
  if (g.Q) return <div className="given"><span className="m" style={{ fontSize: 20 }}>[Q] =</span> <Mat rows={g.Q} digits={4} color={(r) => T.axis[r]} /></div>;
  if (g.q) return (
    <div className="given">
      <span className="m">q</span> = [ {g.q.map((v) => f(v)).join(",  ")} ]
      <span className="tiny faint" style={{ marginLeft: 8 }}>scalar last</span>
    </div>
  );
  return (
    <div className="given">
      <span className="m">û</span> = ({g.u.map((v) => f(v)).join(", ")}), <span className="m">θ</span> = {g.theta}°
    </div>
  );
}

const PROMPT = {
  "ea-dcm": "Build [Q] and give these three entries.",
  "dcm-ea": "Find the 3-2-1 Euler angles.",
  "dcm-sar": "Find the Euler axis û and angle θ.",
  "sar-quat": "Find the quaternion (scalar last).",
  "quat-sar": "Find the Euler axis û and angle θ.",
  "sar-dcm": "Build [Q] from the SAR and give these two entries.",
};

/* ---------- the working, from the same library ---------- */

function Working({ p }) {
  const T = useTheme();
  const lines = [];
  if (p.type === "ea-dcm") {
    lines.push(<>[Q] = R<sub>1</sub>(γ) R<sub>2</sub>(β) R<sub>3</sub>(α), multiplied out with the 3-2-1 matrix:</>);
    lines.push(<Mat rows={p.Q} digits={4} color={(r) => T.axis[r]} />);
  } else if (p.type === "dcm-ea") {
    const Q = p.given.Q;
    lines.push(<>β = sin⁻¹(−Q₁₃) = sin⁻¹({f(-Q[0][2])}) = <b>{f(p.ea.beta, 2)}°</b></>);
    lines.push(<>α = atan2(Q₁₂, Q₁₁) = atan2({f(Q[0][1])}, {f(Q[0][0])}) → <b>{f(p.ea.alpha, 2)}°</b></>);
    lines.push(<>γ = atan2(Q₂₃, Q₃₃) = atan2({f(Q[1][2])}, {f(Q[2][2])}) → <b>{f(p.ea.gamma, 2)}°</b></>);
    lines.push(<span className="dim">α and γ are put between 0° and 360°.</span>);
  } else if (p.type === "dcm-sar") {
    const Q = p.given.Q, tr = Q[0][0] + Q[1][1] + Q[2][2];
    const g = 2 * Math.sin(p.sar.theta * Math.PI / 180);
    lines.push(<>θ = cos⁻¹((tr − 1)/2) = cos⁻¹(({f(tr)} − 1)/2) = <b>{f(p.sar.theta, 2)}°</b></>);
    lines.push(<>γ = 2 sin θ = {f(g)}</>);
    lines.push(<>u<sub>x</sub> = (Q₂₃ − Q₃₂)/γ = <b>{f(p.sar.u[0])}</b>, u<sub>y</sub> = (Q₃₁ − Q₁₃)/γ = <b>{f(p.sar.u[1])}</b>, u<sub>z</sub> = (Q₁₂ − Q₂₁)/γ = <b>{f(p.sar.u[2])}</b></>);
  } else if (p.type === "sar-quat") {
    const h = p.given.theta / 2, s = Math.sin(h * Math.PI / 180);
    lines.push(<>θ/2 = {h}°, sin(θ/2) = {f(s)}, cos(θ/2) = {f(p.q[3])}</>);
    lines.push(<>q = [ û sin(θ/2) ; cos(θ/2) ] = [ <b>{p.q.map((v) => f(v)).join(",  ")}</b> ]</>);
  } else if (p.type === "quat-sar") {
    const q = p.given.q, s = Math.sin(p.sar.theta * Math.PI / 360);
    lines.push(<>θ = 2 cos⁻¹(q₄) = 2 cos⁻¹({f(q[3])}) = <b>{f(p.sar.theta, 2)}°</b></>);
    lines.push(<>sin(θ/2) = {f(s)}, so û = (q₁, q₂, q₃)/sin(θ/2) = <b>({p.sar.u.map((v) => f(v)).join(", ")})</b></>);
  } else if (p.type === "sar-dcm") {
    lines.push(<>Plug û and θ into the SAR matrix:</>);
    lines.push(<Mat rows={p.Q} digits={4} color={(r) => T.axis[r]} />);
  }
  return <div className="working">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>;
}

/* ============================================================================ */

export default function TestPrep() {
  const T = useTheme();
  const [mode, setMode] = useState("mix");
  const [p, setP] = useState(() => makeProblem(TYPES[Math.floor(Math.random() * TYPES.length)].key));
  const [ans, setAns] = useState({});
  const [checked, setChecked] = useState(null);
  const [showWork, setShowWork] = useState(false);
  const [tally, setTally] = useState(loadTally);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(tally)); } catch { /* fine */ } }, [tally]);

  const next = useCallback((m = mode) => {
    const type = m === "mix" ? TYPES[Math.floor(Math.random() * TYPES.length)].key : m;
    setP(makeProblem(type));
    setAns({});
    setChecked(null);
    setShowWork(false);
  }, [mode]);

  const check = () => {
    if (p.ask.every((fld) => String(ans[fld.id] ?? "").trim() === "")) {
      setChecked({ res: {}, all: false, hint: "Type at least one answer first." });
      return;
    }
    const res = Object.fromEntries(p.ask.map((fld) => [fld.id, grade(fld, ans[fld.id] ?? "")]));
    const all = p.ask.every((fld) => res[fld.id].ok);
    setChecked({ res, all, hint: all ? null : diagnose(p, ans) });
    if (!checked || !Object.keys(checked.res).length) {
      setTally((t) => {
        const [r, n] = t[p.type] || [0, 0];
        return { ...t, [p.type]: [r + (all ? 1 : 0), n + 1] };
      });
    }
  };

  const typeInfo = TYPES.find((t) => t.key === p.type);
  const shaky = Object.entries(tally)
    .filter(([, [, n]]) => n >= 2)
    .map(([k, [r, n]]) => ({ k, rate: r / n }))
    .sort((a, b) => a.rate - b.rate)[0];

  return (
    <Page>
      <div className="wrap" style={{ maxWidth: 900, paddingTop: 26 }}>
        <h1 style={{ fontSize: "clamp(32px, 4.4vw, 46px)" }}>Test Prep</h1>
        <p className="lede" style={{ margin: "10px 0 20px", maxWidth: 620 }}>
          New numbers every time. Work it on paper, type what you got, then check. The working is there if you
          get stuck.
        </p>

        <div className="type-row" role="group" aria-label="Problem type">
          <button type="button" className={`step${mode === "mix" ? " on" : ""}`} style={{ "--c": T.primary }}
            onClick={() => { setMode("mix"); next("mix"); }}>Mix it up</button>
          {TYPES.map((t) => {
            const [r, n] = tally[t.key] || [0, 0];
            return (
              <button key={t.key} type="button" className={`step${mode === t.key ? " on" : ""}`}
                style={{ "--c": T.rep[t.to] }} onClick={() => { setMode(t.key); next(t.key); }}>
                <i className="dot" style={{ "--c": T.rep[t.from] }} />{t.label}
                {n > 0 && <span className="faint tiny" style={{ marginLeft: 4 }}>{r}/{n}</span>}
              </button>
            );
          })}
        </div>

        <section className="card prob" style={{ "--c": T.rep[typeInfo.to] }}>
          <div className="prob-head">
            <span className="chip" style={{ "--c": T.rep[typeInfo.from] }}>{typeInfo.label}</span>
            <span className="dim small">{PROMPT[p.type]}</span>
          </div>
          <Given p={p} />

          <div className="answers">
            {p.ask.map((fld) => {
              const r = checked && checked.res[fld.id];
              const col = fld.color === "q" ? T.rep.quat : typeof fld.color === "number" ? T.axis[fld.color] : T.rep[typeInfo.to];
              return (
                <label key={fld.id} className={`ans${r ? (r.ok ? " good" : " bad") : ""}`}>
                  <span className="lbl" style={{ color: `color-mix(in srgb, ${col} 80%, var(--text))` }}>
                    <span className="m">{fld.label.replace(/_(\w)/, "")}</span>
                    {/_(\w)/.test(fld.label) && <sub>{fld.label.match(/_(\w)/)[1]}</sub>}
                    {fld.kind === "deg" && <span className="faint"> (deg)</span>}
                  </span>
                  <span style={{ position: "relative", display: "block" }}>
                    <input className="field" inputMode="decimal" value={ans[fld.id] ?? ""}
                      style={{ "--c": col }}
                      onChange={(e) => { setAns((a) => ({ ...a, [fld.id]: e.target.value })); }}
                      onKeyDown={(e) => { if (e.key === "Enter") check(); }}
                      aria-label={fld.label} />
                    {r && <span className="mark">{r.ok ? <Check size={16} /> : <Cross size={16} />}</span>}
                  </span>
                  {r && !r.ok && <span className="tiny dim">{f(fld.value, fld.kind === "deg" ? 2 : 4)}</span>}
                </label>
              );
            })}
          </div>

          {checked && (
            <div className={`verdict${checked.all ? " good" : ""}`}>
              {checked.all ? "All correct. Nice." : checked.hint || "Not quite. The right values are under each box."}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button type="button" className="btn primary" onClick={check}>Check</button>
            <button type="button" className="btn" onClick={() => setShowWork((s) => !s)}>{showWork ? "Hide the working" : "Show the working"}</button>
            <button type="button" className="btn" onClick={() => next()} style={{ marginLeft: "auto" }}>Next problem <Arrow size={16} /></button>
          </div>
          {showWork && <Working p={p} />}
        </section>

        <div className="small dim" style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
          <span>
            {shaky && shaky.rate < 1
              ? <>Shakiest so far: <b style={{ color: "var(--text)" }}>{TYPES.find((t) => t.key === shaky.k).label}</b> ({Math.round(shaky.rate * 100)}%). Tap it above to drill it.</>
              : "Answers within 0.15° or 0.003 count. Your scores stay on this device."}
          </span>
          {Object.keys(tally).length > 0 && (
            <button type="button" className="link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => setTally({})}>Reset scores</button>
          )}
        </div>

        <p className="small dim" style={{ marginTop: 24 }}>
          Want to see one of these move? Paste the numbers into the <Link className="link" to="/playground">Playground</Link>.
        </p>
      </div>
    </Page>
  );
}
