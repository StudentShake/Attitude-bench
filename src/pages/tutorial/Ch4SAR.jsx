import { useMemo } from "react";
import { useTheme } from "../../lib/theme.js";
import { EAToQ, QToSAR } from "../../lib/course.js";
import SequencePlayer from "../../components/SequencePlayer.jsx";
import { Fig, M, Mat, Ask, Eq } from "./kit.jsx";

function AxisPicture() {
  const T = useTheme();
  // oblique projection
  const P = (x, y, z) => [260 + x * 110 - y * 64, 160 - z * 110 + y * 36 + x * 20];
  const u = [0.62, 0.1, 0.78];
  const n = Math.hypot(...u);
  const un = u.map((v) => v / n);
  const tip = P(...un.map((v) => v * 1.25));
  const tail = P(...un.map((v) => v * -0.55));
  const o = P(0, 0, 0);
  // a ring around the axis, drawn as an ellipse-ish path in the projection
  const ring = [];
  const a = [1, 0, 0];
  const d = a[0] * un[0];
  let p1 = [a[0] - d * un[0], -d * un[1], -d * un[2]];
  const pl = Math.hypot(...p1); p1 = p1.map((v) => v / pl);
  const p2 = [un[1] * p1[2] - un[2] * p1[1], un[2] * p1[0] - un[0] * p1[2], un[0] * p1[1] - un[1] * p1[0]];
  const R = 0.48, c0 = un.map((v) => v * 0.78);
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 1.55;
    ring.push(P(...[0, 1, 2].map((k) => c0[k] + R * (Math.cos(t) * p1[k] + Math.sin(t) * p2[k]))));
  }
  const path = ring.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
  const end = ring[ring.length - 1], prev = ring[ring.length - 4];
  const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180 / Math.PI;
  return (
    <Fig caption="Every attitude change is a single turn θ about one line, the Euler axis û. Points on that line don't move, so û has the same components in the old frame and the new one.">
      <div className="panel">
        <svg viewBox="0 0 520 300" role="img" aria-label="A unit vector u with a curved arrow around it showing the angle theta">
          <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke={T.rep.sar} strokeWidth="5" strokeLinecap="round" />
          <circle cx={tip[0]} cy={tip[1]} r="7" fill={T.rep.sar} />
          <text x={tip[0] + 12} y={tip[1] + 6} fill={T.rep.sar} fontSize="26" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">û</text>
          <path d={path} fill="none" stroke={T.rep.sar} strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="0,-7 14,0 0,7" fill={T.rep.sar} transform={`translate(${end[0]} ${end[1]}) rotate(${ang})`} />
          <text x={ring[44][0] - 8} y={ring[44][1] + 30} fill={T.rep.sar} fontSize="26" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">θ</text>
          {[[1.3, 0, 0, 0, "X"], [0, 1.45, 0, 1, "Y"], [0, 0, 1.15, 2, "Z"]].map(([x, y, z, i, nm]) => {
            const e = P(x, y, z);
            return (
              <g key={nm}>
                <line x1={o[0]} y1={o[1]} x2={e[0]} y2={e[1]} stroke={T.axis[i]} strokeWidth="2" strokeDasharray="6 5" opacity=".75" />
                <text x={e[0] + 4} y={e[1] + 16} fill={T.axis[i]} fontSize="18" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{nm}</text>
              </g>
            );
          })}
          <g fontFamily="var(--sans)" fontSize="14">
            <text x="24" y="40" fill={T.dim}>û = (u<tspan baselineShift="sub" fontSize="10">x</tspan>, u<tspan baselineShift="sub" fontSize="10">y</tspan>, u<tspan baselineShift="sub" fontSize="10">z</tspan>)</text>
            <text x="24" y="62" fill={T.dim}>|û| = 1</text>
            <text x="24" y="84" fill={T.dim}>0° ≤ θ ≤ 180°</text>
          </g>
        </svg>
      </div>
    </Fig>
  );
}

function Worked() {
  const T = useTheme();
  const Q = useMemo(() => EAToQ(30, 20, 10, [3, 2, 1]), []);
  const { u, theta } = QToSAR(Q);
  const tr = Q[0][0] + Q[1][1] + Q[2][2];
  const g = 2 * Math.sin(theta * Math.PI / 180);
  const f = (v, p = 6) => v.toFixed(p);
  return (
    <div className="steps-v">
      <div className="wstep" style={{ "--c": T.rep.dcm }}>
        <div className="wstep-n">1</div>
        <div>
          <h3>Start from the 15 Jul matrix (α 30°, β 20°, γ 10°)</h3>
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
          <h3>Axis from the off-diagonal differences</h3>
          <div className="res" style={{ lineHeight: 1.9 }}>
            γ = 2 sin θ = {f(g)}<br />
            u<sub>x</sub> = (Q₂₃ − Q₃₂)/γ = ({f(Q[1][2])} − {f(Q[2][1])})/γ = <b style={{ color: T.axis[0] }}>{f(u[0])}</b><br />
            u<sub>y</sub> = (Q₃₁ − Q₁₃)/γ = ({f(Q[2][0])} − ({f(Q[0][2])}))/γ = <b style={{ color: T.axis[1] }}>{f(u[1])}</b><br />
            u<sub>z</sub> = (Q₁₂ − Q₂₁)/γ = ({f(Q[0][1])} − ({f(Q[1][0])}))/γ = <b style={{ color: T.axis[2] }}>{f(u[2])}</b>
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
        Flip between the two routes above. They end at exactly the same attitude. The single turn is the
        single-axis rotation, or SAR: an axis <M>û</M> and an angle <M>θ</M>.
      </p>
      <AxisPicture />

      <h2>From û and θ to [Q]</h2>
      <p>Plug the axis and angle into this matrix (14 Jul, slide 12):</p>
      <Eq>
        <Mat size={13.5} rows={[
          ["u_x²(1−cθ) + cθ", "u_xu_y(1−cθ) + u_z sθ", "u_xu_z(1−cθ) − u_y sθ"],
          ["u_xu_y(1−cθ) − u_z sθ", "u_y²(1−cθ) + cθ", "u_yu_z(1−cθ) + u_x sθ"],
          ["u_xu_z(1−cθ) + u_y sθ", "u_yu_z(1−cθ) − u_x sθ", "u_z²(1−cθ) + cθ"],
        ]} />
      </Eq>
      <p>
        Four numbers, but only three are free, because <M>u</M><sub>x</sub>² + <M>u</M><sub>y</sub>² + <M>u</M><sub>z</sub>² = 1.
      </p>

      <h2>From [Q] back to û and θ</h2>
      <p>The angle comes from the diagonal and the axis from the differences across it:</p>
      <Eq>
        θ = cos<sup className="up">−1</sup>((Q<sub className="up">11</sub> + Q<sub className="up">22</sub> + Q<sub className="up">33</sub> − 1)/2)
      </Eq>
      <Eq>
        û = (Q<sub className="up">23</sub> − Q<sub className="up">32</sub>, Q<sub className="up">31</sub> − Q<sub className="up">13</sub>, Q<sub className="up">12</sub> − Q<sub className="up">21</sub>) / 2 sin θ
      </Eq>
      <Worked />
      <p>Those match the slide: (0.124015, 0.615638, 0.778209) and 35.8171°.</p>

      <Ask q="Why does my axis come out with the wrong sign?" tone="sar">
        <p>
          Probably the older square-root formulas. Squaring then rooting throws the signs away, so a negative
          component comes back positive. Use the 23 Jul version above. Because <M>θ</M> is between 0° and 180°,{" "}
          sin <M>θ</M> is positive and the signs come out right on their own.
        </p>
      </Ask>
      <Ask q="Which frame is û written in?" tone="sar">
        <p>Both. A vector along the axis doesn&apos;t move during the turn, so its components are the same in either frame.</p>
      </Ask>
      <Ask q="What about θ = 0° or 180°?" tone="sar">
        <p>
          At 0° nothing turned, so there&apos;s no axis to find and the formula divides by zero. At 180° turning
          about <M>û</M> or −<M>û</M> lands in the same place, so either answer is right.
        </p>
      </Ask>
    </>
  );
}
