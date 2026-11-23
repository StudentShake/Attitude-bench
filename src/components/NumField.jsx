import { useState } from "react";

/** Number input that only commits on Enter or blur, so typing "-0." isn't fought. */
export default function NumField({ value, onCommit, color, label, suffix, style }) {
  const [draft, setDraft] = useState(null);
  const shown = draft !== null ? draft : value;
  const commit = () => {
    if (draft === null) return;
    const v = parseFloat(String(draft).replace("−", "-"));
    setDraft(null);
    if (isFinite(v)) onCommit(v);
  };
  return (
    <span style={{ position: "relative", display: "block", ...style }}>
      <input
        className={`field${draft !== null ? " draft" : ""}`}
        style={{ "--c": color, color: color ? `color-mix(in srgb, ${color} 75%, var(--text))` : undefined, paddingRight: suffix ? 22 : undefined }}
        value={shown}
        inputMode="decimal"
        aria-label={label}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setDraft(null); e.currentTarget.blur(); }
        }}
      />
      {suffix && (
        <span aria-hidden="true" style={{
          position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
          fontFamily: "var(--mono)", fontSize: 14, color: "var(--faint)", pointerEvents: "none",
        }}>{suffix}</span>
      )}
    </span>
  );
}
