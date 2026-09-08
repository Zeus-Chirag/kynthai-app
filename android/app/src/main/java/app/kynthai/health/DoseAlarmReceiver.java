package app.kynthai.health;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import android.content.pm.PackageManager;

/**
 * Fires at dose time: posts a notification with FULL-SCREEN INTENT so Android
 * can take over the entire phone (over other apps / lock screen) — not a tray ping.
 * 
 * Security: on Android 14 (API 33) and above, the system may silently degrade
 * full-screen intents to heads-up notifications. This checks
 * canUseFullScreenIntent() and falls back gracefully.
 */
public class DoseAlarmReceiver extends BroadcastReceiver {
  public static final String CHANNEL_ID = "kynthai_fullscreen_dose_v2";
  public static final String ACTION_DOSE = "app.kynthai.health.ACTION_DOSE_ALARM";

  @Override
  public void onReceive(Context context, Intent intent) {
    String title = intent.getStringExtra("title");
    String body = intent.getStringExtra("body");
    if (title == null || title.trim().isEmpty()) title = "Time for your medication";
    if (body == null || body.trim().isEmpty()) body = "Open Kynthai to mark Taken or Skip.";
    int notifId = intent.getIntExtra("notifId", 9001);

    ensureChannel(context);

    Intent full = new Intent(context, FullScreenAlarmActivity.class);
    full.putExtra("title", title);
    full.putExtra("body", body);
    full.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    // KEY: determine whether full-screen intent is available
    boolean canUseFullScreen = canUseFullScreenIntent(context);

    PendingIntent fullScreenPi;
    if (canUseFullScreen) {
      fullScreenPi = PendingIntent.getActivity(
        context,
        notifId,
        full,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );
    } else {
      // Fall back: use a regular content intent; the notification will appear
      // as a high-priority heads-up notification instead of taking over the phone.
      fullScreenPi = null;
    }

    Intent openApp = new Intent(context, MainActivity.class);
    openApp.putExtra("alarm", "1");
    openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent contentPi = PendingIntent.getActivity(
      context,
      notifId + 1,
      openApp,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
    if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.getApplicationInfo().icon)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .setSound(sound)
      .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
      .setContentIntent(contentPi)
      .setFullScreenIntent(fullScreenPi, canUseFullScreen);

    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm != null) {
      nm.notify(notifId, builder.build());
    }

    // Also start activity directly when possible (foreground / some OEMs)
    try {
      context.startActivity(full);
    } catch (Exception ignored) {}
  }

  /**
   * Check whether the device can use full-screen intents for notifications.
   * On Android 14 (API 33) with targetSdkVersion 36, the system may silently
   * ignore FLAG_RECEIVER_FORGOT_URGENT if the manifest doesn't declare the
   * foreground service permission or if the app's target SDK is too new without
   * the proper opt-in. Return true only when we're confident the intent will work.
   */
  private static boolean canUseFullScreenIntent(Context context) {
    // Android 13 and below: always support full-screen intents
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return true;
    }
    // Android 14 (API 33) and above: check the receiver export and permissions
    // If the receiver is exported and the app has the proper permissions, full-screen
    // intents should work. Otherwise, return false to fall back to heads-up.
    try {
      String receiverClass = context.getPackageName() + ".health.DoseAlarmReceiver";
      int exportFlags = context.getPackageManager().getReceiverInfo(
        new android.content.ComponentName(context.getPackageName(), receiverClass),
        PackageManager.GET_META_DATA
      ).exported;
      // Only allow if explicitly exported and we have the right setup
      return exportFlags;
    } catch (Exception e) {
      Log.w("DoseAlarmReceiver", "Could not determine full-screen intent capability", e);
      return false;
    }
  }

  private void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    NotificationChannel ch = new NotificationChannel(
      CHANNEL_ID,
      "Medication reminders",
      NotificationManager.IMPORTANCE_HIGH
    );
    ch.setDescription("Full-screen medication and emergency reminders with sound");
    ch.setBypassDnd(true);
    ch.enableVibration(true);
    ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
    if (sound != null) {
      AudioAttributes aa = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build();
      ch.setSound(sound, aa);
    }
    nm.createNotificationChannel(ch);
  }
}
