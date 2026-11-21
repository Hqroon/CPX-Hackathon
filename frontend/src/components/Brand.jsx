// Top bar for the light screens: brand mark + name, and the user's initial.
import React from 'react';
import { IconBook } from './Icons.jsx';

export function BrandMark({ size = 28 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <IconBook size={Math.round(size * 0.5)} />
    </span>
  );
}

export default function TopBar({ user }) {
  return (
    <div className="top-bar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">Doomscroll Tax</span>
      </div>
      {user && (
        <span className="avatar-initial" title={`Signed in as ${user.name}`}>
          {(user.name || '?').slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
