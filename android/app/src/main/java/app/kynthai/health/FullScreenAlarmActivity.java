package app.kynthai.health;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.graphics.Color;
import android.view.Gravity;
import android.util.TypedValue;
import android.content.pm.PackageManager;

/**
 * Full-phone takeover for medication / emergency alarms.
 * Shown via full-screen intent even when another app is in the foreground.
 * 
 * Security: validates the originating intent package to prevent unauthorized
 * apps from launching a fake medication reminder screen over the lock screen.
 */
public class FullScreenAlarmActivity extends Activity {
  private static final String TAG = "FullScreenAlarmActivity";
  
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Security: validate the originating package name
    String originatingPackage = getCallingPackage();
    if (originatingPackage == null || !isValidOriginatingPackage(originatingPackage)) {
      Log.e(TAG, "FullScreenAlarmActivity launched from untrusted package: " + originatingPackage);
      // Don't show the alarm — reject it silently
      finish();
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
      KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null) {
        km.requestDismissKeyguard(this, null);
      }
    } else {
      getWindow().addFlags(
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
          | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
          | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
          | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      );
    }
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

    String title = getIntent().getStringExtra("title");
    String body = getIntent().getStringExtra("body");
    if (title == null || title.trim().isEmpty()) title = "Time for your medication";
    if (body == null || body.trim().isEmpty()) body = "Mark Taken or Skip to dismiss this reminder.";

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER);
    root.setBackgroundColor(Color.parseColor("#064e3b")); // brand emerald, not pure black
    root.setPadding(56, 72, 56, 72);

    TextView brand = new TextView(this);
    brand.setText("Kynthai");
    brand.setTextColor(Color.parseColor("#a7f3d0"));
    brand.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
    brand.setGravity(Gravity.CENTER);
    brand.setLetterSpacing(0.12f);
    root.addView(brand);

    TextView label = new TextView(this);
    label.setText("Medication reminder");
    label.setTextColor(Color.parseColor("#ecfdf5"));
    label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
    label.setGravity(Gravity.CENTER);
    root.addView(label);

    TextView t = new TextView(this);
    t.setText(title);
    t.setTextColor(Color.WHITE);
    t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26);
    t.setGravity(Gravity.CENTER);
    t.setPadding(0, 28, 0, 12);
    root.addView(t);

    TextView b = new TextView(this);
    b.setText(body);
    b.setTextColor(Color.parseColor("#d1fae5"));
    b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
    b.setGravity(Gravity.CENTER);
    b.setPadding(0, 0, 0, 40);
    root.addView(b);

    Button open = new Button(this);
    open.setText("Taken / Skip");
    open.setAllCaps(false);
    open.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
    open.setTextColor(Color.parseColor("#064e3b"));
    open.setBackgroundColor(Color.parseColor("#ffffff"));
    open.setPadding(32, 28, 32, 28);
    open.setOnClickListener(v -> {
      android.content.Intent i = new android.content.Intent(this, MainActivity.class);
      i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
      i.putExtra("alarm", "1");
      startActivity(i);
      finish();
    });
    root.addView(open);

    setContentView(root);
  }

  /**
   * Validate that the originating package is allowed to launch this activity.
   * Currently only allows the app itself and system components.
   */
  private boolean isValidOriginatingPackage(String packageName) {
    // Allow the app itself
    String myPackage = getPackageName();
    if (packageName.equals(myPackage)) {
      return true;
    }
    // TODO: Add system package checks if needed (e.g., alarm management)
    // For now, only the app's own components can launch this activity
    return false;
  }
}
