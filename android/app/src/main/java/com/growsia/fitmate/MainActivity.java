package com.growsia.fitmate;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaSaverPlugin.class);
        registerPlugin(TikTokBusinessPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
