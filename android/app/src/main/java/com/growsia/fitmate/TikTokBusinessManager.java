package com.growsia.fitmate;

import android.app.Application;
import android.text.TextUtils;
import android.util.Log;

import com.tiktok.TikTokBusinessSdk;
import com.tiktok.appevents.base.EventName;

import java.util.ArrayList;
import java.util.List;

/**
 * Centralized TikTok App Events SDK bootstrap for FitMate.
 *
 * Credentials are read from BuildConfig values populated by android/app/build.gradle.
 * TIKTOK_APP_SECRET is deliberately NOT used here; an App Secret must remain server-side.
 */
public final class TikTokBusinessManager {
    private static final String TAG = "FitMateTikTok";
    private static boolean initializing = false;
    private static boolean initialized = false;
    private static String initializationError = null;
    private static final List<Runnable> pendingActions = new ArrayList<>();

    private TikTokBusinessManager() {}

    public interface InitializationCallback {
        void onReady();
        void onUnavailable(String reason);
    }

    public static synchronized boolean hasCredentials() {
        return !TextUtils.isEmpty(BuildConfig.TIKTOK_APP_ID)
            && !TextUtils.isEmpty(BuildConfig.TIKTOK_TT_APP_ID)
            && !TextUtils.isEmpty(BuildConfig.TIKTOK_ACCESS_TOKEN);
    }

    public static synchronized boolean isInitialized() {
        return initialized && TikTokBusinessSdk.isInitialized();
    }

    public static synchronized String getInitializationError() {
        return initializationError;
    }

    public static void initialize(Application application, InitializationCallback callback) {
        synchronized (TikTokBusinessManager.class) {
            if (isInitialized()) {
                if (callback != null) callback.onReady();
                return;
            }

            if (!hasCredentials()) {
                initializationError = "TikTok SDK credentials are not configured.";
                if (callback != null) callback.onUnavailable(initializationError);
                return;
            }

            if (initializing) {
                if (callback != null) {
                    pendingActions.add(() -> callback.onReady());
                }
                return;
            }

            initializing = true;
            initializationError = null;
        }

        try {
            TikTokBusinessSdk.TTConfig config = new TikTokBusinessSdk.TTConfig(
                application,
                BuildConfig.TIKTOK_ACCESS_TOKEN
            )
                .setAppId(BuildConfig.TIKTOK_APP_ID)
                .setTTAppId(BuildConfig.TIKTOK_TT_APP_ID)
                // FitMate sends LaunchAPP explicitly after initialization so it is not duplicated.
                .disableLaunchLogging()
                .setLogLevel(BuildConfig.DEBUG
                    ? TikTokBusinessSdk.LogLevel.DEBUG
                    : TikTokBusinessSdk.LogLevel.NONE);

            TikTokBusinessSdk.initializeSdk(config, new TikTokBusinessSdk.TTInitCallback() {
                @Override
                public void success() {
                    List<Runnable> queued;
                    synchronized (TikTokBusinessManager.class) {
                        initialized = true;
                        initializing = false;
                        initializationError = null;
                        queued = new ArrayList<>(pendingActions);
                        pendingActions.clear();
                    }

                    Log.i(TAG, "TikTok Business SDK initialized.");
                    if (callback != null) callback.onReady();
                    for (Runnable action : queued) {
                        try {
                            action.run();
                        } catch (Throwable error) {
                            Log.w(TAG, "Deferred TikTok action failed.", error);
                        }
                    }
                }

                @Override
                public void fail(int code, String msg) {
                    synchronized (TikTokBusinessManager.class) {
                        initialized = false;
                        initializing = false;
                        initializationError = "TikTok SDK init failed (" + code + "): " + msg;
                        pendingActions.clear();
                    }
                    Log.w(TAG, initializationError);
                    if (callback != null) callback.onUnavailable(initializationError);
                }
            });
        } catch (Throwable error) {
            synchronized (TikTokBusinessManager.class) {
                initialized = false;
                initializing = false;
                initializationError = "TikTok SDK init exception: " + error.getMessage();
                pendingActions.clear();
            }
            Log.w(TAG, initializationError, error);
            if (callback != null) callback.onUnavailable(initializationError);
        }
    }

    /** Queue an action while SDK initialization is still in progress. */
    public static boolean runWhenReady(Application application, Runnable action) {
        boolean runImmediately = false;
        boolean shouldInitialize = false;

        synchronized (TikTokBusinessManager.class) {
            if (isInitialized()) {
                runImmediately = true;
            } else {
                if (!hasCredentials()) {
                    return false;
                }
                pendingActions.add(action);
                shouldInitialize = !initializing;
            }
        }

        // Never execute SDK callbacks while holding the manager lock.
        if (runImmediately) {
            action.run();
            return true;
        }
        if (shouldInitialize) {
            initialize(application, null);
        }
        return true;
    }

    public static void trackLaunch(Application application) {
        runWhenReady(application, () -> TikTokBusinessSdk.trackTTEvent(EventName.LAUNCH_APP));
    }
}
