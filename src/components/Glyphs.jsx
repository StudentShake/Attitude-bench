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
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 56L44 8" stroke="var(--sar)" strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="32" cy="32" rx="19" ry="8" transform="rotate(-24 32 32)" fill="none" stroke="var(--sar)" strokeWidth="3" strokeDasharray="44 200" strokeLinecap="round" />
      <path d="M48 22l3 -6 m-3 6l-6 -1" stroke="var(--sar)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="44" cy="8" r="3.5" fill="var(--sar)" />
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
