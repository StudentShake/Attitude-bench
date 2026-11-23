import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { useTheme } from "../../lib/theme.js";
import { canonicalQuat, dcmToQuat, M1, M2, M3 } from "../../lib/attitude.js";
import { EAToQ, quatToQ } from "../../lib/course.js";
import { Fig, M, Mat, Scene, Ask, TeX } from "./kit.jsx";

const serif = { fontFamily: "Times New Roman, serif", fontStyle: "italic", fontWeight: 700 };
const sans = { fontFamily: "var(--sans)" };

/* ---------- 1. one number = one shadow ---------- */

function Shadow() {
  const T = useTheme();
  const [deg, setDeg] = useState(35);
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const O = [200, 190], L = 140;
  const P = (x, y) => [O[0] + x * L, O[1] - y * L];
  const tip = P(c, s), foot = P(c, 0), footY = P(0, s);
  const sq = 10 * Math.sign(c || 1);
  return (
    <Fig caption="Drop a line from the tip of the new axis straight down onto an old axis, meeting it at a right angle. The length of that shadow is the number in [Q]. It's the cosine of the angle between them, so it runs from −1 to 1 and goes negative when the new axis points backwards.">
      <div className="panel">
        <svg viewBox="0 0 600 300" role="img" aria-label={`A unit-length new axis at ${deg} degrees from the old x axis, with its shadows on the old x and y axes`}>
          <line x1={P(-1.2, 0)[0]} y1={O[1]} x2={P(1.25, 0)[0]} y2={O[1]} stroke={T.axis[0]} strokeWidth="2.5" strokeDasharray="7 5" />
          <line x1={O[0]} y1={P(0, -0.25)[1]} x2={O[0]} y2={P(0, 1.2)[1]} stroke={T.axis[1]} strokeWidth="2.5" strokeDasharray="7 5" />
          <text x={P(1.27, 0)[0]} y={O[1] + 7} fill={T.axis[0]} fontSize="22" style={serif}>x</text>
          <text x={O[0] - 6} y={P(0, 1.25)[1]} fill={T.axis[1]} fontSize="22" style={serif}>y</text>
          {/* unit circle hint */}
          <circle cx={O[0]} cy={O[1]} r={L} fill="none" stroke={T.line} strokeWidth="1.5" strokeDasharray="2 5" />
          {/* shadows */}
          <line x1={O[0]} y1={O[1]} x2={foot[0]} y2={O[1]} stroke={T.axis[0]} strokeWidth="9" strokeLinecap="round" opacity=".85" />
          <line x1={O[0]} y1={O[1]} x2={O[0]} y2={footY[1]} stroke={T.axis[1]} strokeWidth="9" strokeLinecap="round" opacity=".85" />
          {/* drop lines with right-angle marks */}
          <line x1={tip[0]} y1={tip[1]} x2={foot[0]} y2={foot[1]} stroke={T.dim} strokeWidth="2" strokeDasharray="4 4" />
          <line x1={tip[0]} y1={tip[1]} x2={footY[0]} y2={footY[1]} stroke={T.dim} strokeWidth="2" strokeDasharray="4 4" />
          <path d={`M${foot[0] - sq} ${O[1]} v${-10 * Math.sign(s || 1)} h${sq}`} fill="none" stroke={T.dim} strokeWidth="1.5" />
          {/* the new axis */}
          <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={T.rep.dcm} strokeWidth="5" strokeLinecap="round" />
          <circle cx={tip[0]} cy={tip[1]} r="6" fill={T.rep.dcm} />
          <text x={tip[0] + 10} y={tip[1] - 6} fill={T.rep.dcm} fontSize="22" style={serif}>x′</text>
          <path d={`M${O[0] + 38} ${O[1]} A38 38 0 0 ${s >= 0 ? 0 : 1} ${O[0] + 38 * c} ${O[1] - 38 * s}`} fill="none" stroke={T.primary} strokeWidth="3" />
          <text x={O[0] + 46 * Math.cos(a / 2)} y={O[1] - 46 * Math.sin(a / 2) + 6} fill={T.primary} fontSize="18" style={serif}>θ</text>
          <text x={(O[0] + foot[0]) / 2} y={O[1] + 30} textAnchor="middle" fill={T.axis[0]} fontSize="15" style={{ ...sans, fontWeight: 700 }}>Q₁₁ = cos θ = {c.toFixed(2)}</text>
          <text x={O[0] - 12} y={(O[1] + footY[1]) / 2 + 5} textAnchor="end" fill={T.axis[1]} fontSize="15" style={{ ...sans, fontWeight: 700 }}>Q₁₂ = {s.toFixed(2)}</text>
          <g style={sans} fontSize="14" fill={T.dim}>
            <text x="392" y="70" fill={T.text} fontWeight="700">New axis: length 1</text>
            <text x="392" y="94">shadow on x = cos θ</text>
            <text x="392" y="118">shadow on y = cos(90° − θ)</text>
            <text x="392" y="152">It&apos;s a perpendicular</text>
            <text x="392" y="174">shadow, not a distance.</text>
          </g>
        </svg>
        <label style={{ display: "block" }}>
          <div className="lbl" style={{ color: T.primary }}><M>θ</M> = {deg}° between <M>x′</M> and <M>x</M></div>
          <input type="range" className="slider" min={-180} max={180} value={deg} style={{ "--c": T.primary }}
            onChange={(e) => setDeg(+e.target.value)} aria-label="Angle between new and old x axis" />
        </label>
      </div>
    </Fig>
  );
}

/* ---------- 2. three shadows make a row ---------- */

function Cosines() {
  const T = useTheme();
  const P = (x, y, z) => [230 - x * 92 + y * 128, 196 - z * 122 + x * 48];
  const o = P(0, 0, 0);
  const k = [0.42, 0.55, 0.72].map((v, _, a) => v / Math.hypot(...a));
  const kp = P(...k);
  const line = (a, b, props) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...props} />;
  const feet = [P(k[0], 0, 0), P(0, k[1], 0), P(0, 0, k[2])];
  const lab = ["Q₃₁", "Q₃₂", "Q₃₃"];
  const off = [[14, 6], [8, 24], [-98, 6]];
  return (
    <Fig caption="In 3-D you get three shadows, one on each old axis. For the new z axis those three numbers are row 3 of [Q]. Do the same for the new x and y axes and you have all nine.">
      <div className="panel">
        <svg viewBox="0 0 600 290" role="img" aria-label="The new z axis with its three shadows on the old x, y and z axes, labelled Q31, Q32 and Q33">
          {/* the box the shadows make, faint */}
          {[[P(k[0], k[1], 0), feet[0]], [P(k[0], k[1], 0), feet[1]], [P(k[0], k[1], 0), kp]].map(([a, b], i) =>
            <g key={i}>{line(a, b, { stroke: T.line, strokeWidth: 1.5 })}</g>)}
          {[[1.5, 0, 0, 0, "x"], [0, 1.45, 0, 1, "y"], [0, 0, 1.3, 2, "z"]].map(([x, y, z, i, n]) => {
            const e = P(x, y, z);
            return (
              <g key={n}>
                {line(o, e, { stroke: T.axis[i], strokeWidth: 2.5, strokeDasharray: "7 5" })}
                <text x={e[0] + (i === 0 ? -20 : 6)} y={e[1] + (i === 0 ? 18 : 4)} fill={T.axis[i]} fontSize="22" style={serif}>{n}</text>
              </g>
            );
          })}
          {feet.map((f, i) => (
            <g key={i}>
              {line(o, f, { stroke: T.axis[i], strokeWidth: 8, strokeLinecap: "round", opacity: 0.85 })}
              {line(kp, f, { stroke: T.dim, strokeWidth: 1.8, strokeDasharray: "4 4" })}
              <circle cx={f[0]} cy={f[1]} r="5.5" fill={T.axis[i]} />
              <text x={f[0] + off[i][0]} y={f[1] + off[i][1]} fill={T.axis[i]} fontSize="16" style={{ ...sans, fontWeight: 700 }}>{lab[i]} = {k[i].toFixed(2)}</text>
            </g>
          ))}
          {line(o, kp, { stroke: T.rep.dcm, strokeWidth: 5, strokeLinecap: "round" })}
          <circle cx={kp[0]} cy={kp[1]} r="6" fill={T.rep.dcm} />
          <text x={kp[0] + 10} y={kp[1] - 6} fill={T.rep.dcm} fontSize="22" style={serif}>z′</text>
          <g style={sans} fontSize="14" fill={T.dim}>
            <text x="420" y="78" fill={T.text} fontWeight="700">Row 3 of [Q]</text>
            <text x="420" y="102">= z′ written in x, y, z</text>
            <text x="420" y="126">= ({k.map((v) => v.toFixed(2)).join(", ")})</text>
          </g>
        </svg>
      </div>
    </Fig>
  );
}

/* ---------- 3. the same thing, live ---------- */

const START = canonicalQuat(dcmToQuat(EAToQ(30, 20, 10, [3, 2, 1])));

function RowsLive() {
  const T = useTheme();
  const [quat, setQuat] = useState(START);
  const [row, setRow] = useState(0);
  const onDrag = useCallback((dq) => {
    setQuat((p) => {
      const n = dq.clone().multiply(new THREE.Quaternion(p[1], p[2], p[3], p[0])).normalize();
      return canonicalQuat([n.w, n.x, n.y, n.z]);
    });
  }, []);
  const Q = useMemo(() => quatToQ(quat), [quat]);
  const projections = useMemo(() => (row === null ? undefined : [{ vec: Q[row], frame: "inertial" }]), [row, Q]);
  return (
    <Fig caption="Tap a row. The matching body axis lights up and drops its three shadows onto X, Y and Z. The badges are the numbers in that row. Drag the spacecraft and watch them change together.">
      <Scene quat={quat} onDrag={onDrag} highlight={row} projections={projections} height={400} />
      <div className="panel" style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <div className="seg-row head" aria-hidden="true">
          <span /> {["X", "Y", "Z"].map((n) => <span key={n} className="faint tiny" style={{ textAlign: "right" }}>along <span className="m">{n}</span></span>)}
        </div>
        {[0, 1, 2].map((r) => (
          <button key={r} type="button" onClick={() => setRow((x) => (x === r ? null : r))}
            className="seg-row" aria-pressed={row === r} style={{ "--c": T.axis[r] }}>
            <span className="m" style={{ color: T.axis[r], fontWeight: 700, width: 44 }}>{"xyz"[r]}<sub style={{ fontStyle: "normal" }}>B</sub></span>
            {[0, 1, 2].map((c) => (
              <span key={c} className="num" style={row === r ? { color: T.axis[c], fontWeight: 600 } : undefined}>
                {Q[r][c].toFixed(3).replace(/^-0\.000$/, "0.000")}
              </span>
            ))}
          </button>
        ))}
      </div>
    </Fig>
  );
}

/* ---------- 4. elementary rotations ---------- */

// For a turn about axis a, the page shows the other two axes:
// horizontal h and vertical v, ordered so (h, v, a) is right-handed.
const PLANE = { 1: [1, 2], 2: [2, 0], 3: [0, 1] };
const NAME = "xyz";

/** Little 3-D triad in the corner: which old axis this R turns about. */
function CornerTriad({ axis }) {
  const T = useTheme();
  const P = (x, y, z) => [52 - x * 24 + y * 34, 60 - z * 34 + x * 15];
  const o = P(0, 0, 0);
  const tips = [P(1.25, 0, 0), P(0, 1.2, 0), P(0, 0, 1.2)];
  const a = axis - 1;
  const others = [0, 1, 2].filter((i) => i !== a);
  const plane = [o, P(...[0, 1, 2].map((i) => (i === others[0] ? 0.9 : 0))), P(...[0, 1, 2].map((i) => (others.includes(i) ? 0.9 : 0))), P(...[0, 1, 2].map((i) => (i === others[1] ? 0.9 : 0)))];
  const t = tips[a];
  const mid = [(o[0] + t[0]) / 2, (o[1] + t[1]) / 2];
  return (
    <div className="corner-triad">
      <svg width="112" height="104" viewBox="0 0 112 104" aria-hidden="true">
        <polygon points={plane.map((p) => p.join(",")).join(" ")} fill={T.axis[a]} opacity=".14" />
        {tips.map((p, i) => (
          <g key={i}>
            <line x1={o[0]} y1={o[1]} x2={p[0]} y2={p[1]} stroke={T.axis[i]} strokeWidth={i === a ? 4.5 : 2} strokeLinecap="round" opacity={i === a ? 1 : 0.55} />
            <text x={p[0] + (i === 0 ? -12 : 4)} y={p[1] + (i === 0 ? 12 : 4)} fill={T.axis[i]} fontSize="15" style={serif} opacity={i === a ? 1 : 0.7}>{NAME[i]}</text>
          </g>
        ))}
        <ellipse cx={mid[0]} cy={mid[1]} rx="13" ry="5" fill="none" stroke={T.axis[a]} strokeWidth="2.5"
          transform={`rotate(${(Math.atan2(t[1] - o[1], t[0] - o[0]) * 180) / Math.PI + 90} ${mid[0]} ${mid[1]})`} strokeDasharray="30 12" />
      </svg>
      <div className="tiny" style={{ fontWeight: 700, color: T.axis[a] }}>
        <M>R</M><sub>{axis}</sub> turns about old <M>{NAME[a]}</M>
      </div>
      <div className="tiny dim">You&apos;re looking down <M>{NAME[a]}</M>. The shaded plane is the view below.</div>
    </div>
  );
}

function Elementary() {
  const T = useTheme();
  const [axis, setAxis] = useState(3);
  const [phi, setPhi] = useState(30);
  const R = [null, M1, M2, M3][axis]((phi * Math.PI) / 180);
  const [h, v] = PLANE[axis];
  const a = axis - 1;
  const c = Math.cos((phi * Math.PI) / 180), s = Math.sin((phi * Math.PI) / 180);
  const C0 = [180, 160], L = 115;
  const pt = (x, y) => [C0[0] + x * L, C0[1] - y * L];
  const hp = pt(c, s), vp = pt(-s, c), hFoot = pt(c, 0);

  return (
    <Fig caption="Drag the slider. The old axis you turn about points out of the screen and doesn't move. The other two turn by φ, and each new axis casts a cos φ shadow and a sin φ shadow on the old ones. Those are the entries of the matrix.">
      <div className="panel" style={{ position: "relative" }}>
        <div className="ctrl" style={{ marginTop: 0, marginBottom: 6, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="seg" role="group" aria-label="Rotation axis">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" aria-pressed={axis === n} style={{ "--c": T.axis[n - 1] }} onClick={() => setAxis(n)}>
                <span className="m">R</span><sub>{n}</sub> about <span className="m">{NAME[n - 1]}</span>
              </button>
            ))}
          </div>
          <CornerTriad axis={axis} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 360 300" style={{ flex: "1 1 260px", maxWidth: 400 }} role="img"
            aria-label={`Turn of ${phi} degrees about the ${NAME[a]} axis`}>
            <line x1={pt(-1.15, 0)[0]} y1={C0[1]} x2={pt(1.15, 0)[0]} y2={C0[1]} stroke={T.axis[h]} strokeWidth="2.5" strokeDasharray="7 5" />
            <line x1={C0[0]} y1={pt(0, -1.15)[1]} x2={C0[0]} y2={pt(0, 1.15)[1]} stroke={T.axis[v]} strokeWidth="2.5" strokeDasharray="7 5" />
            <text x={pt(1.18, 0)[0]} y={C0[1] + 7} fill={T.axis[h]} fontSize="20" style={serif}>{NAME[h]}</text>
            <text x={C0[0] + 8} y={pt(0, 1.13)[1]} fill={T.axis[v]} fontSize="20" style={serif}>{NAME[v]}</text>
            {/* the right triangle under the new h axis */}
            <line x1={C0[0]} y1={C0[1]} x2={hFoot[0]} y2={C0[1]} stroke={T.axis[h]} strokeWidth="8" strokeLinecap="round" opacity=".55" />
            <line x1={hFoot[0]} y1={C0[1]} x2={hp[0]} y2={hp[1]} stroke={T.axis[v]} strokeWidth="8" strokeLinecap="round" opacity=".55" />
            <text x={(C0[0] + hFoot[0]) / 2} y={C0[1] + (s >= 0 ? 26 : -14)} textAnchor="middle" fill={T.text} fontSize="14" style={{ ...sans, fontWeight: 700 }}>cos φ</text>
            <text x={hFoot[0] + (c >= 0 ? 10 : -10)} y={(C0[1] + hp[1]) / 2 + 5} textAnchor={c >= 0 ? "start" : "end"} fill={T.text} fontSize="14" style={{ ...sans, fontWeight: 700 }}>sin φ</text>
            {/* rotated axes */}
            <line x1={C0[0]} y1={C0[1]} x2={hp[0]} y2={hp[1]} stroke={T.axis[h]} strokeWidth="4.5" strokeLinecap="round" />
            <line x1={C0[0]} y1={C0[1]} x2={vp[0]} y2={vp[1]} stroke={T.axis[v]} strokeWidth="4.5" strokeLinecap="round" />
            <text x={hp[0] + 8} y={hp[1] - 4} fill={T.axis[h]} fontSize="20" style={serif}>{NAME[h]}′</text>
            <text x={vp[0] + (vp[0] < C0[0] ? -22 : 6)} y={vp[1] - 6} fill={T.axis[v]} fontSize="20" style={serif}>{NAME[v]}′</text>
            <path d={`M${C0[0] + 34} ${C0[1]} A34 34 0 0 ${phi >= 0 ? 0 : 1} ${C0[0] + 34 * c} ${C0[1] - 34 * s}`} fill="none" stroke={T.primary} strokeWidth="3" />
            <text x={C0[0] + 44 * Math.cos((phi * Math.PI) / 360)} y={C0[1] - 44 * Math.sin((phi * Math.PI) / 360) + 6} fill={T.primary} fontSize="18" style={serif}>φ</text>
            <circle cx={C0[0]} cy={C0[1]} r="9" fill={T.card} stroke={T.axis[a]} strokeWidth="2.5" />
            <circle cx={C0[0]} cy={C0[1]} r="3.2" fill={T.axis[a]} />
          </svg>
          <div style={{ flex: "1 1 220px", textAlign: "center" }}>
            <TeX>{`[R_${axis}(${phi}^\\circ)] =`}</TeX>
            <div style={{ marginTop: 8 }}><Mat rows={R} digits={3} color={(r) => T.axis[r]} /></div>
            <div className="tiny dim" style={{ marginTop: 10 }}>Row <M>i</M> is new axis <M>i</M>. The <M>{NAME[a]}</M> row and column stay 0, 0, 1.</div>
          </div>
        </div>
        <input type="range" className="slider" min={-180} max={180} step={1} value={phi}
          style={{ "--c": T.primary }} onChange={(e) => setPhi(+e.target.value)} aria-label="Rotation angle phi" />
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

      <h2>What one number means</h2>
      <p>
        Take two frames that share an origin: an old one <M>xyz</M> and a new one <M>x′y′z′</M>. Every entry
        of <M>[Q]</M> compares one new axis with one old axis.
      </p>
      <Shadow />
      <TeX block>{String.raw`Q_{ij} = \hat u'_i \cdot \hat u_j = \cos(\text{angle between new axis } i \text{ and old axis } j)`}</TeX>

      <h2>Three shadows make a row</h2>
      <Cosines />
      <p>Stack the three new axes as rows and you have the whole matrix:</p>
      <TeX block>{String.raw`\begin{bmatrix}\hat\imath'\\ \hat\jmath'\\ \hat k'\end{bmatrix} = [Q]\begin{bmatrix}\hat\imath\\ \hat\jmath\\ \hat k\end{bmatrix} \qquad\qquad \bar v\,|_2 = [Q]\,\bar v\,|_1`}</TeX>
      <p>
        On this site frame 1 is inertial and frame 2 is the body. So row 1 is the body <M>x</M> axis seen from
        inertial space, row 2 is body <M>y</M>, row 3 is body <M>z</M>.
      </p>
      <RowsLive />

      <h2>Nine numbers, but only three are free</h2>
      <p>
        The rows aren&apos;t just any numbers. Each one is an axis, so it has length 1, and the three axes are
        at right angles to each other. Written out, that&apos;s six equations:
      </p>
      <TeX block>{String.raw`\underbrace{Q_{i1}^2 + Q_{i2}^2 + Q_{i3}^2 = 1}_{\text{each row has length 1: 3 equations}} \qquad \underbrace{Q_{i1}Q_{j1} + Q_{i2}Q_{j2} + Q_{i3}Q_{j3} = 0}_{\text{rows } 12,\ 13,\ 23 \text{ are perpendicular: 3 equations}}`}</TeX>
      <p>
        Nine unknowns minus six equations leaves three you can pick freely. Every other number is forced.
        That&apos;s why every attitude representation needs at least three numbers.
      </p>
      <p>
        <Link className="link" to="/tutorial/the-math#nine-to-three">Build a [Q] yourself, one free number at a time →</Link>
      </p>

      <h2>Turning about one axis</h2>
      <p>
        The simplest DCMs turn the frame about just one of its own axes. They&apos;re called <M>R</M><sub>1</sub>,{" "}
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
        Because the rows are perpendicular unit vectors, <M>[Q][Q]</M><sup>T</sup> is the identity. So the
        inverse is just the transpose: flip the matrix across its diagonal.
      </p>
      <TeX block>{String.raw`[Q]^{-1} = [Q]^T \qquad\Longrightarrow\qquad \bar v\,|_1 = [Q]^T\,\bar v\,|_2`}</TeX>
      <p>
        Say a star tracker measures a star direction in body coordinates. <M>[Q]</M><sup>T</sup> turns it straight
        back into inertial coordinates, no matrix inversion needed.
      </p>

      <Ask q="Rows or columns?" tone="dcm">
        <p>
          Rows. Row <M>i</M> of <M>[Q]</M> is new axis <M>i</M> written in the old frame. The columns are the
          old axes written in the new frame, which is what you get after transposing.
        </p>
      </Ask>
    </>
  );
}
