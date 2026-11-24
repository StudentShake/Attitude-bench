import { useMemo, useState } from "react";
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
    () => katex.renderToString(src, { displayMode: !!block, throwOnError: false, strict: false, trust: (c) => c.command === "\\htmlClass" }),
    [src, block],
  );
  if (block) return <div className={`eq tex${tint ? "" : ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
  return <span className="tex-i" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * A derivation as a flowchart. Each step is a box; the arrow into it carries
 * the rule that was applied. Hover or tap a rule and the terms it talks about
 * light up in the boxes above and below (mark them in TeX with \\htmlClass{m-a}{…}).
 * steps: [{ tex, rule?, marks?: ["a", "b"] }]
 */
export function MathFlow({ steps, tone = "primary", reveal = true }) {
  const [k, setK] = useState(reveal ? 1 : steps.length);
  const [hl, setHl] = useState(null);
  const shown = steps.slice(0, k);
  return (
    <div className={`mflow${hl ? hl.map((m) => ` hl-${m}`).join("") : ""}`} style={{ "--c": `var(--${tone})` }}>
      {shown.map((st, i) => (
        <div key={i} className="rise">
          {i > 0 && (
            <div className="mflow-link">
              <span className="mflow-arrow" aria-hidden="true" />
              {st.rule && (
                <button type="button" className={`mflow-rule${hl === st.marks ? " on" : ""}`}
                  onMouseEnter={() => setHl(st.marks || null)} onMouseLeave={() => setHl(null)}
                  onFocus={() => setHl(st.marks || null)} onBlur={() => setHl(null)}
                  onClick={() => setHl((h) => (h === st.marks ? null : st.marks || null))}>
                  {st.rule}
                </button>
              )}
            </div>
          )}
          <div className="mflow-node"><TeX block>{st.tex}</TeX></div>
        </div>
      ))}
      {reveal && (
        <div className="mstep-ctl">
          <button type="button" className="btn sm" disabled={k <= 1} onClick={() => setK(k - 1)}>Back</button>
          <button type="button" className="btn sm primary" disabled={k >= steps.length} onClick={() => setK(k + 1)}>
            Next step ({k}/{steps.length})
          </button>
          <button type="button" className="btn sm" disabled={k >= steps.length} onClick={() => setK(steps.length)}>Show all</button>
        </div>
      )}
    </div>
  );
}

/** A small colour key drawn inside an SVG, for pictures where labels on the lines would crowd. */
export function SvgKey({ x = 10, y = 18, items, text }) {
  return (
    <g fontFamily="var(--sans)" fontSize="13" fontWeight="800">
      {items.map((it, i) => (
        <g key={it.label} transform={`translate(${x} ${y + i * 20})`}>
          <line x1="0" y1="-4" x2="20" y2="-4" stroke={it.color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={it.dash || undefined} />
          <text x="27" y="0" fill={text || it.color}>{it.label}</text>
        </g>
      ))}
    </g>
  );
}

/* "Why tan⁻¹ can be 180° off" → "why-tan-1-can-be-180-off" */
const GREEK = { θ: "theta", φ: "phi", α: "alpha", β: "beta", γ: "gamma", "−": " minus " };
const slugify = (text) => String(text).replace(/[θφαβγ−]/g, (ch) => ` ${GREEK[ch]} `).normalize("NFKD")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** A section heading with its own link, so a section can be sent to someone. */
export function H2({ id, children }) {
  const slug = id || slugify(children);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${slug}`;
    window.history.replaceState(window.history.state, "", `#${slug}`);
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy this link:", url); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <h2 id={slug} className="anchored">
      {children}
      <button type="button" className="h-link" onClick={copy} aria-label="Copy a link to this section" title="Copy a link to this section">#</button>
      {copied && <span className="h-copied">Link copied</span>}
    </h2>
  );
}
