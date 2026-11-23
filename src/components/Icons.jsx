/* Small stroke icons. 20px box, currentColor. */

const S = ({ children, size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const Sun = (p) => (
  <S {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></S>
);
export const Moon = (p) => (
  <S {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></S>
);
export const Reset = (p) => (
  <S {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4v4.5H8" /></S>
);
export const Dice = (p) => (
  <S {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.5" cy="8.5" r="1" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1" fill="currentColor" /><circle cx="15.5" cy="8.5" r="1" fill="currentColor" /><circle cx="8.5" cy="15.5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /></S>
);
export const Play = (p) => (
  <S {...p}><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" /></S>
);
export const Pause = (p) => (
  <S {...p}><path d="M8 5v14M16 5v14" strokeWidth="3" /></S>
);
export const Eye = (p) => (
  <S {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></S>
);
export const EyeOff = (p) => (
  <S {...p}><path d="M3 3l18 18" /><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.7C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></S>
);
export const Arrow = (p) => (
  <S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>
);
export const Back = (p) => (
  <S {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></S>
);
export const Check = (p) => (
  <S {...p}><path d="M4.5 12.5l5 5 10-11" /></S>
);
export const Cross = (p) => (
  <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>
);
export const Flip = (p) => (
  <S {...p}><path d="M7 4L3.5 7.5 7 11" /><path d="M3.5 7.5H15a5 5 0 0 1 0 10h-2" /></S>
);

/** The site mark: a body triad leaning out of a dashed reference triad. */
export function Mark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--card)" stroke="var(--line)" strokeWidth="1.5" />
      <g strokeLinecap="round" strokeWidth="1.6" strokeDasharray="1.5 2.4" stroke="var(--faint)">
        <path d="M14 19L14 6" /><path d="M14 19L26 19" /><path d="M14 19L7 25" />
      </g>
      <g strokeLinecap="round" strokeWidth="2.6">
        <path d="M14 19L22 8" stroke="var(--ax2)" />
        <path d="M14 19L26 24" stroke="var(--ax0)" />
        <path d="M14 19L6 14" stroke="var(--ax1)" />
      </g>
      <circle cx="14" cy="19" r="2.4" fill="var(--primary)" />
    </svg>
  );
}
