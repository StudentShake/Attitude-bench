import { useState, useMemo } from "react";
import { useTheme } from "../../lib/theme.js";
import { EAToQ, QToEA } from "../../lib/course.js";
import SequencePlayer from "../../components/SequencePlayer.jsx";
import NumField from "../../components/NumField.jsx";
import { Fig, M, Mat, Ask, Eq } from "./kit.jsx";

const SYM = ["1-2-1", "1-3-1", "2-1-2", "2-3-2", "3-1-3", "3-2-3"];
const ASYM = ["3-2-1", "2-3-1", "1-3-2", "3-1-2", "2-1-3", "1-2-3"];
const NICK = { "3-2-1": "yaw, pitch, roll", "3-1-3": "classical" };

function SeqGrid({ list }) {
  const T = useTheme();
  return (
    <div className="seqs">
      {list.map((s) => (
        <div key={s} className={`seq-chip${NICK[s] ? " star" : ""}`} style={{ "--c": T.rep.euler }}>
          {s.split("-").map((d, i) => (
            <span key={i}>
              <span style={{ color: T.axis[+d - 1] }}>{d}</span>{i < 2 && <span style={{ color: T.faint }}>-</span>}
            </span>
          ))}
          <small>{NICK[s] || " "}</small>
        </div>
      ))}
    </div>
  );
}

function Order() {
  const T = useTheme();
  const box = (name, sub, ang, col, note) => (
    <div style={{ textAlign: "center" }}>
      <div style={{
        border: `2.5px solid ${col}`, background: `color-mix(in srgb, ${col} 14%, var(--card))`, borderRadius: 14,
        padding: "10px 14px", fontFamily: "Times New Roman", fontStyle: "italic", fontSize: 22, fontWeight: 700,
      }}>[{name}<sub style={{ fontStyle: "normal", fontSize: 13 }}>{sub}</sub>({ang})]</div>
      <div className="tiny dim" style={{ marginTop: 6, fontWeight: 600 }}>{note}</div>
    </div>
  );
  return (
    <Fig caption="Read the product right to left. The matrix touching the vector is the rotation that happens first.">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "Times New Roman", fontStyle: "italic", fontSize: 24, fontWeight: 700, paddingTop: 10 }}>[Q] =</div>
          {box("R", 1, "γ", T.axis[0], "3rd: roll")}
          {box("R", 2, "β", T.axis[1], "2nd: pitch")}
          {box("R", 3, "α", T.axis[2], "1st: yaw")}
        </div>
        <svg viewBox="0 0 400 40" style={{ maxWidth: 420, margin: "10px auto 0" }} aria-hidden="true">
          <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill={T.primary} /></marker></defs>
          <path d="M360 14 C 300 34, 120 34, 50 14" fill="none" stroke={T.primary} strokeWidth="3" markerEnd="url(#arr)" />
          <text x="205" y="22" textAnchor="middle" fill={T.dim} fontSize="13" fontFamily="var(--sans)" fontWeight="600">order applied</text>
        </svg>
      </div>
    </Fig>
  );
}

function BackOut() {
  const T = useTheme();
  const [a, setA] = useState([30, 20, 10]);
  const Q = useMemo(() => EAToQ(a[0], a[1], a[2], [3, 2, 1]), [a]);
  const back = QToEA(Q, [3, 2, 1]);
  const G = ["α", "β", "γ"];
  return (
    <Fig caption="Type any three angles. The matrix is built with the slide's 3-2-1 formula, then the angles are pulled back out of it with atan2 and the slide ranges.">
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, flex: "0 0 150px" }}>
          {[0, 1, 2].map((k) => (
            <label key={k} style={{ display: "grid", gridTemplateColumns: "26px 1fr", alignItems: "center", gap: 6 }}>
              <span className="m" style={{ fontSize: 20, color: T.axis[2 - k], fontWeight: 700 }}>{G[k]}</span>
              <NumField value={String(a[k])} suffix="°" color={T.axis[2 - k]} label={G[k]}
                onCommit={(v) => { const n = a.slice(); n[k] = v; setA(n); }} />
            </label>
          ))}
        </div>
        <div style={{ flex: "1 1 260px", textAlign: "center" }}>
          <Mat rows={Q} digits={4} color={(r, c) => (r === 0 || c === 2 ? T.rep.euler : undefined)} />
          <div className="small dim" style={{ marginTop: 12 }}>
            Back out: <span className="m">α</span> = {back.alpha.toFixed(2)}°, <span className="m">β</span> = {back.beta.toFixed(2)}°, <span className="m">γ</span> = {back.gamma.toFixed(2)}°
          </div>
        </div>
      </div>
    </Fig>
  );
}

export default function Ch3() {
  return (
    <>
      <p className="lede">
        Any attitude can be reached with at most three turns, each about one axis. The three angles are
        the Euler angles, <M>α</M>, <M>β</M> and <M>γ</M>, in the order you do them.
      </p>

      <SequencePlayer />

      <h2>Each turn uses the frame you just made</h2>
      <p>
        Start in <M>XYZ</M>. The first turn, <M>α</M>, gives a new frame <M>X</M><sub>1</sub><M>Y</M><sub>1</sub><M>Z</M><sub>1</sub>.
        The second turn is about an axis of <i>that</i> frame and gives <M>X</M><sub>2</sub><M>Y</M><sub>2</sub><M>Z</M><sub>2</sub>.
        The third turn finishes at the body frame. In the player above, the dashed triad is the frame from the step before.
      </p>
      <p>
        Two turns in a row about the same axis would just be one bigger turn, so each step uses a different
        axis than the one before it.
      </p>

      <h2>Twelve sequences</h2>
      <p>
        That rule leaves 12 sequences. When the first and third axes match the sequence is <b>symmetric</b>;
        otherwise it&apos;s <b>asymmetric</b>. The course leans on two of them.
      </p>
      <Fig caption="Digits are coloured by axis: 1 is x, 2 is y, 3 is z. 3-2-1 is the course default.">
        <div className="panel">
          <div className="small dim" style={{ fontWeight: 700, marginBottom: 8 }}>Asymmetric</div>
          <SeqGrid list={ASYM} />
          <div className="small dim" style={{ fontWeight: 700, margin: "14px 0 8px" }}>Symmetric</div>
          <SeqGrid list={SYM} />
        </div>
      </Fig>

      <h2>From angles to [Q]</h2>
      <p>
        Multiply the three elementary matrices. For 3-2-1, <M>α</M> is about <M>z</M>, <M>β</M> about the new{" "}
        <M>y</M>, <M>γ</M> about the newest <M>x</M>:
      </p>
      <Order />
      <p>Multiplying it out gives the matrix on the slides:</p>
      <Eq>
        <Mat size={15} rows={[
          ["cα cβ", "sα cβ", "−sβ"],
          ["cα sβ sγ − sα cγ", "sα sβ sγ + cα cγ", "cβ sγ"],
          ["cα sβ cγ + sα sγ", "sα sβ cγ − cα sγ", "cβ cγ"],
        ]} />
      </Eq>

      <h2>From [Q] back to angles</h2>
      <p>Three entries are enough:</p>
      <Eq>
        β = sin<sup className="up">−1</sup>(−Q<sub className="up">13</sub>) &nbsp;·&nbsp;
        α = tan<sup className="up">−1</sup>(Q<sub className="up">12</sub> / Q<sub className="up">11</sub>) &nbsp;·&nbsp;
        γ = tan<sup className="up">−1</sup>(Q<sub className="up">23</sub> / Q<sub className="up">33</sub>)
      </Eq>
      <BackOut />

      <Ask q="My calculator gave the wrong α. Why?" tone="euler">
        <p>
          A plain <M>tan</M><sup>−1</sup> only returns angles between −90° and 90°. Look at the signs of{" "}
          <M>Q</M><sub>12</sub> and <M>Q</M><sub>11</sub> to pick the right quadrant, or use atan2. The slides
          put <M>α</M> and <M>γ</M> between 0° and 360°, and <M>β</M> between −90° and 90°.
        </p>
      </Ask>
      <Ask q="Which matrix goes on the right?" tone="euler">
        <p>
          The first rotation. In <M>[Q] = R</M><sub>1</sub>(<M>γ</M>) <M>R</M><sub>2</sub>(<M>β</M>) <M>R</M><sub>3</sub>(<M>α</M>),
          the sequence is named 3-2-1 in the order you do the turns, and written right to left in the product.
        </p>
      </Ask>
    </>
  );
}
