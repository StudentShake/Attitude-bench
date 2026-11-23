import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import Viewport from "../../components/Viewport.jsx";

/* Building blocks shared by the chapters. */

export function Fig({ children, caption, wide }) {
  return (
    <figure className={`fig${wide ? " wide" : ""}`}>
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Inline math in the slides' italic serif. */
export const M = ({ children }) => <span className="m">{children}</span>;

/** A bracketed matrix. `color(r, c)` can tint cells. */
/** "u_x²(1−cθ)" -> u<sub>x</sub>²(1−cθ) */
function sym(str) {
  const parts = str.split(/_([xyz0-9])/);
  return parts.map((p, i) => (i % 2 ? <sub key={i}>{p}</sub> : p));
}

export function Mat({ rows, digits = 4, color, size }) {
  const symbolic = typeof rows[0][0] === "string";
  const fmt = (v) => {
    if (typeof v === "string") return sym(v);
    const s = v.toFixed(digits);
    return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
  };
  return (
    <span className={`mat${symbolic ? " sym" : ""}`} style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)`, fontSize: size }}>
      {rows.flatMap((row, r) => row.map((v, c) => (
        <span key={`${r}-${c}`} style={color ? { color: color(r, c) } : undefined}>{fmt(v)}</span>
      )))}
    </span>
  );
}

/** A boxed note whose title is the question people actually ask. */
export function Ask({ q, children, tone = "primary" }) {
  return (
    <aside className="ask" style={{ "--c": `var(--${tone})` }}>
      <div className="ask-q">{q}</div>
      <div>{children}</div>
    </aside>
  );
}

/** A 3D scene sized for reading. */
export function Scene({ height = 380, children, ...props }) {
  return (
    <div className="scene" style={{ height: `clamp(280px, 52vw, ${height}px)` }}>
      <Viewport {...props} />
      {children}
    </div>
  );
}

/** One displayed equation line. */
export const Eq = ({ children }) => <div className="eq">{children}</div>;

/** KaTeX. Pass a TeX string as the child. `block` centres it on its own line. */
export function TeX({ children, block, tint }) {
  const src = Array.isArray(children) ? children.join("") : String(children);
  const html = useMemo(
    () => katex.renderToString(src, { displayMode: !!block, throwOnError: false, strict: false, trust: false }),
    [src, block],
  );
  if (block) return <div className={`eq tex${tint ? "" : ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
  return <span className="tex-i" dangerouslySetInnerHTML={{ __html: html }} />;
}
