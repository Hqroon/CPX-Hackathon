// Soft, flat illustrations drawn for this app (no third-party art).
import React from 'react';

/** Crescent moon inside a circle: the logo mark. */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#8E97FD" />
      <path d="M20.5 8.5a8.5 8.5 0 1 0 3 11.6A7 7 0 0 1 20.5 8.5z" fill="#fff" />
    </svg>
  );
}
