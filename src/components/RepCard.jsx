import { Eye, EyeOff } from "./Icons.jsx";

const Chevron = ({ open }) => (
  <svg className={`rep-chev${open ? " open" : ""}`} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * A card for one representation. Its colour comes from the representation.
 * With onToggle, the badge and title become a dropdown: closing the card keeps its header.
 */
export function RepCard({ rep, symbol, title, note, hidden, onHide, children, extra, open = true, onToggle }) {
  const head = (
    <>
      <span className="rep-badge">{symbol}{onToggle && <Chevron open={open} />}</span>
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        <h3>{title}</h3>
        {note && open && <div className="rep-note">{note}</div>}
      </div>
    </>
  );
  return (
    <section className={`rep card${open ? "" : " closed"}`} style={{ "--c": `var(--${rep})` }}>
      <header className="rep-head">
        {onToggle ? (
          <button type="button" className="rep-toggle" aria-expanded={open} onClick={onToggle}
            title={open ? `Fold up the ${title.toLowerCase()} card` : `Open the ${title.toLowerCase()} card`}>
            {head}
          </button>
        ) : head}
        {onHide && open && (
          <button type="button" className={`hide-btn${hidden ? " on" : ""}`} aria-pressed={hidden}
            onClick={() => onHide(!hidden)} title={hidden ? "Show the numbers" : "Hide the numbers and quiz yourself"}>
            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            <span>{hidden ? "Hidden" : "Hide"}</span>
          </button>
        )}
      </header>
      {open && <div className="rep-body">{children}</div>}
      {open && extra}
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
