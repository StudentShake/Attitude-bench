/* Small illustrations, one per representation. Drawn from CSS variables so
   they follow the theme. Each is decorative; the text next to it carries the meaning. */

export function DcmGlyph({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 8h-4v48h4M54 8h4v48h-4" fill="none" stroke="var(--dcm)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <circle key={`${r}${c}`} cx={18 + c * 14} cy={18 + r * 14} r={r === c ? 5 : 4} fill={`var(--ax${r})`} opacity={r === c ? 1 : 0.55} />
      )))}
    </svg>
  );
}

export function EulerGlyph({ size = 64 }) {
  const arc = (cx, cy, col) => (
    <g>
      <path d={`M${cx - 9} ${cy + 5} A 10 10 0 1 1 ${cx + 9} ${cy + 5}`} fill="none" stroke={col} strokeWidth="3.2" strokeLinecap="round" />
      <path d={`M${cx + 9} ${cy + 5} l 1 -7 M${cx + 9} ${cy + 5} l -6 -2`} stroke={col} strokeWidth="3.2" strokeLinecap="round" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {arc(14, 40, "var(--ax2)")}
      {arc(32, 24, "var(--ax1)")}
      {arc(50, 40, "var(--ax0)")}
    </svg>
  );
}

export function SarGlyph({ size = 64 }) {
  // an ellipse around the axis, swept 250°, with the head on the end pointing along the sweep
  const cx = 32, cy = 34, rx = 18, ry = 7, rot = -24 * Math.PI / 180;
  const P = (t) => {
    const x = rx * Math.cos(t), y = ry * Math.sin(t);
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  };
  const t0 = 0.55 * Math.PI, t1 = t0 + (250 * Math.PI) / 180;
  const pts = Array.from({ length: 41 }, (_, i) => P(t0 + ((t1 - t0) * i) / 40));
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const [ex, ey] = pts[40], [px, py] = pts[37];
  const ang = (Math.atan2(ey - py, ex - px) * 180) / Math.PI;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M21 58L43 8" stroke="var(--sar)" strokeWidth="3.4" strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--sar)" strokeWidth="3" strokeLinecap="round" />
      <polygon points="0,-5 9,0 0,5" fill="var(--sar)" transform={`translate(${ex.toFixed(2)} ${ey.toFixed(2)}) rotate(${ang.toFixed(1)})`} />
      <circle cx="43" cy="8" r="3.5" fill="var(--sar)" />
    </svg>
  );
}

export function QuatGlyph({ size = 64 }) {
  const v = [0.35, -0.6, 0.45, 0.9];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <line x1="6" y1="32" x2="58" y2="32" stroke="var(--faint)" strokeWidth="1.5" strokeDasharray="2 3" />
      {v.map((x, i) => (
        <rect key={i} x={9 + i * 12.5} width="9" rx="3"
          y={x > 0 ? 32 - x * 24 : 32} height={Math.abs(x) * 24}
          fill={i < 3 ? `var(--ax${i})` : "var(--quat)"} />
      ))}
    </svg>
  );
}
