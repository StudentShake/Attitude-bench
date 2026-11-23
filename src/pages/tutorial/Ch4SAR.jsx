import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { canonicalQuat, normalizeQuat } from "../../lib/attitude.js";
import { EAToQ, QToSAR, SARToQuat, fromCourseQuat, quatToQ } from "../../lib/course.js";
import SequencePlayer from "../../components/SequencePlayer.jsx";
import { Fig, M, Mat, Ask, Scene, TeX } from "./kit.jsx";

const serif = { fontFamily: "Times New Roman, serif", fontStyle: "italic", fontWeight: 700 };
const sans = { fontFamily: "var(--sans)" };
const Q0 = EAToQ(30, 20, 10, [3, 2, 1]);
const SAR0 = QToSAR(Q0);

/* ---------- û, θ, and û's own components ---------- */

function AxisPicture() {
  const T = useTheme();
  const P = (x, y, z) => [250 - x * 140 + y * 125, 196 - z * 125 + x * 70];
  const un = SAR0.u;
  const o = P(0, 0, 0);
  const tip = P(...un.map((v) => v * 1.3)), tail = P(...un.map((v) => v * -0.5));
  const uTip = P(...un);
  // ring around the axis
  let p1 = [1 - un[0] * un[0], -un[0] * un[1], -un[0] * un[2]];
  const pl = Math.hypot(...p1); p1 = p1.map((v) => v / pl);
  const p2 = [un[1] * p1[2] - un[2] * p1[1], un[2] * p1[0] - un[0] * p1[2], un[0] * p1[1] - un[1] * p1[0]];
  const R = 0.36, c0 = un.map((v) => v * 1.12);
  const ring = Array.from({ length: 65 }, (_, i) => {
    const t = (i / 64) * Math.PI * 1.55;
    return P(...[0, 1, 2].map((k) => c0[k] + R * (Math.cos(t) * p1[k] + Math.sin(t) * p2[k])));
  });
  const path = ring.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
  const end = ring[64], prev = ring[60];
  const ang = (Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180) / Math.PI;
  const feet = [P(un[0], 0, 0), P(0, un[1], 0), P(0, 0, un[2])];
  const box = P(un[0], un[1], 0);
  const off = [[-60, 46], [10, 24], [-92, 6]];
  return (
    <Fig caption="û is a unit vector, so like any axis it casts three shadows on X, Y and Z. Those shadows are its x, y and z components. θ is how far you turn about it, right-hand rule.">
      <div className="panel">
        <svg viewBox="0 0 560 300" role="img" aria-label="The Euler axis u with its components on X, Y and Z, and a curved arrow around it for theta">
          {[[box, feet[0]], [box, feet[1]], [box, uTip]].map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={T.line} strokeWidth="1.5" />
          ))}
          {[[1.45, 0, 0, 0, "X"], [0, 1.45, 0, 1, "Y"], [0, 0, 1.35, 2, "Z"]].map(([x, y, z, i, nm]) => {
            const e = P(x, y, z);
            return (
              <g key={nm}>
                <line x1={o[0]} y1={o[1]} x2={e[0]} y2={e[1]} stroke={T.axis[i]} strokeWidth="2.2" strokeDasharray="6 5" />
                <text x={e[0] + (i === 0 ? -20 : 6)} y={e[1] + (i === 0 ? 18 : 6)} fill={T.axis[i]} fontSize="20" style={serif}>{nm}</text>
              </g>
            );
          })}
          {feet.map((f, i) => (
            <g key={i}>
              <line x1={o[0]} y1={o[1]} x2={f[0]} y2={f[1]} stroke={T.axis[i]} strokeWidth="8" strokeLinecap="round" opacity=".85" />
              <line x1={uTip[0]} y1={uTip[1]} x2={f[0]} y2={f[1]} stroke={T.dim} strokeWidth="1.6" strokeDasharray="4 4" />
              <circle cx={f[0]} cy={f[1]} r="5" fill={T.axis[i]} />
              <text x={f[0] + off[i][0]} y={f[1] + off[i][1]} fill={T.axis[i]} fontSize="15" style={{ ...sans, fontWeight: 700 }}>
                u<tspan fontSize="11" dy="4">{"xyz"[i]}</tspan><tspan dy="-4"> = {un[i].toFixed(3)}</tspan>
              </text>
            </g>
          ))}
          <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke={T.rep.sar} strokeWidth="5" strokeLinecap="round" />
          <circle cx={uTip[0]} cy={uTip[1]} r="6" fill={T.rep.sar} />
          <text x={tip[0] + 10} y={tip[1] + 4} fill={T.rep.sar} fontSize="26" style={serif}>û</text>
          <path d={path} fill="none" stroke={T.rep.sar} strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="0,-7 14,0 0,7" fill={T.rep.sar} transform={`translate(${end[0]} ${end[1]}) rotate(${ang})`} />
          <text x={ring[18][0] + 12} y={ring[18][1] - 2} fill={T.rep.sar} fontSize="24" style={serif}>θ</text>
          <g style={sans} fontSize="14" fill={T.dim}>
            <text x="24" y="36" fill={T.text} fontWeight="700">|û| = 1, so</text>
            <text x="24" y="58">u<tspan fontSize="10" dy="4">x</tspan><tspan dy="-10" fontSize="10">2</tspan><tspan dy="6"> + u</tspan><tspan fontSize="10" dy="4">y</tspan><tspan dy="-10" fontSize="10">2</tspan><tspan dy="6"> + u</tspan><tspan fontSize="10" dy="4">z</tspan><tspan dy="-10" fontSize="10">2</tspan><tspan dy="6"> = 1</tspan></text>
            <text x="24" y="80">0° ≤ θ ≤ 180°</text>
          </g>
        </svg>
      </div>
    </Fig>
  );
}

/* ---------- û has the same numbers in both frames ---------- */

function SameInBoth() {
  const T = useTheme();
  const [th, setTh] = useState(Math.round(SAR0.theta));
  const u = SAR0.u;
  const quat = useMemo(() => canonicalQuat(normalizeQuat(fromCourseQuat(SARToQuat(u, th)))), [u, th]);
  const Q = useMemo(() => quatToQ(quat), [quat]);
  const uBody = [0, 1, 2].map((i) => Q[i][0] * u[0] + Q[i][1] * u[1] + Q[i][2] * u[2]);
  const xBody = Q.map((row) => row[0]);
  const projections = useMemo(() => [
    { vec: u, frame: "inertial", faint: true, labels: false },
    { vec: u, frame: "body" },
  ], [u]);
  const f = (v) => v.toFixed(3);
  return (
    <Fig caption="Slide θ. The body turns about û, so the body axes swing around, but û's shadows on them (the badges) never change. Its components in the body frame match its components in XYZ the whole way. Any other vector, like X, gets new body components.">
      <Scene quat={quat} sar={{ axis: u, angle: (th * Math.PI) / 180 }} projections={projections} height={400} />
      <div className="panel" style={{ marginTop: 10 }}>
        <label style={{ display: "block" }}>
          <div className="lbl" style={{ color: T.rep.sar }}><M>θ</M> = {th}° about û</div>
          <input type="range" className="slider" min={0} max={180} value={th} style={{ "--c": T.rep.sar }}
            onChange={(e) => setTh(+e.target.value)} aria-label="theta" />
        </label>
        <div className="both-grid">
          <div className="both-cell" style={{ "--c": T.inertial }}>
            <div className="tiny dim">û in inertial <M>XYZ</M></div>
            <div className="num">({u.map(f).join(", ")})</div>
          </div>
          <div className="both-cell" style={{ "--c": T.rep.sar }}>
            <div className="tiny dim">û in body <M>x</M><sub>B</sub><M>y</M><sub>B</sub><M>z</M><sub>B</sub></div>
            <div className="num" style={{ color: T.rep.sar, fontWeight: 600 }}>({uBody.map(f).join(", ")})</div>
          </div>
          <div className="both-cell" style={{ "--c": T.axis[0] }}>
            <div className="tiny dim">for contrast: <M>X</M> in body</div>
            <div className="num">({xBody.map(f).join(", ")})</div>
          </div>
        </div>
      </div>
    </Fig>
  );
}

/* ---------- worked example ---------- */

function Worked() {
  const T = useTheme();
  const Q = Q0;
  const { u, theta } = SAR0;
  const tr = Q[0][0] + Q[1][1] + Q[2][2];
  const g = 2 * Math.sin((theta * Math.PI) / 180);
  const f = (v, p = 6) => v.toFixed(p);
  return (
    <div className="steps-v">
      <div className="wstep" style={{ "--c": T.rep.dcm }}>
        <div className="wstep-n">1</div>
        <div>
          <h3>Start from α 30°, β 20°, γ 10° (3-2-1)</h3>
          <div className="res"><Mat rows={Q} digits={6} size={13.5} /></div>
        </div>
      </div>
      <div className="wstep" style={{ "--c": T.rep.sar }}>
        <div className="wstep-n">2</div>
        <div>
          <h3>Angle from the trace</h3>
          <div className="res">trace = {f(tr)} → θ = cos⁻¹(({f(tr)} − 1)/2) = <b>{f(theta, 4)}°</b></div>
        </div>
      </div>
      <div className="wstep" style={{ "--c": T.rep.sar }}>
        <div className="wstep-n">3</div>
        <div>
          <h3>Axis from the differences across the diagonal</h3>
          <div className="res" style={{ lineHeight: 1.9 }}>
            2 sin θ = {f(g)}<br />
            u<sub>x</sub> = (Q₂₃ − Q₃₂)/(2 sin θ) = ({f(Q[1][2])} − {f(Q[2][1])})/{f(g, 4)} = <b style={{ color: T.axis[0] }}>{f(u[0])}</b><br />
            u<sub>y</sub> = (Q₃₁ − Q₁₃)/(2 sin θ) = ({f(Q[2][0])} − ({f(Q[0][2])}))/{f(g, 4)} = <b style={{ color: T.axis[1] }}>{f(u[1])}</b><br />
            u<sub>z</sub> = (Q₁₂ − Q₂₁)/(2 sin θ) = ({f(Q[0][1])} − ({f(Q[1][0])}))/{f(g, 4)} = <b style={{ color: T.axis[2] }}>{f(u[2])}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Ch4() {
  return (
    <>
      <p className="lede">
        Euler&apos;s theorem: any two frames with the same origin are related by one turn about one axis.
        So the three Euler turns can always be swapped for a single turn.
      </p>
      <SequencePlayer withSAR editable={false} />
      <p style={{ marginTop: 16 }}>
        Play one route, then switch to the other. Each route stays where you left it, so you can flip back and
        forth between the two finished attitudes. They&apos;re identical. The single turn is the single-axis
        rotation, or SAR: an axis <M>û</M> and an angle <M>θ</M>.
      </p>
      <AxisPicture />

      <h2>Why û is the same in either frame</h2>
      <p>
        Points on the axis don&apos;t move during the turn. So whatever û looked like before the turn, it looks the
        same after, and its components in the old frame and the new frame are equal.
      </p>
      <SameInBoth />

      <h2>From û and θ to [Q]</h2>
      <TeX block>{String.raw`[Q] = \begin{bmatrix} u_x^2(1-c\theta)+c\theta & u_xu_y(1-c\theta)+u_z s\theta & u_xu_z(1-c\theta)-u_y s\theta \\ u_xu_y(1-c\theta)-u_z s\theta & u_y^2(1-c\theta)+c\theta & u_yu_z(1-c\theta)+u_x s\theta \\ u_xu_z(1-c\theta)+u_y s\theta & u_yu_z(1-c\theta)-u_x s\theta & u_z^2(1-c\theta)+c\theta \end{bmatrix}`}</TeX>
      <p>
        Four numbers, but only three are free, because <TeX>{String.raw`u_x^2+u_y^2+u_z^2=1`}</TeX>.
      </p>

      <h2>From [Q] back to û and θ</h2>
      <p>The angle comes from the diagonal and the axis from the differences across it:</p>
      <TeX block>{String.raw`\theta = \cos^{-1}\!\left(\frac{Q_{11}+Q_{22}+Q_{33}-1}{2}\right) \qquad \hat u = \frac{1}{2\sin\theta}\begin{bmatrix} Q_{23}-Q_{32} \\ Q_{31}-Q_{13} \\ Q_{12}-Q_{21} \end{bmatrix}`}</TeX>
      <Worked />
      <p><Link className="link" to="/tutorial/the-math#sar">Where do the trace and the differences come from? →</Link></p>

      <Ask q="What about θ = 0° or 180°?" tone="sar">
        <p>
          At 0° nothing turned, so there&apos;s no axis to find and the formula divides by zero. At 180° turning
          about <M>û</M> or −<M>û</M> lands in the same place, so either answer is right.
        </p>
      </Ask>
    </>
  );
}
