import { Link } from "react-router-dom";
import { T } from "../lib/theme.js";
import { Page, Eyebrow } from "../components/SiteChrome.jsx";

const PLANNED = [
  ["Conversions", "Quaternion ↔ DCM ↔ Euler ↔ CRP/MRP, both senses, marked step by step."],
  ["Sequence traps", "All twelve sequences, proper vs Tait-Bryan, and what changes when the order flips."],
  ["Singularities", "Spot gimbal lock before it bites; CRP at Φ = 180°, MRP at Φ = 360°."],
  ["Successive rotations", "Composition order, relative attitude, and the sign conventions that cost marks."],
];

export default function TestPrep() {
  return (
    <Page>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "30px 0" }}>
        <Eyebrow color={T.amber}>Section 03</Eyebrow>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em" }}>
          Test Prep
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, color: T.dim, lineHeight: 1.65 }}>
          Generated problems with worked solutions, drawn from the same verified conversion library
          the playground runs on — so every answer key is the real arithmetic, not a transcription.
        </p>

        <div style={{
          marginTop: 22, border: `1px solid ${T.rule}`, borderRadius: 3,
          background: T.panel, padding: "13px 15px 15px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: T.amber, flex: "0 0 auto",
            }} />
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.16em",
              textTransform: "uppercase", color: T.amber,
            }}>Coming soon</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {PLANNED.map(([title, blurb]) => (
              <li key={title} style={{
                display: "grid", gridTemplateColumns: "minmax(0,150px) minmax(0,1fr)",
                gap: 12, alignItems: "baseline",
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: T.text }}>{title}</span>
                <span style={{ fontSize: 12, color: T.dim, lineHeight: 1.55 }}>{blurb}</span>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ margin: "20px 0 0", fontSize: 12.5, color: T.dim, lineHeight: 1.6 }}>
          Until then — the <Link className="ab-link" to="/tutorial">tutorial</Link> covers the
          theory, and the <Link className="ab-link" to="/playground">playground</Link> is the
          fastest way to check your own hand-worked numbers.
        </p>
      </div>
    </Page>
  );
}
