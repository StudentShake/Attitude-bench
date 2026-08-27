import { useState } from "react";
import { useTheme } from "../lib/theme.js";

/* ============================================================================
   SPOILER
   Blurs a panel's values until you ask for them, and re-hides whenever
   `resetKey` changes — so working a problem by hand never leaks the answer
   from the panel you are checking against.
   ========================================================================== */

export default function Spoiler({ hidden, resetKey, children }) {
  const T = useTheme();
  const [revealed, setRevealed] = useState(false);

  // Re-hide on a new resetKey. Adjusting during render rather than in an
  // effect: React re-runs this component before committing, so the answer is
  // never painted for a frame between the attitude changing and the re-hide.
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setRevealed(false);
  }

  if (!hidden || revealed) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {/* inert while covered: no tabbing or typing into fields you cannot read */}
      <div aria-hidden="true" style={{
        filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.8,
      }}>
        {children}
      </div>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", padding: 0, cursor: "pointer",
        }}
      >
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.14em",
          textTransform: "uppercase", color: T.live,
          background: T.panelHi, border: `1px solid ${T.rule}`,
          borderRadius: 2, padding: "5px 11px",
        }}>
          click to reveal
        </span>
      </button>
    </div>
  );
}
