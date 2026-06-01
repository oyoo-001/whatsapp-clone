package com.tuchat.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.graphics.drawable.IconCompat;

public class NotificationHelper {
    public static final String CHANNEL_MESSAGES = "tuchat_messages";
    public static final String CHANNEL_CALLS = "tuchat_calls";
    public static final String CHANNEL_SERVICE = "tuchat_service";

    public static void createChannels(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        NotificationChannel messages = new NotificationChannel(
                CHANNEL_MESSAGES, "Messages",
                NotificationManager.IMPORTANCE_HIGH);
        messages.setDescription("New message notifications");
        messages.setShowBadge(true);
        messages.enableLights(true);
        messages.enableVibration(true);
        messages.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        nm.createNotificationChannel(messages);

        NotificationChannel calls = new NotificationChannel(
                CHANNEL_CALLS, "Calls",
                NotificationManager.IMPORTANCE_HIGH);
        calls.setDescription("Incoming call notifications");
        calls.setShowBadge(true);
        calls.enableVibration(true);
        calls.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            calls.setAllowUseWhileInUse(true);
        }
        nm.createNotificationChannel(calls);

        NotificationChannel service = new NotificationChannel(
                CHANNEL_SERVICE, "TuChat Service",
                NotificationManager.IMPORTANCE_LOW);
        service.setDescription("Keep TuChat running in background");
        service.setShowBadge(false);
        nm.createNotificationChannel(service);
    }

    public static void showMessageNotification(Context context, String title, String body, int senderId, String avatarUrl) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("android.intent.action.MAIN");
        intent.addCategory("android.intent.category.LAUNCHER");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("openChat", senderId);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, senderId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_MESSAGES)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE | Notification.DEFAULT_LIGHTS)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setFullScreenIntent(pendingIntent, true);

        NotificationManagerCompat.from(context).notify(senderId, builder.build());
    }

    public static void showCallNotification(Context context, String callerName, int callerId, String channelName, String avatarUrl) {
        Intent acceptIntent = new Intent(context, IncomingCallActivity.class);
        acceptIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        acceptIntent.putExtra("callerId", callerId);
        acceptIntent.putExtra("callerName", callerName);
        acceptIntent.putExtra("channelName", channelName);
        acceptIntent.putExtra("avatarUrl", avatarUrl);

        PendingIntent fullScreenIntent = PendingIntent.getActivity(
                context, callerId, acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_CALLS)
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(callerName)
                .setContentText("Incoming call...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setAutoCancel(false)
                .setOngoing(true)
                .setFullScreenIntent(fullScreenIntent, true)
                .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE | Notification.DEFAULT_LIGHTS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NotificationManagerCompat.from(context).notify("call_" + callerId, 0, builder.build());

        fullScreenIntent.send();
    }

    public static void dismissCallNotification(Context context, int callerId) {
        NotificationManagerCompat.from(context).cancel("call_" + callerId, 0);
    }
}
