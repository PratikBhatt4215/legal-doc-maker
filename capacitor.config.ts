import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ DEVELOPMENT MODE — Live reload from Mac via WiFi
// ✅ Make sure phone and Mac are on the SAME WiFi
// ✅ Run: pnpm run dev --host   on your Mac first
// ❌ REMOVE the `server` block before building final APK for client!

const config: CapacitorConfig = {
  appId: 'com.legaldocsmaker.app',
  appName: 'legal doc maker',
  webDir: 'dist',
  server: {
    url: 'http://192.168.0.109:5173',  // Your Mac's IP on WiFi
    cleartext: true                     // Required for HTTP on Android
  }
};

export default config;

