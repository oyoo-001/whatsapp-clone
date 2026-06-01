package com.tuchat.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.core.app.NotificationManagerCompat;

public class IncomingCallActivity extends Activity {
    private String channelName;
    private String callerName;
    private int callerId;
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.activity_incoming_call);

        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );

        setTurnScreenOn(true);
        setShowWhenLocked(true);

        Intent intent = getIntent();
        callerName = intent.getStringExtra("callerName");
        callerId = intent.getIntExtra("callerId", 0);
        channelName = intent.getStringExtra("channelName");

        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "TuChat:IncomingCall");
        wakeLock.acquire(30000);

        TextView nameView = findViewById(R.id.callerName);
        TextView statusView = findViewById(R.id.callStatus);
        ImageButton acceptBtn = findViewById(R.id.acceptBtn);
        ImageButton rejectBtn = findViewById(R.id.rejectBtn);

        if (nameView != null) nameView.setText(callerName != null ? callerName : "Unknown");
        if (statusView != null) statusView.setText("Incoming call...");

        if (acceptBtn != null) {
            acceptBtn.setOnClickListener(v -> {
                releaseWakeLock();
                NotificationHelper.dismissCallNotification(this, callerId);
                Intent mainIntent = new Intent(this, MainActivity.class);
                mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                mainIntent.putExtra("channelName", channelName);
                mainIntent.putExtra("callerId", callerId);
                mainIntent.putExtra("action", "acceptCall");
                startActivity(mainIntent);
                finish();
            });
        }

        if (rejectBtn != null) {
            rejectBtn.setOnClickListener(v -> {
                releaseWakeLock();
                NotificationHelper.dismissCallNotification(this, callerId);
                Intent mainIntent = new Intent(this, MainActivity.class);
                mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                mainIntent.putExtra("callerId", callerId);
                mainIntent.putExtra("channelName", channelName);
                mainIntent.putExtra("action", "rejectCall");
                startActivity(mainIntent);
                finish();
            });
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
        }
    }
}
