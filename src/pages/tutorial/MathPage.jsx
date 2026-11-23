import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { Fig, M, TeX } from "./kit.jsx";

/* ============================================================================
   THE MATH, STEP BY STEP
   Every derivation is revealed one line at a time, so you can follow the
   algebra instead of reading a wall of it.
   ========================================================================== */

/** Reveal children one at a time. */
function Steps({ children, tone = "primary" }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  const [k, setK] = useState(1);
  return (
    <div className="mstep" style={{ "--c": `var(--${tone})` }}>
      <ol>
        {items.slice(0, k).map((c, i) => <li key={i} className="rise">{c}</li>)}
      </ol>
      <div className="mstep-ctl">
        <button type="button" className="btn sm" disabled={k <= 1} onClick={() => setK(k - 1)}>Back</button>
        <button type="button" className="btn sm primary" disabled={k >= items.length} onClick={() => setK(k + 1)}>
          Next step ({k}/{items.length})
        </button>
        <button type="button" className="btn sm" disabled={k >= items.length} onClick={() => setK(items.length)}>Show all</button>
      </div>
    </div>
  );
}

/* ---------- 1. nine numbers, three free: build a [Q] ---------- */

const D = Math.PI / 180;
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function Builder() {
  const T = useTheme();
  const [az, setAz] = useState(35);
  const [el, setEl] = useState(20);
  const [psi, setPsi] = useState(60);
  const [stage, setStage] = useState(1);
  const r1 = [Math.cos(el * D) * Math.cos(az * D), Math.cos(el * D) * Math.sin(az * D), Math.sin(el * D)];
  // two directions perpendicular to r1; row 2 is any mix of them (one free angle)
  const e1 = [-Math.sin(az * D), Math.cos(az * D), 0];
  const e2 = cross(r1, e1);
  const r2 = [0, 1, 2].map((i) => Math.cos(psi * D) * e1[i] + Math.sin(psi * D) * e2[i]);
  const r3 = cross(r1, r2);
  const rows = [r1, r2, r3];

  // orthographic view from the side, so row 1 starts out square-on
  const cA = 115 * D, cE = 16 * D;
  const rgt = [-Math.sin(cA), Math.cos(cA), 0];
  const upv = [-Math.sin(cE) * Math.cos(cA), -Math.sin(cE) * Math.sin(cA), Math.cos(cE)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const P = (v, s = 120) => [190 + dot(v, rgt) * s, 165 - dot(v, upv) * s];
  const O = P([0, 0, 0]);
  const circle = Array.from({ length: 73 }, (_, i) => {
    const t = (i / 72) * 2 * Math.PI;
    return P([0, 1, 2].map((k) => Math.cos(t) * e1[k] + Math.sin(t) * e2[k]));
  });
  const circ = circle.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const arrow = (v, col, show = true) => {
    if (!show) return null;
    const t = P(v);
    return (
      <g>
        <line x1={O[0]} y1={O[1]} x2={t[0]} y2={t[1]} stroke={col} strokeWidth="5" strokeLinecap="round" />
        <circle cx={t[0]} cy={t[1]} r="6.5" fill={col} />
      </g>
    );
  };
  const state = (r) => (r + 1 < stage ? "set" : r + 1 === stage ? "now" : "later");
  const why = [
    "Row 1: any direction. Picking a point on a sphere takes 2 numbers (the third is fixed by length 1).",
    "Row 2: must be perpendicular to row 1, so it lives on the dashed circle. 1 number: where on the circle.",
    "Row 3: nothing left to pick. It has to be row 1 × row 2.",
  ];
  return (
    <Fig caption="Build a DCM by hand. Row 1 costs two free numbers, row 2 costs one, row 3 costs none. That's the 2 + 1 + 0 = 3.">
      <div className="panel">
        <div className="seg" role="group" aria-label="Step" style={{ marginBottom: 10 }}>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={stage === n} style={{ "--c": T.axis[n - 1] }} onClick={() => setStage(n)}>Row {n}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <svg viewBox="0 0 380 330" style={{ flex: "1 1 260px", maxWidth: 400 }} role="img" aria-label="A sphere with the three rows of Q drawn as arrows">
            <circle cx={O[0]} cy={O[1]} r="120" fill="none" stroke={T.line} strokeWidth="1.5" />
            {[[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e, i) => {
              const p = P(e, 140);
              return (
                <g key={i}>
                  <line x1={O[0]} y1={O[1]} x2={p[0]} y2={p[1]} stroke={T.faint} strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x={p[0] + 4} y={p[1] + 4} fill={T.faint} fontSize="15" style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontWeight: 700 }}>{"XYZ"[i]}</text>
                </g>
              );
            })}
            {stage >= 2 && <path d={circ} fill="none" stroke={T.axis[1]} strokeWidth="2.5" strokeDasharray="6 5" opacity=".8" />}
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
                <label className="blk"><span className="lbl">free number 1: azimuth {az}°</span>
                  <input type="range" className="slider" min={-180} max={180} value={az} onChange={(e) => setAz(+e.target.value)} style={{ "--c": T.axis[0] }} /></label>
                <label className="blk"><span className="lbl">free number 2: elevation {el}°</span>
                  <input type="range" className="slider" min={-85} max={85} value={el} onChange={(e) => setEl(+e.target.value)} style={{ "--c": T.axis[0] }} /></label>
              </>
            )}
            {stage === 2 && (
              <label className="blk"><span className="lbl">free number 3: angle around the circle {psi}°</span>
                <input type="range" className="slider" min={-180} max={180} value={psi} onChange={(e) => setPsi(+e.target.value)} style={{ "--c": T.axis[1] }} /></label>
            )}
            {stage === 3 && <p className="small dim">No slider. Try going back and moving row 1 or row 2: row 3 follows.</p>}
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

export default function MathPage() {
  const T = useTheme();
  const cE = T.rep.euler, cS = T.rep.sar, cQ = T.rep.quat;
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, [hash]);

  return (
    <>
      <p className="lede">
        The chapters show what each formula does. This page shows where they come from, one line at a time.
        Hit <b>Next step</b> to walk through each derivation.
      </p>

      <h2 id="nine-to-three">Why nine numbers only have three free</h2>
      <p>The three rows of <M>[Q]</M> are the three body axes. Axes have length 1 and are at right angles. Write that down:</p>
      <Steps tone="dcm">
        <TeX block>{String.raw`\begin{gathered}\text{Each row has length 1:}\\ Q_{11}^2+Q_{12}^2+Q_{13}^2 = 1 \\ Q_{21}^2+Q_{22}^2+Q_{23}^2 = 1 \\ Q_{31}^2+Q_{32}^2+Q_{33}^2 = 1\end{gathered}`}</TeX>
        <TeX block>{String.raw`\begin{gathered}\text{Rows are perpendicular:}\\ Q_{11}Q_{21}+Q_{12}Q_{22}+Q_{13}Q_{23} = 0 \\ Q_{11}Q_{31}+Q_{12}Q_{32}+Q_{13}Q_{33} = 0 \\ Q_{21}Q_{31}+Q_{22}Q_{32}+Q_{23}Q_{33} = 0\end{gathered}`}</TeX>
        <TeX block>{String.raw`\text{That's } 3 + 3 = 6 \text{ equations on } 9 \text{ unknowns.}`}</TeX>
        <TeX block>{String.raw`9 - 6 = 3 \ \text{numbers you can choose. The other six are forced.}`}</TeX>
        <TeX block>{String.raw`\text{Together the six say } [Q][Q]^T = I \ \Rightarrow\ [Q]^{-1} = [Q]^T`}</TeX>
      </Steps>
      <p>Here&apos;s the same count done by hand. Pick the rows one at a time and watch the choices shrink:</p>
      <Builder />

      <h2 id="angles-to-q">Angles to [Q]: multiplying it out</h2>
      <p>
        For 3-2-1, <TeX>{String.raw`[Q] = R_1(\gamma)\,R_2(\beta)\,R_3(\alpha)`}</TeX>. Do it in two products, right
        to left. Short forms: <TeX>{String.raw`c\alpha = \cos\alpha,\ s\alpha = \sin\alpha`}</TeX>.
      </p>
      <Multiply />

      <h2 id="q-to-angles">[Q] to angles: picking out one angle at a time</h2>
      <p>
        Look for entries where only one angle survives, or where a ratio makes the others cancel. Three do the job:
        <TeX>{String.raw`Q_{13}`}</TeX>, the pair <TeX>{String.raw`Q_{12}, Q_{11}`}</TeX>, and the pair <TeX>{String.raw`Q_{23}, Q_{33}`}</TeX>.
      </p>
      <Steps tone="euler">
        <TeX block>{String.raw`[Q] = \begin{bmatrix} \color{${cE}}{c\alpha\, c\beta} & \color{${cE}}{s\alpha\, c\beta} & \color{${cS}}{-s\beta} \\ \cdots & \cdots & \color{${cQ}}{c\beta\, s\gamma} \\ \cdots & \cdots & \color{${cQ}}{c\beta\, c\gamma} \end{bmatrix}`}</TeX>
        <TeX block>{String.raw`\color{${cS}}{Q_{13} = -\sin\beta} \quad\Longrightarrow\quad \beta = \sin^{-1}(-Q_{13})`}</TeX>
        <TeX block>{String.raw`\color{${cE}}{\frac{Q_{12}}{Q_{11}} = \frac{\sin\alpha\,\cancel{\cos\beta}}{\cos\alpha\,\cancel{\cos\beta}} = \tan\alpha} \quad\Longrightarrow\quad \alpha = \tan^{-1}\frac{Q_{12}}{Q_{11}}`}</TeX>
        <TeX block>{String.raw`\color{${cQ}}{\frac{Q_{23}}{Q_{33}} = \frac{\cancel{\cos\beta}\,\sin\gamma}{\cancel{\cos\beta}\,\cos\gamma} = \tan\gamma} \quad\Longrightarrow\quad \gamma = \tan^{-1}\frac{Q_{23}}{Q_{33}}`}</TeX>
        <TeX block>{String.raw`\text{The cancelling needs } \cos\beta \ne 0,\ \text{and the signs of the top and bottom pick the quadrant (atan2).}`}</TeX>
      </Steps>

      <h2 id="sar">SAR and [Q]: the trace and the differences</h2>
      <p>Start from the SAR matrix and add up the diagonal:</p>
      <Steps tone="sar">
        <TeX block>{String.raw`Q_{11}+Q_{22}+Q_{33} = (u_x^2+u_y^2+u_z^2)(1-\cos\theta) + 3\cos\theta`}</TeX>
        <TeX block>{String.raw`= 1\cdot(1-\cos\theta) + 3\cos\theta = 1 + 2\cos\theta \qquad (\text{because } |\hat u| = 1)`}</TeX>
        <TeX block>{String.raw`\Longrightarrow\quad \cos\theta = \frac{Q_{11}+Q_{22}+Q_{33}-1}{2}`}</TeX>
        <TeX block>{String.raw`\text{Now subtract across the diagonal. The } u_iu_j(1-\cos\theta) \text{ parts are equal on both sides and cancel:}`}</TeX>
        <TeX block>{String.raw`Q_{23}-Q_{32} = \big[\cancel{u_yu_z(1-c\theta)} + u_x s\theta\big] - \big[\cancel{u_yu_z(1-c\theta)} - u_x s\theta\big] = 2u_x\sin\theta`}</TeX>
        <TeX block>{String.raw`\text{Same for the others:}\quad Q_{31}-Q_{13} = 2u_y\sin\theta, \qquad Q_{12}-Q_{21} = 2u_z\sin\theta`}</TeX>
        <TeX block>{String.raw`\Longrightarrow\quad \hat u = \frac{1}{2\sin\theta}\,\big(Q_{23}-Q_{32},\ Q_{31}-Q_{13},\ Q_{12}-Q_{21}\big)`}</TeX>
        <TeX block>{String.raw`\text{With } 0^\circ < \theta < 180^\circ,\ \sin\theta > 0, \text{ so the signs of } \hat u \text{ come straight from the differences.}`}</TeX>
      </Steps>

      <h2 id="quaternion">Quaternions and the SAR</h2>
      <p>A quaternion is the SAR with half the angle:</p>
      <Steps tone="quat">
        <TeX block>{String.raw`\bar{\bar q} = \begin{bmatrix}\bar q\\ q_4\end{bmatrix} = \begin{bmatrix}\hat u\,\sin(\theta/2)\\ \cos(\theta/2)\end{bmatrix}`}</TeX>
        <TeX block>{String.raw`\text{Split the vector part:}\quad q_1 = u_x\sin\tfrac{\theta}{2},\quad q_2 = u_y\sin\tfrac{\theta}{2},\quad q_3 = u_z\sin\tfrac{\theta}{2}`}</TeX>
        <TeX block>{String.raw`\text{Length: } q_1^2+q_2^2+q_3^2+q_4^2 = \underbrace{(u_x^2+u_y^2+u_z^2)}_{1}\sin^2\tfrac{\theta}{2} + \cos^2\tfrac{\theta}{2} = 1`}</TeX>
        <TeX block>{String.raw`\text{Back to the SAR: } q_4 = \cos\tfrac{\theta}{2} \ \Longrightarrow\ \theta = 2\cos^{-1}(q_4)`}</TeX>
        <TeX block>{String.raw`\bar q = \hat u\,\sin\tfrac{\theta}{2} \ \Longrightarrow\ \hat u = \frac{\bar q}{\sin(\theta/2)} \qquad (\text{divide, don't square and root, so the signs survive})`}</TeX>
        <TeX block>{String.raw`-\bar{\bar q} = \begin{bmatrix}-\hat u\,\sin\frac{\theta}{2}\\ -\cos\frac{\theta}{2}\end{bmatrix} = \begin{bmatrix}(-\hat u)\sin\frac{360^\circ-\theta}{2}\\ \cos\frac{360^\circ-\theta}{2}\end{bmatrix}`}</TeX>
        <TeX block>{String.raw`\text{That's a turn of } 360^\circ-\theta \text{ about } -\hat u: \text{ the same attitude. So } \bar{\bar q} \text{ and } -\bar{\bar q} \text{ match.}`}</TeX>
      </Steps>
      <p>
        Why half angles? When a quaternion rotates a vector, it gets applied twice: once on each side of the vector.
        Each copy carries half the turn, so the two halves add up to the full <M>θ</M>.
      </p>
    </>
  );
}
