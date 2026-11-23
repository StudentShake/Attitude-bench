# Attitude Bench

Spin a spacecraft and watch its attitude written four ways at once: the direction cosine matrix [Q], Euler angles α β γ, the single-axis rotation (û, θ) and the quaternion q. Built for AE 426 (Spacecraft Attitude Dynamics) at Embry-Riddle, in the course's own notation.

- **Tutorial**: six short chapters in course order, each with drawings and something to play with.
- **Playground**: drag the spacecraft or type into any card. Play a 3-2-1 sequence one turn at a time, or the same attitude as a single SAR turn. Tap an axis in the corner triad to look down it.
- **Test Prep**: generated conversion problems, graded, with the working and a hint when the slip is a common one.

## Notation

Follows Prof. Lovell's slides and Curtis.

| | |
|---|---|
| DCM | [Q] maps inertial to body, v\|B = [Q] v\|I. Row i is body axis i in inertial coordinates. |
| Euler angles | α, β, γ are the 1st, 2nd, 3rd rotations. 3-2-1 is [Q] = R1(γ) R2(β) R3(α). α, γ in [0°, 360°). |
| SAR | û and θ in [0°, 180°], DCM → SAR from the corrected 23 Jul formulas. |
| Quaternion | Scalar last: q = [û sin(θ/2); cos(θ/2)], shown with q4 ≥ 0. |

## Code

- `src/lib/attitude.js`: the conversion engine (radians, scalar-first internally).
- `src/lib/course.js`: the course notation on top of it. The UI only reads through this.
- `src/lib/director.js`: animations as pure functions of time, built on the library.
- `src/lib/practice.js`: Test Prep problem generator, grader and slip detector.

## Run it

```
npm install
npm run dev      # local site
npm test         # attitude.test.mjs (13,316 checks) + course.test.mjs (slide examples and more)
npm run build
```

No accounts, no ads, no trackers. Fonts are bundled, so the site makes no third-party requests.

See `docs/REDESIGN.md` for the design notes and `docs/persona-run.md` for the last scripted walkthrough.
