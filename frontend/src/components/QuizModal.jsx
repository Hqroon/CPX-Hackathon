// Question toll. The reel behind it is paused while this is open. Owner: M2.
import React from 'react';
import { COPY } from '../copy.js';
import Explain from './Explain.jsx';

export default function QuizModal({ quiz, onAnswer, explain }) {
  const { q, k, phase, picked, wait } = quiz;
  return (
    <div className="modal-backdrop">
      <div className="quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-question">
        <div className="quiz-head">{COPY.quiz.header(k)}</div>
        <p className="quiz-sub">{COPY.quiz.sub(q.sourcePage)}</p>
        <h2 id="quiz-question">{q.question}</h2>
        <div className="quiz-options">
          {q.options.map((opt, i) => {
            let cls = 'opt';
            if (phase === 'right' && i === q.answerIndex) cls += ' right';
            if (phase === 'wrong' && i === picked) cls += ' wrong';
            return (
              <button key={`${q.id}-${i}-${opt}`} className={cls} disabled={phase !== 'ask'} onClick={() => onAnswer(i)}>
                <span className="opt-letter">{'ABCD'[i]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        {phase === 'right' && (
          <p className="quiz-feedback ok" role="status">
            {COPY.quiz.right} {q.explanation}
          </p>
        )}
        {phase === 'wrong' && (
          <p className="quiz-feedback bad" role="status">
            {COPY.quiz.wrong(wait)}
          </p>
        )}
        <Explain show={explain} text={COPY.explain.quiz} />
      </div>
    </div>
  );
}
