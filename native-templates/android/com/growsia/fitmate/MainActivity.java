package com.growsia.fitmate;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register FitMate's local native gallery plugin before Capacitor builds
        // the bridge so remote FitMate pages can call it through @capacitor/core.
        registerPlugin(MediaSaverPlugin.class);
        super.onCreate(savedInstanceState);

        // Android's button/edge-back gesture comes through this dispatcher.
        // Next.js uses History API entries, so ask the page history first. This
        // prevents a normal swipe-back from closing FitMate while an internal
        // FitMate page is still available in SPA history.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    finishWithSystemBack(this);
                    return;
                }

                webView.evaluateJavascript(
                    "(function(){if(window.history.length>1){window.history.back();return 'back';}return 'none';})()",
                    result -> {
                        if ("\"back\"".equals(result)) {
                            return;
                        }

                        // Fallback for full-document WebView history entries.
                        if (webView.canGoBack()) {
                            webView.goBack();
                            return;
                        }

                        // Only leave the app when neither SPA history nor native
                        // WebView history contains a previous page.
                        finishWithSystemBack(this);
                    }
                );
            }
        });
    }

    private void finishWithSystemBack(OnBackPressedCallback callback) {
        callback.setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
        callback.setEnabled(true);
    }
}
