import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { AXIS_NAME, SCENE_BG, useTheme, useThemeControls } from "../../lib/theme.js";
import { Viewport } from "../../components/AttitudeBench.jsx";
import { normalizeQuat, canonicalQuat, quatToAxisAngle, DEG } from "../../lib/attitude.js";

/* ============================================================================
   CHAPTER 1 — WHAT IS ATTITUDE?
   ========================================================================== */

const IDENTITY = [1, 0, 0, 0];
const TILTED = canonicalQuat(normalizeQuat([0.8446, 0.1913, 0.4619, 0.1913]));

function H2({ children }) {
  const T = useTheme();
  return (
    <h2 style={{
      margin: "34px 0 10px", fontSize: 17, fontWeight: 600,
      letterSpacing: "-0.015em", color: T.text,
    }}>{children}</h2>
  );
}

function P({ children, dim }) {
  const T = useTheme();
  return (
    <p style={{
      margin: "0 0 11px", fontSize: 13.5, lineHeight: 1.72, color: dim ? T.dim : T.text,
    }}>{children}</p>
  );
}

function Term({ children, color }) {
  const T = useTheme();
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: color || T.live }}>
      {children}
    </span>
  );
}

/* ---------- the live frame demo ---------- */

function FrameDemo() {
  const { name, T } = useThemeControls();
  const [quat, setQuat] = useState(TILTED);
  const [showInertial, setShowInertial] = useState(true);
  const [highlight, setHighlight] = useState(null);

  const onDrag = useCallback((dq) => {
    setQuat((prev) => {
      // the mesh carries body -> inertial, so it holds the conjugate of q
      const m = new THREE.Quaternion(-prev[1], -prev[2], -prev[3], prev[0]);
      const nm = dq.clone().multiply(m).normalize();
      return canonicalQuat([nm.w, -nm.x, -nm.y, -nm.z]);
    });
  }, []);

  const { angle } = quatToAxisAngle(quat);
  const atRest = Math.abs(angle) < 1e-3;

  return (
    <figure style={{ margin: "16px 0 4px" }}>
      <div style={{
        position: "relative", background: SCENE_BG[name], border: `1px solid ${T.rule}`,
        borderRadius: 3, height: "clamp(280px, 42vh, 400px)", overflow: "hidden",
      }}>
        <Viewport quat={quat} onDrag={onDrag} highlight={highlight} showInertial={showInertial} />

        <div style={{
          position: "absolute", left: 11, top: 10, display: "flex", flexDirection: "column",
          gap: 4, fontFamily: "var(--mono)", fontSize: 10.5, pointerEvents: "none",
        }}>
          <span style={{ color: T.faint }}>dashed = reference frame N</span>
          <span style={{ color: T.faint }}>solid = body frame B</span>
        </div>

        <div style={{
          position: "absolute", left: 11, bottom: 10, display: "flex", gap: 13,
          fontFamily: "var(--mono)", fontSize: 10.5,
        }}>
          {AXIS_NAME.map((n, i) => (
            <span key={n}
              onMouseEnter={() => setHighlight(i)}
              onMouseLeave={() => setHighlight(null)}
              style={{ color: T.axis[i], cursor: "help" }}>
              {n}<span style={{ color: T.faint }}>_body</span>
            </span>
          ))}
        </div>

        <div style={{
          position: "absolute", right: 11, top: 10, display: "flex", gap: 6, alignItems: "center",
        }}>
          <label style={{
            fontSize: 10.5, color: T.dim, display: "flex", gap: 5,
            alignItems: "center", cursor: "pointer",
          }}>
            <input type="checkbox" checked={showInertial}
              onChange={(e) => setShowInertial(e.target.checked)}
              style={{ accentColor: T.live, width: 12, height: 12 }} />
            reference frame
          </label>
          <button onClick={() => setQuat(IDENTITY)} style={{
            background: T.panel, border: `1px solid ${T.rule}`, color: T.text,
            fontFamily: "var(--sans)", fontSize: 10.5, padding: "4px 8px",
            borderRadius: 2, cursor: "pointer",
          }}>align frames</button>
        </div>

        <div style={{
          position: "absolute", right: 11, bottom: 10, fontFamily: "var(--mono)",
          fontSize: 10.5, color: atRest ? T.live : T.amber, pointerEvents: "none",
        }}>
          {atRest ? "B aligned with N · Φ = 0°" : `Φ = ${(angle * DEG).toFixed(1)}° off N`}
        </div>
      </div>
      <figcaption style={{ margin: "8px 0 0", fontSize: 11.5, color: T.faint, lineHeight: 1.6 }}>
        Drag the spacecraft. The dashed triad never moves — that is the reference frame. The solid
        triad is bolted to the bus and goes wherever the vehicle goes. Attitude is nothing more than
        the gap between the two.
      </figcaption>
    </figure>
  );
}

/* ---------- attitude vs orbit ---------- */

function OrbitVsAttitude() {
  const T = useTheme();
  const craft = [
    { x: 68, y: 128, rot: 0 },
    { x: 310, y: 40, rot: 52 },
    { x: 552, y: 128, rot: 133 },
  ];
  return (
    <figure style={{ margin: "16px 0 4px" }}>
      <div style={{
        background: T.panel, border: `1px solid ${T.rule}`, borderRadius: 3,
        padding: "14px 14px 10px", overflowX: "auto",
      }}>
        <svg viewBox="0 0 620 250" width="100%" role="img"
          style={{ minWidth: 420, display: "block" }}
          aria-label="An orbit path around a planet with the spacecraft drawn at three points. The position moves along the path while the body axes point in a different direction at each point.">
          <title>Orbit is where the spacecraft is; attitude is which way it faces</title>

          {/* orbit path */}
          <ellipse cx="310" cy="128" rx="242" ry="88" fill="none"
            stroke={T.rule} strokeWidth="1.5" strokeDasharray="5 5" />

          {/* central body */}
          <circle cx="310" cy="128" r="30" fill={T.panelHi} stroke={T.faint} strokeWidth="1" />
          <text x="310" y="132" textAnchor="middle" fill={T.faint}
            style={{ fontFamily: "var(--mono)", fontSize: 10 }}>planet</text>

          {/* three spacecraft along the path, each with a different attitude */}
          {craft.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <rect x="-23" y="-3" width="12" height="6" fill="#1B3A63"
                stroke={T.faint} strokeWidth="0.5" />
              <rect x="11" y="-3" width="12" height="6" fill="#1B3A63"
                stroke={T.faint} strokeWidth="0.5" />
              <rect x="-9" y="-7" width="18" height="14" rx="1.5" fill="#B9C6D1" />
              <line x1="0" y1="0" x2="32" y2="0" stroke={T.axis[0]} strokeWidth="1.8" />
              <line x1="0" y1="0" x2="0" y2="-28" stroke={T.axis[1]} strokeWidth="1.8" />
              <polygon points="34,0 27,-3.2 27,3.2" fill={T.axis[0]} />
              <polygon points="0,-30 -3.2,-23 3.2,-23" fill={T.axis[1]} />
            </g>
          ))}

          {/* legend */}
          <line x1="14" y1="196" x2="240" y2="196" stroke={T.rule} strokeWidth="1" />
          <line x1="376" y1="196" x2="606" y2="196" stroke={T.rule} strokeWidth="1" />
          <g style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}>
            <text x="14" y="212" fill={T.dim}>orbit — where it is</text>
            <text x="14" y="228" fill={T.faint}>3 translational DOF · r(t), v(t) · forces</text>
            <text x="376" y="212" fill={T.dim}>attitude — which way it faces</text>
            <text x="376" y="228" fill={T.faint}>3 rotational DOF · C(t), ω(t) · torques</text>
          </g>
        </svg>
      </div>
      <figcaption style={{ margin: "8px 0 0", fontSize: 11.5, color: T.faint, lineHeight: 1.6 }}>
        Same trajectory, three different orientations. Nothing about the path tells you where the
        antenna is pointing.
      </figcaption>
    </figure>
  );
}

/* ---------- why it matters ---------- */

/** Tones name a token; they are resolved against the live palette at render. */
const tone = (T, k) => (k.startsWith("axis") ? T.axis[+k.slice(4)] : T[k]);

const USES = [
  ["Solar arrays", "Collected power falls off with the cosine of the sun angle. Point the arrays wrong for long enough and the bus browns out.", "amber"],
  ["Antennas", "A high-gain dish has a beam a couple of degrees wide. Miss the ground station and the whole pass is lost.", "live"],
  ["Sensors", "Cameras, star trackers and spectrometers only return data when the boresight is on target — and a star tracker must be kept off the sun.", "axis2"],
  ["Thermal control", "Radiators need a view of deep space; instruments need shade. Which face bakes and which face freezes is an attitude decision.", "axis0"],
  ["Thrusters", "A burn changes velocity along the thrust axis, so an orbit manoeuvre is only ever as accurate as the attitude that aimed it.", "axis1"],
];

function UseGrid() {
  const T = useTheme();
  return (
    <div className="c1-uses" style={{ display: "grid", gap: 8, marginTop: 14, marginBottom: 14 }}>
      {USES.map(([title, blurb, toneKey]) => (
        <div key={title} style={{
          background: T.panel, border: `1px solid ${T.rule}`,
          borderLeft: `2px solid ${tone(T, toneKey)}`, borderRadius: 2, padding: "10px 12px",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11, color: tone(T, toneKey),
            marginBottom: 4, letterSpacing: "0.04em",
          }}>{title}</div>
          <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.6 }}>{blurb}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- chapter ---------- */

export default function Chapter1() {
  const T = useTheme();
  return (
    <article style={{ maxWidth: 720 }}>
      <style>{`
        .c1-uses { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .c1-uses > div:last-child { grid-column: 1 / -1; }
        @media (max-width: 720px) {
          .c1-uses { grid-template-columns: 1fr; }
          .c1-uses > div:last-child { grid-column: auto; }
        }
      `}</style>

      <h1 style={{
        margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1.15,
      }}>What is Attitude?</h1>
      <p style={{ margin: "12px 0 0", fontSize: 14, color: T.dim, lineHeight: 1.68 }}>
        Orbital mechanics answers <em>where</em> a spacecraft is. Attitude answers{" "}
        <em>which way it is facing</em> — and almost everything the vehicle was built to do depends
        on that second answer.
      </p>

      <H2>Two frames, one relationship</H2>
      <P>
        Attitude is not a property a spacecraft carries on its own. It is a <em>relationship</em>{" "}
        between two coordinate frames, and you cannot state one without naming both.
      </P>
      <P>
        The first is a <strong style={{ color: T.text }}>reference frame</strong> — call it{" "}
        <Term color={T.dim}>N</Term>. For spacecraft this is usually an inertial frame: axes fixed
        with respect to the distant stars, non-rotating, the frame in which Newton&apos;s laws hold
        without correction terms. Earth-centred inertial is the common choice, with{" "}
        <Term color={T.dim}>n̂₁</Term> toward the vernal equinox and <Term color={T.dim}>n̂₃</Term>{" "}
        along Earth&apos;s spin axis. Nothing the spacecraft does moves it.
      </P>
      <P>
        The second is a <strong style={{ color: T.text }}>body-fixed frame</strong> —{" "}
        <Term>B</Term> — painted onto the vehicle itself. Its origin sits at the centre of mass and
        its axes are tied to hardware: <Term color={T.axis[0]}>b̂₁</Term> down the antenna
        boresight, <Term color={T.axis[1]}>b̂₂</Term> along the solar array boom, and{" "}
        <Term color={T.axis[2]}>b̂₃</Term> completing the right-handed set. When the spacecraft
        tumbles, this frame tumbles with it.
      </P>
      <P>
        <strong style={{ color: T.text }}>Attitude is the rotation that carries N onto B.</strong>{" "}
        Every representation in this tutorial — direction cosine matrices, Euler angles, the
        principal rotation vector, quaternions, Rodrigues parameters — is a different way of writing
        that one rotation down. They are six notations for a single fact, and converting between
        them changes nothing physical.
      </P>

      <FrameDemo />

      <P dim>
        Notice that three numbers would be enough to describe what you just did: a rigid body free
        to rotate has exactly three rotational degrees of freedom. Some representations use three
        numbers and pay for it with a singularity; others use four or nine and carry constraints
        instead. That trade is the subject of every chapter that follows.
      </P>

      <H2>Why pointing is the whole job</H2>
      <P>
        A spacecraft is a collection of things that only work when they are aimed correctly. The
        attitude determination and control system exists because every one of these has a direction
        attached to it:
      </P>
      <UseGrid />
      <P dim>
        These requirements routinely conflict — the array wants the sun, the radiator wants deep
        space, the star tracker wants neither, and the antenna wants the ground station. Attitude
        design is largely the business of finding an orientation, or a timed sequence of them, that
        keeps every subsystem inside its own budget at once.
      </P>

      <H2>Attitude is not orbit</H2>
      <P>
        The two halves of spacecraft dynamics are worth separating cleanly, because they are easy to
        blur together.
      </P>
      <P>
        <strong style={{ color: T.text }}>Orbit dynamics</strong> is translational: the motion of
        the centre of mass through space. Three degrees of freedom, driven by gravity and thrust,
        described by position and velocity, playing out over hours.
      </P>
      <P>
        <strong style={{ color: T.text }}>Attitude dynamics</strong> is rotational: the orientation
        of the body about that centre of mass. Three degrees of freedom, driven by torques — from
        reaction wheels, magnetorquers and thrusters, and by disturbances like gravity gradient,
        solar radiation pressure and residual aerodynamic drag — playing out over seconds.
      </P>
      <OrbitVsAttitude />
      <P dim>
        The two are coupled in practice: a thruster burn needs a pointing direction before it means
        anything, and gravity-gradient torque depends on where you are in the orbit. But they are
        modelled separately and taught separately. Everything here is the rotational half.
      </P>

      <H2>Try it</H2>
      <P>
        The fastest way to build intuition is to watch one orientation appear in every notation at
        once. The playground gives you a draggable spacecraft with the direction cosine matrix, the
        quaternion, the principal rotation, all twelve Euler sequences and the Rodrigues parameters
        live at the same time — change any one of them and the rest follow.
      </P>
      <P dim>
        Worth doing straight away: drag until the body triad is well away from the reference triad,
        then read the principal rotation panel. However tangled the orientation looks, it is one
        turn of Φ about a single axis. That is Euler&apos;s theorem, and it is chapter 4.
      </P>

      <Link to="/playground" style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6,
        background: T.panel, border: `1px solid ${T.live}`, color: T.live,
        textDecoration: "none", fontSize: 12.5, padding: "9px 14px", borderRadius: 2,
      }}>
        Open the playground
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
