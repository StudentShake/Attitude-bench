import { useState, useEffect, useMemo, useCallback } from "react";
import { ThemeContext, THEMES, THEME_KEY, LEGACY } from "../lib/theme.js";

function initialMode() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    if (saved && LEGACY[saved]) return LEGACY[saved];
  } catch {
    /* storage blocked; fall through to the OS preference */
  }
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Every token becomes a CSS custom property, so stylesheets and JS agree. */
function applyVars(T) {
  const r = document.documentElement;
  r.dataset.theme = T.mode;
  r.style.colorScheme = T.mode;
  const set = (k, v) => r.style.setProperty(k, v);
  ["bg", "bg2", "card", "cardHi", "line", "text", "dim", "faint", "scene", "sceneEdge",
    "primary", "onPrimary", "inertial"].forEach((k) => set(`--${k}`, T[k]));
  T.axis.forEach((c, i) => set(`--ax${i}`, c));
  Object.entries(T.rep).forEach(([k, c]) => set(`--${k}`, c));
}

export default function ThemeProvider({ children }) {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    applyVars(THEMES[mode]);
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* fine without it */ }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === "dark" ? "light" : "dark")), []);
  const value = useMemo(() => ({ mode, T: THEMES[mode], toggle }), [mode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
