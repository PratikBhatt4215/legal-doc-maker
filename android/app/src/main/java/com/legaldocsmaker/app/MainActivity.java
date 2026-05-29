package com.legaldocsmaker.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Disable rubber-band/overscroll on the Capacitor WebView
        // Capacitor's Bridge creates its own WebView — we find it after super.onCreate()
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Completely kill overscroll bounce / rubber-band effect
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                // Remove scroll glow / edge glow effects
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
            }
        } catch (Exception e) {
            // Silently ignore — app still works without this optimization
        }
    }
}

