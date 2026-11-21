// Open Doodles illustrations (CC0, see src/assets/doodles/CREDITS.md).
// Inlined so their colours follow the CSS variables --ink-c and --accent-c.
import React from 'react';
import laying from '../assets/doodles/laying.svg?raw';
import sittingreading from '../assets/doodles/sittingreading.svg?raw';
import zombieing from '../assets/doodles/zombieing.svg?raw';
import meditating from '../assets/doodles/meditating.svg?raw';

const ART = { laying, sittingreading, zombieing, meditating };

/** A doodle on a hand-drawn highlighter blob, floating gently. */
export default function Doodle({ name, className = '' }) {
  return (
    <div className={`doodle doodle-${name} ${className}`} aria-hidden="true">
      <svg className="doodle-blob" viewBox="0 0 200 140" preserveAspectRatio="none">
        <path d="M18 78c-6-30 22-58 66-62 40-4 86 2 100 30 14 30-6 66-52 76-44 10-106 4-114-44z" />
      </svg>
      <div className="doodle-art" dangerouslySetInnerHTML={{ __html: ART[name] }} />
    </div>
  );
}
