package app.kynthai.health;

import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "KynthaiMain";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DoseAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Register JavaScript interface for FCM token callback
        getBridge().getWebView().addJavascriptInterface(new FcmTokenHandler(), "KynthaiFCM");
        
        // Get FCM token and send to server
        registerFcmToken();
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
                sendTokenToServer(token);
            });
    }

    private void sendTokenToServer(String token) {
        // Call the web endpoint via JavaScript
        String js = "window.KynthaiFCM?.onTokenReceived?.('" + token.replace("'", "\\'") + "');";
        runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(js, null));
    }

    public static class FcmTokenHandler {
        @JavascriptInterface
        public void onTokenReceived(String token) {
            // This is called from the FCM service to send token to web
            Log.d(TAG, "FCM Token received in handler: " + token);
        }
    }
}
