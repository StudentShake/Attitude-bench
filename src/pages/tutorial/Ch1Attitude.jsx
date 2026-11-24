import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { useTheme, REPS } from "../../lib/theme.js";
import { canonicalQuat, dcmToQuat } from "../../lib/attitude.js";
import { EAToQ, QToSAR, quatToQ } from "../../lib/course.js";
import { slerp } from "../../lib/director.js";
import { Fig, M, Scene, Ask, H2 } from "./kit.jsx";
import { Reset } from "../../components/Icons.jsx";

const TILTED = canonicalQuat(dcmToQuat(EAToQ(40, 25, -20, [3, 2, 1])));

function FrameDemo() {
  const T = useTheme();
  const [quat, setQuat] = useState(TILTED);
  const onDrag = useCallback((dq) => {
    setQuat((p) => {
      const n = dq.clone().multiply(new THREE.Quaternion(p[1], p[2], p[3], p[0])).normalize();
      return canonicalQuat([n.w, n.x, n.y, n.z]);
    });
  }, []);
  const theta = useMemo(() => QToSAR(quatToQ(quat)).theta, [quat]);

  const realign = () => {
    const from = quat;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 800);
      setQuat(slerp(from, [1, 0, 0, 0], t * t * (3 - 2 * t)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <Fig caption="Drag the spacecraft. The dashed axes never move: that's the inertial frame. The solid arrows are bolted to the spacecraft and go wherever it goes.">
      <Scene quat={quat} onDrag={onDrag} height={400}>
        <div className="scene-ui" style={{ left: 12, top: 12 }}>
          <button type="button" className="btn sm" onClick={realign}><Reset size={16} /> Line them back up</button>
        </div>
        <div className="caption" style={{ "--c": theta < 0.05 ? T.axis[1] : T.rep.sar, top: "auto", bottom: 14, left: "auto", right: 12, transform: "none" }}>
          {theta < 0.05 ? "Lined up. No rotation." : <>Body frame is {theta.toFixed(0)}° away from inertial</>}
        </div>
      </Scene>
    </Fig>
  );
}

/* ECI, drawn the way orbital mechanics texts usually do: equatorial plane,
   ecliptic tilted 23.4° from it, X along the line where the two meet. */
function ECI() {
  const T = useTheme();
  const C = [360, 214], r = 150, EPS = 23.4 * Math.PI / 180;
  // oblique projection: X toward the viewer (lower left), Y right, Z up
  const P = (x, y, z) => [C[0] - 0.6 * x * r + 1.0 * y * r, C[1] + 0.38 * x * r - 1.0 * z * r + 0.02 * y * r];
  const ring = (f, from, to, n = 60) => Array.from({ length: n + 1 }, (_, i) => f(from + ((to - from) * i) / n));
  const path = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const equ = (t) => P(Math.cos(t), Math.sin(t), 0);
  const ecl = (t) => P(Math.cos(t), Math.sin(t) * Math.cos(EPS), Math.sin(t) * Math.sin(EPS));
  // depth = x (toward viewer). Back half: x < 0, i.e. t in (90°, 270°)
  const back = (f) => path(ring(f, Math.PI / 2, 1.5 * Math.PI));
  const front = (f) => path(ring(f, -Math.PI / 2, Math.PI / 2));
  const full = (f) => path(ring(f, 0, 2 * Math.PI, 120)) + " Z";
  const O = P(0, 0, 0);
  const tipX = P(1.62, 0, 0), tipY = P(0, 1.42, 0), tipZ = P(0, 0, 1.22);
  const surfX = P(0.47, 0, 0), surfY = P(0, 0.47, 0), surfZ = P(0, 0, 0.47);
  const sun = P(2.25, 0, 0);
  const arrow = (from, to, col) => {
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
    return (
      <g>
        <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={col} strokeWidth="3.5" strokeLinecap="round" />
        <polygon points="0,-6.5 14,0 0,6.5" fill={col} transform={`translate(${to[0]} ${to[1]}) rotate(${ang})`} />
      </g>
    );
  };
  const inner = (to, col) => <line x1={O[0]} y1={O[1]} x2={to[0]} y2={to[1]} stroke={col} strokeWidth="2" strokeDasharray="4 4" opacity=".75" />;
  const tiltA = ecl(Math.PI / 2), tiltB = equ(Math.PI / 2);
  const font = { fontFamily: "var(--sans)", fontSize: 14 };
  const axisFont = { fontFamily: "Times New Roman, serif", fontStyle: "italic", fontWeight: 700, fontSize: 26 };
  return (
    <Fig caption="The inertial frame used for Earth orbits. Z is Earth's spin axis. X sits where the equatorial plane meets the ecliptic, pointing at the Sun on the first day of spring. Y is 90° east of X, in the equator. J2000 freezes those directions at noon UTC on 1 Jan 2000.">
      <div className="panel">
        <svg viewBox="0 0 680 430" role="img" aria-label="Earth at the centre. The equatorial plane and the ecliptic plane cross along the X axis, which points at the Sun. Y lies in the equatorial plane, Z points to the north pole.">
          <defs>
            <radialGradient id="earthG" cx="38%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#7cc0ff" /><stop offset="65%" stopColor="#2a6fd1" /><stop offset="100%" stopColor="#163f8a" />
            </radialGradient>
            <radialGradient id="sunG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff6c9" /><stop offset="45%" stopColor="#ffc53d" /><stop offset="100%" stopColor="#ffc53d" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* planes: fills first, back rims dashed */}
          <path d={full(ecl)} fill={T.rep.sar} opacity=".10" />
          <path d={full(equ)} fill={T.axis[2]} opacity=".10" />
          <path d={back(ecl)} fill="none" stroke={T.rep.sar} strokeWidth="2" strokeDasharray="5 5" opacity=".8" />
          <path d={back(equ)} fill="none" stroke={T.axis[2]} strokeWidth="2" strokeDasharray="5 5" opacity=".7" />

          {/* Earth */}
          <circle cx={O[0]} cy={O[1]} r={0.47 * r} fill="url(#earthG)" />
          <path d={`M${O[0] - 40} ${O[1] - 22}c18 -14 40 -10 52 4s30 8 26 0M${O[0] - 24} ${O[1] + 30}c14 8 30 10 44 0`} stroke="#86e3a0" strokeWidth="8" strokeLinecap="round" fill="none" opacity=".5" />
          {inner(surfX, T.axis[0])}{inner(surfY, T.axis[1])}{inner(surfZ, T.axis[2])}

          {/* front rims over the Earth */}
          <path d={front(equ)} fill="none" stroke={T.axis[2]} strokeWidth="2.5" />
          <path d={front(ecl)} fill="none" stroke={T.rep.sar} strokeWidth="2.5" />

          {/* tilt between the planes */}
          <line x1={O[0]} y1={O[1]} x2={tiltA[0]} y2={tiltA[1]} stroke={T.rep.sar} strokeWidth="1.5" strokeDasharray="3 4" />
          {(() => {
            // arc at the origin between the two planes, drawn out past the Earth
            const R = 0.86 * r;
            const aB = Math.atan2(tiltB[1] - O[1], tiltB[0] - O[0]), aA = Math.atan2(tiltA[1] - O[1], tiltA[0] - O[0]);
            const p1 = [O[0] + R * Math.cos(aB), O[1] + R * Math.sin(aB)], p2 = [O[0] + R * Math.cos(aA), O[1] + R * Math.sin(aA)];
            const mid = (aA + aB) / 2;
            return (
              <g>
                <path d={`M${p1[0]} ${p1[1]} A ${R} ${R} 0 0 0 ${p2[0]} ${p2[1]}`} fill="none" stroke={T.text} strokeWidth="2" />
                <text x={O[0] + (R + 14) * Math.cos(mid)} y={O[1] + (R + 14) * Math.sin(mid) + 5} fill={T.text} style={{ ...font, fontWeight: 700 }}>23.4°</text>
              </g>
            );
          })()}

          {/* axes */}
          {arrow(surfX, tipX, T.axis[0])}
          {arrow(surfY, tipY, T.axis[1])}
          {arrow(surfZ, tipZ, T.axis[2])}
          <line x1={tipX[0]} y1={tipX[1]} x2={sun[0] + 18} y2={sun[1] - 12} stroke={T.axis[0]} strokeWidth="1.5" strokeDasharray="2 5" />

          {/* Sun along +X */}
          <circle cx={sun[0]} cy={sun[1]} r="30" fill="url(#sunG)" />
          <circle cx={sun[0]} cy={sun[1]} r="12" fill="#ffd45e" />

          {/* labels, each kept clear of the lines */}
          <text x={tipZ[0] + 14} y={tipZ[1] + 10} fill={T.axis[2]} style={axisFont}>Z</text>
          <text x={tipZ[0] + 14} y={tipZ[1] + 32} fill={T.dim} style={font}>north pole, spin axis</text>
          <text x={tipY[0] - 4} y={tipY[1] - 16} fill={T.axis[1]} style={axisFont}>Y</text>
          <text x={tipY[0] - 52} y={tipY[1] + 28} fill={T.dim} style={font}>90° east of X</text>
          <text x={tipX[0] + 16} y={tipX[1] + 22} fill={T.axis[0]} style={axisFont}>X</text>
          <text x={sun[0] + 38} y={sun[1] + 6} fill={T.dim} style={font}>Sun on the first day of spring</text>
          <text x={sun[0] + 38} y={sun[1] + 24} fill={T.faint} style={font}>(the vernal equinox direction)</text>
          <text x={P(-0.2, 1.08, 0)[0] + 8} y={P(-0.2, 1.08, 0)[1] - 34} fill={T.axis[2]} style={{ ...font, fontWeight: 700 }}>equatorial plane</text>
          <text x={P(0.1, -1.1, 0)[0] - 72} y={P(0.1, -1.1, 0)[1] - 50} fill={T.rep.sar} style={{ ...font, fontWeight: 700 }}>ecliptic</text>
          <text x={P(0.1, -1.1, 0)[0] - 72} y={P(0.1, -1.1, 0)[1] - 32} fill={T.dim} style={font}>(plane of Earth&apos;s orbit)</text>
        </svg>
      </div>
    </Fig>
  );
}

/* why it matters: the slide's list, one picture each */
const WHY = [
  ["Solar panels", "Face the Sun or run out of power.", "sar", (c) => <g><rect x="6" y="18" width="36" height="16" rx="2" fill={c} /><path d="M18 18v16M30 18v16M6 26h36" stroke="var(--card)" strokeWidth="1.5" /><circle cx="40" cy="8" r="5" fill="var(--sar)" /></g>],
  ["Antennas", "A narrow beam has to land on the ground station.", "ax2", (c) => <g><path d="M10 30a16 16 0 0 1 22-22" stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M20 20l14-14" stroke={c} strokeWidth="2.5" strokeLinecap="round" /><path d="M36 10a8 8 0 0 1 4 6M38 4a14 14 0 0 1 6 10" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" /></g>],
  ["Sensors", "Cameras and particle counters only see what they point at.", "quat", (c) => <g><rect x="8" y="16" width="22" height="16" rx="4" fill={c} /><path d="M30 20l10-6v20l-10-6z" fill={c} /><circle cx="19" cy="24" r="4" fill="var(--card)" /></g>],
  ["Heat", "Radiators want cold sky, electronics want shade.", "ax0", (c) => <g><rect x="20" y="6" width="8" height="26" rx="4" fill="none" stroke={c} strokeWidth="3" /><circle cx="24" cy="36" r="7" fill={c} /><path d="M24 30v-14" stroke={c} strokeWidth="3" /></g>],
  ["Sun damage", "Some instruments go blind if they look at the Sun.", "euler", (c) => <g><circle cx="24" cy="24" r="12" fill="none" stroke={c} strokeWidth="3.5" /><path d="M12 36L36 12" stroke={c} strokeWidth="3.5" strokeLinecap="round" /></g>],
  ["Thrusters", "A burn only helps if it pushes the right way.", "ax1", (c) => <g><path d="M14 12h14l6 24H8z" fill={c} /><path d="M14 38l-2 6M21 38v7M28 38l2 6" stroke="var(--sar)" strokeWidth="3" strokeLinecap="round" /></g>],
];

function Why() {
  const T = useTheme();
  const c = (k) => (k.startsWith("ax") ? T.axis[+k[2]] : T.rep[k]);
  return (
    <div className="tiles">
      {WHY.map(([title, line, k, icon]) => (
        <div key={title} className="tile" style={{ borderTop: `4px solid ${c(k)}` }}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">{icon(c(k))}</svg>
          <h3>{title}</h3>
          <p>{line}</p>
        </div>
      ))}
    </div>
  );
}

function OrbitVsAttitude() {
  const T = useTheme();
  const craft = [{ x: 78, y: 150, rot: 0 }, { x: 320, y: 56, rot: 52 }, { x: 562, y: 150, rot: 140 }];
  return (
    <Fig caption="Same path, three different attitudes. Where it is on the orbit tells you nothing about which way the dish points.">
      <div className="panel">
        <svg viewBox="0 0 640 300" role="img" aria-label="An orbit with a spacecraft drawn at three points, pointing a different way at each">
          <ellipse cx="320" cy="150" rx="242" ry="92" fill="none" stroke={T.faint} strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="320" cy="150" r="34" fill="#2a6fd1" />
          <path d="M300 140c8-6 18-4 22 2M314 164c8 4 16 4 22-2" stroke="#7ee08f" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".6" />
          {craft.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
              <rect x="-27" y="-4" width="14" height="8" rx="1" fill="#2852a8" />
              <rect x="13" y="-4" width="14" height="8" rx="1" fill="#2852a8" />
              <rect x="-10" y="-9" width="20" height="18" rx="3" fill="#d8a23a" />
              <line x1="0" y1="0" x2="38" y2="0" stroke={T.axis[0]} strokeWidth="3" strokeLinecap="round" />
              <polygon points="42,0 34,-4.5 34,4.5" fill={T.axis[0]} />
              <line x1="0" y1="0" x2="0" y2="-32" stroke={T.axis[2]} strokeWidth="3" strokeLinecap="round" />
              <polygon points="0,-36 -4.5,-28 4.5,-28" fill={T.axis[2]} />
            </g>
          ))}
          <g fontFamily="var(--sans)">
            <rect x="12" y="232" width="276" height="54" rx="14" fill={T.cardHi} />
            <text x="28" y="255" fill={T.text} fontSize="15" fontWeight="700">Orbit: where it is</text>
            <text x="28" y="275" fill={T.dim} fontSize="13">moves the centre of mass · forces</text>
            <rect x="346" y="232" width="282" height="54" rx="14" fill={T.cardHi} />
            <text x="362" y="255" fill={T.text} fontSize="15" fontWeight="700">Attitude: which way it faces</text>
            <text x="362" y="275" fill={T.dim} fontSize="13">turns about the centre of mass · torques</text>
          </g>
        </svg>
      </div>
    </Fig>
  );
}

export default function Ch1() {
  const T = useTheme();
  return (
    <>
      <p className="lede">
        Orbital mechanics tells you where a spacecraft is. Attitude tells you which way it&apos;s facing.
        Most of what a spacecraft is for depends on the second one.
      </p>

      <H2>Two frames and the gap between them</H2>
      <p>
        Attitude is always a comparison. You need a <b>reference frame</b> that stays put and a <b>body
        frame</b> fixed to the spacecraft. Attitude is how far, and which way, the body frame is turned
        relative to the reference.
      </p>
      <FrameDemo />
      <p>
        For anything orbiting Earth the usual reference is an inertial frame centred on Earth. It doesn&apos;t
        rotate with the planet, so a star that&apos;s along <M>X</M> today is along <M>X</M> next month too.
      </p>
      <ECI />

      <H2>Why anyone cares</H2>
      <p>Pretty much every piece of hardware on a spacecraft has a direction it needs to point.</p>
      <Why />
      <p>
        These fight each other. The panels want the Sun, the radiator wants deep space and the antenna wants
        the ground. Picking an attitude is picking which of them wins, and when.
      </p>

      <H2>Attitude is not orbit</H2>
      <OrbitVsAttitude />
      <p>
        Orbit is translation: three numbers for where the centre of mass is. Attitude is rotation: three
        numbers for how the body is turned about that centre. In 1-D it&apos;s just an angle <M>θ</M> with{" "}
        <M>M = Iα</M>. In 3-D the angle becomes a set of numbers and <M>I</M> becomes a matrix.
      </p>

      <Ask q="So how do you write an attitude down?">
        <p>
          The course uses four ways. They all describe the same rotation, and the rest of this tutorial
          takes them one at a time.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {REPS.map((r) => (
            <span key={r.key} className="chip" style={{ "--c": T.rep[r.key], fontSize: 14 }}>
              <span className="m">{r.symbol}</span> {r.name} · {r.count} numbers
            </span>
          ))}
        </div>
        <p style={{ marginTop: 12 }}>
          Want to see all four at once first? <Link className="link" to="/playground">Open the Playground</Link>.
        </p>
      </Ask>
    </>
  );
}
