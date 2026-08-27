import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { T } from "../../lib/theme.js";
import { Page } from "../../components/SiteChrome.jsx";
import { CHAPTERS, chapterBySlug, neighbours } from "./chapters.js";

/* ============================================================================
   TUTORIAL SHELL
   Sidebar + chapter body + prev/next. Later chapters slot straight into the
   <Outlet /> — nothing here needs to change but chapters.js.
   ========================================================================== */

function ChapterLink({ c }) {
  const row = (extra) => ({
    display: "grid", gridTemplateColumns: "22px minmax(0,1fr)", gap: 8,
    padding: "8px 9px", borderRadius: 2, textDecoration: "none",
    border: "1px solid transparent", ...extra,
  });

  if (!c.ready) {
    return (
      <div style={row({ cursor: "not-allowed", opacity: 0.55 })} title="Not written yet">
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: T.faint }}>
          {String(c.n).padStart(2, "0")}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ fontSize: 12, color: T.faint, display: "block" }}>{c.title}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: T.faint }}>soon</span>
        </span>
      </div>
    );
  }

  return (
    <NavLink to={`/tutorial/${c.slug}`} style={({ isActive }) => row({
      background: isActive ? T.panelHi : "transparent",
      borderColor: isActive ? T.rule : "transparent",
    })}>
      {({ isActive }) => (
        <>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10.5, color: isActive ? T.live : T.faint,
          }}>{String(c.n).padStart(2, "0")}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{
              fontSize: 12, color: isActive ? T.text : T.dim, display: "block", lineHeight: 1.35,
            }}>{c.title}</span>
            {isActive && (
              <span style={{ fontSize: 10.5, color: T.dim, display: "block", marginTop: 3, lineHeight: 1.45 }}>
                {c.blurb}
              </span>
            )}
          </span>
        </>
      )}
    </NavLink>
  );
}

function FootLink({ c, dir }) {
  const label = dir === "prev" ? "← Previous" : "Next →";
  if (!c) return <span />;
  const inner = (
    <>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.faint, display: "block" }}>
        {label}
      </span>
      <span style={{ fontSize: 12.5, color: c.ready ? T.text : T.faint }}>
        {c.title}{!c.ready && " · soon"}
      </span>
    </>
  );
  const box = {
    display: "block", padding: "9px 12px", borderRadius: 2,
    border: `1px solid ${T.rule}`, background: T.panel, textDecoration: "none",
    textAlign: dir === "prev" ? "left" : "right", maxWidth: 260,
  };
  return c.ready
    ? <Link to={`/tutorial/${c.slug}`} style={box}>{inner}</Link>
    : <div style={{ ...box, opacity: 0.55, cursor: "not-allowed" }}>{inner}</div>;
}

/** Placeholder body for a chapter slug that has no component yet. */
export function ChapterStub() {
  const slug = useLocation().pathname.split("/").filter(Boolean).pop();
  const c = chapterBySlug(slug);
  return (
    <article style={{ maxWidth: 720 }}>
      <h1 style={{
        margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1.15,
        color: c ? T.text : T.dim,
      }}>{c ? c.title : "Chapter not found"}</h1>
      <p style={{ margin: "12px 0 0", fontSize: 14, color: T.dim, lineHeight: 1.68 }}>
        {c ? c.blurb : "Nothing lives at this address yet."}
      </p>
      <div style={{
        marginTop: 20, border: `1px solid ${T.rule}`, borderRadius: 3, background: T.panel,
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 9,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.amber }} />
        <span style={{ fontSize: 12.5, color: T.dim }}>
          Not written yet. Chapter 1 is up — or take the{" "}
          <Link className="ab-link" to="/playground">playground</Link> for a run.
        </span>
      </div>
    </article>
  );
}

export default function TutorialLayout() {
  const slug = useLocation().pathname.split("/").filter(Boolean).pop();
  const current = chapterBySlug(slug);
  const { prev, next } = neighbours(slug);

  return (
    <Page pad={false}>
      <style>{`
        .tut-grid {
          display: grid; gap: 22px; align-items: start;
          grid-template-columns: 232px minmax(0, 1fr);
          max-width: 1080px; margin: 0 auto; width: 100%;
          padding: 24px 20px 44px;
        }
        .tut-aside { position: sticky; top: 62px; }
        @media (max-width: 860px) {
          .tut-grid { grid-template-columns: 1fr; }
          .tut-aside { position: static; }
        }
      `}</style>

      <div className="tut-grid">
        <aside className="tut-aside">
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em",
            textTransform: "uppercase", color: T.dim, padding: "0 9px 8px",
          }}>Chapters</div>
          <nav style={{
            border: `1px solid ${T.rule}`, borderRadius: 3, background: T.panel, padding: 5,
            display: "grid", gap: 2,
          }}>
            {CHAPTERS.map((c) => <ChapterLink key={c.slug} c={c} />)}
          </nav>
        </aside>

        <div style={{ minWidth: 0 }}>
          {current && (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: T.live, marginBottom: 8,
            }}>
              Chapter {String(current.n).padStart(2, "0")}
            </div>
          )}

          <Outlet />

          <div style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            marginTop: 30, paddingTop: 18, borderTop: `1px solid ${T.rule}`,
          }}>
            <FootLink c={prev} dir="prev" />
            <FootLink c={next} dir="next" />
          </div>
        </div>
      </div>
    </Page>
  );
}
