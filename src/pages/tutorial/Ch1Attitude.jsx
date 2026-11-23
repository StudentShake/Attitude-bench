import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { useTheme, REPS } from "../../lib/theme.js";
import { canonicalQuat, dcmToQuat } from "../../lib/attitude.js";
import { EAToQ, QToSAR, quatToQ } from "../../lib/course.js";
import { slerp } from "../../lib/director.js";
import { Fig, M, Scene, Ask } from "./kit.jsx";
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

function ECI() {
  const T = useTheme();
  return (
    <Fig caption="Earth-centred inertial (ECI). X points at the vernal equinox, Z at the north pole, Y finishes the right-handed set. J2000 freezes the equinox direction at noon UTC on 1 Jan 2000.">
      <div className="panel">
        <svg viewBox="0 0 560 300" role="img" aria-label="Earth with the ECI axes drawn from its centre">
          <defs>
            <radialGradient id="earth" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#6fb5ff" /><stop offset="70%" stopColor="#2a6fd1" /><stop offset="100%" stopColor="#1b4b98" />
            </radialGradient>
          </defs>
          <circle cx="280" cy="160" r="92" fill="url(#earth)" />
          <path d="M228 120c18-14 40-10 52 4s30 8 40 0M246 190c14 10 34 12 50 2" stroke="#7ee08f" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".55" />
          <ellipse cx="280" cy="160" rx="150" ry="34" fill="none" stroke={T.faint} strokeWidth="1.5" strokeDasharray="5 5" />
          <text x="430" y="196" fill={T.faint} fontSize="13" fontFamily="var(--sans)">equatorial plane</text>
          {/* Z */}
          <line x1="280" y1="160" x2="280" y2="22" stroke={T.axis[2]} strokeWidth="3" strokeDasharray="7 5" />
          <circle cx="280" cy="68" r="5" fill="#fff" />
          <text x="292" y="72" fill={T.dim} fontSize="13" fontFamily="var(--sans)">north pole</text>
          <text x="288" y="26" fill={T.axis[2]} fontSize="24" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">Z</text>
          {/* X */}
          <line x1="280" y1="160" x2="120" y2="250" stroke={T.axis[0]} strokeWidth="3" strokeDasharray="7 5" />
          <text x="92" y="270" fill={T.axis[0]} fontSize="24" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">X</text>
          <text x="40" y="232" fill={T.dim} fontSize="13" fontFamily="var(--sans)">to the vernal equinox</text>
          {/* Y */}
          <line x1="280" y1="160" x2="470" y2="226" stroke={T.axis[1]} strokeWidth="3" strokeDasharray="7 5" />
          <text x="476" y="244" fill={T.axis[1]} fontSize="24" fontFamily="Times New Roman" fontStyle="italic" fontWeight="700">Y</text>
          {/* a satellite for scale of the idea, not of the drawing */}
          <g transform="translate(430 70) rotate(-25)">
            <rect x="-26" y="-5" width="16" height="10" fill="#2852a8" />
            <rect x="10" y="-5" width="16" height="10" fill="#2852a8" />
            <rect x="-9" y="-9" width="18" height="18" rx="2" fill="#d8a23a" />
            <path d="M0 0L18 -22" stroke={T.axis[0]} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M0 0L-16 -20" stroke={T.axis[2]} strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <text x="462" y="52" fill={T.dim} fontSize="13" fontFamily="var(--sans)">body frame</text>
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

      <h2>Two frames and the gap between them</h2>
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

      <h2>Why anyone cares</h2>
      <p>Pretty much every piece of hardware on a spacecraft has a direction it needs to point.</p>
      <Why />
      <p>
        These fight each other. The panels want the Sun, the radiator wants deep space and the antenna wants
        the ground. Picking an attitude is picking which of them wins, and when.
      </p>

      <h2>Attitude is not orbit</h2>
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
