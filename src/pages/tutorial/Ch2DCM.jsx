import { useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { useTheme } from "../../lib/theme.js";
import { canonicalQuat, dcmToQuat, M1, M2, M3 } from "../../lib/attitude.js";
import { EAToQ, quatToQ } from "../../lib/course.js";
import { Fig, M, Mat, Scene, Ask, Eq } from "./kit.jsx";

/* ---------- direction cosines, drawn like the slide ---------- */

function Cosines() {
  const T = useTheme();
  // a fixed oblique projection of 3D onto the page
  const P = (x, y, z) => [190 + x * 120 - y * 70, 170 - z * 120 + y * 40 + x * 22];
  const o = P(0, 0, 0);
  const k = [0.42, 0.55, 0.72];
  const kp = P(...k);
  const line = (a, b, props) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...props} />;
  return (
    <Fig caption="Row 3 of [Q] is the new z axis written in the old frame. Each entry is the cosine of the angle between two axes, which is why it's called a direction cosine matrix.">
      <div className="panel">
        <svg viewBox="0 0 600 280" role="img" aria-label="The primed z axis with its three projections onto the unprimed axes, labelled Q31, Q32 and Q33">
          {[[1.35, 0, 0, 0, "x"], [0, 1.5, 0, 1, "y"], [0, 0, 1.25, 2, "z"]].map(([x, y, z, i, n]) => {
            const e = P(x, y, z);
            return (
              <g key={n}>
                {line(o, e, { stroke: T.axis[i], strokeWidth: 2.5, strokeDasharray: "7 5" })}
                <text x={e[0] + 6} y={e[1] + 4} fill={T.axis[i]} fontSize="22" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{n}</text>
              </g>
            );
          })}
          {line(o, kp, { stroke: T.rep.dcm, strokeWidth: 4, strokeLinecap: "round" })}
          <text x={kp[0] + 8} y={kp[1] - 4} fill={T.rep.dcm} fontSize="22" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">z′</text>
          {/* projections */}
          {[[k[0], 0, 0, "Q₃₁", 0], [0, k[1], 0, "Q₃₂", 1], [0, 0, k[2], "Q₃₃", 2]].map(([x, y, z, lab, i]) => {
            const f = P(x, y, z);
            return (
              <g key={lab}>
                {line(kp, f, { stroke: T.faint, strokeWidth: 1.5, strokeDasharray: "3 4" })}
                <circle cx={f[0]} cy={f[1]} r="6" fill={T.axis[i]} />
                <text x={f[0] + (i === 0 ? 8 : i === 1 ? -14 : -46)} y={f[1] + (i === 0 ? 22 : i === 1 ? -14 : 4)} fill={T.text} fontSize="16" fontFamily="var(--sans)" fontWeight="700">{lab}</text>
              </g>
            );
          })}
          <g fontFamily="var(--sans)" fontSize="14" fill={T.dim}>
            <text x="390" y="60">dashed: old frame</text>
            <text x="390" y="82" fill={T.rep.dcm}>solid: new axis z′</text>
            <text x="390" y="120" fill={T.text} fontWeight="700">Q₃ⱼ = ẑ′ · ûⱼ</text>
            <text x="390" y="142">= cos(angle between them)</text>
          </g>
        </svg>
      </div>
    </Fig>
  );
}

/* ---------- elementary rotations R1, R2, R3 ---------- */

// For a rotation about axis a, the page shows the other two axes:
// horizontal h and vertical v, ordered so (h, v, a) is right-handed.
const PLANE = { 1: [1, 2], 2: [2, 0], 3: [0, 1] };

function Elementary() {
  const T = useTheme();
  const [axis, setAxis] = useState(3);
  const [phi, setPhi] = useState(30);
  const R = [null, M1, M2, M3][axis](phi * Math.PI / 180);
  const [h, v] = PLANE[axis];
  const a = axis - 1;
  const c = Math.cos(phi * Math.PI / 180), s = Math.sin(phi * Math.PI / 180);
  const C0 = [170, 160], L = 120;
  const pt = (x, y) => [C0[0] + x * L, C0[1] - y * L];
  const hp = pt(c, s), vp = pt(-s, c);
  const NAME = "xyz";

  return (
    <Fig caption="Drag the slider. The rotation axis points out of the screen and doesn't move; the other two axes turn by φ. Positive φ follows the right-hand rule.">
      <div className="panel">
        <div className="ctrl" style={{ marginTop: 0, marginBottom: 6 }}>
          <div className="seg" role="group" aria-label="Rotation axis">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" aria-pressed={axis === n} style={{ "--c": T.axis[n - 1] }} onClick={() => setAxis(n)}>
                <span className="m">R</span><sub>{n}</sub> about <span className="m">{NAME[n - 1]}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 340 300" style={{ flex: "1 1 260px", maxWidth: 380 }} role="img"
            aria-label={`Rotation of ${phi} degrees about the ${NAME[a]} axis`}>
            <line x1={C0[0]} y1={C0[1]} x2={pt(1.05, 0)[0]} y2={C0[1]} stroke={T.axis[h]} strokeWidth="2.5" strokeDasharray="7 5" />
            <line x1={C0[0]} y1={C0[1]} x2={C0[0]} y2={pt(0, 1.05)[1]} stroke={T.axis[v]} strokeWidth="2.5" strokeDasharray="7 5" />
            <text x={pt(1.08, 0)[0]} y={C0[1] + 6} fill={T.axis[h]} fontSize="20" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{NAME[h]}</text>
            <text x={C0[0] - 6} y={pt(0, 1.1)[1]} fill={T.axis[v]} fontSize="20" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{NAME[v]}</text>
            {/* projections of the new h axis */}
            <line x1={hp[0]} y1={hp[1]} x2={hp[0]} y2={C0[1]} stroke={T.faint} strokeDasharray="3 4" />
            <text x={(C0[0] + hp[0]) / 2} y={C0[1] + (s >= 0 ? 20 : -10)} textAnchor="middle" fill={T.dim} fontSize="13" fontFamily="var(--sans)">cos φ</text>
            <text x={hp[0] + (c >= 0 ? 6 : -6)} y={(C0[1] + hp[1]) / 2 + 4} textAnchor={c >= 0 ? "start" : "end"} fill={T.dim} fontSize="13" fontFamily="var(--sans)">sin φ</text>
            {/* rotated axes */}
            <line x1={C0[0]} y1={C0[1]} x2={hp[0]} y2={hp[1]} stroke={T.axis[h]} strokeWidth="4.5" strokeLinecap="round" />
            <line x1={C0[0]} y1={C0[1]} x2={vp[0]} y2={vp[1]} stroke={T.axis[v]} strokeWidth="4.5" strokeLinecap="round" />
            <text x={hp[0] + 6} y={hp[1] - 4} fill={T.axis[h]} fontSize="20" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{NAME[h]}′</text>
            <text x={vp[0] - 18} y={vp[1] - 6} fill={T.axis[v]} fontSize="20" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{NAME[v]}′</text>
            {/* angle arc */}
            <path d={`M${C0[0] + 40} ${C0[1]} A40 40 0 0 ${phi >= 0 ? 0 : 1} ${C0[0] + 40 * c} ${C0[1] - 40 * s}`} fill="none" stroke={T.primary} strokeWidth="3" />
            <text x={C0[0] + 46 * Math.cos(phi * Math.PI / 360) + 4} y={C0[1] - 46 * Math.sin(phi * Math.PI / 360)} fill={T.primary} fontSize="18" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">φ</text>
            {/* axis out of the screen */}
            <circle cx={C0[0]} cy={C0[1]} r="10" fill={T.card} stroke={T.axis[a]} strokeWidth="2.5" />
            <circle cx={C0[0]} cy={C0[1]} r="3.5" fill={T.axis[a]} />
            <text x={C0[0] - 26} y={C0[1] + 24} fill={T.axis[a]} fontSize="16" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">{NAME[a]} = {NAME[a]}′</text>
          </svg>
          <div style={{ flex: "1 1 220px", textAlign: "center" }}>
            <div style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontSize: 20, marginBottom: 8 }}>
              [R<sub style={{ fontStyle: "normal" }}>{axis}</sub>({phi}°)] =
            </div>
            <Mat rows={R} digits={3} color={(r) => T.axis[r]} />
          </div>
        </div>
        <input type="range" className="slider" min={-180} max={180} step={1} value={phi}
          style={{ "--c": T.primary }} onChange={(e) => setPhi(+e.target.value)} aria-label="Rotation angle phi" />
      </div>
    </Fig>
  );
}

/* ---------- rows are body axes, live ---------- */

const START = canonicalQuat(dcmToQuat(EAToQ(30, 20, 10, [3, 2, 1])));

function RowsLive() {
  const T = useTheme();
  const [quat, setQuat] = useState(START);
  const [hl, setHl] = useState(0);
  const onDrag = useCallback((dq) => {
    setQuat((p) => {
      const n = dq.clone().multiply(new THREE.Quaternion(p[1], p[2], p[3], p[0])).normalize();
      return canonicalQuat([n.w, n.x, n.y, n.z]);
    });
  }, []);
  const Q = useMemo(() => quatToQ(quat), [quat]);
  return (
    <Fig caption="Tap a row. Its three numbers are the X, Y and Z components of that body axis, and the matching arrow lights up. Drag the spacecraft and watch the row change.">
      <Scene quat={quat} onDrag={onDrag} highlight={hl} height={360} />
      <div className="panel" style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {[0, 1, 2].map((r) => (
          <button key={r} type="button" onClick={() => setHl(r)} onMouseEnter={() => setHl(r)}
            className="seg-row" aria-pressed={hl === r}
            style={{ "--c": T.axis[r] }}>
            <span className="m" style={{ color: T.axis[r], fontWeight: 700, width: 44 }}>{"xyz"[r]}<sub style={{ fontStyle: "normal" }}>B</sub></span>
            {[0, 1, 2].map((c) => (
              <span key={c} className="num">{Q[r][c].toFixed(3).replace(/^-0\.000$/, "0.000")}</span>
            ))}
          </button>
        ))}
      </div>
    </Fig>
  );
}

export default function Ch2() {
  return (
    <>
      <p className="lede">
        The direction cosine matrix is a 3 × 3 table that converts a vector&apos;s components from one frame
        to another. The course calls it <M>[Q]</M>.
      </p>

      <h2>What the nine numbers are</h2>
      <p>
        Take two frames that share an origin: an old one <M>XYZ</M> and a new one <M>X′Y′Z′</M>. Write each new
        axis as a mix of the old ones and stack the three rows:
      </p>
      <Eq>
        î′ = Q<sub className="up">11</sub>î + Q<sub className="up">12</sub>ĵ + Q<sub className="up">13</sub>k̂ &nbsp;&nbsp;·&nbsp;&nbsp;
        ĵ′ = Q<sub className="up">21</sub>î + … &nbsp;&nbsp;·&nbsp;&nbsp; k̂′ = Q<sub className="up">31</sub>î + …
      </Eq>
      <Cosines />
      <p>
        Once you have <M>[Q]</M>, moving any vector between frames is one multiplication:
      </p>
      <Eq>v|<sub className="up">2</sub> = [Q] v|<sub className="up">1</sub></Eq>
      <p>
        In the Playground and the rest of this site, frame 1 is inertial and frame 2 is the body. So row 1 is
        the body <M>x</M> axis seen from inertial space, row 2 is body <M>y</M>, row 3 is body <M>z</M>.
      </p>
      <RowsLive />

      <h2>Turning about one axis</h2>
      <p>
        The simplest DCMs turn the frame about just one of its own axes. The course names them <M>R</M><sub>1</sub>,{" "}
        <M>R</M><sub>2</sub> and <M>R</M><sub>3</sub> for turns about <M>x</M>, <M>y</M> and <M>z</M>.
        Every other DCM you&apos;ll build is a product of these.
      </p>
      <Elementary />
      <p>
        Notice where the minus sign lands. In <M>R</M><sub>1</sub> and <M>R</M><sub>3</sub> it&apos;s below the
        diagonal; in <M>R</M><sub>2</sub> it moves above. That&apos;s the right-hand rule showing up once you
        cycle <M>z → x</M>.
      </p>

      <h2>Going back is free</h2>
      <p>
        A DCM is orthogonal, so its inverse is just its transpose. To go from body back to inertial, flip the
        matrix across its diagonal:
      </p>
      <Eq>v|<sub className="up">1</sub> = [Q]<sup className="up">T</sup> v|<sub className="up">2</sub></Eq>
      <p>
        The 15 Jul sensor example does exactly this: GPS gives the gap between two sensors in J2000, and{" "}
        <M>[Q]</M><sup>T</sup> turns it into body coordinates, <M>(0, 2.86, 5.98)</M> m.
      </p>

      <Ask q="Rows or columns?" tone="dcm">
        <p>
          Rows. Row <M>i</M> of <M>[Q]</M> is new axis <M>i</M> written in the old frame. The columns are the
          old axes written in the new frame, which is what you get after transposing.
        </p>
      </Ask>
      <Ask q="Nine numbers, but how many actually matter?" tone="dcm">
        <p>
          Three. Each row has length 1 and the rows are perpendicular to each other, which is six constraints
          on nine numbers. That&apos;s why the course says the minimum to describe an attitude is three.
        </p>
      </Ask>
    </>
  );
}
