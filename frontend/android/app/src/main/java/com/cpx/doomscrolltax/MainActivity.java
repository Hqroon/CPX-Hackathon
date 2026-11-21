package com.cpx.doomscrolltax;

import android.os.Bundle;

import com.cpx.doomscrolltax.guard.ReelGuardPlugin;
import com.cpx.doomscrolltax.guard.ReelGuardService;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local (in-app) plugins must be registered before super.onCreate.
        registerPlugin(ReelGuardPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onDestroy() {
        // Leaving the app for good (back button, swipe away from recents) ends the demo:
        // no bubble, points and reel count back to 0. Not on a screen rotation.
        if (isFinishing()) ReelGuardService.resetForExit(getApplicationContext());
        super.onDestroy();
    }
}
