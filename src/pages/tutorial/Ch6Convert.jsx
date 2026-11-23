import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme.js";
import { EAToQ, QToEA, QToSAR, SARToQuat, quatToSAR, SARToQ } from "../../lib/course.js";
import NumField from "../../components/NumField.jsx";
import { Fig, M, Mat, Ask, TeX } from "./kit.jsx";

function Chain() {
  const T = useTheme();
  const nodes = [
    { k: "euler", x: 70, label: "EA", sub: "α β γ" },
    { k: "dcm", x: 290, label: "DCM", sub: "[Q]" },
    { k: "sar", x: 510, label: "SAR", sub: "û, θ" },
    { k: "quat", x: 730, label: "QUAT", sub: "q" },
  ];
  const links = [
    ["multiply the R's", "sin⁻¹, atan2"],
    ["SAR matrix", "trace, differences"],
    ["half angle", "2 cos⁻¹ q₄"],
  ];
  return (
    <Fig caption="Every conversion in the course goes through this line, one hop at a time. Going from Euler angles to a quaternion means passing through [Q] and the SAR on the way.">
      <div className="panel" style={{ overflowX: "auto" }}>
        <svg viewBox="0 0 800 170" style={{ minWidth: 560 }} role="img" aria-label="Chain of conversions: Euler angles to DCM to SAR to quaternion, with arrows both ways">
          <defs>
            <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={T.dim} />
            </marker>
          </defs>
          {links.map(([fwd, back], i) => {
            const x1 = nodes[i].x + 54, x2 = nodes[i + 1].x - 54;
            return (
              <g key={i} fontFamily="var(--sans)" fontSize="12" fill={T.dim} fontWeight="600">
                <path d={`M${x1} 70 L${x2} 70`} stroke={T.dim} strokeWidth="2" markerEnd="url(#ah)" />
                <path d={`M${x2} 102 L${x1} 102`} stroke={T.dim} strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#ah)" />
                <text x={(x1 + x2) / 2} y={60} textAnchor="middle">{fwd}</text>
                <text x={(x1 + x2) / 2} y={124} textAnchor="middle">{back}</text>
              </g>
            );
          })}
          {nodes.map((n) => (
            <g key={n.k}>
              <rect x={n.x - 52} y="46" width="104" height="80" rx="18" fill={T.rep[n.k]} />
              <text x={n.x} y="82" textAnchor="middle" fill="#12121a" fontFamily="var(--display)" fontWeight="800" fontSize="20">{n.label}</text>
              <text x={n.x} y="106" textAnchor="middle" fill="#12121a" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700" fontSize="17">{n.sub}</text>
            </g>
          ))}
          <text x="400" y="160" textAnchor="middle" fill={T.faint} fontFamily="var(--sans)" fontSize="12">solid: forward · dashed: back</text>
        </svg>
      </div>
    </Fig>
  );
}

const f = (v, p = 6) => { const s = v.toFixed(p); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; };

function Walkthrough() {
  const T = useTheme();
  const [a, setA] = useState([30, 20, 10]);
  const r = useMemo(() => {
    const Q = EAToQ(a[0], a[1], a[2], [3, 2, 1]);
    const sar = QToSAR(Q);
    const q = sar.u ? SARToQuat(sar.u, sar.theta) : [0, 0, 0, 1];
    const sar2 = quatToSAR(q);
    const Q2 = sar2.u ? SARToQ(sar2.u, sar2.theta) : Q;
    const ea = QToEA(Q2, [3, 2, 1]);
    return { Q, sar, q, sar2, Q2, ea };
  }, [a]);
  const G = ["α", "β", "γ"];
  const close = (x, y) => Math.abs(x - y) < 1e-6;
  const backOk = [0, 1, 2].every((k) => close([r.ea.alpha, r.ea.beta, r.ea.gamma][k], [((a[0] % 360) + 360) % 360, a[1], ((a[2] % 360) + 360) % 360][k]));

  const node = (rep, title, sym, body, check) => (
    <div className="flow-node" style={{ "--c": T.rep[rep] }}>
      <div className="flow-head">
        <span className="rep-badge">{sym}</span>
        <b>{title}</b>
        {check && <span className="chip" style={{ "--c": T.axis[1], marginLeft: "auto" }}>✓ matches</span>}
      </div>
      <div className="flow-body">{body}</div>
    </div>
  );
  const link = (tex, note) => (
    <div className="flow-link">
      <span className="flow-arrow" aria-hidden="true" />
      <div className="flow-note"><TeX>{tex}</TeX>{note && <span className="tiny dim"> {note}</span>}</div>
    </div>
  );
  return (
    <div className="flow">
      <div className="flow-rail" aria-hidden="true"><span>same angles</span></div>
      {node("euler", "Start: Euler angles (3-2-1)", "α β γ", (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          {[0, 1, 2].map((k) => (
            <label key={k} style={{ flex: "1 1 70px" }}>
              <div className="lbl" style={{ color: T.axis[2 - k] }}><span className="m">{G[k]}</span></div>
              <NumField value={String(a[k])} suffix="°" color={T.axis[2 - k]} label={G[k]}
                onCommit={(v) => { const n = a.slice(); n[k] = v; setA(n); }} />
            </label>
          ))}
          <button type="button" className="btn sm" onClick={() => setA([30, 20, 10])}>30°, 20°, 10°</button>
        </div>
      ))}
      {link(String.raw`[Q] = R_1(\gamma)\,R_2(\beta)\,R_3(\alpha)`)}
      {node("dcm", "DCM", "[Q]", <Mat rows={r.Q} digits={6} size={13.5} />)}
      {link(String.raw`\theta = \cos^{-1}\tfrac{\mathrm{tr}[Q]-1}{2},\ \ \hat u = \tfrac{1}{2\sin\theta}(Q_{23}-Q_{32},\ \dots)`)}
      {node("sar", "Single-axis rotation", "û, θ", r.sar.u
        ? <span className="num">û = ({r.sar.u.map((v) => f(v)).join(", ")})<br />θ = {f(r.sar.theta, 4)}°</span>
        : <span className="dim">θ = 0°, so there&apos;s no axis. Pick nonzero angles.</span>)}
      {link(String.raw`\bar{\bar q} = [\,\hat u\sin\tfrac{\theta}{2}\ ;\ \cos\tfrac{\theta}{2}\,]`)}
      {node("quat", "Quaternion", "q", <span className="num">[ {r.q.map((v) => f(v)).join("  ")} ]</span>)}
      {link(String.raw`\theta = 2\cos^{-1}q_4,\ \ \hat u = \bar q / \sin\tfrac{\theta}{2}`, "now go back")}
      {node("sar", "SAR again", "û, θ", r.sar2.u
        ? <span className="num">û = ({r.sar2.u.map((v) => f(v)).join(", ")}), θ = {f(r.sar2.theta, 4)}°</span>
        : <span className="num">θ = 0°</span>, !!r.sar.u)}
      {link(String.raw`\text{plug } \hat u,\ \theta \text{ into the SAR matrix}`)}
      {node("dcm", "DCM again", "[Q]", <Mat rows={r.Q2} digits={6} size={13.5} />, true)}
      {link(String.raw`\beta = \sin^{-1}(-Q_{13}),\ \ \alpha,\gamma \text{ from atan2}`)}
      {node("euler", "Back where you started", "α β γ",
        <span className="num">α = {f(r.ea.alpha, 4)}°, β = {f(r.ea.beta, 4)}°, γ = {f(r.ea.gamma, 4)}°</span>, backOk)}
    </div>
  );
}

export default function Ch6() {
  return (
    <>
      <p className="lede">
        Four representations, one attitude. On a quiz you&apos;ll usually be handed one and asked for another.
        Here&apos;s the route and a full worked example you can change.
      </p>
      <Chain />

      <h2>One example, all the way around</h2>
      <p>
        A spacecraft finds its attitude as <M>α</M> = 30°, <M>β</M> = 20°, <M>γ</M> = 10° in a 3-2-1 sequence.
        Find the DCM, the SAR and the quaternion, then go back the other way to check. Each box feeds the next.
        Change the angles and the whole chain redoes itself.
      </p>
      <Walkthrough />

      <Ask q="How many numbers do I actually need?" tone="primary">
        <p>
          Three, for every representation. Euler angles use exactly three. SAR uses four with one constraint
          (the axis has length 1). Quaternions use four with one constraint (length 1). The DCM uses nine with
          six constraints.
        </p>
      </Ask>
      <Ask q="Ready to test yourself?" tone="primary">
        <p>
          <Link className="link" to="/test-prep">Test Prep</Link> gives you fresh numbers for each of these
          hops and shows the working when you check.
        </p>
      </Ask>
    </>
  );
}
