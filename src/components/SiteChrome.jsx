import { NavLink, Link } from "react-router-dom";
import { T, MONO, SANS } from "../lib/theme.js";

/* ============================================================================
   SITE CHROME
   Every page sits inside <Page>, so the tokens, type stack and focus rings
   are declared exactly once.
   ========================================================================== */

const SECTIONS = [
  { to: "/tutorial", label: "Tutorial" },
  { to: "/playground", label: "Playground" },
  { to: "/test-prep", label: "Test Prep" },
];

export function SiteNav() {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap",
      padding: "11px 20px", borderBottom: `1px solid ${T.rule}`,
      background: T.deep, position: "sticky", top: 0, zIndex: 20,
    }}>
      <Link to="/" style={{
        textDecoration: "none", color: T.text, fontSize: 13, fontWeight: 600,
        letterSpacing: "-0.01em", display: "flex", alignItems: "baseline", gap: 7,
      }}>
        Attitude Bench
        <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: T.faint, letterSpacing: "0.14em" }}>
          ADCS
        </span>
      </Link>
      <div style={{ display: "flex", gap: 4 }}>
        {SECTIONS.map((s) => (
          <NavLink key={s.to} to={s.to} style={({ isActive }) => ({
            textDecoration: "none", fontSize: 11.5, padding: "5px 10px", borderRadius: 2,
            border: `1px solid ${isActive ? T.rule : "transparent"}`,
            background: isActive ? T.panel : "transparent",
            color: isActive ? T.live : T.dim,
          })}>{s.label}</NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Outer shell: tokens, global rules, optional nav. */
export function Page({ children, nav = true, pad = true }) {
  return (
    <div style={{
      "--mono": MONO, "--sans": SANS,
      background: T.deep, color: T.text, fontFamily: "var(--sans)",
      minHeight: "100svh", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible {
          outline: 2px solid ${T.live}; outline-offset: 1px;
        }
        .ab-link { color: ${T.live}; text-decoration: none; border-bottom: 1px solid ${T.rule}; }
        .ab-link:hover { border-bottom-color: ${T.live}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>
      {nav && <SiteNav />}
      <main style={{ flex: 1, minHeight: 0, padding: pad ? "26px 20px 40px" : 0 }}>
        {children}
      </main>
    </div>
  );
}

/** Section heading used across tutorial + static pages. */
export function Eyebrow({ children, color }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em",
      textTransform: "uppercase", color: color || T.dim, marginBottom: 8,
    }}>{children}</div>
  );
}
