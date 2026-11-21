package com.cpx.doomscrolltax.guard;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.util.Log;
import java.util.HashMap;
import java.util.Map;
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
 * Reel Guard: applies the 看看 rules on top of Instagram, Xiaohongshu, Douyin…
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
    private boolean ownAppForeground = false; // 看看's own screen is open
    private long lastCountAt = 0;
    private boolean blocking = false;
    private boolean quizOpen = false;
    private GuardQuestion currentQuestion;
    private int countdown = 0;

    // ---- lifecycle ----------------------------------------------------------------------

    public static boolean isRunning() {
        return instance != null;
    }

    /** Called by the plugin after the web app arms / disarms or sends new questions / settings. */
    public static void reload() {
        ReelGuardService s = instance;
        if (s != null) s.handler.post(() -> {
            s.cfg = s.store.config();
            if (!s.active()) {
                if (s.inTarget) s.leaveTarget();
                s.ui.hideBubble();
                return;
            }
            if (s.inTarget) s.ui.updateBubble(s.store.points());
            else if (!s.ownAppForeground) s.ui.showBubble(s.store.points());
        });
    }

    /** The tax and the bubble only run after the user started the bubble ("armed"). */
    private boolean active() {
        return store.isEnabled() && store.isArmed();
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        store = new GuardStore(this);
        cfg = store.config();
        ui = new GuardOverlays(this);
        audio = (AudioManager) getSystemService(AUDIO_SERVICE);
        log("service connected, armed=" + store.isArmed());
        // The phone may restart this service (low memory, battery manager). Bring the
        // bubble back so the user can see the guard is still on.
        if (active()) ui.showBubble(store.points());
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

        // Track whether 看看's own screen is open, even before the bubble is started.
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && !IGNORED.contains(pkg)) {
            if (!pkg.equals(getPackageName())) {
                ownAppForeground = false;
            } else if (event.getClassName() != null && event.getClassName().toString().endsWith("MainActivity")) {
                ownAppForeground = true;
            }
        }

        if (!active()) {
            if (inTarget) leaveTarget();
            if (ui.isBubbleShowing()) ui.hideBubble();
            return;
        }

        switch (event.getEventType()) {
            case AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED:
                if (IGNORED.contains(pkg)) return;
                if (pkg.equals(getPackageName())) {
                    // Only 看看's own screen counts, not our overlay windows.
                    CharSequence cls = event.getClassName();
                    if (cls != null && cls.toString().endsWith("MainActivity")) {
                        ownAppForeground = true;
                        foreground = pkg;
                        if (inTarget) leaveTarget();
                        ui.hideBubble(); // the app itself is open: no bubble needed
                    }
                    return;
                }
                boolean target = store.targets().contains(pkg);
                if (target) {
                    ownAppForeground = false;
                    if (!inTarget || !pkg.equals(foreground)) {
                        if (inTarget) leaveTarget(); // switched from one guarded app to another
                        foreground = pkg;
                        enterTarget();
                    }
                } else if (isAppScreen(pkg, event.getClassName())) {
                    // A real screen of another app (home screen, WeChat…): the user left.
                    // Toasts, popups and dialogs from other apps are NOT a real screen, so they
                    // no longer kick the guard off while the user stays in Instagram.
                    ownAppForeground = false;
                    log("left " + foreground + " for " + pkg + "/" + event.getClassName());
                    foreground = pkg;
                    if (inTarget) leaveTarget();
                    ui.showBubble(store.points()); // armed: the bubble floats over any app
                } else {
                    log("ignored window " + pkg + "/" + event.getClassName());
                }
                break;
            case AccessibilityEvent.TYPE_VIEW_SCROLLED:
                if (!store.targets().contains(pkg)) break;
                if (!inTarget || !pkg.equals(foreground)) {
                    // Self-repair: a swipe inside a guarded app proves the user is in it,
                    // even if we missed its window event or a stray window made us leave.
                    log("re-attached to " + pkg + " on scroll");
                    if (inTarget) leaveTarget();
                    foreground = pkg;
                    ownAppForeground = false;
                    enterTarget();
                }
                onSwipe();
                break;
            default:
                break;
        }
    }

    /** Known answers to "is this class a real screen (Activity) of that app?" */
    private final Map<String, Boolean> screenCache = new HashMap<>();

    /**
     * True when (pkg, cls) is an Activity, i.e. the user really switched apps. Toasts,
     * popup menus, dialogs and floating windows of other apps return false.
     */
    private boolean isAppScreen(String pkg, CharSequence clsSeq) {
        if (clsSeq == null) return false;
        String cls = clsSeq.toString();
        if (cls.isEmpty()) return false;
        String key = pkg + "/" + cls;
        Boolean known = screenCache.get(key);
        if (known != null) return known;
        boolean result;
        try {
            getPackageManager().getActivityInfo(new ComponentName(pkg, cls), 0);
            result = true;
        } catch (PackageManager.NameNotFoundException e) {
            // Not an Activity of that app, or the app is hidden from us: fall back to the name.
            result = !(cls.startsWith("android.widget.") || cls.startsWith("android.view.")
                    || cls.startsWith("android.app.Dialog") || cls.startsWith("android.app.AlertDialog")
                    || cls.contains("Toast") || cls.contains("Popup") || cls.contains("Dialog")
                    || cls.contains("FloatWindow") || cls.contains("Overlay"));
        } catch (Exception e) {
            result = false;
        }
        screenCache.put(key, result);
        return result;
    }

    private static void log(String msg) {
        Log.d("ReelGuard", msg);
    }

    private void enterTarget() {
        ui.setWatching(true);
        log("enter " + foreground + " reels=" + store.sessionReels() + " points=" + store.points());
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
            toast("看看 is watching: your first " + cfg.freeReels + " reels are free.");
        }
        if (store.pendingQuestion()) openQuiz(); // can't dodge a question by leaving
    }

    private void leaveTarget() {
        inTarget = false;
        ui.setWatching(false);
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
        ui.removeAllButBubble(); // the bubble stays while armed
        restoreVolume();
    }

    private void onSwipe() {
        long now = System.currentTimeMillis();
        if (blocking || quizOpen) return;
        if (now - lastCountAt < cfg.swipeDebounceMs) return;
        lastCountAt = now;
        store.setLastSeenAt(now);
        int n = store.sessionReels() + 1;
        log("reel " + n);
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
