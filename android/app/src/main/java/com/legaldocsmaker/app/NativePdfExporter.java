package com.legaldocsmaker.app;

import android.content.ContentValues;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Custom Capacitor plugin to generate vector PDFs programmatically from an HTML string without a print dialog.
 * Renders HTML in a hidden WebView on the UI thread and writes vector draw calls directly into an Android PdfDocument.
 */
@CapacitorPlugin(name = "NativePdfExporter")
public class NativePdfExporter extends Plugin {

    private WebView pdfWebView = null;

    @PluginMethod
    public void export(final PluginCall call) {
        final String html      = call.getString("html", "");
        final String filename  = call.getString("filename", "document.pdf");
        final String paperSize = call.getString("paperSize", "a4");
        final int pageCount    = call.getInt("pageCount", 0);

        if (html.isEmpty()) {
            call.reject("html content is required");
            return;
        }

        android.util.Log.d("NativePdfExporter", "export vector started for: " + filename + " [" + paperSize + "] pageCount=" + pageCount);

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                final Context ctx     = getContext();
                final boolean isLegal = "legal".equalsIgnoreCase(paperSize);
                final File outFile    = new File(ctx.getCacheDir(), filename);
                
                if (outFile.exists()) {
                    outFile.delete();
                }

                if (pdfWebView != null) {
                    try { pdfWebView.destroy(); } catch (Exception ignored) {}
                    pdfWebView = null;
                }

                pdfWebView = new WebView(ctx);
                final WebView wv = pdfWebView;

                // MUST use software rendering so webView.draw() works on the PDF canvas
                wv.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

                WebSettings ws = wv.getSettings();
                ws.setJavaScriptEnabled(true);
                ws.setDomStorageEnabled(true);
                ws.setAllowFileAccess(true);
                ws.setAllowContentAccess(true);
                ws.setTextZoom(100);
                ws.setUseWideViewPort(false);
                ws.setLoadWithOverviewMode(false);

                final ViewGroup root = (ViewGroup) getActivity().findViewById(android.R.id.content);
                if (root == null) {
                    call.reject("Cannot find root view");
                    wv.destroy(); pdfWebView = null;
                    return;
                }

                // A4 = 794px width, Legal = 816px width
                final int pageWidthPx = isLegal ? 816 : 794;
                final int pageHeightPx = isLegal ? 1344 : 1123;
                final float density = ctx.getResources().getDisplayMetrics().density;
                final int layoutWidth = (int) (pageWidthPx * density);
                
                // Set explicit layout parameters height to the total height of all pages to prevent clipping at screen bounds
                final int layoutHeight = pageCount > 0 ? (int) (pageCount * pageHeightPx * density) : ViewGroup.LayoutParams.WRAP_CONTENT;
                root.addView(wv, 0, new ViewGroup.LayoutParams(layoutWidth, layoutHeight));

                wv.setWebViewClient(new WebViewClient() {
                    private boolean finished = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (finished) return;
                        finished = true;
                        android.util.Log.d("NativePdfExporter", "WebView finished loading HTML content");

                        // Delay to let layouts compute and settle before exporting
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            try {
                                generateVectorPdf(wv, root, outFile, filename, isLegal, pageWidthPx, pageCount, call);
                            } catch (Exception e) {
                                android.util.Log.e("NativePdfExporter", "PDF export failed", e);
                                call.reject("Export failed: " + e.getMessage());
                                cleanup(root, wv);
                            }
                        }, 1500);
                    }
                });

                wv.loadDataWithBaseURL("https://localhost", html, "text/html", "UTF-8", null);

            } catch (Exception e) {
                android.util.Log.e("NativePdfExporter", "Setup error", e);
                call.reject("Setup error: " + e.getMessage());
            }
        });
    }

    private void generateVectorPdf(
        final WebView wv, 
        final ViewGroup root, 
        final File outFile, 
        final String filename, 
        final boolean isLegal, 
        final int pageWidthPx,
        final int pageCount,
        final PluginCall call
    ) throws Exception {
        
        float density = getActivity().getResources().getDisplayMetrics().density;

        // A4 = ~1123px tall, Legal = ~1344px tall
        final int pageHeightPx = isLegal ? 1344 : 1123;

        // Get WebView's content height in DP (density-independent pixels)
        int contentHeightDp = Math.max(wv.getContentHeight(), pageHeightPx);
        int contentHeightPx = (int) (contentHeightDp * density);

        android.util.Log.d("NativePdfExporter", 
            "Generating PDF: contentH=" + contentHeightPx + "px contentHDp=" + contentHeightDp + "dp pageH=" + pageHeightPx + "dp density=" + density);

        PdfDocument pdf = new PdfDocument();
        int numPages = pageCount > 0 ? pageCount : (int) Math.ceil((double) contentHeightDp / pageHeightPx);

        for (int i = 0; i < numPages; i++) {
            PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(pageWidthPx, pageHeightPx, i + 1).create();
            PdfDocument.Page page = pdf.startPage(pageInfo);
            Canvas canvas = page.getCanvas();

            canvas.save();
            // Clip to current page boundaries in PDF points (DP)
            canvas.clipRect(0, 0, pageWidthPx, pageHeightPx);
            
            // Shift drawing coordinate space upward for page slices (in PDF points / DP)
            canvas.translate(0, -i * pageHeightPx);
            
            // Scale canvas from physical WebView pixels to logical PDF points (1-to-1)
            canvas.scale(1.0f / density, 1.0f / density);
            
            // Draw WebView directly into PDF vector canvas
            wv.draw(canvas);
            
            canvas.restore();
            pdf.finishPage(page);
        }

        // Save PDF to cache file
        try (FileOutputStream fos = new FileOutputStream(outFile)) {
            pdf.writeTo(fos);
        } finally {
            pdf.close();
        }

        cleanup(root, wv);

        // Copy to public downloads folder
        String dlPath = copyToDownloads(getContext(), outFile, filename);
        if (dlPath != null) {
            JSObject result = new JSObject();
            result.put("downloadPath", dlPath);
            result.put("path", outFile.getAbsolutePath());
            call.resolve(result);
        } else {
            call.reject("Failed to copy PDF to public Downloads directory");
        }
    }

    private String copyToDownloads(Context ctx, File src, String filename) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                cv.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = ctx.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri != null) {
                    try (OutputStream os = ctx.getContentResolver().openOutputStream(uri);
                         FileInputStream fis = new FileInputStream(src)) {
                        byte[] buf = new byte[8192]; int n;
                        while ((n = fis.read(buf)) > 0) os.write(buf, 0, n);
                        os.flush();
                        android.util.Log.d("NativePdfExporter", "Saved to Downloads: " + uri);
                        return uri.toString();
                    }
                }
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File dst = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(dst);
                     FileInputStream fis = new FileInputStream(src)) {
                    byte[] buf = new byte[8192]; int n;
                    while ((n = fis.read(buf)) > 0) fos.write(buf, 0, n);
                    fos.flush();
                    android.util.Log.d("NativePdfExporter", "Saved legacy: " + dst.getAbsolutePath());
                    return dst.getAbsolutePath();
                }
            }
        } catch (Exception e) {
            android.util.Log.e("NativePdfExporter", "Downloads copy failed: " + e.getMessage());
        }
        return null;
    }

    private void cleanup(final ViewGroup root, final WebView wv) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (wv.getParent() != null) root.removeView(wv);
                wv.stopLoading();
                wv.loadUrl("about:blank");
                wv.destroy();
                if (pdfWebView == wv) pdfWebView = null;
            } catch (Exception ignored) {}
        });
    }
}
