package com.cpx.doomscrolltax;

import android.content.Intent;
import android.os.Bundle;

import com.cpx.doomscrolltax.guard.ExitWatchService;
import com.cpx.doomscrolltax.guard.ReelGuardPlugin;
import com.cpx.doomscrolltax.guard.ReelGuardService;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local (in-app) plugins must be registered before super.onCreate.
        registerPlugin(ReelGuardPlugin.class);
        super.onCreate(savedInstanceState);
        watchForExit();
    }

    @Override
    public void onResume() {
        super.onResume();
        watchForExit();
        ReelGuardService.setOwnAppVisible(true); // our screen is showing: no bubble needed
    }

    @Override
    public void onPause() {
        ReelGuardService.setOwnAppVisible(false); // going to the background: bubble (if started)
        super.onPause();
    }

    /** Start the tiny service that resets everything when 看看 is swiped away from recents. */
    private void watchForExit() {
        try {
            startService(new Intent(this, ExitWatchService.class));
        } catch (Exception ignored) {
            // Background start not allowed right now: onResume tries again.
        }
    }

    @Override
    public void onDestroy() {
        // Leaving the app for good (back button, swipe away from recents) ends the demo:
        // no bubble, points and reel count back to 0. Not on a screen rotation.
        if (isFinishing()) ReelGuardService.resetForExit(getApplicationContext());
        super.onDestroy();
    }
}
