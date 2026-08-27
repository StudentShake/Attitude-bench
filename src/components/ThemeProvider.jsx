import { useState, useEffect, useMemo, useCallback } from "react";
import { ThemeContext, THEMES, DEFAULT_THEME, THEME_KEY, MODE } from "../lib/theme.js";

/* ============================================================================
   THEME PROVIDER
   Holds the active palette name, persists it, and keeps <body> in step so the
   overscroll gutter and the native form controls match the page.
   ========================================================================== */

function storedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved && THEMES[saved] ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // storage blocked (private mode, embedded frame)
  }
}

export default function ThemeProvider({ children }) {
  const [name, setName] = useState(storedTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch {
      /* not persisting is survivable; the session still themes correctly */
    }
    const t = THEMES[name];
    document.documentElement.style.colorScheme = MODE[name];
    document.body.style.background = t.deep;
    document.body.style.color = t.text;
  }, [name]);

  const setTheme = useCallback((next) => {
    if (THEMES[next]) setName(next);
  }, []);

  const value = useMemo(() => ({ name, T: THEMES[name], setTheme }), [name, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
