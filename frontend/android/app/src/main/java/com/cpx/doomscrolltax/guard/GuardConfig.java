package com.cpx.doomscrolltax.guard;

import org.json.JSONObject;

/**
 * Rule numbers for the Reel Guard (the overlay that runs on top of Instagram,
 * Xiaohongshu, Douyin…). Defaults mirror frontend/src/config.js; the web app
 * sends its own values through ReelGuardPlugin.configure().
 */
public final class GuardConfig {
    public int freeReels = 5;
    public int pointsPerReel = 1;
    public int minutesPerPoint = 5;
    public int questionEvery = 5;
    public int wrongWaitSeconds = 5;
    public double volumeStepDown = 0.02;
    public double minVolume = 0.05;
    public int slowAfterReels = 10;
    public int slowTransitionMs = 3000;
    public int decayFullAfterReels = 15;

    /** Being away from every target app this long starts a new session (free reels again). */
    public int sessionGapMinutes = 10;
    /** Scroll events closer together than this are one swipe, i.e. one reel. */
    public int swipeDebounceMs = 900;
    /** Opacity of the grey "decay" layer at full decay, 0..1. */
    public double maxGreyAlpha = 0.6;

    public static GuardConfig fromJson(String json) {
        GuardConfig c = new GuardConfig();
        if (json == null || json.isEmpty()) return c;
        try {
            JSONObject o = new JSONObject(json);
            c.freeReels = o.optInt("freeReels", c.freeReels);
            c.pointsPerReel = o.optInt("pointsPerReel", c.pointsPerReel);
            c.minutesPerPoint = Math.max(1, o.optInt("minutesPerPoint", c.minutesPerPoint));
            c.questionEvery = Math.max(1, o.optInt("questionEvery", c.questionEvery));
            c.wrongWaitSeconds = Math.max(0, o.optInt("wrongWaitSeconds", c.wrongWaitSeconds));
            c.volumeStepDown = o.optDouble("volumeStepDown", c.volumeStepDown);
            c.minVolume = o.optDouble("minVolume", c.minVolume);
            c.slowAfterReels = o.optInt("slowAfterReels", c.slowAfterReels);
            c.slowTransitionMs = Math.max(0, o.optInt("slowTransitionMs", c.slowTransitionMs));
            c.decayFullAfterReels = Math.max(1, o.optInt("decayFullAfterReels", c.decayFullAfterReels));
            c.sessionGapMinutes = Math.max(1, o.optInt("sessionGapMinutes", c.sessionGapMinutes));
            c.swipeDebounceMs = Math.max(100, o.optInt("swipeDebounceMs", c.swipeDebounceMs));
            c.maxGreyAlpha = Math.min(0.9, Math.max(0, o.optDouble("maxGreyAlpha", c.maxGreyAlpha)));
        } catch (Exception ignored) {
            // Bad JSON: keep the defaults.
        }
        return c;
    }
}
