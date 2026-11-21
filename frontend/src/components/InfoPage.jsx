// "Click Here for More Information": the rules and how 看看 works, written for judges.
// Numbers come from config.js so this page always matches the app. Owner: M1.
import React from 'react';
import { CONFIG } from '../config.js';
import TopBar from './Brand.jsx';
import BackgroundLogo from './BackgroundLogo.jsx';

export default function InfoPage({ onBack }) {
  const free = CONFIG.freeReels;
  const every = CONFIG.questionEvery;
  const firstQ = free + every;
  const qReels = [firstQ, firstQ + every, firstQ + 2 * every].join(', ');

  return (
    <div className="screen info-page">
      <BackgroundLogo />
      <TopBar right={<button type="button" className="btn small back-btn" onClick={onBack}>← Back</button>} />
      <div className="screen-scroll">
        <p className="eyebrow">About 看看 See See</p>
        <h1 className="title">Scroll as much as you like. It just costs you.</h1>
        <p className="lede">
          看看 doesn't block social media. It puts a price on every extra reel and makes you pay in Loan Points, study questions and patience.
        </p>

        <section className="info-section" aria-labelledby="info-rules">
          <h2 id="info-rules">The rules</h2>
          <ol className="info-list">
            <li>
              <strong>{free} free reels.</strong> The first {free} reels of every session cost nothing.
            </li>
            <li>
              <strong>Every reel after that is a loan.</strong> From reel {free + 1}, each reel you watch adds
              {' '}{CONFIG.pointsPerReel} Loan Point. The bubble shows your total.
            </li>
            <li>
              <strong>A question every {every} reels.</strong> On reels {qReels} and so on, a question from your own
              lecture slides covers the reel. Answer it right to keep scrolling. Answer wrong and you wait
              {' '}{CONFIG.wrongWaitSeconds} seconds for a new question.
            </li>
            <li>
              <strong>It gets less fun.</strong> After the free reels the sound turns on and off and gets quieter.
              From reel {CONFIG.slowAfterReels + 1}, each new reel takes {CONFIG.slowTransitionMs / 1000} seconds to
              load and the screen slowly turns grey.
            </li>
            <li>
              <strong>Pay the loan back by leaving.</strong> Every {CONFIG.minutesPerPoint} minutes away from the
              app clears 1 Loan Point.
            </li>
          </ol>
        </section>

        <section className="info-section" aria-labelledby="info-how">
          <h2 id="info-how">How it works</h2>
          <ol className="info-list">
            <li>
              <strong>An Android app (APK).</strong> Upload your lecture slides as PDFs. AI writes multiple-choice
              questions from them, so every question is about your course.
            </li>
            <li>
              <strong>Start the bubble.</strong> Tap <em>Continue on other apps</em>, then <em>Start 看看</em>. The
              app shrinks into a small green bubble that floats on top of other apps and shows your Loan Points.
            </li>
            <li>
              <strong>Scroll Instagram or Xiaohongshu as usual.</strong> 看看 uses Android's accessibility service to
              notice which app is open and each time you swipe to a new reel. Only swipes in the reels player count;
              scrolling the normal feed doesn't. It checks which part of the app is scrolling, never what's on your
              screen.
            </li>
            <li>
              <strong>The rules run on top of their reels.</strong> Question cards, the loading cover, the grey layer
              and the sound changes are drawn over Instagram and Xiaohongshu, so there's no way to skip them.
            </li>
            <li>
              <strong>Stop any time.</strong> Tap the bubble to come back to 看看. Close 看看 from recent apps to
              switch everything off and reset the Loan Points to 0.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
