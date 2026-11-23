import { NavLink, Link } from "react-router-dom";
import { useThemeControls } from "../lib/theme.js";
import { Sun, Moon, Mark } from "./Icons.jsx";

const SECTIONS = [
  { to: "/tutorial", label: "Tutorial" },
  { to: "/playground", label: "Playground" },
  { to: "/test-prep", label: "Test Prep" },
];

export function ThemeToggle() {
  const { mode, toggle } = useThemeControls();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <button type="button" className="icon-btn" onClick={toggle}
      aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function SiteNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link to="/" className="brand" aria-label="Attitude Bench home">
          <Mark />
          <span className="brand-word">Attitude Bench</span>
        </Link>
        <div className="nav-links">
          {SECTIONS.map((s) => (
            <NavLink key={s.to} to={s.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              {s.label}
            </NavLink>
          ))}
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}

export function Page({ children }) {
  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <SiteNav />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      <footer className="wrap faint tiny" style={{ padding: "28px 20px 34px" }}>
        Built for AE 426 at Embry-Riddle. Notation follows Prof. Lovell&apos;s slides and Curtis.
      </footer>
    </div>
  );
}
