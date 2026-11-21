package com.cpx.doomscrolltax.guard;

import android.accessibilityservice.AccessibilityService;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import com.cpx.doomscrolltax.R;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/**
 * Draws the Reel Guard's windows on top of other apps. Uses TYPE_ACCESSIBILITY_OVERLAY,
 * which an accessibility service may add without the "display over other apps" permission.
 *
 *  - bubble:  small draggable circle showing points owed; tap opens our app
 *  - grey:    see-through grey layer that grows with visual decay (touches pass through)
 *  - blocker: 3-second "loading next reel" cover that swallows touches
 *  - quiz:    full-screen question card that swallows touches until answered
 */
final class GuardOverlays {
    interface QuizListener {
        void onAnswer(int index);
    }

    private static final int PRIMARY = Color.parseColor("#8E97FD");
    private static final int NAVY = Color.parseColor("#03174C");
    private static final int BAD = Color.parseColor("#F2566B");
    private static final int GOOD = Color.parseColor("#3DA56F");
    private static final int LOGO_GREEN = Color.parseColor("#1F8A5B");
    private static final int LOGO_GREEN_DARK = Color.parseColor("#14603F");
    private static final int INK = Color.parseColor("#3F414E");

    private final AccessibilityService service;
    private final WindowManager wm;

    private LinearLayout bubble;   // green circle: eye logo on top, points underneath
    private TextView bubbleText;
    private WindowManager.LayoutParams bubbleParams;
    private View grey;
    private View blocker;
    private View quizRoot;
    private TextView quizHeader;
    private TextView quizQuestion;
    private TextView quizFeedback;
    private final Button[] quizButtons = new Button[4];
    private QuizListener quizListener;

    GuardOverlays(AccessibilityService service) {
        this.service = service;
        this.wm = (WindowManager) service.getSystemService(AccessibilityService.WINDOW_SERVICE);
    }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v,
                service.getResources().getDisplayMetrics()));
    }

    private WindowManager.LayoutParams params(int w, int h, boolean touchable) {
        int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
        if (!touchable) flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                w, h, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, flags, PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.TOP | Gravity.START;
        return p;
    }

    private void safeAdd(View v, WindowManager.LayoutParams p) {
        try {
            wm.addView(v, p);
        } catch (Exception ignored) {
            // Service not ready or window already added.
        }
    }

    private void safeRemove(View v) {
        if (v == null) return;
        try {
            wm.removeView(v);
        } catch (Exception ignored) {
            // Already removed.
        }
    }

    private static GradientDrawable rounded(int color, float radiusPx) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radiusPx);
        return d;
    }

    // ---- bubble ---------------------------------------------------------------------

    @SuppressLint("ClickableViewAccessibility")
    void showBubble(int points) {
        if (bubble != null) {
            updateBubble(points);
            return;
        }
        bubble = new LinearLayout(service);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setGravity(Gravity.CENTER);
        bubble.setElevation(dp(8));
        ImageView eye = new ImageView(service);
        eye.setImageResource(R.drawable.bubble_eye);
        eye.setScaleType(ImageView.ScaleType.FIT_CENTER);
        eye.setAdjustViewBounds(true);
        bubble.addView(eye, new LinearLayout.LayoutParams(dp(30), dp(25)));
        bubbleText = new TextView(service);
        bubbleText.setGravity(Gravity.CENTER);
        bubbleText.setTextColor(Color.WHITE);
        bubbleText.setTypeface(Typeface.DEFAULT_BOLD);
        bubbleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        bubbleText.setIncludeFontPadding(false);
        LinearLayout.LayoutParams tl = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tl.topMargin = dp(2);
        bubble.addView(bubbleText, tl);
        int size = dp(64);
        bubbleParams = params(size, size, true);
        int screenW = service.getResources().getDisplayMetrics().widthPixels;
        bubbleParams.x = screenW - size - dp(12);
        bubbleParams.y = dp(140);

        bubble.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startX, startY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startX = bubbleParams.x;
                        startY = bubbleParams.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX;
                        float dy = e.getRawY() - downY;
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true;
                        bubbleParams.x = startX + Math.round(dx);
                        bubbleParams.y = startY + Math.round(dy);
                        try {
                            wm.updateViewLayout(bubble, bubbleParams);
                        } catch (Exception ignored) {
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) openOurApp();
                        return true;
                    default:
                        return false;
                }
            }
        });
        updateBubble(points);
        safeAdd(bubble, bubbleParams);
    }

    private boolean watching = false;

    /** Green ring = Reel Guard is attached to Instagram / Xiaohongshu and counting reels. */
    void setWatching(boolean on) {
        watching = on;
        if (bubble != null) updateBubble(lastPoints);
    }

    private int lastPoints = 0;

    void updateBubble(int points) {
        lastPoints = points;
        if (bubble == null) return;
        bubbleText.setText(points > 0 ? "−" + points : "0");
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(points > 0 ? LOGO_GREEN_DARK : LOGO_GREEN); // logo green; darker once points are owed
        d.setStroke(dp(watching ? 3 : 2), watching ? Color.WHITE : Color.argb(110, 255, 255, 255)); // bright ring = counting reels
        bubble.setBackground(d);
        bubble.setContentDescription(points + " points owed. Tap to open 看看.");
    }

    void hideBubble() {
        safeRemove(bubble);
        bubble = null;
        bubbleText = null;
    }

    private void openOurApp() {
        Intent i = service.getPackageManager().getLaunchIntentForPackage(service.getPackageName());
        if (i == null) return;
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            service.startActivity(i);
        } catch (Exception ignored) {
        }
    }

    // ---- grey decay layer -------------------------------------------------------------

    /** alpha 0..1; 0 removes the layer. Touches always pass through to the app below. */
    void showGrey(double alpha) {
        if (alpha <= 0.001) {
            hideGrey();
            return;
        }
        int a = (int) Math.round(Math.min(1, alpha) * 255);
        int color = Color.argb(a, 110, 112, 120);
        if (grey == null) {
            grey = new View(service);
            grey.setBackgroundColor(color);
            safeAdd(grey, params(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, false));
        } else {
            grey.setBackgroundColor(color);
        }
    }

    void hideGrey() {
        safeRemove(grey);
        grey = null;
    }

    // ---- 3-second blocker --------------------------------------------------------------

    void showBlocker() {
        if (blocker != null) return;
        FrameLayout root = new FrameLayout(service);
        root.setBackgroundColor(Color.argb(150, 0, 0, 0));
        root.setClickable(true); // swallow touches

        LinearLayout box = new LinearLayout(service);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(dp(28), dp(22), dp(28), dp(22));
        box.setMinimumWidth(dp(220)); // room for the whole "Loading next reel…" line
        box.setBackground(rounded(Color.argb(235, 20, 96, 63), dp(20))); // logo green

        ProgressBar spinner = new ProgressBar(service);
        box.addView(spinner, new LinearLayout.LayoutParams(dp(44), dp(44)));

        TextView label = new TextView(service);
        label.setText("Loading next reel…");
        label.setTextColor(Color.WHITE);
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        label.setTypeface(Typeface.DEFAULT_BOLD);
        label.setGravity(Gravity.CENTER);
        label.setSingleLine(true);
        label.setPadding(0, dp(12), 0, 0);
        box.addView(label, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        root.addView(box, lp);
        blocker = root;
        safeAdd(blocker, params(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, true));
    }

    void hideBlocker() {
        safeRemove(blocker);
        blocker = null;
    }

    // ---- question card ---------------------------------------------------------------

    boolean isQuizShowing() {
        return quizRoot != null;
    }

    void showQuiz(GuardQuestion q, int number, QuizListener listener) {
        quizListener = listener;
        if (quizRoot == null) buildQuiz();
        setQuestion(q, number);
        setQuizFeedback("", INK);
        setQuizEnabled(true);
    }

    private void buildQuiz() {
        FrameLayout root = new FrameLayout(service);
        root.setBackgroundColor(Color.argb(215, 3, 23, 76));
        root.setClickable(true); // swallow touches so the reel can't be swiped

        LinearLayout card = new LinearLayout(service);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(22), dp(20), dp(20));
        card.setBackground(rounded(Color.WHITE, dp(24)));

        quizHeader = new TextView(service);
        quizHeader.setTextColor(PRIMARY);
        quizHeader.setTypeface(Typeface.DEFAULT_BOLD);
        quizHeader.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        quizHeader.setLetterSpacing(0.08f);
        card.addView(quizHeader);

        TextView sub = new TextView(service);
        sub.setText("Answer to keep scrolling. Your reel is silenced.");
        sub.setTextColor(Color.parseColor("#A1A4B2"));
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        sub.setPadding(0, dp(4), 0, dp(10));
        card.addView(sub);

        quizQuestion = new TextView(service);
        quizQuestion.setTextColor(INK);
        quizQuestion.setTypeface(Typeface.DEFAULT_BOLD);
        quizQuestion.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        quizQuestion.setPadding(0, 0, 0, dp(12));
        card.addView(quizQuestion);

        for (int i = 0; i < quizButtons.length; i++) {
            final int index = i;
            Button b = new Button(service);
            b.setAllCaps(false);
            b.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
            b.setTextColor(INK);
            b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
            b.setBackground(rounded(Color.parseColor("#F2F3F7"), dp(14)));
            b.setPadding(dp(14), dp(10), dp(14), dp(10));
            b.setOnClickListener(v -> {
                if (quizListener != null) quizListener.onAnswer(index);
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(8);
            card.addView(b, lp);
            quizButtons[i] = b;
        }

        quizFeedback = new TextView(service);
        quizFeedback.setTypeface(Typeface.DEFAULT_BOLD);
        quizFeedback.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        quizFeedback.setPadding(0, dp(12), 0, 0);
        card.addView(quizFeedback);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        lp.leftMargin = dp(18);
        lp.rightMargin = dp(18);
        root.addView(card, lp);
        quizRoot = root;
        safeAdd(quizRoot, params(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, true));
    }

    void setQuestion(GuardQuestion q, int number) {
        if (quizRoot == null) return;
        quizHeader.setText("TOLL BOOTH · QUESTION " + number);
        quizQuestion.setText(q.question);
        for (int i = 0; i < quizButtons.length; i++) {
            Button b = quizButtons[i];
            if (i < q.options.length) {
                b.setText((char) ('A' + i) + "   " + q.options[i]);
                b.setVisibility(View.VISIBLE);
                b.setBackground(rounded(Color.parseColor("#F2F3F7"), dp(14)));
            } else {
                b.setVisibility(View.GONE);
            }
        }
    }

    void markAnswer(int index, boolean right) {
        if (quizRoot == null || index < 0 || index >= quizButtons.length) return;
        quizButtons[index].setBackground(rounded(right ? Color.parseColor("#DDF3E6") : Color.parseColor("#FFE3E7"), dp(14)));
    }

    void setQuizFeedback(String text, int color) {
        if (quizFeedback == null) return;
        quizFeedback.setText(text);
        quizFeedback.setTextColor(color);
    }

    void setQuizEnabled(boolean enabled) {
        for (Button b : quizButtons) {
            if (b != null) {
                b.setEnabled(enabled);
                b.setAlpha(enabled ? 1f : 0.7f);
            }
        }
    }

    static int goodColor() { return GOOD; }
    static int badColor() { return BAD; }

    void hideQuiz() {
        safeRemove(quizRoot);
        quizRoot = null;
        quizListener = null;
    }

    /** Everything except the floating bubble (used when leaving a guarded app while armed). */
    void removeAllButBubble() {
        hideQuiz();
        hideBlocker();
        hideGrey();
    }

    boolean isBubbleShowing() {
        return bubble != null;
    }

    void removeAll() {
        removeAllButBubble();
        hideBubble();
    }
}
