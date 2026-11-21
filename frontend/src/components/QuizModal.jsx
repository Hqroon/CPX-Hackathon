// Question toll. The reel behind it is paused while this is open. Owner: M2.
// Layout follows the template's card-front / revealed-card screens.
// Phases: loading (waiting for questions from the user's slides) | ask | right | wrong.
import React from 'react';
import { COPY } from '../copy.js';
import { CONFIG } from '../config.js';
import Explain from './Explain.jsx';
import { IconCheck, IconClose, IconRotate } from './Icons.jsx';

export default function QuizModal({ quiz, onAnswer, explain }) {
  const { q, k, phase, picked, wait } = quiz;
  const total = CONFIG.wrongWaitSeconds;
  const loading = phase === 'loading' || !q;
  const progress = phase === 'right' ? '100%' : phase === 'wrong' ? `${(1 - wait / total) * 100}%` : '8%';

  return (
    <div className="modal-backdrop">
      <div className={`quiz phase-${phase}`} role="dialog" aria-modal="true" aria-labelledby="quiz-question" aria-busy={loading}>
        <div className="quiz-top">
          <span className="quiz-paused">Reel paused</span>
          <span className="muted">{COPY.quiz.header(k)}</span>
        </div>
        <div className={`quiz-progress ${loading ? 'indeterminate' : ''}`} aria-hidden="true">
          <span style={loading ? undefined : { width: progress }} />
        </div>

        {loading ? (
          <>
            <div className="card quiz-card">
              <span className="card-label">From your slides</span>
              <h2 id="quiz-question">Writing a question from your slides…</h2>
              <span className="quiz-spinner" aria-hidden="true" />
            </div>
            <div className="note" role="status">
              <IconRotate size={14} />
              <span>This takes a few seconds the first time. Your reel stays paused until you've answered.</span>
            </div>
          </>
        ) : (
          <>
            <div className="card quiz-card">
              {q.sample ? (
                <span className="sample-pill">Sample question</span>
              ) : (
                <span className="card-label">{q.sourcePage ? `From your slides, page ${q.sourcePage}` : 'From your slides'}</span>
              )}
              <h2 id="quiz-question">{q.question}</h2>
              {phase === 'right' && q.explanation && (
                <>
                  <span className="card-rule" aria-hidden="true" />
                  <span className="card-label">Why</span>
                  <p className="quiz-answer">{q.explanation}</p>
                </>
              )}
            </div>

            <p className="group-label">Choose an answer</p>
            <div className="quiz-options">
              {q.options.map((opt, i) => {
                const isRight = phase === 'right' && i === q.answerIndex;
                const isWrong = phase === 'wrong' && i === picked;
                return (
                  <button
                    key={`${q.id}-${i}-${opt}`}
                    className={`opt ${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`}
                    disabled={phase !== 'ask'}
                    onClick={() => onAnswer(i)}
                  >
                    <span className="opt-letter">
                      {isRight ? <IconCheck size={16} /> : isWrong ? <IconClose size={14} /> : 'ABCD'[i]}
                    </span>
                    <span className="opt-text">{opt}</span>
                  </button>
                );
              })}
            </div>

            {phase === 'right' && (
              <div className="quiz-feedback ok" role="status"><IconCheck size={16} /><p>{COPY.quiz.right}</p></div>
            )}
            {phase === 'wrong' && (
              <div className="quiz-feedback bad" role="status">
                <span className="countdown" style={{ '--p': wait / total }}><span>{wait}</span></span>
                <p>{COPY.quiz.wrong(wait)}</p>
              </div>
            )}
            {phase === 'ask' && (
              <div className="note">
                <IconRotate size={14} />
                <span>
                  {q.sample
                    ? "We couldn't write questions from your slides this time, so this one is from our sample deck. Your reel stays paused until you get it right."
                    : 'Your reel stays paused until you get this right.'}
                </span>
              </div>
            )}
          </>
        )}
        <Explain show={explain} text={COPY.explain.quiz} />
      </div>
    </div>
  );
}
