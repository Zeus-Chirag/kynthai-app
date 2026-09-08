package app.kynthai.health;

import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class KynthaiFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "KynthaiFCM";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM Token refreshed: " + token);
        sendTokenToServer(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM Message received: " + remoteMessage.getFrom());
        
        // Handle data payload if needed
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "FCM Data payload: " + remoteMessage.getData());
        }
        
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "FCM Notification: " + remoteMessage.getNotification().getTitle() + " / " + remoteMessage.getNotification().getBody());
        }
    }

    private void sendTokenToServer(String token) {
        try {
            // Send token to Capacitor web view via JavaScript interface
            // The web view will call our /api/notifications/fcm/register endpoint
            if (getApplicationContext() instanceof com.getcapacitor.BridgeActivity) {
                com.getcapacitor.BridgeActivity activity = (com.getcapacitor.BridgeActivity) getApplicationContext();
                activity.runOnUiThread(() -> {
                    String js = "window.KynthaiFCM?.onTokenReceived?.('" + token.replace("'", "\\'") + "');";
                    activity.getBridge().getWebView().evaluateJavascript(js, null);
                });
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send FCM token to web view", e);
        }
    }
}