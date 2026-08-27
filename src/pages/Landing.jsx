import React from "react";
import { Link } from "react-router-dom";
import { T } from "../lib/theme.js";
import { Page, Eyebrow } from "../components/SiteChrome.jsx";

const CARDS = [
  {
    to: "/tutorial",
    kicker: "01",
    title: "Tutorial",
    blurb:
      "Work up from what attitude even is to the six ways of writing one down — what each representation buys you, and where each one breaks.",
    lede: "Start here",
    tone: T.live,
    ready: true,
  },
  {
    to: "/playground",
    kicker: "02",
    title: "Playground",
    blurb:
      "One orientation, six coordinate sets, all live. Drag the spacecraft or type into any panel and watch the rest follow.",
    lede: "Open the bench",
    tone: T.amber,
    ready: true,
  },
  {
    to: "/test-prep",
    kicker: "03",
    title: "Test Prep",
    blurb:
      "Generated problems with worked solutions — conversions, sequences, gimbal lock, and the sign conventions that cost the most marks.",
    lede: "Coming soon",
    tone: T.faint,
    ready: false,
  },
];

function Card({ c }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Link
      to={c.to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: "none", color: "inherit", display: "flex",
        flexDirection: "column", minHeight: 176,
        background: hover ? T.panelHi : T.panel,
        border: `1px solid ${hover ? c.tone : T.rule}`,
        borderRadius: 3, padding: "15px 16px 16px",
        transition: "background .14s ease, border-color .14s ease, transform .14s ease",
        transform: hover ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
      }}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em" }}>
          {c.title}
        </h2>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.faint }}>{c.kicker}</span>
      </div>
      <p style={{
        margin: "9px 0 0", fontSize: 12.5, color: T.dim, lineHeight: 1.62, flex: 1,
      }}>{c.blurb}</p>
      <div style={{
        marginTop: 14, fontFamily: "var(--mono)", fontSize: 11,
        color: c.ready ? c.tone : T.faint,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {c.lede}
        {c.ready && <span style={{ transform: hover ? "translateX(3px)" : "none", transition: "transform .14s ease" }}>→</span>}
      </div>
    </Link>
  );
}

export default function Landing() {
  return (
    <Page>
      <style>{`
        .lp-cards { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 880px) { .lp-cards { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <header style={{ padding: "34px 0 30px", maxWidth: 660 }}>
          <Eyebrow>Spacecraft attitude · ADCS fundamentals</Eyebrow>
          <h1 style={{
            margin: 0, fontSize: 38, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.03em",
          }}>
            Where is the spacecraft{" "}
            <span style={{ color: T.live }}>pointing</span>?
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: 14, color: T.dim, lineHeight: 1.65 }}>
            Attitude is the orientation of a body-fixed frame relative to a reference frame — one
            fact about a spacecraft, written six different ways. Learn the representations, then
            drive them all at once and watch what each one does well and where it falls apart.
          </p>
        </header>

        <div className="lp-cards">
          {CARDS.map((c) => <Card key={c.to} c={c} />)}
        </div>

        <p style={{
          margin: "26px 0 0", fontSize: 10.5, color: T.faint, fontFamily: "var(--mono)",
          lineHeight: 1.6, maxWidth: 760,
        }}>
          Conventions throughout: C maps inertial → body · quaternions scalar-first, same sense ·
          Euler sequences intrinsic · conversions verified by 13,316 round-trip assertions.
        </p>
      </div>
    </Page>
  );
}
