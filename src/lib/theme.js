import { createContext, useContext } from "react";

/* ============================================================================
   DESIGN TOKENS
   Four palettes, one shape. Every colour the site draws comes from the token
   object handed out by useTheme() — nothing reads a palette directly, so
   adding a fifth theme means adding it here and nowhere else.
   ========================================================================== */

/** The original dark theme. */
export const OBSIDIAN = {
  deep: "#0B1016",
  panel: "#121B24",
  panelHi: "#18242F",
  rule: "#233240",
  text: "#CFDBE4",
  dim: "#6E828F",
  faint: "#3F5361",
  amber: "#E9A13B",
  live: "#67E8DC",
  axis: ["#FF5D6C", "#4FD98A", "#5C93FF"],
};

export const DAYLIGHT = {
  deep: "#F7F8FA",
  panel: "#FFFFFF",
  panelHi: "#EEF1F4",
  rule: "#D8DEE4",
  text: "#1B2530",
  dim: "#5B6B78",
  faint: "#8FA0AC",
  amber: "#C97A1E",
  live: "#0E8C82",
  axis: ["#D1394A", "#1F9A57", "#2F5FD1"],
};

export const SLATE = {
  deep: "#0D1420",
  panel: "#131C2B",
  panelHi: "#1B2740",
  rule: "#2A3A52",
  text: "#D7E1EC",
  dim: "#7488A0",
  faint: "#405872",
  amber: "#F2B84B",
  live: "#59C4F5",
  axis: ["#FF6F91", "#57D9A3", "#7FA8FF"],
};

export const SEPIA = {
  deep: "#EFE7D8",
  panel: "#FBF7EE",
  panelHi: "#F2EADB",
  rule: "#DCCFB4",
  text: "#2C2417",
  dim: "#756B57",
  faint: "#A5987C",
  amber: "#B5651D",
  live: "#1E7A72",
  axis: ["#B23A48", "#3D7A45", "#35538F"],
};

export const THEMES = { obsidian: OBSIDIAN, daylight: DAYLIGHT, slate: SLATE, sepia: SEPIA };

export const DEFAULT_THEME = "obsidian";
export const THEME_KEY = "attitude-bench:theme";

/**
 * Per-theme facts that are not colour tokens: `mode` drives the browser's
 * color-scheme (form controls, scrollbars), `scene` is the flat backdrop
 * behind the 3D viewport, which needs to sit a shade beyond `deep`.
 */
export const THEME_LIST = [
  { name: "obsidian", label: "Obsidian", mode: "dark", scene: "#080D12" },
  { name: "daylight", label: "Daylight", mode: "light", scene: "#E9EDF2" },
  { name: "slate", label: "Slate", mode: "dark", scene: "#080E17" },
  { name: "sepia", label: "Sepia", mode: "light", scene: "#E4DAC5" },
];

const byName = Object.fromEntries(THEME_LIST.map((t) => [t.name, t]));

export const MODE = Object.fromEntries(THEME_LIST.map((t) => [t.name, t.mode]));
export const SCENE_BG = Object.fromEntries(THEME_LIST.map((t) => [t.name, t.scene]));

export const isLight = (name) => byName[name]?.mode === "light";

/* ---------- context ---------- */

export const ThemeContext = createContext({
  name: DEFAULT_THEME,
  T: THEMES[DEFAULT_THEME],
  setTheme: () => {},
});

/** The token object for the active theme — what nearly every component wants. */
export function useTheme() {
  return useContext(ThemeContext).T;
}

/** Name + setter + tokens, for the switcher and the two scene backdrops. */
export function useThemeControls() {
  return useContext(ThemeContext);
}

/* ---------- type ---------- */

export const AXIS_NAME = ["x", "y", "z"];

export const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const SANS = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";

/** Spread onto any root element that needs the type stack. */
export const FONT_VARS = { "--mono": MONO, "--sans": SANS };
