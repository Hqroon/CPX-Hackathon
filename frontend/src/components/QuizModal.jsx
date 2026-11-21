// Question toll. The reel behind it is paused while this is open. Owner: M2.
import React from 'react';
import { COPY } from '../copy.js';
import { CONFIG } from '../config.js';
import Explain from './Explain.jsx';
import { IconCheck, IconClose } from './Icons.jsx';

export default function QuizModal({ quiz, onAnswer, explain }) {
  const { q, k, phase, picked, wait } = quiz;
  const total = CONFIG.wrongWaitSeconds;
  return (
    <div className="modal-backdrop">
      <div className={`quiz phase-${phase}`} role="dialog" aria-modal="true" aria-labelledby="quiz-question">
        <span className="grabber" aria-hidden="true" />
        <div className="quiz-head">
          <span className="pill pill-soft">{COPY.quiz.header(k)}</span>
        </div>
        <h2 id="quiz-question">{q.question}</h2>
        <p className="quiz-sub">{COPY.quiz.sub(q.sourcePage)}</p>
        <div className="quiz-options">
          {q.options.map((opt, i) => {
            let cls = 'opt';
            const isRight = phase === 'right' && i === q.answerIndex;
            const isWrong = phase === 'wrong' && i === picked;
            if (isRight) cls += ' right';
            if (isWrong) cls += ' wrong';
            return (
              <button key={`${q.id}-${i}-${opt}`} className={cls} disabled={phase !== 'ask'} onClick={() => onAnswer(i)}>
                <span className="opt-letter">
                  {isRight ? <IconCheck size={16} /> : isWrong ? <IconClose size={14} /> : 'ABCD'[i]}
                </span>
                <span className="opt-text">{opt}</span>
              </button>
            );
          })}
        </div>
        {phase === 'right' && (
          <div className="quiz-feedback ok" role="status">
            <p><strong>{COPY.quiz.right}</strong> {q.explanation}</p>
          </div>
        )}
        {phase === 'wrong' && (
          <div className="quiz-feedback bad" role="status">
            <span className="countdown" style={{ '--p': wait / total }}>
              <span>{wait}</span>
            </span>
            <p>{COPY.quiz.wrong(wait)}</p>
          </div>
        )}
        <Explain show={explain} text={COPY.explain.quiz} />
      </div>
    </div>
  );
}
