package com.cpx.doomscrolltax.guard;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Everything the Reel Guard remembers, kept in SharedPreferences so it survives restarts. */
public final class GuardStore {
    private static final String PREFS = "reel_guard";

    /** Default apps to guard: Instagram, Xiaohongshu, Douyin (+ lite), TikTok, Kuaishou. */
    public static final List<String> DEFAULT_TARGETS = Arrays.asList(
            "com.instagram.android",
            "com.xingin.xhs",
            "com.ss.android.ugc.aweme",
            "com.ss.android.ugc.aweme.lite",
            "com.zhiliaoapp.musically",
            "com.ss.android.ugc.trill",
            "com.smile.gifmaker"
    );

    private final SharedPreferences prefs;

    public GuardStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---- on/off and setup -----------------------------------------------------

    public boolean isEnabled() { return prefs.getBoolean("enabled", true); }
    public void setEnabled(boolean v) { prefs.edit().putBoolean("enabled", v).apply(); }

    /**
     * Armed = the user chose "Continue on other apps" and started the bubble. Nothing is
     * taxed and no bubble is shown until then, even with the accessibility service on.
     */
    public boolean isArmed() { return prefs.getBoolean("armed", false); }
    public void setArmed(boolean v) { prefs.edit().putBoolean("armed", v).apply(); }

    public GuardConfig config() { return GuardConfig.fromJson(prefs.getString("config", "")); }
    public void setConfigJson(String json) { prefs.edit().putString("config", json).apply(); }

    public String questionsJson() { return prefs.getString("questions", ""); }
    public void setQuestionsJson(String json) { prefs.edit().putString("questions", json).apply(); }

    public Set<String> targets() {
        String csv = prefs.getString("targets", "");
        if (csv.isEmpty()) return new HashSet<>(DEFAULT_TARGETS);
        return new HashSet<>(Arrays.asList(csv.split(",")));
    }

    public void setTargets(List<String> packages) {
        prefs.edit().putString("targets", TextUtils.join(",", packages)).apply(); // String.join needs API 26
    }

    // ---- points -------------------------------------------------------------------

    public int points() { return prefs.getInt("points", 0); }
    public void setPoints(int v) { prefs.edit().putInt("points", Math.max(0, v)).apply(); }
    public void addPoints(int n) { setPoints(points() + n); }

    /** When the user last left the guarded apps (0 = currently in one / never). */
    public long awaySince() { return prefs.getLong("awaySince", 0L); }
    public void setAwaySince(long t) { prefs.edit().putLong("awaySince", t).apply(); }

    /**
     * "15 minutes away clears 1 point". Returns how many points were cleared and keeps
     * the remainder of partial time by moving awaySince forward.
     */
    public int applyAwayWaiver(long now, GuardConfig c) {
        long since = awaySince();
        int pts = points();
        if (since <= 0 || pts <= 0) return 0;
        long minutes = (now - since) / 60000L;
        int cleared = Math.min(pts, GuardRules.pointsCleared(minutes, c));
        if (cleared > 0) {
            setPoints(pts - cleared);
            setAwaySince(since + cleared * (long) c.minutesPerPoint * 60000L);
        }
        return cleared;
    }

    // ---- session --------------------------------------------------------------------

    /** Reel number in the current session (1 = the first reel seen). */
    public int sessionReels() { return prefs.getInt("sessionReels", 0); }
    public void setSessionReels(int n) { prefs.edit().putInt("sessionReels", n).apply(); }

    /** Last time a guarded app was on screen; decides when a new session starts. */
    public long lastSeenAt() { return prefs.getLong("lastSeenAt", 0L); }
    public void setLastSeenAt(long t) { prefs.edit().putLong("lastSeenAt", t).apply(); }

    /** The user's own media volume, saved on entry and restored on exit (-1 = none saved). */
    public int savedVolume() { return prefs.getInt("savedVolume", -1); }
    public void setSavedVolume(int v) { prefs.edit().putInt("savedVolume", v).apply(); }

    /** A question was open when the user left: it comes back when they return. */
    public boolean pendingQuestion() { return prefs.getBoolean("pendingQuestion", false); }
    public void setPendingQuestion(boolean v) { prefs.edit().putBoolean("pendingQuestion", v).apply(); }

    public int questionPointer() { return prefs.getInt("qPointer", 0); }
    public void setQuestionPointer(int p) { prefs.edit().putInt("qPointer", p).apply(); }

    public int questionsAsked() { return prefs.getInt("qAsked", 0); }
    public void setQuestionsAsked(int n) { prefs.edit().putInt("qAsked", n).apply(); }

    public void resetAll() {
        prefs.edit()
                .putInt("points", 0)
                .putLong("awaySince", 0L)
                .putInt("sessionReels", 0)
                .putLong("lastSeenAt", 0L)
                .putBoolean("pendingQuestion", false)
                .putInt("qAsked", 0)
                .apply();
    }
}
