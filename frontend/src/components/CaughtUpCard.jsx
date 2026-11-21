import React from 'react';
import { COPY } from '../copy.js';
import Explain from './Explain.jsx';

export default function CaughtUpCard({ onClose, onKeep, explain }) {
  return (
    <div className="caught-up">
      <div className="check" aria-hidden="true">✓</div>
      <h2>{COPY.caughtUp.title}</h2>
      <p>{COPY.caughtUp.body}</p>
      <button className="btn primary" onClick={onClose}>
        {COPY.caughtUp.close}
      </button>
      <button className="btn ghost" onClick={onKeep}>
        {COPY.caughtUp.keep}
      </button>
      <Explain show={explain} text={COPY.explain.friends} />
    </div>
  );
}
