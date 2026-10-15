package app.kynthai.health;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

public class KynthaiFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "KynthaiFCM";
    private static final String CHANNEL_ID = "kynthai_fullscreen_dose_v2";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM Token refreshed: " + token);
        // Deliver to the active MainActivity via static reference
        MainActivity.deliverTokenRefresh(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM Message received from: " + remoteMessage.getFrom());

        // For notification-messages with the app in foreground, the OS does NOT
        // auto-display them — we must build the notification ourselves.
        // For data-only messages, this is the only handler.
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String body = remoteMessage.getNotification().getBody();
            Log.d(TAG, "FCM Notification: " + title + " / " + body);
            showNotification(title, body, remoteMessage.getData());
        } else if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "FCM Data payload: " + remoteMessage.getData());
            String title = remoteMessage.getData().get("title");
            String body = remoteMessage.getData().get("body");
            if (title != null) {
                showNotification(title, body, remoteMessage.getData());
            }
        }
    }

    private void showNotification(String title, String body, java.util.Map<String, String> data) {
        ensureChannel();

        String type = data.getOrDefault("type", "kynthai");
        String url = data.getOrDefault("url", "/patient");
        boolean isDoseAlarm = "dose_alarm".equals(type);

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("url", url);
        intent.putExtra("type", type);
        for (java.util.Map.Entry<String, String> entry : data.entrySet()) {
            intent.putExtra(entry.getKey(), entry.getValue());
        }

        int requestCode = (int) System.currentTimeMillis();
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title != null ? title : "Kynthai")
            .setContentText(body != null ? body : "")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(isDoseAlarm
                ? NotificationCompat.CATEGORY_ALARM
                : NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(new long[]{0, 500, 200, 500});

        if (isDoseAlarm) {
            // Full-screen intent: wake device even when screen is off
            Intent fullScreenIntent = new Intent(this, MainActivity.class);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            fullScreenIntent.putExtra("alarm", "1");
            fullScreenIntent.putExtra("url", url);
            PendingIntent fullScreenPending = PendingIntent.getActivity(
                this, requestCode + 1, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.setFullScreenIntent(fullScreenPending, true);
            builder.setCategory(NotificationCompat.CATEGORY_ALARM);
        }

        NotificationManagerCompat manager = NotificationManagerCompat.from(this);
        try {
            manager.notify(requestCode, builder.build());
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission not granted", e);
        }
    }

    private void ensureChannel() {
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

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
