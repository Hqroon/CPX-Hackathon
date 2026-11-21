package com.cpx.doomscrolltax.guard;

/**
 * The frustration rules, as pure functions of the reel number n (1, 2, 3… in a session).
 * A line-for-line port of frontend/src/rules/frustration.js so the overlay on
 * Instagram behaves exactly like the in-app feed:
 *
 *   reels 1–5      free: 0 points, normal volume, no question, no slowdown
 *   reel 6+        −1 point each; sound alternates on / muted, 2% quieter per reel
 *   reels 10,15…   a question (every 5 paid reels)
 *   reel 11+       3 s block after each swipe, and the screen greys out progressively
 */
public final class GuardRules {
    private GuardRules() {}

    private static double clamp(double x, double lo, double hi) {
        return Math.min(hi, Math.max(lo, x));
    }

    public static boolean isFree(int n, GuardConfig c) {
        return n >= 1 && n <= c.freeReels;
    }

    /** 0 for free reels, then 1, 2, 3… */
    public static int paidNumber(int n, GuardConfig c) {
        return Math.max(0, n - c.freeReels);
    }

    public static int pointsFor(int n, GuardConfig c) {
        return isFree(n, c) ? 0 : c.pointsPerReel;
    }

    public static boolean asksQuestion(int n, GuardConfig c) {
        int k = paidNumber(n, c);
        return k > 0 && (k - 1) % c.questionEvery == 0; // same as frustration.js: reels 6, 11, 16…
    }

    /** Paid reels alternate: 1st on, 2nd muted, 3rd on… */
    public static boolean muted(int n, GuardConfig c) {
        if (isFree(n, c)) return false;
        return paidNumber(n, c) % 2 == 0;
    }

    /** Volume factor 0..1, applied to the user's own media volume. */
    public static double volume(int n, GuardConfig c) {
        if (isFree(n, c)) return 1.0;
        return clamp(1.0 - c.volumeStepDown * paidNumber(n, c), c.minVolume, 1.0);
    }

    /** True when arriving at reel n should be blocked for slowTransitionMs. */
    public static boolean slow(int n, GuardConfig c) {
        return n > c.slowAfterReels;
    }

    /** 0 (normal) → 1 (fully decayed). */
    public static double decay(int n, GuardConfig c) {
        if (n <= c.slowAfterReels) return 0;
        return clamp((n - c.slowAfterReels) / (double) c.decayFullAfterReels, 0, 1);
    }

    public static int pointsCleared(long minutesAway, GuardConfig c) {
        if (minutesAway <= 0) return 0;
        return (int) (minutesAway / c.minutesPerPoint);
    }
}
