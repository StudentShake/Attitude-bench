import { NavLink, Link } from "react-router-dom";
import { MONO, SANS, THEMES, THEME_LIST, useTheme, useThemeControls } from "../lib/theme.js";

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

/** Four swatches: the palette's own panel, rule and accent, drawn in itself. */
export function ThemeSwitcher() {
  const { name, setTheme } = useThemeControls();
  const T = useTheme();

  return (
    <div role="group" aria-label="Colour theme" style={{ display: "flex", gap: 3 }}>
      {THEME_LIST.map((t) => {
        const active = t.name === name;
        // the swatch is drawn in its OWN palette, not the active one
        const own = THEMES[t.name];
        return (
          <button
            key={t.name}
            type="button"
            onClick={() => setTheme(t.name)}
            title={t.label}
            aria-pressed={active}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 7px", borderRadius: 2, cursor: "pointer",
              background: active ? T.panel : "transparent",
              border: `1px solid ${active ? T.rule : "transparent"}`,
              color: active ? T.text : T.dim,
              fontFamily: "var(--sans)", fontSize: 11,
            }}
          >
            <span aria-hidden="true" style={{
              width: 11, height: 11, borderRadius: 2, flex: "0 0 auto",
              background: `linear-gradient(135deg, ${own.panel} 0 50%, ${own.live} 50% 100%)`,
              border: `1px solid ${own.rule}`,
              boxShadow: active ? `0 0 0 1px ${T.live}` : "none",
            }} />
            <span className="thm-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SiteNav() {
  const T = useTheme();
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
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
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
        <ThemeSwitcher />
      </div>
    </nav>
  );
}

/** Outer shell: tokens, global rules, optional nav. */
export function Page({ children, nav = true, pad = true }) {
  const T = useTheme();
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
        @media (max-width: 700px) { .thm-label { display: none; } }
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
  const T = useTheme();
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em",
      textTransform: "uppercase", color: color || T.dim, marginBottom: 8,
    }}>{children}</div>
  );
}
