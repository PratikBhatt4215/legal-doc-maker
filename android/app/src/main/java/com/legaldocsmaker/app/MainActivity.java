package com.legaldocsmaker.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.content.Intent;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WebView.enableSlowWholeDocumentDraw();
        registerPlugin(NativePdfExporter.class);
        super.onCreate(savedInstanceState);
        // getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);

        // Disable rubber-band/overscroll on the Capacitor WebView
        // and register custom handler for UPI payment redirects
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Completely kill overscroll bounce / rubber-band effect
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                // Remove scroll glow / edge glow effects
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);

                // Intercept custom payment schemes safely without breaking Capacitor plugins
                webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                    
                    private boolean handleCustomScheme(WebView view, String url) {
                        if (url == null) return false;

                        // 1. Handle android intent deep-links (e.g. intent://pay?...)
                        if (url.startsWith("intent://")) {
                            try {
                                Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                                if (intent != null) {
                                    PackageManager packageManager = view.getContext().getPackageManager();
                                    ResolveInfo info = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
                                    if (info != null) {
                                        view.getContext().startActivity(intent);
                                        return true;
                                    } else {
                                        // App not installed, check fallback browser URL
                                        String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                                        if (fallbackUrl != null) {
                                            view.loadUrl(fallbackUrl);
                                            return true;
                                        }
                                    }
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                            return true; // Handled (even if failed, we don't want WebView to load intent://)
                        }

                        // 2. Handle direct UPI app custom schemes (e.g. upi://, phonepe://, paytm://, gpay://, bhim://, tez://)
                        if (url.startsWith("upi://") || url.startsWith("phonepe://") || url.startsWith("paytm://") || 
                            url.startsWith("gpay://") || url.startsWith("bhim://") || url.startsWith("tez://") ||
                            url.startsWith("paytmmp://")) {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                view.getContext().startActivity(intent);
                                return true;
                            } catch (Exception e) {
                                android.widget.Toast.makeText(view.getContext(), "Selected UPI App is not installed on this device", android.widget.Toast.LENGTH_SHORT).show();
                                return true; // Handled
                            }
                        }

                        // Let WebView handle normal http/https/file URLs
                        return false;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        String url = request.getUrl().toString();
                        if (handleCustomScheme(view, url)) {
                            return true;
                        }
                        return super.shouldOverrideUrlLoading(view, request);
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        if (handleCustomScheme(view, url)) {
                            return true;
                        }
                        return super.shouldOverrideUrlLoading(view, url);
                    }
                });
            }
        } catch (Exception e) {
            // Silently ignore — app still works without this optimization
        }
    }
}
