import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { SARToQuat } from "../../lib/course.js";
import { Fig, M, TeX } from "./kit.jsx";

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
    <Fig caption="Start with the unit axis û (amber). Shrink it to length sin(θ/2) (pink). The shadows of that shorter arrow on X, Y and Z are q₁, q₂ and q₃. So q₁ is just uₓ scaled by sin(θ/2), and the same for the other two.">
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
          <input type="range" className="slider" min={0} max={180} value={th} style={{ "--c": T.rep.sar }}
            onChange={(e) => setTh(+e.target.value)} aria-label="theta" />
        </label>
      </div>
    </Fig>
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

      <h2>Why spacecraft store quaternions</h2>
      <Storage />
      <p>
        If a spacecraft slews from attitude 1 to 2 to 3 and you want 3 relative to 1, DCMs and quaternions let
        you just multiply. With Euler angles or SAR you&apos;d have to convert to one of those first anyway.
        Between the two, the quaternion is smaller.
      </p>

      <h2>Back to û and θ</h2>
      <p>Undo the two steps: the angle from q₄, then divide the vector part by sin(<M>θ</M>/2) to get back to length 1.</p>
      <TeX block>{String.raw`\theta = 2\cos^{-1}(q_4) \qquad \hat u = \frac{1}{\sin(\theta/2)}\begin{bmatrix} q_1 \\ q_2 \\ q_3 \end{bmatrix}`}</TeX>
      <p><Link className="link" to="/tutorial/the-math#quaternion">Why half angles? See it worked out →</Link></p>

    </>
  );
}
