package app.kynthai.health;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Reschedules medication alarms after device reboot.
 * Without this receiver, every exact alarm set by DoseAlarmPlugin is wiped
 * when the device reboots (Android clears AlarmManager on boot).
 *
 * The manifest already declares RECEIVE_BOOT_COMPLETED; this receiver
 * broadcasts a JS event into the WebView so the app can re-schedule
 * today's remaining reminders.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "KynthaiBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.d(TAG, "Device rebooted — signaling WebView to reschedule alarms");

            // Deliver a JS event to the WebView so medication-alarm-host
            // can re-fetch today's reminders and re-schedule native alarms.
            MainActivity activity = MainActivity.currentInstanceForBoot();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    try {
                        activity.getBridge().getWebView().evaluateJavascript(
                            "window.dispatchEvent(new Event('kynthai:reschedule-alarms'));",
                            null
                        );
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to notify WebView of reboot", e);
                    }
                });
            }
        }
    }
}
