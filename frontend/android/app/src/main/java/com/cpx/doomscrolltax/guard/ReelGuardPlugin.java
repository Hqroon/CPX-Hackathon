package com.cpx.doomscrolltax.guard;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;

import com.cpx.doomscrolltax.R;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

/**
 * Bridge between the web app (frontend/src/native/reelGuard.js) and the Reel Guard service.
 * Present in both APK variants; the service itself is only declared in the "guard" variant
 * (src/guard/AndroidManifest.xml), so in the "feed" variant getStatus() reports mode "feed".
 */
@CapacitorPlugin(name = "ReelGuard")
public class ReelGuardPlugin extends Plugin {

    private GuardStore store() {
        return new GuardStore(getContext());
    }

    /** "feed" or "guard", from res/values/strings.xml (overridden in the guard variant). */
    private String mode() {
        return getContext().getString(R.string.app_mode);
    }

    private boolean accessibilityEnabled() {
        String enabled = Settings.Secure.getString(getContext().getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null || enabled.isEmpty()) return false;
        ComponentName cn = new ComponentName(getContext(), ReelGuardService.class);
        String full = cn.flattenToString();
        String shortName = cn.flattenToShortString();
        for (String s : enabled.split(":")) {
            if (s.equalsIgnoreCase(full) || s.equalsIgnoreCase(shortName)) return true;
        }
        return false;
    }

    private JSObject status() {
        GuardStore s = store();
        JSObject r = new JSObject();
        r.put("mode", mode());
        r.put("accessibilityEnabled", accessibilityEnabled());
        r.put("running", ReelGuardService.isRunning());
        r.put("enabled", s.isEnabled());
        r.put("points", s.points());
        r.put("sessionReels", s.sessionReels());
        r.put("questionsAsked", s.questionsAsked());
        r.put("hasQuestions", !GuardQuestion.parseList(s.questionsJson()).isEmpty());
        JSArray targets = new JSArray();
        JSArray installed = new JSArray();
        PackageManager pm = getContext().getPackageManager();
        for (String t : s.targets()) {
            targets.put(t);
            if (pm.getLaunchIntentForPackage(t) != null) installed.put(t);
        }
        r.put("targets", targets);
        r.put("installed", installed);
        return r;
    }

    private void start(Intent i) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    /** Opens Settings → Accessibility, where the user switches the Reel Guard on. */
    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        start(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        call.resolve();
    }

    /** Opens this app's info page (Android 13+: ⋮ → "Allow restricted settings" lives here). */
    @PluginMethod
    public void openAppDetails(PluginCall call) {
        start(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName())));
        call.resolve();
    }

    /** Opens a guarded app, e.g. { package: "com.xingin.xhs" }. */
    @PluginMethod
    public void launchApp(PluginCall call) {
        String pkg = call.getString("package");
        Intent i = pkg == null ? null : getContext().getPackageManager().getLaunchIntentForPackage(pkg);
        if (i == null) {
            call.reject("App not installed: " + pkg);
            return;
        }
        start(i);
        call.resolve();
    }

    /**
     * { questions?: [...], config?: {...}, targets?: ["com.instagram.android", ...], enabled?: boolean }
     * Saves what's given and tells the running service to pick it up.
     */
    @PluginMethod
    public void configure(PluginCall call) {
        GuardStore s = store();
        JSArray questions = call.getArray("questions");
        if (questions != null) s.setQuestionsJson(questions.toString());
        JSObject config = call.getObject("config");
        if (config != null) s.setConfigJson(config.toString());
        JSArray targets = call.getArray("targets");
        if (targets != null && targets.length() > 0) {
            List<String> list = new ArrayList<>();
            for (int i = 0; i < targets.length(); i++) {
                String t = targets.optString(i, "");
                if (!t.isEmpty()) list.add(t);
            }
            if (!list.isEmpty()) s.setTargets(list);
        }
        Boolean enabled = call.getBoolean("enabled");
        if (enabled != null) s.setEnabled(enabled);
        ReelGuardService.reload();
        call.resolve(status());
    }

    /** Clears points and the current session (demo reset). */
    @PluginMethod
    public void resetPoints(PluginCall call) {
        store().resetAll();
        ReelGuardService.reload();
        call.resolve(status());
    }
}
