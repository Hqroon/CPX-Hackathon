// First screen: 看看 See See, then two ways to scroll. Owner: M1.
import React from 'react';
import { CONFIG } from '../config.js';
import { BrandMark, Wordmark } from './Brand.jsx';
import { IconLayers, IconShare, IconChevron } from './Icons.jsx';

export default function StartScreen({ onThisApp, onOtherApps, guardStatus, nativeApp }) {
  const owed = guardStatus?.points || 0;
  const armed = !!guardStatus?.armed;
  const otherSub = !nativeApp
    ? 'Android app only · Instagram, 小红书 Xiaohongshu'
    : armed
      ? 'Running as a bubble' + (owed > 0 ? ` · −${owed} owed` : '')
      : 'Instagram · 小红书 Xiaohongshu · 抖音 Douyin';

  return (
    <div className="screen start">
      <div className="screen-scroll start-scroll">
        <div className="start-hero">
          <BrandMark size={76} />
          <Wordmark size="xl" />
          <p className="lede start-lede">
            Your first {CONFIG.freeReels} reels are free. Every reel after that costs you.
          </p>
        </div>

        <div className="start-options">
          <p className="group-label">Where do you want to scroll?</p>
          <div className="card list-card">
            <button className="list-row start-option" onClick={onThisApp}>
              <span className="row-icon"><IconLayers size={18} /></span>
              <span className="row-text">
                <span className="row-title">Continue in the app</span>
                <span className="row-sub">Add your slides, then scroll our reels</span>
              </span>
              <IconChevron size={18} className="row-chevron" />
            </button>
            <button className="list-row start-option" onClick={onOtherApps}>
              <span className={`row-icon ${armed ? 'on' : ''}`}><IconShare size={18} /></span>
              <span className="row-text">
                <span className="row-title">Continue on other apps</span>
                <span className="row-sub">{otherSub}</span>
              </span>
              <IconChevron size={18} className="row-chevron" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
