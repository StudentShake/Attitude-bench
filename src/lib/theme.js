/* ============================================================================
   DESIGN TOKENS
   Single source of truth for the whole site. AttitudeBench defined these
   first; every page imports them so nothing drifts.
   ========================================================================== */

export const T = {
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

export const AXIS_NAME = ["x", "y", "z"];

export const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const SANS = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";

/** Spread onto any root element that needs the type stack. */
export const FONT_VARS = { "--mono": MONO, "--sans": SANS };
