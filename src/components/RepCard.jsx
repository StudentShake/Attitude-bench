import { Eye, EyeOff } from "./Icons.jsx";

/** A card for one representation. Its colour comes from the representation. */
export function RepCard({ rep, symbol, title, note, hidden, onHide, children, extra }) {
  return (
    <section className="rep card" style={{ "--c": `var(--${rep})` }}>
      <header className="rep-head">
        <span className="rep-badge">{symbol}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3>{title}</h3>
          {note && <div className="rep-note">{note}</div>}
        </div>
        {onHide && (
          <button type="button" className={`hide-btn${hidden ? " on" : ""}`} aria-pressed={hidden}
            onClick={() => onHide(!hidden)} title={hidden ? "Show the numbers" : "Hide the numbers and quiz yourself"}>
            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            <span>{hidden ? "Hidden" : "Hide"}</span>
          </button>
        )}
      </header>
      <div className="rep-body">{children}</div>
      {extra}
    </section>
  );
}

export function Label({ children, color }) {
  return (
    <div className="lbl" style={color ? { color: `color-mix(in srgb, ${color} 80%, var(--text))` } : undefined}>
      {children}
    </div>
  );
}
