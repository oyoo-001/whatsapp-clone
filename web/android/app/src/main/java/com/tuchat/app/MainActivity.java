package com.tuchat.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TuChatPlugin.class);
        super.onCreate(savedInstanceState);

        NotificationHelper.createChannels(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null) {
            String action = intent.getStringExtra("action");
            String channelName = intent.getStringExtra("channelName");
            int callerId = intent.getIntExtra("callerId", 0);

            if ("acceptCall".equals(action)) {
                bridge.eval("window.__acceptCall && window.__acceptCall(" +
                        "'" + (channelName != null ? channelName.replaceAll("'", "\\\\'") : "") + "'," +
                        callerId + ")");
            } else if ("rejectCall".equals(action)) {
                bridge.eval("window.__rejectCall && window.__rejectCall(" +
                        "'" + (channelName != null ? channelName.replaceAll("'", "\\\\'") : "") + "'," +
                        callerId + ")");
            }

            if (intent.hasExtra("openChat")) {
                int chatUserId = intent.getIntExtra("openChat", 0);
                bridge.eval("window.__openChat && window.__openChat(" + chatUserId + ")");
            }
        }
    }
}
