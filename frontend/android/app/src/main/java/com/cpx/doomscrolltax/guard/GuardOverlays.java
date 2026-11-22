package com.cpx.doomscrolltax.guard;

import android.accessibilityservice.AccessibilityService;
import android.animation.ValueAnimator;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.LinearInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.res.ResourcesCompat;

import com.cpx.doomscrolltax.R;

import java.util.Random;

/**
 * Draws the Reel Guard's windows on top of other apps. Uses TYPE_ACCESSIBILITY_OVERLAY,
 * which an accessibility service may add without the "display over other apps" permission.
 *
 *  - bubble:  draggable pair: the green logo bubble with Loan Points, and a "free reels"
 *             bubble under it counting 5 → 0 (red at 0); tap opens our app
 *  - grey:    see-through grey layer that grows with visual decay (touches pass through)
 *  - blocker: "Loading next reel" cover with a loading bar and our logo riding across it
 *  - quiz:    full-screen question card that swallows touches until answered; confetti and
 *             a cheer when the answer is right
 *
 * Colours and font (Inter) follow the app's dark theme (frontend/src/theme-dark.css).
 */
final class GuardOverlays {
    interface QuizListener {
        void onAnswer(int index);
    }

    /** How many free reels are left in this session (5 → 0). */
    interface FreeLeft {
        int get();
    }

    // Dark theme tokens (src/theme-dark.css)
    private static final int SURFACE = Color.parseColor("#1C1C1E");       // --dk-surface
    private static final int SURFACE_PRESS = Color.parseColor("#2C2C2E"); // --dk-surface-press
    private static final int TEXT = Color.WHITE;                          // --dk-text
    private static final int MUTED = Color.parseColor("#8E8E93");         // --dk-muted
    private static final int ACCENT = Color.parseColor("#3DBB83");        // --dk-accent
    private static final int ACCENT_STRONG = Color.parseColor("#166C47"); // --dk-accent-strong
    private static final int ACCENT_SOFT = Color.argb(36, 61, 187, 131);  // --dk-accent-soft
    private static final int WARN = Color.parseColor("#FF8F7A");          // --dk-warn
    private static final int WARN_SOFT = Color.argb(33, 255, 143, 122);   // --dk-warn-soft
    private static final int HAIRLINE = Color.argb(41, 255, 255, 255);    // --dk-dash
    private static final int RED = Color.parseColor("#E5484D");           // free reels used up
    private static final int LOGO_GREEN = Color.parseColor("#1F8A5B");
    private static final int LOGO_GREEN_DARK = Color.parseColor("#14603F");

    private final AccessibilityService service;
    private final WindowManager wm;
    private final FreeLeft freeLeft;
    private final Random random = new Random();
    private Typeface fontMedium;
    private Typeface fontBold;

    private LinearLayout bubble;      // the draggable pair
    private LinearLayout loanBubble;  // green circle: eye logo + Loan Points
    private TextView bubbleText;
    private LinearLayout freeBubble;  // smaller circle: "FREE" + reels left
    private TextView freeText;
    private WindowManager.LayoutParams bubbleParams;
    private View grey;
    private View blocker;
    private ValueAnimator blockerAnim;
    private FrameLayout quizRoot;
    private TextView quizQuestion;
    private TextView quizFeedback;
    private final LinearLayout[] quizOptions = new LinearLayout[4];
    private final TextView[] quizOptionText = new TextView[4];
    private QuizListener quizListener;

    GuardOverlays(AccessibilityService service, FreeLeft freeLeft) {
        this.service = service;
        this.freeLeft = freeLeft;
        this.wm = (WindowManager) service.getSystemService(AccessibilityService.WINDOW_SERVICE);
        try {
            fontMedium = ResourcesCompat.getFont(service, R.font.inter_medium);
            fontBold = ResourcesCompat.getFont(service, R.font.inter_bold);
        } catch (Exception e) {
            fontMedium = null;
            fontBold = null;
        }
        if (fontMedium == null) fontMedium = Typeface.DEFAULT;
        if (fontBold == null) fontBold = Typeface.DEFAULT_BOLD;
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

    private TextView text(float sp, Typeface face, int color) {
        TextView t = new TextView(service);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTypeface(face);
        t.setTextColor(color);
        t.setIncludeFontPadding(false);
        return t;
    }

    private static GradientDrawable circle(int fill, int strokePx, int stroke) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(fill);
        if (strokePx > 0) d.setStroke(strokePx, stroke);
        return d;
    }

    private static GradientDrawable rounded(int fill, float radiusPx, int strokePx, int stroke) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(radiusPx);
        if (strokePx > 0) d.setStroke(strokePx, stroke);
        return d;
    }

    /** Quick "pop" when a number changes. */
    private static void pop(View v, float to) {
        if (v == null) return;
        v.animate().cancel();
        v.setScaleX(1f);
        v.setScaleY(1f);
        v.animate().scaleX(to).scaleY(to).setDuration(140).setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> v.animate().scaleX(1f).scaleY(1f).setDuration(280)
                        .setInterpolator(new OvershootInterpolator(3f)).start())
                .start();
    }

    /** Small left-right shake (a new Loan Point, a wrong answer). */
    private static void shake(View v) {
        if (v == null) return;
        v.setRotation(0f);
        v.animate().rotation(-10f).setDuration(70).withEndAction(() ->
                v.animate().rotation(8f).setDuration(90).withEndAction(() ->
                        v.animate().rotation(0f).setDuration(120)
                                .setInterpolator(new OvershootInterpolator()).start()
                ).start()).start();
    }

    // ---- bubble pair --------------------------------------------------------------------

    @SuppressLint("ClickableViewAccessibility")
    void showBubble(int points) {
        if (bubble != null) {
            updateBubble(points);
            return;
        }
        bubble = new LinearLayout(service);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setGravity(Gravity.CENTER_HORIZONTAL);
        bubble.setPadding(dp(8), dp(8), dp(8), dp(8)); // room for the pop animation
        bubble.setClipChildren(false);
        bubble.setClipToPadding(false);

        // Loan Points: the green logo bubble
        loanBubble = new LinearLayout(service);
        loanBubble.setOrientation(LinearLayout.VERTICAL);
        loanBubble.setGravity(Gravity.CENTER);
        loanBubble.setElevation(dp(8));
        ImageView eye = new ImageView(service);
        eye.setImageResource(R.drawable.bubble_eye);
        eye.setScaleType(ImageView.ScaleType.FIT_CENTER);
        eye.setAdjustViewBounds(true);
        loanBubble.addView(eye, new LinearLayout.LayoutParams(dp(30), dp(25)));
        bubbleText = text(14, fontBold, Color.WHITE);
        bubbleText.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams tl = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tl.topMargin = dp(2);
        loanBubble.addView(bubbleText, tl);
        bubble.addView(loanBubble, new LinearLayout.LayoutParams(dp(64), dp(64)));

        // Free reels: a smaller bubble underneath, 5 → 0
        freeBubble = new LinearLayout(service);
        freeBubble.setOrientation(LinearLayout.VERTICAL);
        freeBubble.setGravity(Gravity.CENTER);
        freeBubble.setElevation(dp(6));
        // One centred text block ("FREE" small on top, the number big underneath), so the
        // label always sits inside the circle.
        freeText = text(17, fontBold, Color.WHITE);
        freeText.setGravity(Gravity.CENTER);
        freeText.setIncludeFontPadding(false);
        freeBubble.addView(freeText, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        LinearLayout.LayoutParams fl = new LinearLayout.LayoutParams(dp(52), dp(52));
        fl.topMargin = dp(8);
        bubble.addView(freeBubble, fl);

        bubbleParams = params(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, true);
        int screenW = service.getResources().getDisplayMetrics().widthPixels;
        bubbleParams.x = screenW - dp(64 + 16) - dp(4);
        bubbleParams.y = dp(130);

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
        shownPoints = -1;
        shownFree = -1;
        updateBubble(points);
        safeAdd(bubble, bubbleParams);
        bubble.setScaleX(0.4f);
        bubble.setScaleY(0.4f);
        bubble.setAlpha(0f);
        bubble.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(320)
                .setInterpolator(new OvershootInterpolator(2f)).start();
    }

    private boolean watching = false;

    /** Bright ring = Reel Guard is attached to Instagram / Xiaohongshu and counting reels. */
    void setWatching(boolean on) {
        watching = on;
        if (bubble != null) updateBubble(lastPoints);
    }

    private int lastPoints = 0;
    private int shownPoints = -1;
    private int shownFree = -1;

    void updateBubble(int points) {
        lastPoints = points;
        if (bubble == null) return;
        int free = Math.max(0, freeLeft.get());

        // Loan Points: 0 while free reels last, then −1, −2…
        bubbleText.setText(points > 0 ? "−" + points : "0");
        int ring = watching ? Color.WHITE : Color.argb(110, 255, 255, 255);
        loanBubble.setBackground(circle(points > 0 ? LOGO_GREEN_DARK : LOGO_GREEN, dp(watching ? 3 : 2), ring));
        loanBubble.setContentDescription(points + " Loan Points. Tap to open 看看.");
        if (shownPoints >= 0 && points != shownPoints) {
            pop(loanBubble, 1.22f);
            if (points > shownPoints) shake(loanBubble);
        }
        shownPoints = points;

        // Free reels: 5, 4, 3, 2, 1, then a red 0
        android.text.SpannableString label = new android.text.SpannableString("FREE\n" + free);
        label.setSpan(new android.text.style.RelativeSizeSpan(0.5f), 0, 4, 0);
        label.setSpan(new android.text.style.ForegroundColorSpan(Color.argb(220, 255, 255, 255)), 0, 4, 0);
        freeText.setText(label);
        freeBubble.setBackground(free > 0
                ? circle(SURFACE, dp(2), ACCENT)
                : circle(RED, dp(2), Color.WHITE));
        freeBubble.setContentDescription(free + " free reels left");
        if (shownFree >= 0 && free != shownFree) pop(freeBubble, free == 0 ? 1.35f : 1.25f);
        shownFree = free;
    }

    void hideBubble() {
        safeRemove(bubble);
        bubble = null;
        loanBubble = null;
        bubbleText = null;
        freeBubble = null;
        freeText = null;
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

    // ---- 3-second blocker: loading bar with our logo -----------------------------------

    void showBlocker(int durationMs) {
        if (blocker != null) return;
        FrameLayout root = new FrameLayout(service);
        root.setBackgroundColor(Color.argb(170, 0, 0, 0));
        root.setClickable(true); // swallow touches

        LinearLayout box = new LinearLayout(service);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(22), dp(20), dp(22), dp(22));
        box.setBackground(rounded(SURFACE, dp(18), dp(1), HAIRLINE));

        LinearLayout head = new LinearLayout(service);
        head.setOrientation(LinearLayout.HORIZONTAL);
        head.setGravity(Gravity.CENTER_VERTICAL);
        TextView label = text(15, fontBold, TEXT);
        label.setText("Loading next reel");
        head.addView(label, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        final TextView pct = text(14, fontBold, ACCENT);
        pct.setText("0%");
        head.addView(pct);
        box.addView(head, new LinearLayout.LayoutParams(dp(240), ViewGroup.LayoutParams.WRAP_CONTENT));

        // Track with a green fill; the logo rides on the front of the fill.
        final int trackW = dp(240);
        final int logoW = dp(34);
        FrameLayout track = new FrameLayout(service);
        track.setClipChildren(false);
        View rail = new View(service);
        rail.setBackground(rounded(SURFACE_PRESS, dp(6), 0, 0));
        track.addView(rail, new FrameLayout.LayoutParams(trackW, dp(10), Gravity.CENTER_VERTICAL));
        final View fill = new View(service);
        GradientDrawable fillD = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{ACCENT_STRONG, ACCENT});
        fillD.setCornerRadius(dp(6));
        fill.setBackground(fillD);
        final FrameLayout.LayoutParams fillLp = new FrameLayout.LayoutParams(0, dp(10), Gravity.CENTER_VERTICAL);
        track.addView(fill, fillLp);
        final ImageView logo = new ImageView(service);
        logo.setImageResource(R.drawable.logo_eye);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        track.addView(logo, new FrameLayout.LayoutParams(logoW, logoW, Gravity.CENTER_VERTICAL));
        LinearLayout.LayoutParams trackLp = new LinearLayout.LayoutParams(trackW, dp(40));
        trackLp.topMargin = dp(12);
        box.addView(track, trackLp);

        TextView sub = text(12, fontMedium, MUTED);
        sub.setText("看看 is slowing your scroll down");
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subLp.topMargin = dp(6);
        box.addView(sub, subLp);

        root.addView(box, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        blocker = root;
        safeAdd(blocker, params(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, true));

        blockerAnim = ValueAnimator.ofFloat(0f, 1f);
        blockerAnim.setDuration(Math.max(300, durationMs - 150));
        blockerAnim.setInterpolator(new LinearInterpolator());
        blockerAnim.addUpdateListener(a -> {
            float f = (float) a.getAnimatedValue();
            int w = Math.round(trackW * f);
            fillLp.width = w;
            fill.setLayoutParams(fillLp);
            logo.setTranslationX(Math.max(0, Math.min(trackW - logoW, w - logoW / 2f)));
            logo.setRotation((float) Math.sin(f * Math.PI * 6) * 8f); // a little wobble as it travels
            pct.setText(Math.round(f * 100) + "%");
        });
        blockerAnim.start();
    }

    void hideBlocker() {
        if (blockerAnim != null) blockerAnim.cancel();
        blockerAnim = null;
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
        setQuizFeedback("", MUTED);
        setQuizEnabled(true);
    }

    private void buildQuiz() {
        FrameLayout root = new FrameLayout(service);
        root.setBackgroundColor(Color.argb(225, 0, 0, 0));
        root.setClickable(true); // swallow touches so the reel can't be swiped

        LinearLayout card = new LinearLayout(service);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(22), dp(20), dp(20));
        card.setBackground(rounded(SURFACE, dp(18), dp(1), HAIRLINE));

        TextView heading = text(13, fontBold, ACCENT);
        heading.setText("Question");
        heading.setLetterSpacing(0.04f);
        card.addView(heading);

        quizQuestion = text(20, fontBold, TEXT);
        quizQuestion.setLineSpacing(dp(3), 1f);
        LinearLayout.LayoutParams ql = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ql.topMargin = dp(10);
        ql.bottomMargin = dp(8);
        card.addView(quizQuestion, ql);

        for (int i = 0; i < quizOptions.length; i++) {
            final int index = i;
            LinearLayout row = new LinearLayout(service);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(14), dp(13), dp(14), dp(13));
            row.setMinimumHeight(dp(52));
            row.setBackground(rounded(SURFACE_PRESS, dp(12), 0, 0));

            TextView letter = text(15, fontBold, ACCENT);
            letter.setText(String.valueOf((char) ('A' + i)));
            letter.setGravity(Gravity.CENTER);
            row.addView(letter, new LinearLayout.LayoutParams(dp(18), ViewGroup.LayoutParams.WRAP_CONTENT));

            View divider = new View(service); // the small vertical line between letter and answer
            divider.setBackgroundColor(HAIRLINE);
            LinearLayout.LayoutParams dl = new LinearLayout.LayoutParams(dp(1), dp(22));
            dl.leftMargin = dp(12);
            dl.rightMargin = dp(12);
            row.addView(divider, dl);

            TextView answer = text(15, fontMedium, TEXT);
            answer.setLineSpacing(dp(2), 1f);
            row.addView(answer, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

            row.setOnClickListener(v -> {
                if (quizListener != null) quizListener.onAnswer(index);
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(8);
            card.addView(row, lp);
            quizOptions[i] = row;
            quizOptionText[i] = answer;
        }

        quizFeedback = text(14, fontMedium, MUTED);
        quizFeedback.setLineSpacing(dp(2), 1f);
        LinearLayout.LayoutParams fl = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        fl.topMargin = dp(12);
        card.addView(quizFeedback, fl);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        lp.leftMargin = dp(16);
        lp.rightMargin = dp(16);
        root.addView(card, lp);
        quizRoot = root;
        safeAdd(quizRoot, params(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, true));
        card.setTranslationY(dp(40));
        card.setAlpha(0f);
        card.animate().translationY(0).alpha(1f).setDuration(260)
                .setInterpolator(new DecelerateInterpolator()).start();
    }

    void setQuestion(GuardQuestion q, int number) {
        if (quizRoot == null) return;
        quizQuestion.setText(q.question);
        for (int i = 0; i < quizOptions.length; i++) {
            LinearLayout row = quizOptions[i];
            if (i < q.options.length) {
                quizOptionText[i].setText(q.options[i]);
                row.setVisibility(View.VISIBLE);
                row.setBackground(rounded(SURFACE_PRESS, dp(12), 0, 0));
            } else {
                row.setVisibility(View.GONE);
            }
        }
    }

    void markAnswer(int index, boolean right) {
        if (quizRoot == null || index < 0 || index >= quizOptions.length) return;
        quizOptions[index].setBackground(right
                ? rounded(ACCENT_SOFT, dp(12), dp(2), ACCENT)
                : rounded(WARN_SOFT, dp(12), dp(2), WARN));
        if (right) pop(quizOptions[index], 1.04f);
        else shake(quizOptions[index]);
    }

    void setQuizFeedback(String text, int color) {
        if (quizFeedback == null) return;
        quizFeedback.setText(text);
        quizFeedback.setTextColor(color);
        quizFeedback.setVisibility(text.isEmpty() ? View.GONE : View.VISIBLE);
    }

    void setQuizEnabled(boolean enabled) {
        for (LinearLayout row : quizOptions) {
            if (row != null) {
                row.setEnabled(enabled);
                row.setAlpha(enabled ? 1f : 0.85f);
            }
        }
    }

    private static final String[] CHEERS = {
            "Brain 1, Reels 0!", "Nailed it!", "Big brain energy!", "You earned this reel!",
            "Look at you studying!", "That's the one!",
    };

    /** Right answer: confetti over the screen and a cheer that pops in. */
    void celebrate() {
        if (quizRoot == null) return;
        ConfettiView confetti = new ConfettiView(service, random);
        quizRoot.addView(confetti, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout badge = new LinearLayout(service);
        badge.setOrientation(LinearLayout.VERTICAL);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(24), dp(16), dp(24), dp(18));
        badge.setBackground(rounded(ACCENT_STRONG, dp(20), dp(2), ACCENT));
        badge.setElevation(dp(12));
        TextView emoji = text(40, Typeface.DEFAULT, Color.WHITE);
        emoji.setText("🎉");
        emoji.setGravity(Gravity.CENTER);
        badge.addView(emoji);
        TextView cheer = text(18, fontBold, Color.WHITE);
        cheer.setText(CHEERS[random.nextInt(CHEERS.length)]);
        cheer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams cl = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        cl.topMargin = dp(8);
        badge.addView(cheer, cl);
        FrameLayout.LayoutParams bl = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER_HORIZONTAL | Gravity.TOP);
        bl.topMargin = dp(80);
        quizRoot.addView(badge, bl);
        badge.setScaleX(0.3f);
        badge.setScaleY(0.3f);
        badge.setAlpha(0f);
        badge.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(380)
                .setInterpolator(new OvershootInterpolator(2.5f)).start();
        emoji.animate().rotationBy(360f).setDuration(700).setStartDelay(150).start();
        confetti.start();
    }

    /** Falling confetti in the app's colours. */
    private static final class ConfettiView extends View {
        private static final int[] COLORS = {
                Color.parseColor("#3DBB83"), Color.parseColor("#2AA56C"), Color.parseColor("#FFFFFF"),
                Color.parseColor("#FFD166"), Color.parseColor("#7BE0B0"), Color.parseColor("#FF8F7A"),
        };
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final float[] x, y, vx, vy, rot, vr, size;
        private final int[] color;
        private float t = 0f;

        ConfettiView(Context c, Random r) {
            super(c);
            float density = c.getResources().getDisplayMetrics().density;
            int n = 90;
            x = new float[n];
            y = new float[n];
            vx = new float[n];
            vy = new float[n];
            rot = new float[n];
            vr = new float[n];
            size = new float[n];
            color = new int[n];
            for (int i = 0; i < n; i++) {
                x[i] = r.nextFloat();                  // fraction of the width
                y[i] = -0.1f - r.nextFloat() * 0.35f;  // start above the top
                vx[i] = (r.nextFloat() - 0.5f) * 0.25f;
                vy[i] = 0.45f + r.nextFloat() * 0.55f; // screens per second
                rot[i] = r.nextFloat() * 360f;
                vr[i] = (r.nextFloat() - 0.5f) * 720f;
                size[i] = (6 + r.nextFloat() * 6) * density;
                color[i] = COLORS[r.nextInt(COLORS.length)];
            }
        }

        void start() {
            ValueAnimator a = ValueAnimator.ofFloat(0f, 1.8f);
            a.setDuration(1800);
            a.setInterpolator(new LinearInterpolator());
            a.addUpdateListener(v -> {
                t = (float) v.getAnimatedValue();
                invalidate();
            });
            a.start();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            int w = getWidth(), h = getHeight();
            float fade = t > 1.3f ? Math.max(0f, 1f - (t - 1.3f) / 0.5f) : 1f;
            for (int i = 0; i < x.length; i++) {
                float px = (x[i] + vx[i] * t) * w;
                float py = (y[i] + vy[i] * t + 0.25f * t * t) * h;
                paint.setColor(color[i]);
                paint.setAlpha(Math.round(255 * fade));
                canvas.save();
                canvas.translate(px, py);
                canvas.rotate(rot[i] + vr[i] * t);
                canvas.drawRect(-size[i] / 2, -size[i] / 4, size[i] / 2, size[i] / 4, paint);
                canvas.restore();
            }
        }
    }

    static int goodColor() { return ACCENT; }
    static int badColor() { return WARN; }

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
