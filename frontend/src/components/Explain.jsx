import React from 'react';
import { IconCircleCheck } from './Icons.jsx';

/** Explain-mode note: shows why a frustrating mechanism exists (styled like a design annotation). */
export default function Explain({ show, text, className = '' }) {
  if (!show) return null;
  return (
    <div className={`explain ${className}`}>
      <span className="explain-tag"><IconCircleCheck size={14} /> Why this exists</span>
      <span>{text}</span>
    </div>
  );
}
