# Attitude Bench

Spacecraft attitude, six ways.

Attitude — the orientation of a body-fixed frame relative to a reference
frame — is one physical fact with several standard descriptions: direction
cosine matrix, Euler angles (twelve sequences), the principal rotation
(axis + angle), quaternions, and classical/modified Rodrigues parameters.
Attitude Bench is a live, interactive reference for all of them: rotate a
spacecraft in a 3D viewport, or type numbers into any representation, and
watch every other representation update in lockstep.

## What's here

- **Tutorial** (`/tutorial`) — a chapter-by-chapter build-up from "what is
  attitude" to each representation, what it buys you, and where it breaks
  (singularities, gimbal lock, the quaternion double cover). Chapter 1 is
  written; the rest are stubbed out and listed in the sidebar.
- **Playground** (`/playground`) — one orientation, six live coordinate
  sets. Drag the spacecraft in the 3D view or edit any panel (DCM, Euler
  angles in any of the 12 sequences, axis-angle, quaternion, CRP, MRP) and
  every other panel updates to match, with gimbal-lock and singularity
  warnings surfaced as they're approached.
- **Test Prep** (`/test-prep`) — planned: generated conversion problems
  with worked solutions, drawn from the same conversion library the
  playground runs on.

## Conventions

Fixed internally and documented in `src/lib/attitude.js`; the UI
transposes/reorders only at the display layer:

- DCM `C` maps inertial → body: `v_body = C · v_inertial`.
- Quaternion `q = [q0, q1, q2, q3]`, scalar first, same inertial → body sense.
- Euler sequences are intrinsic (successive body-axis rotations).
- Angles in radians internally; converted at the UI boundary.

## Tech stack

- [React 19](https://react.dev/) + [React Router](https://reactrouter.com/)
- [Vite](https://vite.dev/) for dev/build tooling
- [three.js](https://threejs.org/) for the 3D viewport
- `src/lib/attitude.test.mjs` — a standalone Node script (no test
  framework) that round-trips thousands of random and known-value
  conversions across every representation and all 12 Euler sequences to
  verify the math in `attitude.js`

## Getting started

```bash
npm install
npm run dev       # start the dev server with HMR
```

Other scripts:

```bash
npm run build      # production build
npm run preview    # preview the production build locally
npm run lint        # eslint
node src/lib/attitude.test.mjs   # run the conversion round-trip checks
```

## Project structure

```
src/
  lib/attitude.js        conversions between all attitude representations
  lib/attitude.test.mjs  round-trip tests for attitude.js
  lib/theme.js            shared theme tokens/hooks
  components/             AttitudeBench (playground), site chrome, theming
  pages/                   Landing, Playground, TestPrep, tutorial chapters
```
