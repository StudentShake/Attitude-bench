# Attitude Bench redesign (Nov 2026)

## Who it's for, in order

1. **An AE 426 student the night before a quiz.** Has the slides open, has a number that doesn't match, wants to see the thing move and check their work. Probably on a laptop, sometimes on a phone in bed.
2. **Prof. Lovell at a projector.** Needs big, legible, one-click demos: play a 3-2-1 sequence, show the single-axis turn.
3. **Someone checking a sign convention.** Wants the four representations side by side in the course's notation.

The feeling to aim for: "oh, so *that's* what β does." It gets shared when a student sends the Playground to a classmate with "look, it does the 3-2-1 thing for you."

## Fixed

- The math. `attitude.js` and its 13,316 assertions are untouched. A new `course.js` adapter carries the course notation and has its own tests, including the worked examples from the 15 Jul and 23 Jul slides.
- Course notation: [Q] maps frame 1 to frame 2 (inertial to body), α β γ for Euler angles with 3-2-1 as default, SAR as û and θ, quaternions scalar last (q₄ is the scalar).
- Only what was taught: DCM, Euler angles, SAR, quaternions. CRP and MRP are gone from the site. Their library functions and tests stay, unused by the UI, so the verified engine isn't weakened.

## What changed and why

| Before | After | Why |
|---|---|---|
| Four themes | Dark and light, one toggle | Nobody needs Sepia |
| Mono caps labels on everything | Plain sentence-case headings | Eyebrow labels read as AI boilerplate |
| Square, 2–3 px radius, gray panels | Rounded cards, one colour per representation | It looked like a tax form |
| Identity / Gimbal lock / 180° about y buttons | Reset and Random, both animated | Reset is what people mean; one-axis presets were arbitrary |
| Middle-drag to orbit, nothing on touch | Corner axis triad (Fluent style): tap an axis to look down it, tap the centre for the iso view. Right-drag or two fingers to orbit | Works on a phone, matches what students already use in Fluent |
| Gimbal-lock meter, scalar-first toggle, body→inertial toggle, MRP shadow toggle | Removed | Not needed to learn the course material |
| One tutorial chapter | Six chapters, each with drawings and a live demo | Pictures carry the explanation |
| Test Prep "coming soon" | Working practice problems with worked solutions | The exam-week loop |

## Colour code (used everywhere: 3D, cards, tutorial, practice)

- Axes: x red, y green, z blue. Body frame solid, inertial frame dashed and faint, intermediate frames dashed.
- Representations: **[Q] violet**, **α β γ cyan**, **SAR amber**, **q pink**. The SAR axis and its θ arc in 3D are amber too.

## Art direction

Friendly mission-sticker look. Rounded cards, a warm paper background with a dot grid in light mode, a quiet star field in dark mode. A gold-foil spacecraft with blue panels. Bricolage Grotesque for headings, DM Sans for text, DM Mono for numbers. No gradients on surfaces, no glass, no emoji as icons.

## Copy rules

Second person, short sentences, contractions. No em dashes, no "not X, it's Y", no lists of three where two will do, no meta-commentary ("in this chapter we will"). Say the one thing and stop.

## Motion

Every animation is a pure function of time t built on the library (Euler steps use `eulerToQuat` with partial angles, the single turn uses `axisAngleToQuat` with partial θ), so the readouts stay in sync and the scrubber is free. Respects `prefers-reduced-motion`.
