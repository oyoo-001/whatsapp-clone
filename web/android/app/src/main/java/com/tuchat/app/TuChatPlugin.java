package com.tuchat.app;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TuChat")
public class TuChatPlugin extends Plugin {
    private static final String EVENT_INCOMING_MESSAGE = "incomingMessage";
    private static final String EVENT_INCOMING_CALL = "incomingCall";
    private static final String EVENT_CALL_ENDED = "callEnded";

    @Override
    public void load() {
        super.load();
        if (getContext() != null) {
            NotificationHelper.createChannels(getContext());
        }
    }

    @PluginMethod
    public void startForeground(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopForeground(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ForegroundService.class);
        getContext().stopService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void showMessageNotification(PluginCall call) {
        String title = call.getString("title", "");
        String body = call.getString("body", "");
        int senderId = call.getInt("senderId", 0);
        String avatarUrl = call.getString("avatarUrl", "");

        if (getContext() != null) {
            NotificationHelper.showMessageNotification(getContext(), title, body, senderId, avatarUrl);
        }
        call.resolve();
    }

    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        String callerName = call.getString("callerName", "Unknown");
        int callerId = call.getInt("callerId", 0);
        String channelName = call.getString("channelName", "");
        String avatarUrl = call.getString("avatarUrl", "");

        if (getContext() != null) {
            NotificationHelper.showCallNotification(getContext(), callerName, callerId, channelName, avatarUrl);
        }
        call.resolve();
    }

    @PluginMethod
    public void dismissIncomingCall(PluginCall call) {
        int callerId = call.getInt("callerId", 0);
        if (getContext() != null) {
            NotificationHelper.dismissCallNotification(getContext(), callerId);
        }
        call.resolve();
    }

    public void notifyIncomingMessage(String title, String body, int senderId, String avatarUrl) {
        JSObject data = new JSObject();
        data.put("title", title);
        data.put("body", body);
        data.put("senderId", senderId);
        data.put("avatarUrl", avatarUrl);
        notifyListeners(EVENT_INCOMING_MESSAGE, data);
    }

    public void notifyIncomingCall(int callerId, String callerName, String channelName, String callType) {
        JSObject data = new JSObject();
        data.put("callerId", callerId);
        data.put("callerName", callerName);
        data.put("channelName", channelName);
        data.put("callType", callType);
        notifyListeners(EVENT_INCOMING_CALL, data);
    }

    public void notifyCallEnded(int callerId) {
        JSObject data = new JSObject();
        data.put("callerId", callerId);
        notifyListeners(EVENT_CALL_ENDED, data);
    }
}
