import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { canonicalQuat, normalizeQuat } from "../../lib/attitude.js";
import { EAToQ, QToSAR, SARToQuat, fromCourseQuat, quatToQ } from "../../lib/course.js";
import SequencePlayer from "../../components/SequencePlayer.jsx";
import { Fig, M, Mat, Ask, Scene, TeX } from "./kit.jsx";
import { ortho, arc3, path, fromAzEl, cross, norm, scale, add } from "./ortho.js";

const serif = { fontFamily: "Times New Roman, serif", fontStyle: "italic", fontWeight: 700 };
const sans = { fontFamily: "var(--sans)" };
const Q0 = EAToQ(30, 20, 10, [3, 2, 1]);
const SAR0 = QToSAR(Q0);

/* ---------- û and θ, drawn as two clean pictures ---------- */

const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const NAMES = ["X", "Y", "Z"];

function Axes({ V, T, len = 1.3 }) {
  return AX.map((e, i) => {
    const p = V.P(scale(e, len));
    return (
      <g key={i}>
        <line x1={V.O[0]} y1={V.O[1]} x2={p[0]} y2={p[1]} stroke={T.axis[i]} strokeWidth="1.8" strokeDasharray="5 5" opacity=".7" />
        <text x={p[0] + (i === 0 ? -16 : 5)} y={p[1] + (i === 0 ? 14 : i === 2 ? 2 : 5)} fill={T.axis[i]} fontSize="17" style={serif}>{NAMES[i]}</text>
      </g>
    );
  });
}

function AxisPicture() {
  const T = useTheme();
  const u = SAR0.u;
  const V = ortho(28, 18, 105, 150, 150);
  // left: the turn
  const e1 = norm(cross([0, 0, 1], u)), e2 = cross(u, e1);
  const ring = arc3(scale(u, 0.95), e1, e2, 0.3, 0.3, 0.3 + 5.2).map(V.P);
  const end = ring[ring.length - 1], prev = ring[ring.length - 4];
  const ang = (Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180) / Math.PI;
  const tip = V.P(scale(u, 1.3)), tail = V.P(scale(u, -0.35));
  const thetaAt = V.P(add(scale(u, 0.95), scale(e1, -0.48)));
  // right: the components
  const uT = V.P(u);
  return (
    <Fig caption="Left: θ is a turn about the axis û. Right: û is a unit vector, so it casts three shadows on X, Y and Z, and those are its components.">
      <div className="panel two-pics">
        <div>
          <div className="pic-title" style={{ color: T.rep.sar }}>The turn</div>
          <svg viewBox="0 0 300 270" role="img" aria-label="The axis u with a curved arrow around it for theta">
            <Axes V={V} T={T} />
            <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke={T.rep.sar} strokeWidth="5" strokeLinecap="round" />
            <path d={path(ring)} fill="none" stroke={T.rep.sar} strokeWidth="3" strokeLinecap="round" />
            <polygon points="0,-6 12,0 0,6" fill={T.rep.sar} transform={`translate(${end[0]} ${end[1]}) rotate(${ang})`} />
            <text x={tip[0] + 8} y={tip[1] + 4} fill={T.rep.sar} fontSize="24" style={serif}>û</text>
            <text x={thetaAt[0] - 18} y={thetaAt[1] + 6} fill={T.rep.sar} fontSize="22" style={serif}>θ</text>
          </svg>
        </div>
        <div>
          <div className="pic-title" style={{ color: T.text }}>Its components</div>
          <svg viewBox="0 0 300 270" role="img" aria-label="The axis u with its x, y and z components">
            <Axes V={V} T={T} />
            {AX.map((e, i) => {
              const f = V.P(scale(e, u[i]));
              const dir = [f[0] - V.O[0], f[1] - V.O[1]];
              const n = Math.hypot(...dir) || 1;
              const perp = [dir[1] / n, -dir[0] / n];
              const lp = [f[0] + perp[0] * 22 * (i === 1 ? -1 : 1), f[1] + perp[1] * 22 * (i === 1 ? -1 : 1)];
              return (
                <g key={i}>
                  <line x1={V.O[0]} y1={V.O[1]} x2={f[0]} y2={f[1]} stroke={T.axis[i]} strokeWidth="5" strokeLinecap="round" />
                  <line x1={uT[0]} y1={uT[1]} x2={f[0]} y2={f[1]} stroke={T.faint} strokeWidth="1.4" strokeDasharray="3 4" />
                  <circle cx={f[0]} cy={f[1]} r="4" fill={T.axis[i]} />
                  <text x={lp[0]} y={lp[1] + 5} textAnchor="middle" fill={T.axis[i]} fontSize="14" style={{ ...sans, fontWeight: 800 }}>
                    u<tspan fontSize="10" dy="3">{"xyz"[i]}</tspan><tspan dy="-3"> {u[i].toFixed(2)}</tspan>
                  </text>
                </g>
              );
            })}
            <line x1={V.O[0]} y1={V.O[1]} x2={uT[0]} y2={uT[1]} stroke={T.rep.sar} strokeWidth="4" strokeLinecap="round" />
            <circle cx={uT[0]} cy={uT[1]} r="5" fill={T.rep.sar} />
            <text x={uT[0] + 8} y={uT[1] - 4} fill={T.rep.sar} fontSize="22" style={serif}>û</text>
          </svg>
        </div>
      </div>
    </Fig>
  );
}

/* ---------- θ is a turn about û, not an angle between two given arrows ---------- */

function ThetaBuilder() {
  const T = useTheme();
  const [az, setAz] = useState(75);
  const [el, setEl] = useState(25);
  const [th, setTh] = useState(100);
  const V = ortho(25, 20, 112, 190, 185);
  const u = fromAzEl(az, el);
  const h = [Math.cos((az * Math.PI) / 180), Math.sin((az * Math.PI) / 180), 0];
  const equ = arc3([0, 0, 0], [1, 0, 0], [0, 1, 0], 1, 0, 2 * Math.PI, 90).map(V.P);
  const mer = arc3([0, 0, 0], h, [0, 0, 1], 1, -Math.PI / 2, Math.PI / 2, 60).map(V.P);
  const azArc = arc3([0, 0, 0], [1, 0, 0], [0, 1, 0], 0.42, 0, (az * Math.PI) / 180, 40).map(V.P);
  const elArc = arc3([0, 0, 0], h, [0, 0, 1], 0.62, 0, (el * Math.PI) / 180, 30).map(V.P);
  const foot = V.P(scale(h, Math.cos((el * Math.PI) / 180)));
  const uT = V.P(u);
  // the disk at right angles to û, and an arrow in it sweeping θ
  const e1 = Math.abs(u[2]) > 0.999 ? [1, 0, 0] : norm(cross([0, 0, 1], u));
  const e2 = cross(u, e1);
  const c = scale(u, 1.12);
  const R = 0.46;
  const disk = arc3(c, e1, e2, R, 0, 2 * Math.PI, 60).map(V.P);
  const t = (th * Math.PI) / 180;
  const r0 = add(c, scale(e2, R)), rT = add(c, scale(e2, R * Math.cos(t)), scale(cross(u, e2), R * Math.sin(t)));
  const sweep = arc3(c, e2, cross(u, e2), R * 0.62, 0, t, 40).map(V.P);
  const C = V.P(c), R0 = V.P(r0), RT = V.P(rT), mid = V.P(add(c, scale(e2, R * 0.82 * Math.cos(t / 2)), scale(cross(u, e2), R * 0.82 * Math.sin(t / 2))));
  const uTip = V.P(scale(u, 1.42));
  const azLab = V.P(arc3([0, 0, 0], [1, 0, 0], [0, 1, 0], 0.55, 0, (az * Math.PI) / 360, 1)[1]);
  const elLab = V.P(arc3([0, 0, 0], h, [0, 0, 1], 0.78, 0, (el * Math.PI) / 360, 1)[1]);
  return (
    <Fig caption="Pick û the way you'd pick a place on a globe: azimuth is its longitude, elevation its latitude. That's 2 numbers. θ is the third: take any arrow lying flat in the disk at right angles to û and turn it about û. How far it sweeps is θ.">
      <div className="panel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <svg viewBox="0 0 380 350" style={{ flex: "1 1 340px", maxWidth: 460 }} role="img" aria-label="Globe-style picture of the axis u, with azimuth and elevation, and a disk around u showing theta">
            <circle cx={V.O[0]} cy={V.O[1]} r={V.s} fill="none" stroke={T.line} strokeWidth="1.5" />
            <path d={path(equ)} fill="none" stroke={T.faint} strokeWidth="1.3" strokeDasharray="4 5" />
            <path d={path(mer)} fill="none" stroke={T.faint} strokeWidth="1.3" strokeDasharray="4 5" />
            <Axes V={V} T={T} len={1.18} />
            <path d={path(azArc)} fill="none" stroke={T.primary} strokeWidth="3" />
            <path d={path(elArc)} fill="none" stroke={T.rep.quat} strokeWidth="3" />
            <line x1={V.O[0]} y1={V.O[1]} x2={foot[0]} y2={foot[1]} stroke={T.faint} strokeWidth="1.5" />
            <line x1={uT[0]} y1={uT[1]} x2={foot[0]} y2={foot[1]} stroke={T.faint} strokeWidth="1.5" strokeDasharray="3 4" />
            <text x={azLab[0]} y={azLab[1] + 18} textAnchor="middle" fill={T.primary} fontSize="13" style={{ ...sans, fontWeight: 800 }}>azimuth</text>
            <text x={elLab[0] + 8} y={elLab[1]} fill={T.rep.quat} fontSize="13" style={{ ...sans, fontWeight: 800 }}>elevation</text>
            <line x1={V.O[0]} y1={V.O[1]} x2={uT[0]} y2={uT[1]} stroke={T.rep.sar} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx={uT[0]} cy={uT[1]} r="5" fill={T.rep.sar} />
            <path d={path(disk, true)} fill={T.rep.sar} fillOpacity=".22" stroke={T.rep.sar} strokeWidth="2" />
            <line x1={uT[0]} y1={uT[1]} x2={uTip[0]} y2={uTip[1]} stroke={T.rep.sar} strokeWidth="4.5" strokeLinecap="round" />
            <text x={uTip[0] + 8} y={uTip[1] - 4} fill={T.rep.sar} fontSize="22" style={serif}>û</text>
            <line x1={C[0]} y1={C[1]} x2={R0[0]} y2={R0[1]} stroke={T.dim} strokeWidth="2.5" strokeDasharray="4 3" />
            <circle cx={R0[0]} cy={R0[1]} r="3.5" fill={T.dim} />
            <line x1={C[0]} y1={C[1]} x2={RT[0]} y2={RT[1]} stroke={T.text} strokeWidth="3" strokeLinecap="round" />
            <circle cx={RT[0]} cy={RT[1]} r="4" fill={T.text} />
            <path d={path(sweep)} fill="none" stroke={T.rep.sar} strokeWidth="3" />
            <text x={mid[0]} y={mid[1] + 6} textAnchor="middle" fill={T.rep.sar} fontSize="18" style={serif}>θ</text>
          </svg>
          <div style={{ flex: "1 1 200px" }}>
            <label className="blk"><span className="lbl" style={{ color: T.primary }}>1. azimuth (longitude) {az}°</span>
              <input type="range" className="slider" min={-180} max={180} value={az} onChange={(e) => setAz(+e.target.value)} style={{ "--c": T.primary }} /></label>
            <label className="blk"><span className="lbl" style={{ color: T.rep.quat }}>2. elevation (latitude) {el}°</span>
              <input type="range" className="slider" min={-85} max={85} value={el} onChange={(e) => setEl(+e.target.value)} style={{ "--c": T.rep.quat }} /></label>
            <label className="blk"><span className="lbl" style={{ color: T.rep.sar }}>3. θ, the turn about û {th}°</span>
              <input type="range" className="slider" min={0} max={180} value={th} onChange={(e) => setTh(+e.target.value)} style={{ "--c": T.rep.sar }} /></label>
            <p className="small num" style={{ marginTop: 10 }}>û = ({u.map((v) => v.toFixed(3)).join(", ")})</p>
            <p className="small dim">Three sliders, three free numbers. The same count as everywhere else.</p>
          </div>
        </div>
      </div>
    </Fig>
  );
}

/* ---------- û has the same numbers in both frames ---------- */

function SameInBoth() {
  const T = useTheme();
  const [th, setTh] = useState(Math.round(SAR0.theta));
  const [showI, setShowI] = useState(false);
  const [showX, setShowX] = useState(false);
  const [craft, setCraft] = useState("ghost");
  const u = SAR0.u;
  const quat = useMemo(() => canonicalQuat(normalizeQuat(fromCourseQuat(SARToQuat(u, th)))), [u, th]);
  const Q = useMemo(() => quatToQ(quat), [quat]);
  const uBody = [0, 1, 2].map((i) => Q[i][0] * u[0] + Q[i][1] * u[1] + Q[i][2] * u[2]);
  const xBody = Q.map((row) => row[0]);
  const projections = useMemo(() => [
    { vec: u, frame: "body" },
    showI ? { vec: u, frame: "inertial", color: T.inertial, faint: true, labels: false } : null,
    showX ? { vec: [1, 0, 0], frame: "body", color: T.rep.dcm } : null,
  ].filter(Boolean), [u, showI, showX, T]);
  const f = (v) => v.toFixed(3);
  return (
    <Fig caption="Slide θ. The body turns about û, so the body axes swing around, but û's shadows on them (the badges) never change. Turn on X's shadows to compare: those change the whole time.">
      <Scene quat={quat} sar={{ axis: u, angle: (th * Math.PI) / 180 }} projections={projections} craft={craft} height={420}>
        <div className="scene-ui" style={{ right: 12, top: 12 }}>
          <span className="seg craft-seg" role="group" aria-label="Spacecraft">
            {[["solid", "Solid"], ["ghost", "See-through"], ["hidden", "Hidden"]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={craft === k} onClick={() => setCraft(k)}>{l}</button>
            ))}
          </span>
        </div>
      </Scene>
      <div className="panel" style={{ marginTop: 10 }}>
        <label style={{ display: "block" }}>
          <div className="lbl" style={{ color: T.rep.sar }}><M>θ</M> = {th}° about û</div>
          <input type="range" className="slider" min={0} max={180} value={th} style={{ "--c": T.rep.sar }}
            onChange={(e) => setTh(+e.target.value)} aria-label="theta" />
        </label>
        <div className="legend" style={{ margin: "8px 0 4px" }}>
          <span><i className="swatch-line" style={{ "--c": T.axis[0] }} /><i className="swatch-line" style={{ "--c": T.axis[1], marginLeft: -4 }} /><i className="swatch-line" style={{ "--c": T.axis[2], marginLeft: -4 }} /> û&apos;s shadows on the body axes</span>
          <button type="button" className="toggle" aria-pressed={showI} style={{ "--c": T.inertial }} onClick={() => setShowI((v) => !v)}>
            <span className="sw" /> û&apos;s shadows on X, Y, Z (grey)
          </button>
          <button type="button" className="toggle" aria-pressed={showX} style={{ "--c": T.rep.dcm }} onClick={() => setShowX((v) => !v)}>
            <span className="sw" /> X&apos;s shadows on the body axes
          </button>
        </div>
        <div className="both-grid">
          <div className="both-cell" style={{ "--c": T.inertial }}>
            <div className="tiny dim">û in inertial <M>XYZ</M></div>
            <div className="num">({u.map(f).join(", ")})</div>
          </div>
          <div className="both-cell" style={{ "--c": T.rep.sar }}>
            <div className="tiny dim">û in body <M>x</M><sub>B</sub><M>y</M><sub>B</sub><M>z</M><sub>B</sub></div>
            <div className="num" style={{ color: T.rep.sar, fontWeight: 600 }}>({uBody.map(f).join(", ")})</div>
          </div>
          <div className="both-cell" style={{ "--c": T.rep.dcm }}>
            <div className="tiny dim">for contrast: <M>X</M> in body</div>
            <div className="num">({xBody.map(f).join(", ")})</div>
          </div>
        </div>
      </div>
    </Fig>
  );
}

/* ---------- plugging û and θ into [Q], one entry at a time ---------- */

const SAR_CELLS = [
  ["u_x^2(1-c\\theta)+c\\theta", (u, c) => [`(${u[0].toFixed(3)})^2(1-${c.toFixed(3)})+${c.toFixed(3)}`, u[0] * u[0] * (1 - c) + c]],
  ["u_xu_y(1-c\\theta)+u_z s\\theta", (u, c, s) => [`(${u[0].toFixed(3)})(${u[1].toFixed(3)})(1-${c.toFixed(3)})+(${u[2].toFixed(3)})(${s.toFixed(3)})`, u[0] * u[1] * (1 - c) + u[2] * s]],
  ["u_xu_z(1-c\\theta)-u_y s\\theta", (u, c, s) => [`(${u[0].toFixed(3)})(${u[2].toFixed(3)})(1-${c.toFixed(3)})-(${u[1].toFixed(3)})(${s.toFixed(3)})`, u[0] * u[2] * (1 - c) - u[1] * s]],
  ["u_xu_y(1-c\\theta)-u_z s\\theta", (u, c, s) => [`(${u[0].toFixed(3)})(${u[1].toFixed(3)})(1-${c.toFixed(3)})-(${u[2].toFixed(3)})(${s.toFixed(3)})`, u[0] * u[1] * (1 - c) - u[2] * s]],
  ["u_y^2(1-c\\theta)+c\\theta", (u, c) => [`(${u[1].toFixed(3)})^2(1-${c.toFixed(3)})+${c.toFixed(3)}`, u[1] * u[1] * (1 - c) + c]],
  ["u_yu_z(1-c\\theta)+u_x s\\theta", (u, c, s) => [`(${u[1].toFixed(3)})(${u[2].toFixed(3)})(1-${c.toFixed(3)})+(${u[0].toFixed(3)})(${s.toFixed(3)})`, u[1] * u[2] * (1 - c) + u[0] * s]],
  ["u_xu_z(1-c\\theta)+u_y s\\theta", (u, c, s) => [`(${u[0].toFixed(3)})(${u[2].toFixed(3)})(1-${c.toFixed(3)})+(${u[1].toFixed(3)})(${s.toFixed(3)})`, u[0] * u[2] * (1 - c) + u[1] * s]],
  ["u_yu_z(1-c\\theta)-u_x s\\theta", (u, c, s) => [`(${u[1].toFixed(3)})(${u[2].toFixed(3)})(1-${c.toFixed(3)})-(${u[0].toFixed(3)})(${s.toFixed(3)})`, u[1] * u[2] * (1 - c) - u[0] * s]],
  ["u_z^2(1-c\\theta)+c\\theta", (u, c) => [`(${u[2].toFixed(3)})^2(1-${c.toFixed(3)})+${c.toFixed(3)}`, u[2] * u[2] * (1 - c) + c]],
];

function SarToQ() {
  const T = useTheme();
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { u, theta } = SAR0;
  const c = Math.cos((theta * Math.PI) / 180), s = Math.sin((theta * Math.PI) / 180);
  useEffect(() => {
    if (!playing || k >= 8) return;
    const id = setTimeout(() => { setK((x) => x + 1); if (k + 1 >= 8) setPlaying(false); }, 1800);
    return () => clearTimeout(id);
  }, [playing, k]);
  const [sym, fn] = SAR_CELLS[k];
  const [nums, val] = fn(u, c, s);
  const r = Math.floor(k / 3), col = k % 3;
  const diag = r === col;
  return (
    <Fig caption="Each entry has the same pattern. On the diagonal: uᵢ²(1 − cos θ) + cos θ. Off it: uᵢuⱼ(1 − cos θ) ± u_k sin θ, where u_k is the component that isn't i or j. Step through with the numbers for û = (0.124, 0.616, 0.778), θ = 35.82°.">
      <div className="panel hunt">
        <div className="hunt-mat" style={{ "--c": diag ? T.rep.dcm : T.rep.sar }}>
          {SAR_CELLS.map(([sy, f2], i) => (
            <span key={i} className={i === k ? "on" : ""} style={{ textAlign: "center", fontSize: 14 }}>
              <small>Q<sub>{Math.floor(i / 3) + 1}{(i % 3) + 1}</sub></small>
              {i <= k ? f2(u, c, s)[1].toFixed(4) : <span className="faint" data-sym={sy}>?</span>}
            </span>
          ))}
        </div>
        <div className="hunt-step" style={{ "--c": diag ? T.rep.dcm : T.rep.sar, display: "block", overflowX: "auto" }}>
          <TeX>{`Q_{${r + 1}${col + 1}} = ${sym}`}</TeX><br />
          <TeX>{`= ${nums} = ${val.toFixed(4)}`}</TeX>
          <div className="tiny dim" style={{ marginTop: 6 }}>{diag ? "Diagonal: no sin θ term." : "Off the diagonal: a sin θ term that flips sign across the diagonal."}</div>
        </div>
        <div className="mstep-ctl">
          <button type="button" className="btn sm primary" onClick={() => { if (k >= 8) setK(0); setPlaying((p) => !p); }}>{playing ? "Pause" : k >= 8 ? "Play again" : "Play"}</button>
          <button type="button" className="btn sm" disabled={k === 0} onClick={() => { setPlaying(false); setK(k - 1); }}>Back</button>
          <button type="button" className="btn sm" disabled={k >= 8} onClick={() => { setPlaying(false); setK(k + 1); }}>Next entry ({k + 1}/9)</button>
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

      <h2>θ is a turn, not a gap between two arrows</h2>
      <p>
        Most angles you&apos;ve met sit between two arrows. θ is different: it&apos;s how far things spin <i>around</i> û.
        The easy way to see it is to build an SAR from scratch, the same way you&apos;d find a city on a globe.
      </p>
      <ThetaBuilder />

      <h2>Why û is the same in either frame</h2>
      <p>
        Points on the axis don&apos;t move during the turn. So whatever û looked like before the turn, it looks the
        same after, and its components in the old frame and the new frame are equal.
      </p>
      <SameInBoth />

      <h2>From û and θ to [Q]</h2>
      <TeX block>{String.raw`[Q] = \begin{bmatrix} u_x^2(1-c\theta)+c\theta & u_xu_y(1-c\theta)+u_z s\theta & u_xu_z(1-c\theta)-u_y s\theta \\ u_xu_y(1-c\theta)-u_z s\theta & u_y^2(1-c\theta)+c\theta & u_yu_z(1-c\theta)+u_x s\theta \\ u_xu_z(1-c\theta)+u_y s\theta & u_yu_z(1-c\theta)-u_x s\theta & u_z^2(1-c\theta)+c\theta \end{bmatrix}`}</TeX>
      <p>
        Four numbers, but only three are free, because <TeX>{String.raw`u_x^2+u_y^2+u_z^2=1`}</TeX>. It looks like a lot,
        but every entry follows one of two patterns. Watch it fill in:
      </p>
      <SarToQ />
      <p><Link className="link" to="/tutorial/the-math#sar-to-q">Where does this matrix come from? →</Link></p>

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
