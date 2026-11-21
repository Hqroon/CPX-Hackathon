// Small inline icon set (stroke icons, inherit currentColor).
import React from 'react';

const Svg = ({ children, size = 22, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const IconHeart = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </Svg>
);
export const IconComment = (p) => (
  <Svg {...p}><path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12z" /></Svg>
);
export const IconShare = (p) => (
  <Svg {...p}><path d="M22 3 11 14" /><path d="M22 3 15 21l-4-7-7-4 18-7z" /></Svg>
);
export const IconSound = (p) => (
  <Svg {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19.5 5.5a9 9 0 0 1 0 13" /></Svg>
);
export const IconMute = (p) => (
  <Svg {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="m17 9 5 6" /><path d="m22 9-5 6" /></Svg>
);
export const IconClose = (p) => (
  <Svg {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
);
export const IconUpload = (p) => (
  <Svg {...p}><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></Svg>
);
export const IconDoc = (p) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Svg>
);
export const IconCheck = (p) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const IconBook = (p) => (
  <Svg {...p}><path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z" /><path d="M12 6v13.5" /></Svg>
);
export const IconLayers = (p) => (
  <Svg {...p}><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></Svg>
);
export const IconChevron = (p) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
export const IconArrow = (p) => (
  <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
);
export const IconCircleCheck = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></Svg>
);
export const IconRotate = (p) => (
  <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Svg>
);
