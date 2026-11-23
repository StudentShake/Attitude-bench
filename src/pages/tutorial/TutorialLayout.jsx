import { useEffect } from "react";
import { Routes, Route, Navigate, NavLink, Link, useParams, useLocation } from "react-router-dom";
import { Page } from "../../components/SiteChrome.jsx";
import { Arrow, Back } from "../../components/Icons.jsx";
import { CHAPTERS, chapterBySlug, neighbours } from "./chapters.js";
import Ch1 from "./Ch1Attitude.jsx";
import Ch2 from "./Ch2DCM.jsx";
import Ch3 from "./Ch3Euler.jsx";
import Ch4 from "./Ch4SAR.jsx";
import Ch5 from "./Ch5Quat.jsx";
import Ch6 from "./Ch6Convert.jsx";
import MathPage from "./MathPage.jsx";

const BODY = {
  "what-is-attitude": Ch1,
  "direction-cosine-matrix": Ch2,
  "euler-angles": Ch3,
  "single-axis-rotation": Ch4,
  quaternions: Ch5,
  converting: Ch6,
  "the-math": MathPage,
};

const col = (c) => `var(--${c.color})`;

function Sidebar() {
  const { pathname } = useLocation();
  // on phones the chapter list is a sideways strip; keep the current chapter in view
  useEffect(() => {
    const el = document.querySelector(".tut-side .chap.on");
    if (el && el.scrollIntoView && window.innerWidth <= 900) el.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  return (
    <nav className="tut-side" aria-label="Chapters">
      {CHAPTERS.map((c) => c.ready ? (
        <NavLink key={c.slug} to={`/tutorial/${c.slug}`} className={({ isActive }) => `chap${isActive ? " on" : ""}`}
          style={{ "--c": col(c) }}>
          <span className="chap-n">{c.n}</span>
          <span className="chap-t">{c.title}</span>
        </NavLink>
      ) : (
        <span key={c.slug} className="chap soon" title="Coming later">
          <span className="chap-n">{c.n}</span>
          <span className="chap-t">{c.title}<em>soon</em></span>
        </span>
      ))}
    </nav>
  );
}

function Chapter() {
  const { slug } = useParams();
  const c = chapterBySlug(slug);
  const Body = BODY[slug];
  const { prev, next } = neighbours(slug);
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0); }, [slug]);
  useEffect(() => {
    if (c) document.title = `${c.title} · Attitude Bench`;
    return () => { document.title = "Attitude Bench · spin a spacecraft, watch the math follow"; };
  }, [c]);

  if (!c || !Body) return <Navigate to="/tutorial" replace />;
  return (
    <article className="prose" style={{ "--c": col(c) }}>
      <h1>{c.title}</h1>
      <Body />
      <div className="tut-foot">
        {prev ? (
          <Link className="card foot-link" to={`/tutorial/${prev.slug}`} style={{ "--c": col(prev) }}>
            <Back size={18} /><span><span className="faint tiny">Back</span><br />{prev.title}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link className="card foot-link next" to={`/tutorial/${next.slug}`} style={{ "--c": col(next) }}>
            <span><span className="faint tiny">Next</span><br />{next.title}</span><Arrow size={18} />
          </Link>
        ) : (
          <Link className="card foot-link next" to="/test-prep" style={{ "--c": "var(--primary)" }}>
            <span><span className="faint tiny">Now try</span><br />Test Prep</span><Arrow size={18} />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function TutorialLayout() {
  return (
    <Page>
      <div className="wrap tut">
        <Sidebar />
        <div style={{ minWidth: 0 }}>
          <Routes>
            <Route index element={<Navigate to={CHAPTERS[0].slug} replace />} />
            <Route path=":slug" element={<Chapter />} />
          </Routes>
        </div>
      </div>
    </Page>
  );
}
