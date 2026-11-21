// Every tunable number lives here. M4 sets the final values from the interviews.

export const CONFIG = {
  freeReels: 5,              // golden path: the first N reels of a session are free
  minSlides: 5,              // slide gate: pages with text needed before scrolling
  questionCount: 12,         // questions requested from the backend
  questionEvery: 5,          // a question after every N paid reels (after the free ones)
  wrongWaitSeconds: 10,      // lockout after a wrong answer
  slowAfterReels: 20,        // reels in a session before slow scroll starts
  slowAfterIfOwing: 10,      // ...earlier if the user starts a session still owing points
  slowTransitionMs: 3000,    // swipe duration in slow mode
  normalTransitionMs: 320,
  minutesPerPoint: 15,       // minutes away that clear 1 point
  swipeThresholdPx: 80,
};

// "Demo speed x3" in the demo panel swaps in these values so the full
// journey fits into a 3-minute judging slot.
export const DEMO_OVERRIDES = {
  questionEvery: 2,
  slowAfterReels: 8,
  slowAfterIfOwing: 6,
};
