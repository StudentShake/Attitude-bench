import { createContext, useContext } from "react";

/* Two palettes, one shape. CSS reads the same values as custom properties
   (set by ThemeProvider); Three.js and inline SVG read them from useTheme(). */

const shared = {
  // one colour per representation, used in 3D, cards, tutorial and practice
  rep: null,
  axis: null,
};

export const DARK = {
  ...shared,
  mode: "dark",
  bg: "#0D1322",
  bg2: "#111A2E",
  card: "#16203A",
  cardHi: "#1E2A48",
  line: "#2A3858",
  text: "#EEF2FA",
  dim: "#A6B1CB",
  faint: "#6D7A99",
  scene: "#0A1020",
  sceneEdge: "#16213B",
  primary: "#FFC53D",
  onPrimary: "#1A1405",
  axis: ["#FF6B6B", "#4ADE80", "#5FA8FF"],
  rep: { dcm: "#B197FC", euler: "#3BD5F0", sar: "#FFC53D", quat: "#F783C6" },
  inertial: "#8C97B5",
  craft: { bus: 0xd9a441, foil: 0xb07d22, panel: 0x2852a8, frame: 0xc9d2e3, dish: 0xeef2f8 },
};

export const LIGHT = {
  ...shared,
  mode: "light",
  bg: "#FBF8F2",
  bg2: "#F5F0E7",
  card: "#FFFFFF",
  cardHi: "#F6F1E8",
  line: "#E7DFD2",
  text: "#1B2133",
  dim: "#566079",
  faint: "#949BAD",
  scene: "#EEF2F9",
  sceneEdge: "#DCE3EF",
  primary: "#F5B301",
  onPrimary: "#1B1404",
  axis: ["#E5484D", "#16A05A", "#2F6FEB"],
  rep: { dcm: "#7B57F5", euler: "#0B9DBA", sar: "#D48A00", quat: "#D6337F" },
  inertial: "#7D869C",
  craft: { bus: 0xd8a23a, foil: 0xa8741c, panel: 0x2852a8, frame: 0xb9c3d6, dish: 0xffffff },
};

export const THEMES = { dark: DARK, light: LIGHT };
export const THEME_KEY = "attitude-bench:theme";

/** Older builds stored one of four palette names. Map them onto the two left. */
export const LEGACY = { obsidian: "dark", slate: "dark", daylight: "light", sepia: "light" };

export const ThemeContext = createContext({ mode: "dark", T: DARK, toggle: () => {} });

/** Token object for the active theme. */
export function useTheme() {
  return useContext(ThemeContext).T;
}

/** Mode + toggle + tokens. */
export function useThemeControls() {
  return useContext(ThemeContext);
}

export const AXIS_NAME = ["x", "y", "z"];

/** Representation metadata, in the order the course teaches them. */
export const REPS = [
  { key: "dcm", name: "DCM", symbol: "[Q]", long: "Direction cosine matrix", count: 9 },
  { key: "euler", name: "Euler angles", symbol: "α β γ", long: "Euler angles", count: 3 },
  { key: "sar", name: "SAR", symbol: "û, θ", long: "Single-axis rotation", count: 4 },
  { key: "quat", name: "Quaternion", symbol: "q", long: "Quaternion", count: 4 },
];
