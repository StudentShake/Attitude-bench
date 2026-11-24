import { useState } from "react";
import { useTheme } from "../../lib/theme.js";
import { Fig, M, TeX, MathFlow, SvgKey, H2 } from "./kit.jsx";
import { ortho, arc3, path, fromAzEl, cross, scale, add } from "./ortho.js";

/* ============================================================================
   THE MATH, STEP BY STEP
   Every derivation is revealed one line at a time, so you can follow the
   algebra instead of reading a wall of it.
   ========================================================================== */

/* ---------- 1. nine numbers, three free: build a [Q] ---------- */

function Builder() {
  const T = useTheme();
  const [az, setAz] = useState(-35);
  const [el, setEl] = useState(28);
  const [psi, setPsi] = useState(60);
  const [stage, setStage] = useState(1);
  const r1 = fromAzEl(az, el);
  const h = [Math.cos((az * Math.PI) / 180), Math.sin((az * Math.PI) / 180), 0];
  const e1 = [-Math.sin((az * Math.PI) / 180), Math.cos((az * Math.PI) / 180), 0];
  const e2 = cross(r1, e1);
  const r2 = add(scale(e1, Math.cos((psi * Math.PI) / 180)), scale(e2, Math.sin((psi * Math.PI) / 180)));
  const r3 = cross(r1, r2);
  const rows = [r1, r2, r3];
  const V = ortho(25, 20, 120, 190, 172);
  const O = V.O;
  const equ = arc3([0, 0, 0], [1, 0, 0], [0, 1, 0], 1, 0, 2 * Math.PI, 90).map(V.P);
  const mer = arc3([0, 0, 0], h, [0, 0, 1], 1, -Math.PI / 2, Math.PI / 2, 60).map(V.P);
  const azArc = arc3([0, 0, 0], [1, 0, 0], [0, 1, 0], 0.4, 0, (az * Math.PI) / 180, 40).map(V.P);
  const elArc = arc3([0, 0, 0], h, [0, 0, 1], 0.6, 0, (el * Math.PI) / 180, 30).map(V.P);
  const foot = V.P(scale(h, Math.cos((el * Math.PI) / 180)));
  const circ = arc3([0, 0, 0], e1, e2, 1, 0, 2 * Math.PI, 90).map(V.P);
  const arrow = (v, col, show = true) => {
    if (!show) return null;
    const t = V.P(v);
    return (
      <g>
        <line x1={O[0]} y1={O[1]} x2={t[0]} y2={t[1]} stroke={col} strokeWidth="5" strokeLinecap="round" />
        <circle cx={t[0]} cy={t[1]} r="6.5" fill={col} />
      </g>
    );
  };
  const state = (r) => (r + 1 < stage ? "set" : r + 1 === stage ? "now" : "later");
  const why = [
    "Row 1 can point anywhere. Like a place on a globe, that takes 2 numbers: longitude (azimuth) and latitude (elevation). Its length is already fixed at 1.",
    "Row 2 has to be at right angles to row 1, so its tip must sit on the dashed circle. Only 1 number left: where on the circle.",
    "Row 3 has nothing left to choose. It's row 1 × row 2.",
  ];
  const AZ = T.rep.euler, EL = T.rep.quat;
  return (
    <Fig caption="Build a DCM by hand. Row 1 costs two free numbers, row 2 costs one, row 3 costs none. That's 2 + 1 + 0 = 3.">
      <div className="panel">
        <div className="seg" role="group" aria-label="Step" style={{ marginBottom: 10 }}>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={stage === n} style={{ "--c": T.axis[n - 1] }} onClick={() => setStage(n)}>Row {n}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <svg viewBox="0 0 380 340" style={{ flex: "1 1 330px", maxWidth: 440 }} role="img" aria-label="A globe with the three rows of Q drawn as arrows">
            <circle cx={O[0]} cy={O[1]} r={V.s} fill="none" stroke={T.line} strokeWidth="1.5" />
            <path d={path(equ)} fill="none" stroke={T.faint} strokeWidth="1.2" strokeDasharray="4 5" />
            {stage === 1 && <path d={path(mer)} fill="none" stroke={T.faint} strokeWidth="1.2" strokeDasharray="4 5" />}
            {[[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e, i) => {
              const p = V.P(scale(e, 1.15));
              return (
                <g key={i}>
                  <line x1={O[0]} y1={O[1]} x2={p[0]} y2={p[1]} stroke={T.faint} strokeWidth="1.3" strokeDasharray="3 4" />
                  <text x={p[0] + 4} y={p[1] + 4} fill={T.faint} fontSize="15" style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontWeight: 700 }}>{"XYZ"[i]}</text>
                </g>
              );
            })}
            {stage === 1 && (
              <g>
                <path d={path(azArc)} fill="none" stroke={AZ} strokeWidth="3.5" />
                <path d={path(elArc)} fill="none" stroke={EL} strokeWidth="3.5" />
                <line x1={O[0]} y1={O[1]} x2={foot[0]} y2={foot[1]} stroke={T.faint} strokeWidth="1.5" />
                <line x1={V.P(r1)[0]} y1={V.P(r1)[1]} x2={foot[0]} y2={foot[1]} stroke={T.faint} strokeWidth="1.5" strokeDasharray="3 4" />
                <SvgKey x={8} y={20} items={[{ color: AZ, label: "azimuth" }, { color: EL, label: "elevation" }]} />
              </g>
            )}
            {stage >= 2 && <path d={path(circ)} fill="none" stroke={T.axis[1]} strokeWidth="2.5" strokeDasharray="6 5" opacity=".85" />}
            {arrow(r1, T.axis[0])}
            {arrow(r2, T.axis[1], stage >= 2)}
            {arrow(r3, T.axis[2], stage >= 3)}
            <circle cx={O[0]} cy={O[1]} r="4" fill={T.text} />
          </svg>
          <div style={{ flex: "1 1 240px" }}>
            <div className="bmat">
              {rows.map((row, r) => row.map((v, c) => (
                <span key={`${r}${c}`} className={`bm-${state(r)}`} style={{ "--c": T.axis[r] }}>
                  {r + 1 <= stage ? v.toFixed(3) : "?"}
                </span>
              )))}
            </div>
            <p className="small" style={{ marginTop: 12 }}>{why[stage - 1]}</p>
            {stage === 1 && (
              <>
                <label className="blk"><span className="lbl" style={{ color: AZ }}>free number 1: azimuth (longitude) {az}°</span>
                  <input type="range" className="slider" min={-180} max={180} value={az} onChange={(e) => setAz(+e.target.value)} style={{ "--c": AZ }} /></label>
                <label className="blk"><span className="lbl" style={{ color: EL }}>free number 2: elevation (latitude) {el}°</span>
                  <input type="range" className="slider" min={-85} max={85} value={el} onChange={(e) => setEl(+e.target.value)} style={{ "--c": EL }} /></label>
              </>
            )}
            {stage === 2 && (
              <label className="blk"><span className="lbl" style={{ color: T.axis[1] }}>free number 3: angle around the circle {psi}°</span>
                <input type="range" className="slider" min={-180} max={180} value={psi} onChange={(e) => setPsi(+e.target.value)} style={{ "--c": T.axis[1] }} /></label>
            )}
            {stage === 3 && <p className="small dim">No slider. Go back and move row 1 or row 2: row 3 follows.</p>}
          </div>
        </div>
      </div>
    </Fig>
  );
}

/* ---------- 2. multiplying out the 3-2-1 matrix ---------- */

// symbolic entries: a sum of terms, each a sign and a list of factors
const term = (s, ...f) => ({ s, f });
const Z = [];
const ONE = [term(1)];
const R3 = [[[term(1, "c\\alpha")], [term(1, "s\\alpha")], Z], [[term(-1, "s\\alpha")], [term(1, "c\\alpha")], Z], [Z, Z, ONE]];
const R2 = [[[term(1, "c\\beta")], Z, [term(-1, "s\\beta")]], [Z, ONE, Z], [[term(1, "s\\beta")], Z, [term(1, "c\\beta")]]];
const R1 = [[ONE, Z, Z], [Z, [term(1, "c\\gamma")], [term(1, "s\\gamma")]], [Z, [term(-1, "s\\gamma")], [term(1, "c\\gamma")]]];
const ORDER = { "\\alpha": 0, "\\beta": 1, "\\gamma": 2 };
const key = (f) => ORDER[f.slice(1)] * 2 + (f[0] === "s" ? 1 : 0);
const mulPoly = (a, b) => a.flatMap((x) => b.map((y) => term(x.s * y.s, ...[...x.f, ...y.f].sort((p, q) => key(p) - key(q)))));
const addPoly = (...ps) => ps.flat();
const tex = (p) => {
  if (!p.length) return "0";
  return p.map((t, i) => {
    const body = t.f.length ? t.f.join("\\,") : "1";
    return `${t.s < 0 ? "-" : i ? "+" : ""}${body}`;
  }).join(" ");
};
const texFactor = (p) => `(${tex(p)})`;
const mulMat = (A, B) => A.map((row, i) => [0, 1, 2].map((j) => addPoly(...[0, 1, 2].map((k) => mulPoly(A[i][k], B[k][j])))));
const R2R3 = mulMat(R2, R3);
const QFULL = mulMat(R1, R2R3);

function SymMat({ M: Mx, hiRow = -1, hiCol = -1, upto = 9, done = 9, color }) {
  return (
    <div className="smat" style={{ "--c": color }}>
      {Mx.map((row, i) => row.map((p, j) => {
        const idx = i * 3 + j;
        const on = i === hiRow || j === hiCol;
        const hidden = idx >= done && idx !== upto;
        return (
          <span key={`${i}${j}`} className={`${on ? "on" : ""}${idx === upto ? " cur" : ""}`}>
            {hidden ? <span className="faint">·</span> : <TeX>{tex(p)}</TeX>}
          </span>
        );
      }))}
    </div>
  );
}

function Multiply() {
  const T = useTheme();
  const [stage, setStage] = useState(0); // 0: R2·R3, 1: R1·(R2R3)
  const [cell, setCell] = useState(0);
  const A = stage === 0 ? R2 : R1, B = stage === 0 ? R3 : R2R3, C = stage === 0 ? R2R3 : QFULL;
  const i = Math.floor(cell / 3), j = cell % 3;
  const expansion = [0, 1, 2].map((k) => `${texFactor(A[i][k])}${texFactor(B[k][j])}`).join(" + ");
  const names = stage === 0 ? ["[R_2(\\beta)]", "[R_3(\\alpha)]", "[R_2R_3]"] : ["[R_1(\\gamma)]", "[R_2R_3]", "[Q]"];
  const next = () => (cell < 8 ? setCell(cell + 1) : stage === 0 ? (setStage(1), setCell(0)) : null);
  const back = () => (cell > 0 ? setCell(cell - 1) : stage === 1 ? (setStage(0), setCell(8)) : null);
  return (
    <Fig caption="Each entry of a product is a row of the left matrix times a column of the right one: multiply matching entries and add. Step through all eighteen and you get the 3-2-1 matrix.">
      <div className="panel">
        <div className="mul">
          <div><div className="mul-name"><TeX>{names[0]}</TeX></div><SymMat M={A} hiRow={i} color={T.rep.euler} /></div>
          <div className="mul-x">×</div>
          <div><div className="mul-name"><TeX>{names[1]}</TeX></div><SymMat M={B} hiCol={j} color={T.rep.euler} /></div>
          <div className="mul-x">=</div>
          <div><div className="mul-name"><TeX>{names[2]}</TeX></div><SymMat M={C} upto={cell} done={cell} color={T.rep.dcm} /></div>
        </div>
        <div className="eq tex" style={{ marginTop: 14 }}>
          <TeX>{`\\text{row } ${i + 1} \\cdot \\text{col } ${j + 1} = ${expansion} = ${tex(C[i][j])}`}</TeX>
        </div>
        <div className="mstep-ctl">
          <button type="button" className="btn sm" onClick={back} disabled={stage === 0 && cell === 0}>Back</button>
          <button type="button" className="btn sm primary" onClick={next} disabled={stage === 1 && cell === 8}>
            Next entry ({stage * 9 + cell + 1}/18)
          </button>
          <button type="button" className="btn sm" onClick={() => { setStage(1); setCell(8); }}>Jump to the end</button>
        </div>
      </div>
    </Fig>
  );
}

/* ============================================================================ */

const hc = (m, x) => `\\htmlClass{m-${m}}{${x}}`;

const NINE = [
  { tex: String.raw`[Q] = \begin{bmatrix} ${hc("a", "Q_{11}")} & ${hc("a", "Q_{12}")} & ${hc("a", "Q_{13}")} \\ ${hc("b", "Q_{21}")} & ${hc("b", "Q_{22}")} & ${hc("b", "Q_{23}")} \\ ${hc("c", "Q_{31}")} & ${hc("c", "Q_{32}")} & ${hc("c", "Q_{33}")} \end{bmatrix} \qquad \text{9 numbers}` },
  {
    rule: "Each row is an axis, so each row has length 1", marks: ["a", "b", "c"],
    tex: String.raw`\begin{gathered} ${hc("a", "Q_{11}^2+Q_{12}^2+Q_{13}^2")} = 1 \\ ${hc("b", "Q_{21}^2+Q_{22}^2+Q_{23}^2")} = 1 \\ ${hc("c", "Q_{31}^2+Q_{32}^2+Q_{33}^2")} = 1 \end{gathered}`,
  },
  {
    rule: "The three axes are at right angles, so each pair of rows has dot product 0", marks: ["a", "b", "c"],
    tex: String.raw`\begin{gathered} ${hc("a", "\\text{row}_1")} \cdot ${hc("b", "\\text{row}_2")} = 0 \\ ${hc("a", "\\text{row}_1")} \cdot ${hc("c", "\\text{row}_3")} = 0 \\ ${hc("b", "\\text{row}_2")} \cdot ${hc("c", "\\text{row}_3")} = 0 \end{gathered}`,
  },
  { rule: "Count: 3 + 3 equations tie up 6 of the 9 numbers", tex: String.raw`9 - 6 = 3 \ \text{numbers you can choose freely}` },
  { rule: "Written as one matrix equation, those six say this", tex: String.raw`[Q][Q]^T = I \quad\Longrightarrow\quad [Q]^{-1} = [Q]^T` },
];

const QANG = [
  { tex: String.raw`[Q]_{321} = \begin{bmatrix} ${hc("b", "c\\alpha\\, c\\beta")} & ${hc("b", "s\\alpha\\, c\\beta")} & ${hc("a", "-s\\beta")} \\ \cdots & \cdots & ${hc("c", "c\\beta\\, s\\gamma")} \\ \cdots & \cdots & ${hc("c", "c\\beta\\, c\\gamma")} \end{bmatrix}` },
  { rule: "Q₁₃ is the only entry with β on its own", marks: ["a"], tex: String.raw`${hc("a", "Q_{13} = -\\sin\\beta")} \quad\Longrightarrow\quad \beta = \sin^{-1}(-Q_{13})` },
  {
    rule: "Divide Q₁₂ by Q₁₁: cos β is in both, so it cancels", marks: ["b"],
    tex: String.raw`\frac{${hc("b", "Q_{12}")}}{${hc("b", "Q_{11}")}} = \frac{\sin\alpha\,\cancel{\cos\beta}}{\cos\alpha\,\cancel{\cos\beta}} = \tan\alpha \quad\Longrightarrow\quad \alpha = \tan^{-1}\frac{Q_{12}}{Q_{11}}`,
  },
  {
    rule: "Same trick down the last column with Q₂₃ and Q₃₃", marks: ["c"],
    tex: String.raw`\frac{${hc("c", "Q_{23}")}}{${hc("c", "Q_{33}")}} = \frac{\cancel{\cos\beta}\,\sin\gamma}{\cancel{\cos\beta}\,\cos\gamma} = \tan\gamma \quad\Longrightarrow\quad \gamma = \tan^{-1}\frac{Q_{23}}{Q_{33}}`,
  },
  {
    rule: "Two things to watch",
    tex: String.raw`\begin{gathered} \text{The cancelling needs } \cos\beta \ne 0. \\ \text{The signs of the top and bottom pick the quadrant (atan2).} \end{gathered}`,
  },
];

const TRACE = [
  {
    tex: String.raw`\begin{aligned} Q_{11} &= ${hc("a", "u_x^2")}(1-\cos\theta) + ${hc("b", "\\cos\\theta")} \\ Q_{22} &= ${hc("a", "u_y^2")}(1-\cos\theta) + ${hc("b", "\\cos\\theta")} \\ Q_{33} &= ${hc("a", "u_z^2")}(1-\cos\theta) + ${hc("b", "\\cos\\theta")} \end{aligned}`,
  },
  {
    rule: "Add the three. The u² terms share (1 − cos θ); the cos θ terms make three", marks: ["a", "b"],
    tex: String.raw`Q_{11}+Q_{22}+Q_{33} = (${hc("a", "u_x^2+u_y^2+u_z^2")})(1-\cos\theta) + ${hc("b", "3\\cos\\theta")}`,
  },
  { rule: "û has length 1, so that bracket is 1", marks: ["a"], tex: String.raw`= ${hc("a", "1")}\cdot(1-\cos\theta) + 3\cos\theta = 1 + 2\cos\theta` },
  { rule: "Solve for cos θ", tex: String.raw`\cos\theta = \frac{Q_{11}+Q_{22}+Q_{33}-1}{2}` },
];

const DIFF = [
  {
    tex: String.raw`\begin{aligned} Q_{23} &= ${hc("b", "u_yu_z(1-\\cos\\theta)")} + ${hc("c", "u_x\\sin\\theta")} \\ Q_{32} &= ${hc("b", "u_yu_z(1-\\cos\\theta)")} - ${hc("c", "u_x\\sin\\theta")} \end{aligned}`,
  },
  { rule: "Subtract. The matching parts cancel and the sin θ parts double", marks: ["b", "c"], tex: String.raw`Q_{23} - Q_{32} = ${hc("c", "2u_x\\sin\\theta")}` },
  { rule: "Same for the other two pairs", tex: String.raw`\begin{gathered} Q_{31} - Q_{13} = 2u_y\sin\theta \\ Q_{12} - Q_{21} = 2u_z\sin\theta \end{gathered}` },
  { rule: "Divide by 2 sin θ", tex: String.raw`\hat u = \frac{1}{2\sin\theta}\begin{bmatrix} Q_{23}-Q_{32} \\ Q_{31}-Q_{13} \\ Q_{12}-Q_{21}\end{bmatrix}` },
  { rule: "Why the signs come out right", tex: String.raw`\begin{gathered} 0^\circ < \theta < 180^\circ \ \Rightarrow\ \sin\theta > 0 \\ \text{dividing by a positive number keeps every sign} \end{gathered}` },
];

const SARQ = [
  { tex: String.raw`[Q] = ${hc("a", "\\cos\\theta\\, I")} + ${hc("b", "(1-\\cos\\theta)\\,\\hat u\\hat u^T")} - ${hc("c", "\\sin\\theta\\,[\\hat u\\times]")}` },
  {
    rule: "Piece 1 turns nothing yet: it's cos θ down the diagonal", marks: ["a"],
    tex: String.raw`${hc("a", "\\cos\\theta\\, I")} = \begin{bmatrix} c\theta & 0 & 0 \\ 0 & c\theta & 0 \\ 0 & 0 & c\theta \end{bmatrix}`,
  },
  {
    rule: "Piece 2 is the part along û, which the turn never touches", marks: ["b"],
    tex: String.raw`${hc("b", "(1-c\\theta)\\,\\hat u\\hat u^T")} = (1-c\theta)\begin{bmatrix} u_x^2 & u_xu_y & u_xu_z \\ u_xu_y & u_y^2 & u_yu_z \\ u_xu_z & u_yu_z & u_z^2 \end{bmatrix}`,
  },
  {
    rule: "Piece 3 is the cross-product part that does the turning", marks: ["c"],
    tex: String.raw`-${hc("c", "s\\theta\\,[\\hat u\\times]")} = -s\theta\begin{bmatrix} 0 & -u_z & u_y \\ u_z & 0 & -u_x \\ -u_y & u_x & 0 \end{bmatrix}`,
  },
  {
    rule: "Add the three, entry by entry", marks: ["a", "b", "c"],
    tex: String.raw`[Q] = \begin{bmatrix} ${hc("b", "u_x^2(1-c\\theta)")}+${hc("a", "c\\theta")} & ${hc("b", "u_xu_y(1-c\\theta)")}+${hc("c", "u_zs\\theta")} & ${hc("b", "u_xu_z(1-c\\theta)")}-${hc("c", "u_ys\\theta")} \\ ${hc("b", "u_xu_y(1-c\\theta)")}-${hc("c", "u_zs\\theta")} & ${hc("b", "u_y^2(1-c\\theta)")}+${hc("a", "c\\theta")} & ${hc("b", "u_yu_z(1-c\\theta)")}+${hc("c", "u_xs\\theta")} \\ ${hc("b", "u_xu_z(1-c\\theta)")}+${hc("c", "u_ys\\theta")} & ${hc("b", "u_yu_z(1-c\\theta)")}-${hc("c", "u_xs\\theta")} & ${hc("b", "u_z^2(1-c\\theta)")}+${hc("a", "c\\theta")} \end{bmatrix}`,
  },
];

const QUAT = [
  { tex: String.raw`\bar{\bar q} = \begin{bmatrix} ${hc("a", "\\bar q")} \\ ${hc("b", "q_4")} \end{bmatrix} = \begin{bmatrix} ${hc("a", "\\hat u\\,\\sin(\\theta/2)")} \\ ${hc("b", "\\cos(\\theta/2)")} \end{bmatrix}` },
  { rule: "Split the vector part into its x, y, z pieces", marks: ["a"], tex: String.raw`q_1 = u_x\sin\tfrac{\theta}{2},\quad q_2 = u_y\sin\tfrac{\theta}{2},\quad q_3 = u_z\sin\tfrac{\theta}{2}` },
  {
    rule: "Its length is always 1", marks: ["c"],
    tex: String.raw`\begin{aligned} q_1^2+q_2^2+q_3^2+q_4^2 &= (${hc("c", "u_x^2+u_y^2+u_z^2")})\sin^2\tfrac{\theta}{2} + \cos^2\tfrac{\theta}{2} \\ &= ${hc("c", "1")}\cdot\sin^2\tfrac{\theta}{2} + \cos^2\tfrac{\theta}{2} = 1 \end{aligned}`,
  },
  { rule: "Going back: q₄ gives the angle", marks: ["b"], tex: String.raw`${hc("b", "q_4 = \\cos\\tfrac{\\theta}{2}")} \ \Longrightarrow\ \theta = 2\cos^{-1}(q_4)` },
  {
    rule: "Then divide the vector part by sin(θ/2). Dividing keeps the signs; squaring and rooting would lose them", marks: ["a"],
    tex: String.raw`${hc("a", "\\bar q = \\hat u\\,\\sin\\tfrac{\\theta}{2}")} \ \Longrightarrow\ \hat u = \frac{\bar q}{\sin(\theta/2)}`,
  },
  {
    rule: "Flip every sign and rewrite it", marks: ["d"],
    tex: String.raw`\begin{aligned} -\bar{\bar q} &= \begin{bmatrix} -\hat u\,\sin\frac{\theta}{2} \\ -\cos\frac{\theta}{2}\end{bmatrix} \\ &= \begin{bmatrix} ${hc("d", "(-\\hat u)")}\,\sin\frac{${hc("d", "360^\\circ-\\theta")}}{2} \\ \cos\frac{${hc("d", "360^\\circ-\\theta")}}{2}\end{bmatrix} \end{aligned}`,
  },
  {
    rule: "Read it as a turn", marks: ["d"],
    tex: String.raw`\begin{gathered} \text{a turn of } ${hc("d", "360^\\circ-\\theta")} \text{ about } ${hc("d", "-\\hat u")} \\ \text{lands in the same place, so } \bar{\bar q} \text{ and } -\bar{\bar q} \text{ match} \end{gathered}`,
  },
];

export default function MathPage() {
  return (
    <>
      <p className="lede">
        The chapters show what each formula does. This page shows where each one comes from, one move at a time.
        Hover or tap the notes between the boxes to light up the pieces they&apos;re talking about.
      </p>

      <H2 id="nine-to-three">Why nine numbers only have three free</H2>
      <MathFlow tone="dcm" steps={NINE} />
      <p>Here&apos;s the same count done by hand. Pick the rows one at a time and watch the choices shrink:</p>
      <Builder />

      <H2 id="angles-to-q">Angles to [Q]: multiplying it out</H2>
      <p>
        For 3-2-1, <TeX>{String.raw`[Q] = R_1(\gamma)\,R_2(\beta)\,R_3(\alpha)`}</TeX>. Do it in two products, right
        to left. Short forms: <TeX>{String.raw`c\alpha = \cos\alpha,\ s\alpha = \sin\alpha`}</TeX>.
      </p>
      <Multiply />

      <H2 id="q-to-angles">[Q] to angles: one angle at a time</H2>
      <MathFlow tone="euler" steps={QANG} />

      <H2 id="sar">SAR from [Q]: the trace</H2>
      <MathFlow tone="sar" steps={TRACE} />
      <H2 id="sar-axis">SAR from [Q]: the differences</H2>
      <MathFlow tone="sar" steps={DIFF} />

      <H2 id="sar-to-q">Where the SAR matrix comes from</H2>
      <p>
        The big SAR matrix is three simple matrices added together. One keeps the part of a vector along û, the other
        two turn the part at right angles to û by θ.
      </p>
      <MathFlow tone="sar" steps={SARQ} />

      <H2 id="quaternion">Quaternions and the SAR</H2>
      <MathFlow tone="quat" steps={QUAT} />
      <p>
        Why half angles? When a quaternion rotates a vector, it gets applied twice: once on each side of the vector.
        Each copy carries half the turn, so the two halves add up to the full <M>θ</M>.
      </p>
    </>
  );
}
