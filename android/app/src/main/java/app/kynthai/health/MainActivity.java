package app.kynthai.health;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "KynthaiMain";
    public static final String CHANNEL_ID = "kynthai_fullscreen_dose_v2";

    // Static reference for the FCM service to deliver token refreshes
    private static MainActivity currentInstance;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DoseAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        currentInstance = this;

        // Create the notification channel at startup — FCM pushes targeting
        // this channel are silently dropped on Android 8+ if it doesn't exist.
        createNotificationChannel();

        // Expose a pull-based interface: the JS hook calls getToken() on mount
        // instead of relying on a push that races against React hydration.
        getBridge().getWebView().addJavascriptInterface(new FcmBridge(), "KynthaiFCMNative");

        // Also keep the push-based path for when the bridge is ready
        registerFcmToken();
    }

    @Override
    protected void onDestroy() {
        currentInstance = null;
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Medication Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Dose alarms and medication reminders");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setLockscreenVisibility(NotificationManager.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void registerFcmToken() {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d(TAG, "FCM Token: " + token);
                sendTokenToWeb(token);
            });
    }

    private void sendTokenToWeb(String token) {
        // JSON-encoded to prevent any injection
        String encoded = JSONObject.quote(token);
        String js = "window.KynthaiFCM?.onTokenReceived?.(" + encoded + ");";
        runOnUiThread(() -> {
            try {
                getBridge().getWebView().evaluateJavascript(js, null);
            } catch (Exception e) {
                Log.e(TAG, "Failed to send token to webview", e);
            }
        });
    }

    /**
     * Static method called by KynthaiFirebaseMessagingService.onNewToken
     * to deliver refreshed tokens to the active activity.
     */
    public static void deliverTokenRefresh(String token) {
        MainActivity activity = currentInstance;
        if (activity != null) {
            activity.sendTokenToWeb(token);
        }
    }

    /**
     * Pull-based JavaScript interface. The React hook calls getToken() on mount
     * (after auth is ready) to retrieve the cached FCM token. This eliminates
     * the race condition where the push-based token delivery fires before
     * React has hydrated.
     */
    public class FcmBridge {
        @JavascriptInterface
        public void getToken() {
            FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        String token = task.getResult();
                        // Deliver to whichever handler is registered
                        String encoded = JSONObject.quote(token);
                        String js = "window.KynthaiFCM?.onTokenReceived?.(" + encoded + ");";
                        runOnUiThread(() -> {
                            try {
                                getBridge().getWebView().evaluateJavascript(js, null);
                            } catch (Exception e) {
                                Log.e(TAG, "Failed to deliver token", e);
                            }
                        });
                    }
                });
        }

        @JavascriptInterface
        public String getTokenSync() {
            // Fallback: return empty — getToken() (async) is the primary path
            return "";
        }
    }
}
