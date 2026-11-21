// First screen of the Android app: use our own feed, or run the tax on top of other apps.
// Owner: M1.
import React from 'react';
import { CONFIG } from '../config.js';
import { LogoMark, MoonArt } from './Illustrations.jsx';

export default function HomeChooser({ onThisApp, onOtherApps, status }) {
  const owed = status?.points || 0;
  return (
    <div className="gate home">
      <div className="gate-card">
        <div className="home-logo"><LogoMark size={56} /></div>
        <div className="brand">Doomscroll Tax · 刷屏税</div>
        <h1>Where do you want to scroll?</h1>
        <p className="gate-body">
          Either way, your first {CONFIG.freeReels} reels are free. Everything after costs you.
        </p>
        <div className="gate-art home-art"><MoonArt /></div>

        <button className="btn primary big home-choice" onClick={onThisApp}>
          <span className="home-choice-text">
            <strong>Continue on this app</strong>
            <small>Our own reel feed</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <button className="btn ghost big home-choice" onClick={onOtherApps}>
          <span className="home-choice-text">
            <strong>Continue with other apps</strong>
            <small>
              Instagram, 小红书 Xiaohongshu, 抖音 Douyin
              {status?.accessibilityEnabled ? ' · Reel Guard on' : ''}
              {owed > 0 ? ` · −${owed} owed` : ''}
            </small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
