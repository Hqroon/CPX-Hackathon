package com.cpx.doomscrolltax.guard;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * Tiny service whose only job is to hear "看看 was swiped away from recent apps"
 * (onTaskRemoved). Then the bubble goes and the Loan Points reset to 0, so the next
 * judge starts clean. MainActivity starts it while the app is open.
 */
public class ExitWatchService extends Service {
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        ReelGuardService.resetForExit(getApplicationContext());
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
