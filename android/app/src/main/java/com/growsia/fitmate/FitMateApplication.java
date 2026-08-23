package com.growsia.fitmate;

import android.app.Application;
import android.util.Log;

/** Application bootstrap for native integrations used by FitMate. */
public class FitMateApplication extends Application {
    private static final String TAG = "FitMateApplication";

    @Override
    public void onCreate() {
        super.onCreate();

        TikTokBusinessManager.initialize(this, new TikTokBusinessManager.InitializationCallback() {
            @Override
            public void onReady() {
                TikTokBusinessManager.trackLaunch(FitMateApplication.this);
            }

            @Override
            public void onUnavailable(String reason) {
                // Missing credentials are expected until TikTok Events Manager values are filled in.
                Log.i(TAG, reason);
            }
        });
    }
}
