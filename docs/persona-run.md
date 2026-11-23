## Persona: AE 426 student on a phone (375×812), night before Quiz 2

**Task 1. The slide example.** Opened the home page and tapped *Open the Playground*.
- Cards on load: α β γ = ['30.00', '20.00', '10.00']; [Q] rows = [['0.8138', '0.4698', '-0.3420'], ['-0.4410', '0.8826', '0.1632'], ['0.3785', '0.0180', '0.9254']]; û, θ = ['0.1240', '0.6156', '0.7782', '35.82']; q = ['0.0381', '0.1893', '0.2393', '0.9515']
- Slide 25–27 values: [Q] row 1 = 0.813798 0.469846 −0.34202; û = (0.124015, 0.615638, 0.778209), θ = 35.8171°; q = [0.038135 0.189308 0.239298 0.951549]
- Match to displayed precision: **yes**

**Task 2. Find the 3-2-1 angles for a quaternion from the homework.** Typed q = [0.5, 0.5, 0.5, 0.5] into the quaternion card.
- Euler card read α β γ = ['90.00', '0.00', '90.00']; SAR card read û, θ = ['0.5774', '0.5774', '0.5774', '120.00']
- By hand: q = [½ ½ ½ ½] is 120° about (1,1,1)/√3, which for 3-2-1 is α = 90°, β = 0°, γ = 90°.
- Match: **yes**

**Task 3. Watch the sequence.** Tapped *Watch the 3-2-1 sequence*.
- Caption mid-step: “Step 1 of 3: α = 76.0° about Z”
- Caption at the end: “Done. Three turns, one attitude.”

**Task 4. Look straight down Z.** Tapped the Z dot in the corner triad.
- Camera turned to look down the inertial Z axis (screenshot: docs/shots/playground-top-view-375.jpg).

**Task 5. Start over.** Tapped *Reset*.
- Diagonal of [Q] = ['1.0000', '1.0000', '1.0000'], θ = 0.00, SAR card says there's no axis yet: yes

**Task 6. Test Prep.** Opened Test Prep, picked *SAR → QUAT*, typed the answer scalar-first on purpose.
- Given: û
= (0.7026, -0.1460, 0.6965),
θ
= 105°
- Verdict: “Looks like scalar first. The course puts the scalar last, as q₄.”
- After fixing the order: “All correct. Nice.”

Page errors during the run: none

## Stuck points found and fixed

- **Task 2 failed on the first run.** Typing q₁ to q₄ one box at a time renormalised the quaternion after every box, so the other three numbers changed under the student's fingers and the result was α β γ = 89.23°, 5.81°, 78.40°. The cards now keep what you typed on screen until the attitude changes some other way, and say so when the typed vector isn't unit length. Same fix for the DCM and SAR cards. Second run: 90°, 0°, 90°, as above.
- **Test Prep counted an empty check as a wrong attempt.** Checking with nothing typed now asks for an answer first and doesn't touch the score.
- **The scene caption covered the Random button** on laptop widths. It now sits top-right on wide screens and under the buttons on phones.
