import { useState } from "react";

/**
 * Blurs its children until tapped, and hides them again whenever `resetKey`
 * changes, so working a problem by hand never leaks the answer.
 */
export default function Spoiler({ hidden, resetKey, children }) {
  const [revealed, setRevealed] = useState(false);
  // re-hide during render, so the answer never paints for a frame
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setRevealed(false);
  }

  if (!hidden || revealed) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" inert style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none", opacity: 0.75 }}>
        {children}
      </div>
      <button type="button" onClick={() => setRevealed(true)} style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        background: "transparent", border: "none", cursor: "pointer",
      }}>
        <span className="chip" style={{ "--c": "var(--c)", fontSize: 14, padding: "6px 14px", background: "var(--card)", boxShadow: "var(--shadow)" }}>
          Tap to check your answer
        </span>
      </button>
    </div>
  );
}
