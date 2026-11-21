import React from 'react';

/** Explain-mode badge: shows why a frustrating mechanism exists. */
export default function Explain({ show, text, className = '' }) {
  if (!show) return null;
  return (
    <div className={`explain ${className}`}>
      <span className="explain-tag">Why</span>
      {text}
    </div>
  );
}
