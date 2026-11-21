package com.cpx.doomscrolltax;

import android.os.Bundle;

import com.cpx.doomscrolltax.guard.ReelGuardPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local (in-app) plugins must be registered before super.onCreate.
        registerPlugin(ReelGuardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
