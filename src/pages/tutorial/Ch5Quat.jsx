import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { SARToQuat, EAToQ } from "../../lib/course.js";
import { dcmToQuat, canonicalQuat, mul } from "../../lib/attitude.js";
import { Fig, M, TeX, Mat, Scene } from "./kit.jsx";

const U = [0.124015, 0.615638, 0.778209]; // the axis for α 30°, β 20°, γ 10° (3-2-1)

function HalfAngle() {
  const T = useTheme();
  const [th, setTh] = useState(36);
  const q = SARToQuat(U, th);
  const h = (th / 2) * Math.PI / 180;
  const C = [150, 150], R = 110;
  const P = (a) => [C[0] + R * Math.cos(a), C[1] - R * Math.sin(a)];
  const pt = P(h), full = P(th * Math.PI / 180);
  const arc = (a, r) => {
    const e = [C[0] + r * Math.cos(a), C[1] - r * Math.sin(a)];
    return `M${C[0] + r} ${C[1]} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 0 ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
  };
  return (
    <Fig caption="Slide θ. The quaternion is built from half of it: the scalar q₄ is cos(θ/2), and the vector part is û stretched by sin(θ/2). Past 180°, q₄ goes negative.">
      <div className="panel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <svg viewBox="0 0 345 300" style={{ flex: "1 1 260px", maxWidth: 360 }} role="img" aria-label={`Unit circle showing theta ${th} degrees and half of it`}>
            <circle cx={C[0]} cy={C[1]} r={R} fill="none" stroke={T.line} strokeWidth="2" />
            <line x1={C[0] - R - 10} y1={C[1]} x2={C[0] + R + 10} y2={C[1]} stroke={T.line} strokeWidth="1.5" />
            <line x1={C[0]} y1={C[1] - R - 10} x2={C[0]} y2={C[1] + R + 10} stroke={T.line} strokeWidth="1.5" />
            {th > 0.5 && <path d={arc(th * Math.PI / 180, 46)} fill="none" stroke={T.rep.sar} strokeWidth="4" strokeLinecap="round" />}
            {th > 0.5 && <path d={arc(h, 76)} fill="none" stroke={T.rep.quat} strokeWidth="4" strokeLinecap="round" />}
            <line x1={C[0]} y1={C[1]} x2={full[0]} y2={full[1]} stroke={T.rep.sar} strokeWidth="2" strokeDasharray="5 4" />
            <line x1={C[0]} y1={C[1]} x2={pt[0]} y2={pt[1]} stroke={T.rep.quat} strokeWidth="3.5" />
            <line x1={pt[0]} y1={pt[1]} x2={pt[0]} y2={C[1]} stroke={T.text} strokeWidth="2" strokeDasharray="3 3" />
            <line x1={C[0]} y1={C[1] + 3} x2={pt[0]} y2={C[1] + 3} stroke={T.rep.quat} strokeWidth="6" strokeLinecap="round" />
            <circle cx={pt[0]} cy={pt[1]} r="7" fill={T.rep.quat} />
            <text x={(C[0] + pt[0]) / 2} y={C[1] + 24} textAnchor="middle" fill={T.rep.quat} fontSize="14" fontFamily="var(--sans)" fontWeight="700">q₄ = cos(θ/2)</text>
            <text x={pt[0] + 8} y={(C[1] + pt[1]) / 2} fill={T.text} fontSize="13" fontFamily="var(--sans)" fontWeight="600">sin(θ/2)</text>
            <text x={C[0] + 52} y={C[1] - 8} fill={T.rep.sar} fontSize="17" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">θ</text>
          </svg>
          <div style={{ flex: "1 1 220px" }}>
            {[0, 1, 2, 3].map((i) => {
              const v = q[i];
              const col = i < 3 ? T.axis[i] : T.rep.quat;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr 64px", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span className="m" style={{ color: col, fontWeight: 700, fontSize: 18 }}>q<sub style={{ fontStyle: "normal", fontSize: 12 }}>{i + 1}</sub></span>
                  <div className="qbar" style={{ "--c": col, height: 12, marginTop: 0, borderRadius: 6 }}>
                    <i style={{ left: `${50 + Math.min(0, v) * 50}%`, width: `${Math.abs(v) * 50}%` }} />
                  </div>
                  <span className="num" style={{ textAlign: "right" }}>{v.toFixed(3)}</span>
                </div>
              );
            })}
            <div className="tiny dim">Axis fixed at <M>û</M> = (0.124, 0.616, 0.778), the axis for α 30°, β 20°, γ 10°.</div>
          </div>
        </div>
        <label style={{ display: "block", marginTop: 8 }}>
          <div className="lbl" style={{ color: T.rep.sar }}><span className="m">θ</span> = {th}°</div>
          <input type="range" className="slider" min={0} max={360} step={1} value={th} style={{ "--c": T.rep.sar }}
            onChange={(e) => setTh(+e.target.value)} aria-label="theta" />
        </label>
      </div>
    </Fig>
  );
}

/* where q₁, q₂, q₃ come from: û, shrunk by sin(θ/2), then its shadows */
function VectorPart() {
  const T = useTheme();
  const [th, setTh] = useState(72);
  const s2 = Math.sin((th * Math.PI) / 360);
  const q = U.map((v) => v * s2);
  const P = (x, y, z) => [230 - x * 90 + y * 140, 220 - z * 150 + x * 55];
  const o = P(0, 0, 0), uT = P(...U), qT = P(...q);
  const feet = [P(q[0], 0, 0), P(0, q[1], 0), P(0, 0, q[2])];
  const off = [[-60, 22], [10, 22], [-60, 6]];
  const sans = { fontFamily: "var(--sans)", fontWeight: 700 };
  return (
    <Fig caption="Both dials on this page go all the way to 360°. Past 180°, sin(θ/2) shrinks again while q₄ goes negative: that's the −q copy of a smaller turn the other way. Start with the unit axis û (amber). Shrink it to length sin(θ/2) (pink). The shadows of that shorter arrow on X, Y and Z are q₁, q₂ and q₃. So q₁ is just uₓ scaled by sin(θ/2), and the same for the other two.">
      <div className="panel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <svg viewBox="0 0 440 290" style={{ flex: "1 1 280px", maxWidth: 460 }} role="img" aria-label="The axis u and the shorter vector u times sin of theta over 2, with its components q1, q2, q3">
            {[[1.25, 0, 0, 0, "X"], [0, 1.2, 0, 1, "Y"], [0, 0, 1.15, 2, "Z"]].map(([x, y, z, i, nm]) => {
              const e = P(x, y, z);
              return (
                <g key={nm}>
                  <line x1={o[0]} y1={o[1]} x2={e[0]} y2={e[1]} stroke={T.axis[i]} strokeWidth="2.2" strokeDasharray="6 5" />
                  <text x={e[0] + (i === 0 ? -20 : 6)} y={e[1] + (i === 0 ? 18 : 6)} fill={T.axis[i]} fontSize="19" style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontWeight: 700 }}>{nm}</text>
                </g>
              );
            })}
            <line x1={o[0]} y1={o[1]} x2={uT[0]} y2={uT[1]} stroke={T.rep.sar} strokeWidth="3" strokeDasharray="7 5" />
            <circle cx={uT[0]} cy={uT[1]} r="5" fill={T.rep.sar} />
            <text x={uT[0] + 8} y={uT[1] - 4} fill={T.rep.sar} fontSize="20" style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontWeight: 700 }}>û</text>
            {feet.map((f, i) => (
              <g key={i}>
                <line x1={o[0]} y1={o[1]} x2={f[0]} y2={f[1]} stroke={T.axis[i]} strokeWidth="8" strokeLinecap="round" opacity=".85" />
                <line x1={qT[0]} y1={qT[1]} x2={f[0]} y2={f[1]} stroke={T.dim} strokeWidth="1.6" strokeDasharray="4 4" />
                <circle cx={f[0]} cy={f[1]} r="5" fill={T.axis[i]} />
                <text x={f[0] + off[i][0]} y={f[1] + off[i][1]} fill={T.axis[i]} fontSize="14" style={sans}>q{"₁₂₃"[i]} = {q[i].toFixed(3)}</text>
              </g>
            ))}
            <line x1={o[0]} y1={o[1]} x2={qT[0]} y2={qT[1]} stroke={T.rep.quat} strokeWidth="5" strokeLinecap="round" />
            <circle cx={qT[0]} cy={qT[1]} r="6" fill={T.rep.quat} />
            <text x={qT[0] + 10} y={qT[1] + 14} fill={T.rep.quat} fontSize="14" style={sans}>û sin(θ/2)</text>
          </svg>
          <div style={{ flex: "1 1 220px" }} className="num small">
            <div style={{ lineHeight: 2 }}>
              sin(θ/2) = sin({(th / 2).toFixed(1)}°) = <b>{s2.toFixed(3)}</b><br />
              <span className="dim">q<sub>i</sub> = u<sub>i</sub> × sin(θ/2):</span><br />
              {[0, 1, 2].map((i) => (
                <span key={i}>
                  <span style={{ color: T.axis[i], fontWeight: 700 }}>q{"₁₂₃"[i]}</span> = {U[i].toFixed(3)} × {s2.toFixed(3)} = <b style={{ color: T.axis[i] }}>{q[i].toFixed(3)}</b><br />
                </span>
              ))}
              <span style={{ color: T.rep.quat, fontWeight: 700 }}>q₄</span> = cos(θ/2) = <b style={{ color: T.rep.quat }}>{Math.cos((th * Math.PI) / 360).toFixed(3)}</b>
            </div>
          </div>
        </div>
        <label style={{ display: "block", marginTop: 6 }}>
          <div className="lbl" style={{ color: T.rep.sar }}><M>θ</M> = {th}°</div>
          <input type="range" className="slider" min={0} max={360} value={th} style={{ "--c": T.rep.sar }}
            onChange={(e) => setTh(+e.target.value)} aria-label="theta" />
        </label>
      </div>
    </Fig>
  );
}

/* ---------- chaining ---------- */

function ChainDiagram() {
  const T = useTheme();
  const tri = (x, rot, label, col) => (
    <g transform={`translate(${x} 120)`}>
      <g transform={`rotate(${rot})`}>
        <line x1="0" y1="0" x2="44" y2="0" stroke={T.axis[0]} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="0" y1="0" x2="0" y2="-44" stroke={T.axis[2]} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="0" y1="0" x2="-24" y2="20" stroke={T.axis[1]} strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <circle r="5" fill={col} />
      <text y="54" textAnchor="middle" fill={T.text} fontSize="15" style={{ fontFamily: "var(--sans)", fontWeight: 800 }}>{label}</text>
    </g>
  );
  const arrow = (x1, x2, y, lab, col) => (
    <g>
      <line x1={x1} y1={y} x2={x2 - 10} y2={y} stroke={col} strokeWidth="3" />
      <polygon points="0,-6 12,0 0,6" fill={col} transform={`translate(${x2 - 12} ${y})`} />
      <text x={(x1 + x2) / 2} y={y - 10} textAnchor="middle" fill={col} fontSize="16" style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontWeight: 700 }}>{lab}</text>
    </g>
  );
  return (
    <Fig caption="Each arrow is one DCM. Going 1 → 2 → 3 is the same as going 1 → 3 directly, so [Q₁₃] = [Q₂₃][Q₁₂]. The slew you do first sits on the right, next to the vector.">
      <div className="panel">
        <svg viewBox="0 0 600 210" role="img" aria-label="Frames 1, 2 and 3 with arrows Q12, Q23 and the combined Q13">
          {tri(90, 0, "Frame 1", T.inertial)}
          {tri(300, -35, "Frame 2", T.inter[1])}
          {tri(510, -80, "Frame 3", T.rep.dcm)}
          {arrow(150, 260, 110, "[Q₁₂]", T.dim)}
          {arrow(360, 470, 110, "[Q₂₃]", T.dim)}
          <path d="M 100 60 C 200 -10, 400 -10, 500 56" fill="none" stroke={T.rep.dcm} strokeWidth="3" />
          <polygon points="0,-6 12,0 0,6" fill={T.rep.dcm} transform="translate(498 54) rotate(40)" />
          <text x="300" y="28" textAnchor="middle" fill={T.rep.dcm} fontSize="17" style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontWeight: 700 }}>[Q₁₃] = [Q₂₃] [Q₁₂]</text>
        </svg>
      </div>
    </Fig>
  );
}

function ChainLive() {
  const T = useTheme();
  const [a, setA] = useState([40, 15, 10]);
  const [b, setB] = useState([30, 20, 25]);
  const [craft, setCraft] = useState("ghost");
  const Q12 = useMemo(() => EAToQ(a[0], a[1], a[2], [3, 2, 1]), [a]);
  const Q23 = useMemo(() => EAToQ(b[0], b[1], b[2], [3, 2, 1]), [b]);
  const Q13 = useMemo(() => mul(Q23, Q12), [Q23, Q12]);
  const quat = useMemo(() => canonicalQuat(dcmToQuat(Q13)), [Q13]);
  const naive = useMemo(() => canonicalQuat(dcmToQuat(EAToQ(a[0] + b[0], a[1] + b[1], a[2] + b[2], [3, 2, 1]))), [a, b]);
  const ghosts = useMemo(() => [{ quat: naive, mark: "+" }], [naive]);
  const err = Math.acos(Math.min(1, Math.abs(quat[0] * naive[0] + quat[1] * naive[1] + quat[2] * naive[2] + quat[3] * naive[3]))) * 2 * 180 / Math.PI;
  const G = ["α", "β", "γ"];
  const sliders = (vals, set, col, title) => (
    <div style={{ flex: "1 1 220px" }}>
      <div className="small" style={{ fontWeight: 800, color: col, marginBottom: 4 }}>{title}</div>
      {[0, 1, 2].map((k) => (
        <label key={k} className="blk"><span className="lbl"><span className="m">{G[k]}</span> {vals[k]}°</span>
          <input type="range" className="slider" min={k === 1 ? -80 : -180} max={k === 1 ? 80 : 180} value={vals[k]} style={{ "--c": col }}
            onChange={(e) => { const n = vals.slice(); n[k] = +e.target.value; set(n); }} />
        </label>
      ))}
    </div>
  );
  return (
    <Fig caption="Solid triad: frame 3, the real result of both slews. Dashed triad tagged +: what adding the angles gives. They only match in special cases, like two turns about the same single axis.">
      <Scene quat={quat} ghosts={ghosts} craft={craft} height={400}>
        <div className="scene-ui" style={{ right: 12, top: 12 }}>
          <span className="seg craft-seg" role="group" aria-label="Spacecraft">
            {[["solid", "Solid"], ["ghost", "See-through"], ["hidden", "Hidden"]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={craft === k} onClick={() => setCraft(k)}>{l}</button>
            ))}
          </span>
        </div>
        <div className="caption" style={{ "--c": err > 0.5 ? T.axis[0] : T.axis[1], top: "auto", bottom: 14 }}>
          {err > 0.5 ? <>Adding the angles is off by {err.toFixed(1)}°</> : <>Here they happen to agree</>}
        </div>
      </Scene>
      <div className="panel" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {sliders(a, setA, T.inter[1], "Slew 1 → 2 (3-2-1)")}
          {sliders(b, setB, T.rep.dcm, "Slew 2 → 3 (3-2-1)")}
        </div>
        <div className="chain-mats">
          <div><TeX>{"[Q_{23}]"}</TeX><Mat rows={Q23} digits={3} /></div>
          <span>×</span>
          <div><TeX>{"[Q_{12}]"}</TeX><Mat rows={Q12} digits={3} /></div>
          <span>=</span>
          <div><TeX>{"[Q_{13}]"}</TeX><Mat rows={Q13} digits={3} color={() => T.rep.dcm} /></div>
        </div>
      </div>
    </Fig>
  );
}

function ChainCost() {
  const T = useTheme();
  const row = (label, dcm, q) => (
    <div className="cost-row"><span className="dim">{label}</span><b style={{ color: T.rep.dcm }}>{dcm}</b><b style={{ color: T.rep.quat }}>{q}</b></div>
  );
  return (
    <div className="panel cost">
      <div className="cost-row head"><span /><span style={{ color: T.rep.dcm }}>[Q]</span><span style={{ color: T.rep.quat }}>q</span></div>
      {row("numbers stored", "9", "4")}
      {row("multiplications to chain two", "27", "16")}
      {row("fixing round-off drift", "re-orthogonalise 3 rows", "divide by its length")}
      {row("chain without converting first", "yes", "yes")}
    </div>
  );
}

function Storage() {
  const T = useTheme();
  const cells = (n, col, cols) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 26px)`, gap: 5 }}>
      {Array.from({ length: n }, (_, i) => <span key={i} style={{ width: 26, height: 26, borderRadius: 7, background: col, opacity: 0.85 }} />)}
    </div>
  );
  return (
    <Fig caption="Both can be chained by multiplying, which Euler angles and SAR can't do directly. A quaternion does it with four numbers instead of nine.">
      <div className="panel" style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>{cells(9, T.rep.dcm, 3)}<div className="small" style={{ marginTop: 8, fontWeight: 650 }}>[Q]: 9 numbers</div></div>
        <div style={{ textAlign: "center" }}>{cells(4, T.rep.quat, 4)}<div className="small" style={{ marginTop: 8, fontWeight: 650 }}>q: 4 numbers</div></div>
      </div>
    </Fig>
  );
}

export default function Ch5() {
  return (
    <>
      <p className="lede">
        A quaternion is four numbers: a vector part and a scalar. Hamilton came up with them in 1843. For
        attitude, they&apos;re a repackaged single-axis rotation that turns out to be easier to compute with.
      </p>

      <h2>Built from the SAR</h2>
      <p>Take the axis <M>û</M> and angle <M>θ</M> from the last chapter and halve the angle:</p>
      <TeX block>{String.raw`\bar{\bar q} = \begin{bmatrix} q_1 \\ q_2 \\ q_3 \\ q_4 \end{bmatrix} = \begin{bmatrix} u_x \sin(\theta/2) \\ u_y \sin(\theta/2) \\ u_z \sin(\theta/2) \\ \cos(\theta/2) \end{bmatrix}`}</TeX>
      <p>
        The course puts the scalar <b>last</b>, as <M>q</M><sub>4</sub>. Plenty of textbooks and software put it
        first, so check which one you&apos;re looking at before you compare numbers.
      </p>
      <HalfAngle />
      <h2>Where q₁, q₂ and q₃ come from</h2>
      <p>
        The dial shows how big the vector part is: sin(<M>θ</M>/2). Its direction is just <M>û</M>. Split that
        shorter arrow into its X, Y and Z pieces and you have the first three numbers.
      </p>
      <VectorPart />
      <p>
        Since <M>û</M> has length 1 and sin² + cos² = 1, every attitude quaternion has length 1 too. Four
        numbers, one constraint, three free. Same count as always.
      </p>

      <h2>q and −q are the same attitude</h2>
      <p>
        Flip every sign and you get a turn of 360° − <M>θ</M> about −<M>û</M>, which ends in the same place.
        So each attitude has two quaternions. This site always shows the one with <M>q</M><sub>4</sub> ≥ 0,
        which keeps <M>θ</M> between 0° and 180°. You can try the flip yourself in the{" "}
        <Link className="link" to="/playground">Playground</Link>.
      </p>

      <h2>Chaining turns</h2>
      <p>
        A spacecraft rarely makes one turn and stops. It slews from attitude 1 to 2, then from 2 to 3. Often you
        know each slew separately and want the total: where is frame 3 relative to frame 1?
      </p>
      <ChainDiagram />
      <p>
        With DCMs you just multiply, right to left like before: the first slew goes on the right. Try it below.
        The solid triad is the real result of both slews. The dashed one is what you get if you simply add the
        Euler angles together, which looks tempting and is wrong.
      </p>
      <ChainLive />

      <h2>Why spacecraft store quaternions</h2>
      <Storage />
      <ChainCost />

      <h2>Back to û and θ</h2>
      <p>Undo the two steps: the angle from q₄, then divide the vector part by sin(<M>θ</M>/2) to get back to length 1.</p>
      <TeX block>{String.raw`\theta = 2\cos^{-1}(q_4) \qquad \hat u = \frac{1}{\sin(\theta/2)}\begin{bmatrix} q_1 \\ q_2 \\ q_3 \end{bmatrix}`}</TeX>
      <p><Link className="link" to="/tutorial/the-math#quaternion">Why half angles? See it worked out →</Link></p>

    </>
  );
}
