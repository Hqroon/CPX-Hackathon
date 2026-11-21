package com.cpx.doomscrolltax.guard;

import android.accessibilityservice.AccessibilityService;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Toast;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Reel Guard: applies the Doomscroll Tax rules on top of Instagram, Xiaohongshu, Douyin…
 *
 * How it works:
 *  - TYPE_WINDOW_STATE_CHANGED tells us which app is on screen. Entering a guarded app
 *    starts (or continues) a session and shows the floating points bubble; leaving it
 *    hides everything and restores the user's volume.
 *  - TYPE_VIEW_SCROLLED from the guarded app = the user swiped. Bursts of scroll events
 *    closer than swipeDebounceMs count as one reel.
 *  - For each new reel n, GuardRules decides points, sound, question, slowdown and decay.
 *
 * Limits (by design of Android): we can't pause or slow the other app's video. We cover
 * it (question card / 3 s blocker), silence it (audio focus + media volume), and dim it
 * (grey layer).
 */
public class ReelGuardService extends AccessibilityService {
    private static volatile ReelGuardService instance;

    /** Packages whose window events must not count as "the user left the guarded app". */
    private static final Set<String> IGNORED = new HashSet<>(Arrays.asList(
            "com.android.systemui",
            "android",
            "com.google.android.inputmethod.latin",
            "com.samsung.android.honeyboard",
            "com.touchtype.swiftkey",
            "com.sohu.inputmethod.sogou",
            "com.sohu.inputmethod.sogou.xiaomi",
            "com.baidu.input",
            "com.baidu.input_mi",
            "com.iflytek.inputmethod",
            "com.tencent.wetype"
    ));

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();

    private GuardStore store;
    private GuardConfig cfg;
    private GuardOverlays ui;
    private AudioManager audio;
    private Object focusRequest; // AudioFocusRequest on API 26+

    private String foreground = "";
    private boolean inTarget = false;
    private long lastCountAt = 0;
    private boolean blocking = false;
    private boolean quizOpen = false;
    private GuardQuestion currentQuestion;
    private int countdown = 0;

    // ---- lifecycle ----------------------------------------------------------------------

    public static boolean isRunning() {
        return instance != null;
    }

    /** Called by the plugin after the web app sends new questions / settings. */
    public static void reload() {
        ReelGuardService s = instance;
        if (s != null) s.handler.post(() -> {
            s.cfg = s.store.config();
            if (!s.store.isEnabled() && s.inTarget) s.leaveTarget();
            if (s.inTarget) s.ui.updateBubble(s.store.points());
        });
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        store = new GuardStore(this);
        cfg = store.config();
        ui = new GuardOverlays(this);
        audio = (AudioManager) getSystemService(AUDIO_SERVICE);
    }

    @Override
    public void onInterrupt() {
        // Nothing to interrupt: we give no spoken feedback.
    }

    @Override
    public void onDestroy() {
        if (inTarget) leaveTarget();
        if (ui != null) ui.removeAll();
        instance = null;
        super.onDestroy();
    }

    // ---- events -------------------------------------------------------------------------

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null || store == null) return;
        String pkg = event.getPackageName().toString();

        if (!store.isEnabled()) {
            if (inTarget) leaveTarget();
            return;
        }

        switch (event.getEventType()) {
            case AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED:
                if (pkg.equals(getPackageName()) || IGNORED.contains(pkg)) return;
                boolean target = store.targets().contains(pkg);
                if (target && (!inTarget || !pkg.equals(foreground))) {
                    foreground = pkg;
                    if (!inTarget) enterTarget();
                } else if (!target) {
                    foreground = pkg;
                    if (inTarget) leaveTarget();
                }
                break;
            case AccessibilityEvent.TYPE_VIEW_SCROLLED:
                if (inTarget && pkg.equals(foreground)) onSwipe();
                break;
            default:
                break;
        }
    }

    private void enterTarget() {
        inTarget = true;
        cfg = store.config();
        long now = System.currentTimeMillis();

        int cleared = store.applyAwayWaiver(now, cfg);
        store.setAwaySince(0);

        boolean newSession = now - store.lastSeenAt() > cfg.sessionGapMinutes * 60000L
                || store.sessionReels() <= 0;
        if (newSession) store.setSessionReels(1); // the first reel on screen is reel 1
        store.setLastSeenAt(now);

        if (store.savedVolume() < 0 && audio != null) {
            store.setSavedVolume(audio.getStreamVolume(AudioManager.STREAM_MUSIC));
        }

        ui.showBubble(store.points());
        applyReel(store.sessionReels(), false);

        if (cleared > 0) {
            toast("Welcome back. " + cleared + " point" + (cleared == 1 ? "" : "s")
                    + " cleared while you were away.");
        } else if (newSession) {
            toast("Reel Guard is on: your first " + cfg.freeReels + " reels are free.");
        }
        if (store.pendingQuestion()) openQuiz(); // can't dodge a question by leaving
    }

    private void leaveTarget() {
        inTarget = false;
        long now = System.currentTimeMillis();
        store.setLastSeenAt(now);
        if (store.awaySince() <= 0) store.setAwaySince(now);

        handler.removeCallbacksAndMessages(null);
        blocking = false;
        if (quizOpen) {
            store.setPendingQuestion(true);
            quizOpen = false;
            abandonFocus();
        }
        ui.removeAll();
        restoreVolume();
    }

    private void onSwipe() {
        long now = System.currentTimeMillis();
        if (blocking || quizOpen) return;
        if (now - lastCountAt < cfg.swipeDebounceMs) return;
        lastCountAt = now;
        store.setLastSeenAt(now);
        int n = store.sessionReels() + 1;
        store.setSessionReels(n);
        applyReel(n, true);
    }

    /** Apply every rule for reel n. charge=false re-applies sound/decay without charging. */
    private void applyReel(int n, boolean charge) {
        if (charge) {
            int p = GuardRules.pointsFor(n, cfg);
            if (p > 0) {
                store.addPoints(p);
                ui.updateBubble(store.points());
            }
        }
        applySound(n);
        ui.showGrey(GuardRules.decay(n, cfg) * cfg.maxGreyAlpha);

        if (!charge) return;
        if (GuardRules.asksQuestion(n, cfg)) {
            openQuiz();
        } else if (GuardRules.slow(n, cfg)) {
            block(cfg.slowTransitionMs);
        }
    }

    // ---- sound ----------------------------------------------------------------------------

    /** On / muted alternation and the silent 2%-per-reel fade, on the phone's media volume. */
    private void applySound(int n) {
        if (audio == null) return;
        int base = store.savedVolume() >= 0 ? store.savedVolume()
                : audio.getStreamVolume(AudioManager.STREAM_MUSIC);
        int level = GuardRules.muted(n, cfg) ? 0 : (int) Math.round(base * GuardRules.volume(n, cfg));
        setMediaVolume(level);
    }

    private void setMediaVolume(int level) {
        try {
            // flags = 0: change the volume without showing the system volume slider
            audio.setStreamVolume(AudioManager.STREAM_MUSIC, Math.max(0, level), 0);
        } catch (SecurityException ignored) {
            // Some phones refuse while Do Not Disturb is on; the other rules still apply.
        }
    }

    private void restoreVolume() {
        int saved = store.savedVolume();
        if (saved >= 0 && audio != null) setMediaVolume(saved);
        store.setSavedVolume(-1);
    }

    private void requestFocus() {
        if (audio == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioFocusRequest req = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build())
                        .build();
                audio.requestAudioFocus(req);
                focusRequest = req;
            } else {
                audio.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
        } catch (Exception ignored) {
        }
    }

    private void abandonFocus() {
        if (audio == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest instanceof AudioFocusRequest) {
                audio.abandonAudioFocusRequest((AudioFocusRequest) focusRequest);
            } else {
                audio.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {
        }
        focusRequest = null;
    }

    // ---- slow scroll ------------------------------------------------------------------------

    private void block(int ms) {
        blocking = true;
        ui.showBlocker();
        handler.postDelayed(() -> {
            blocking = false;
            ui.hideBlocker();
        }, ms);
    }

    // ---- question toll -------------------------------------------------------------------------

    private GuardQuestion nextQuestion(String avoidId) {
        List<GuardQuestion> pool = GuardQuestion.parseList(store.questionsJson());
        if (pool.isEmpty()) pool = GuardQuestion.fallback();
        int size = pool.size();
        int p = Math.max(0, store.questionPointer());
        GuardQuestion q = pool.get(p % size);
        if (size > 1 && avoidId != null && avoidId.equals(q.id)) {
            p++;
            q = pool.get(p % size);
        }
        store.setQuestionPointer(p + 1);
        store.setQuestionsAsked(store.questionsAsked() + 1);
        return q.shuffled(random);
    }

    private void openQuiz() {
        quizOpen = true;
        store.setPendingQuestion(true);
        requestFocus();
        setMediaVolume(0); // silence the reel underneath
        currentQuestion = nextQuestion(null);
        ui.showQuiz(currentQuestion, store.questionsAsked(), this::onAnswer);
    }

    private void onAnswer(int index) {
        if (!quizOpen || currentQuestion == null) return;
        ui.setQuizEnabled(false);
        if (index == currentQuestion.answerIndex) {
            ui.markAnswer(index, true);
            String explain = currentQuestion.explanation.isEmpty() ? "" : " " + currentQuestion.explanation;
            ui.setQuizFeedback("Correct. Reel unlocked." + explain, GuardOverlays.goodColor());
            handler.postDelayed(this::closeQuiz, 1400);
        } else {
            ui.markAnswer(index, false);
            countdown = cfg.wrongWaitSeconds;
            tickWrong();
        }
    }

    /** Wrong answer: "A new question in Ns", then a different question. */
    private void tickWrong() {
        if (!quizOpen) return;
        if (countdown <= 0) {
            currentQuestion = nextQuestion(currentQuestion == null ? null : currentQuestion.id);
            ui.setQuestion(currentQuestion, store.questionsAsked());
            ui.setQuizFeedback("", GuardOverlays.goodColor());
            ui.setQuizEnabled(true);
            return;
        }
        ui.setQuizFeedback("Not quite. A new question in " + countdown + "s.", GuardOverlays.badColor());
        countdown--;
        handler.postDelayed(this::tickWrong, 1000);
    }

    private void closeQuiz() {
        quizOpen = false;
        store.setPendingQuestion(false);
        ui.hideQuiz();
        abandonFocus();
        if (inTarget) applySound(store.sessionReels());
    }

    private void toast(String text) {
        try {
            Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {
        }
    }
}
