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
 * HIPAA COMPLIANCE: Medication names are NEVER shown or spoken aloud.
 * Only generic message: "Time for your medication"
 * 
 * Notification behavior:
 *   • Shows generic reminder (no drug names visible)
 *   • Plays ringtone alarm sound
 *   • Vibrates pattern
 *   • Opens full-screen alarm when tapped
 */
public class DoseAlarmReceiver extends BroadcastReceiver {
  public static final String CHANNEL_ID = "kynthai_fullscreen_dose_v2";
  public static final String ACTION_DOSE = "app.kynthai.health.ACTION_DOSE_ALARM";

  @Override
  public void onReceive(Context context, Intent intent) {
    // HIPAA COMPLIANCE: Never show medication name in notification
    // Use GENERIC message only - do NOT include drug names
    String title = "Time for your medication";
    String body = "Open Kynthai to mark Taken or Skip.";
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
      // Fallback: just show a standard notification
      fullScreenPi = null;
    }

    // Play alarm sound (ringtone only, no speech)
    Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
    if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.getApplicationInfo().icon)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .setSound(sound)
      .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
      .setContentIntent(fullScreenPi)
      .setFullScreenIntent(fullScreenPi, canUseFullScreen);

    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm != null) {
      nm.notify(notifId, builder.build());
    }
  }

  /**
   * Ensures the notification channel exists with high importance
   * for full-screen intents on Android 13+.
   */
  private void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm == null) return;

      NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
      if (ch == null) {
        ch = new NotificationChannel(
          CHANNEL_ID,
          "Medication Reminders",
          NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Full-screen medication reminders with sound");
        ch.setBypassDnd(true);
        ch.enableVibration(true);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        
        // Set alarm sound for the channel
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
  }

  /**
   * Checks whether full-screen intent permission is allowed.
   * On Android 14 (API 33), this requires USE_FULL_SCREEN_INTENT permission.
   */
  private boolean canUseFullScreenIntent(Context context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      return nm != null && nm.canUseFullScreenIntent();
    }
    return true; // Allow on older Android versions
  }
}
