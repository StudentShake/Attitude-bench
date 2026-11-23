import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { EAToQ, QToEA, wrap360 } from "../../lib/course.js";
import { SEQUENCES } from "../../lib/attitude.js";
import SequencePlayer from "../../components/SequencePlayer.jsx";
import NumField from "../../components/NumField.jsx";
import { Fig, M, Mat, Ask, TeX } from "./kit.jsx";

const SYM = ["1-2-1", "1-3-1", "2-1-2", "2-3-2", "3-1-3", "3-2-3"];
const ASYM = ["3-2-1", "2-3-1", "1-3-2", "3-1-2", "2-1-3", "1-2-3"];
const NICK = { "3-2-1": "yaw, pitch, roll", "3-1-3": "classical" };

function SeqGrid({ list, current, onPick }) {
  const T = useTheme();
  return (
    <div className="seqs">
      {list.map((s) => (
        <button key={s} type="button" aria-pressed={current === s} onClick={() => onPick(s)}
          className={`seq-chip${NICK[s] ? " star" : ""}`} style={{ "--c": T.rep.euler }} title={`Play the ${s} sequence`}>
          {s.split("-").map((d, i) => (
            <span key={i}>
              <span style={{ color: T.axis[+d - 1] }}>{d}</span>{i < 2 && <span style={{ color: T.faint }}>-</span>}
            </span>
          ))}
          <small>{NICK[s] || " "}</small>
        </button>
      ))}
    </div>
  );
}

function Order() {
  const T = useTheme();
  const box = (name, sub, ang, col, note) => (
    <div style={{ textAlign: "center" }}>
      <div style={{
        border: `2.5px solid ${col}`, background: `color-mix(in srgb, ${col} 14%, var(--card))`, borderRadius: 14,
        padding: "10px 14px", fontFamily: "Times New Roman", fontStyle: "italic", fontSize: 22, fontWeight: 700,
      }}>[{name}<sub style={{ fontStyle: "normal", fontSize: 13 }}>{sub}</sub>({ang})]</div>
      <div className="tiny dim" style={{ marginTop: 6, fontWeight: 600 }}>{note}</div>
    </div>
  );
  return (
    <Fig caption="Read the product right to left. The matrix touching the vector is the rotation that happens first.">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontSize: 24, fontWeight: 700, paddingTop: 10 }}>[Q] =</div>
          {box("R", 1, "γ", T.axis[0], "3rd: roll")}
          {box("R", 2, "β", T.axis[1], "2nd: pitch")}
          {box("R", 3, "α", T.axis[2], "1st: yaw")}
        </div>
        <svg viewBox="0 0 400 40" style={{ maxWidth: 420, margin: "10px auto 0" }} aria-hidden="true">
          <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill={T.primary} /></marker></defs>
          <path d="M360 14 C 300 34, 120 34, 50 14" fill="none" stroke={T.primary} strokeWidth="3" markerEnd="url(#arr)" />
          <text x="205" y="22" textAnchor="middle" fill={T.dim} fontSize="13" fontFamily="var(--sans)" fontWeight="600">order applied</text>
        </svg>
      </div>
    </Fig>
  );
}

function BackOut() {
  const T = useTheme();
  const [a, setA] = useState([30, 20, 10]);
  const Q = useMemo(() => EAToQ(a[0], a[1], a[2], [3, 2, 1]), [a]);
  const back = QToEA(Q, [3, 2, 1]);
  const G = ["α", "β", "γ"];
  return (
    <Fig caption="Type any three angles. The matrix is built with the 3-2-1 formula, then the angles are pulled back out of the highlighted entries.">
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, flex: "0 0 150px" }}>
          {[0, 1, 2].map((k) => (
            <label key={k} style={{ display: "grid", gridTemplateColumns: "26px 1fr", alignItems: "center", gap: 6 }}>
              <span className="m" style={{ fontSize: 20, color: T.axis[2 - k], fontWeight: 700 }}>{G[k]}</span>
              <NumField value={String(a[k])} suffix="°" color={T.axis[2 - k]} label={G[k]}
                onCommit={(v) => { const n = a.slice(); n[k] = v; setA(n); }} />
            </label>
          ))}
        </div>
        <div style={{ flex: "1 1 260px", textAlign: "center" }}>
          <Mat rows={Q} digits={4} color={(r, c) => (r === 0 || c === 2 ? T.rep.euler : undefined)} />
          <div className="small dim" style={{ marginTop: 12 }}>
            Back out: <span className="m">α</span> = {back.alpha.toFixed(2)}°, <span className="m">β</span> = {back.beta.toFixed(2)}°, <span className="m">γ</span> = {back.gamma.toFixed(2)}°
          </div>
        </div>
      </div>
    </Fig>
  );
}

/* why a plain tan⁻¹ can be 180° off */
function Quadrant() {
  const T = useTheme();
  const [alpha, setAlpha] = useState(210);
  const a = (alpha * Math.PI) / 180;
  const q11 = Math.cos(a), q12 = Math.sin(a); // with cos β > 0 these have the signs of cos α and sin α
  const calc = Math.abs(q11) < 1e-9 ? (q12 > 0 ? 90 : -90) : (Math.atan(q12 / q11) * 180) / Math.PI;
  const off = Math.abs(((wrap360(calc) - wrap360(alpha) + 540) % 360) - 180) > 1;
  const O = [180, 160], R = 112;
  const P = (deg, r = R) => [O[0] + r * Math.cos((deg * Math.PI) / 180), O[1] - r * Math.sin((deg * Math.PI) / 180)];
  const t = P(alpha), c = P(calc), l1 = P(alpha, 150), l2 = P(alpha + 180, 150);
  const quad = Math.floor(wrap360(alpha) / 90);
  const qStart = quad * 90;
  const wedge = `M${O[0]} ${O[1]} L${P(qStart)[0]} ${P(qStart)[1]} A${R} ${R} 0 0 0 ${P(qStart + 90)[0]} ${P(qStart + 90)[1]} Z`;
  return (
    <Fig caption="tan α only sees the ratio Q₁₂ / Q₁₁, which is the slope of the dashed line. Two directions share that slope, 180° apart. A calculator always answers with the one on the right half. The signs of Q₁₂ and Q₁₁ tell you which half α is really in.">
      <div className="panel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <svg viewBox="0 0 360 320" style={{ flex: "1 1 240px", maxWidth: 380 }} role="img" aria-label={`True alpha ${alpha} degrees, calculator answer ${calc.toFixed(1)} degrees`}>
            <path d={wedge} fill={T.rep.euler} opacity=".12" />
            <rect x={O[0]} y={O[1] - R - 10} width={R + 10} height={2 * R + 20} fill={T.primary} opacity=".07" />
            <text x={O[0] + R - 4} y={O[1] + R + 4} textAnchor="end" fill={T.faint} fontSize="12" style={{ fontFamily: "var(--sans)" }}>calculator&apos;s half</text>
            <circle cx={O[0]} cy={O[1]} r={R} fill="none" stroke={T.line} strokeWidth="1.5" />
            <line x1={O[0] - R - 14} y1={O[1]} x2={O[0] + R + 14} y2={O[1]} stroke={T.line} strokeWidth="1.5" />
            <line x1={O[0]} y1={O[1] - R - 14} x2={O[0]} y2={O[1] + R + 14} stroke={T.line} strokeWidth="1.5" />
            <text x={O[0] + R + 4} y={O[1] - 6} fill={T.dim} fontSize="12" style={{ fontFamily: "var(--sans)" }}>Q₁₁ +</text>
            <text x={O[0] + 6} y={O[1] - R - 4} fill={T.dim} fontSize="12" style={{ fontFamily: "var(--sans)" }}>Q₁₂ +</text>
            <line x1={l2[0]} y1={l2[1]} x2={l1[0]} y2={l1[1]} stroke={T.faint} strokeWidth="2" strokeDasharray="6 5" />
            {off && <line x1={O[0]} y1={O[1]} x2={c[0]} y2={c[1]} stroke={T.axis[0]} strokeWidth="4" strokeLinecap="round" />}
            {off && <circle cx={c[0]} cy={c[1]} r="7" fill={T.card} stroke={T.axis[0]} strokeWidth="3" />}
            <line x1={O[0]} y1={O[1]} x2={t[0]} y2={t[1]} stroke={T.rep.euler} strokeWidth="5" strokeLinecap="round" />
            <circle cx={t[0]} cy={t[1]} r="8" fill={T.rep.euler} />
            {(() => { const q = P(alpha, R + 26); return <text x={q[0]} y={q[1] + 5} textAnchor="middle" fill={T.rep.euler} fontSize="15" style={{ fontFamily: "var(--sans)", fontWeight: 700 }}>true α</text>; })()}
            {off && (() => { const q = P(calc, R + 26); return <text x={q[0]} y={q[1] + 5} textAnchor="middle" fill={T.axis[0]} fontSize="15" style={{ fontFamily: "var(--sans)", fontWeight: 700 }}>calculator</text>; })()}
          </svg>
          <div style={{ flex: "1 1 220px" }} className="small">
            <div className="num" style={{ lineHeight: 2 }}>
              Q₁₁ ∝ cos α = <b style={{ color: q11 < 0 ? T.axis[0] : T.axis[1] }}>{q11 >= 0 ? "+" : "−"}{Math.abs(q11).toFixed(3)}</b><br />
              Q₁₂ ∝ sin α = <b style={{ color: q12 < 0 ? T.axis[0] : T.axis[1] }}>{q12 >= 0 ? "+" : "−"}{Math.abs(q12).toFixed(3)}</b><br />
              tan⁻¹(Q₁₂/Q₁₁) = <b>{calc.toFixed(1)}°</b>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 15 }}>
              {off
                ? <>Q₁₁ is negative, so α is on the left half. Add 180°: <b>{wrap360(calc + 180).toFixed(1)}°</b>.</>
                : <>Q₁₁ is positive, so the calculator&apos;s answer is right{calc < 0 ? <> (as {wrap360(calc).toFixed(1)}° in 0 to 360°)</> : null}.</>}
            </p>
          </div>
        </div>
        <label style={{ display: "block", marginTop: 6 }}>
          <div className="lbl" style={{ color: T.rep.euler }}><M>α</M> = {alpha}°</div>
          <input type="range" className="slider" min={0} max={359} value={alpha} style={{ "--c": T.rep.euler }}
            onChange={(e) => setAlpha(+e.target.value)} aria-label="alpha" />
        </label>
      </div>
    </Fig>
  );
}

export default function Ch3() {
  const [si, setSi] = useState(5);
  const [playKey, setPlayKey] = useState(0);
  const top = useRef(null);
  const pick = (name) => {
    const i = SEQUENCES.findIndex((q) => q.join("-") === name);
    if (i < 0) return;
    setSi(i);
    setPlayKey((k) => k + 1);
    top.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const current = SEQUENCES[si].join("-");
  return (
    <>
      <p className="lede">
        Any attitude can be reached with at most three turns, each about one axis. The three angles are
        the Euler angles, <M>α</M>, <M>β</M> and <M>γ</M>, in the order you do them.
      </p>

      <div ref={top}>
        <SequencePlayer seqIndex={si} onSeq={setSi} playKey={playKey} />
      </div>

      <h2>Each turn uses the frame you just made</h2>
      <p>
        Start in <M>XYZ</M>. The first turn, <M>α</M>, gives a new frame <M>x</M><sub>1</sub><M>y</M><sub>1</sub><M>z</M><sub>1</sub>.
        The second turn is about an axis of <i>that</i> frame and gives <M>x</M><sub>2</sub><M>y</M><sub>2</sub><M>z</M><sub>2</sub>.
        The third turn finishes at the body frame. In the player, the dashed triad with the small tags is the frame from
        the step before, and the glowing rod is the axis you&apos;re turning about right now.
      </p>
      <p>
        Two turns in a row about the same axis would just be one bigger turn, so each step uses a different
        axis than the one before it.
      </p>

      <h2>Twelve sequences</h2>
      <p>
        That rule leaves 12 sequences. When the first and third axes match the sequence is <b>symmetric</b>;
        otherwise it&apos;s <b>asymmetric</b>. Tap any of them to watch it in the player above.
      </p>
      <Fig caption="Digits are coloured by axis: 1 is x, 2 is y, 3 is z. 3-2-1 is the course default.">
        <div className="panel">
          <div className="small dim" style={{ fontWeight: 700, marginBottom: 8 }}>Asymmetric</div>
          <SeqGrid list={ASYM} current={current} onPick={pick} />
          <div className="small dim" style={{ fontWeight: 700, margin: "14px 0 8px" }}>Symmetric</div>
          <SeqGrid list={SYM} current={current} onPick={pick} />
        </div>
      </Fig>

      <h2>From angles to [Q]</h2>
      <p>
        Multiply the three elementary matrices. For 3-2-1, <M>α</M> is about <M>z</M>, <M>β</M> about the new{" "}
        <M>y</M>, <M>γ</M> about the newest <M>x</M>:
      </p>
      <Order />
      <p>Multiplying it out gives:</p>
      <TeX block>{String.raw`[Q]_{321} = \begin{bmatrix} c\alpha\, c\beta & s\alpha\, c\beta & -s\beta \\ c\alpha\, s\beta\, s\gamma - s\alpha\, c\gamma & s\alpha\, s\beta\, s\gamma + c\alpha\, c\gamma & c\beta\, s\gamma \\ c\alpha\, s\beta\, c\gamma + s\alpha\, s\gamma & s\alpha\, s\beta\, c\gamma - c\alpha\, s\gamma & c\beta\, c\gamma \end{bmatrix}`}</TeX>
      <p><Link className="link" to="/tutorial/the-math#angles-to-q">Watch it multiply out, one entry at a time →</Link></p>

      <h2>From [Q] back to angles</h2>
      <p>Three entries are enough, because each one isolates a single angle:</p>
      <TeX block>{String.raw`\beta = \sin^{-1}(-Q_{13}) \qquad \alpha = \tan^{-1}\!\frac{Q_{12}}{Q_{11}} \qquad \gamma = \tan^{-1}\!\frac{Q_{23}}{Q_{33}}`}</TeX>
      <BackOut />
      <p><Link className="link" to="/tutorial/the-math#q-to-angles">Why these entries? See the cancelling →</Link></p>

      <h2>Why tan⁻¹ can be 180° off</h2>
      <Quadrant />
      <Ask q="Which matrix goes on the right?" tone="euler">
        <p>
          The first rotation. In <M>[Q] = R</M><sub>1</sub>(<M>γ</M>) <M>R</M><sub>2</sub>(<M>β</M>) <M>R</M><sub>3</sub>(<M>α</M>),
          the sequence is named 3-2-1 in the order you do the turns, and written right to left in the product.
        </p>
      </Ask>
    </>
  );
}
