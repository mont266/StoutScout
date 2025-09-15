import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.co.stoutly.twa',
  appName: 'Stoutly',
  webDir: 'dist',
  // The 'server' property is used for live-reload development and should be
  // removed or commented out for production builds. When it's removed, Capacitor
  // bundles your web assets (`dist` folder) directly into the native app.
  /*
  server: {
    // 🔴 IMPORTANT: Replace 'YOUR_COMPUTER_IP_ADDRESS' with your computer's
    // actual local network IP address.
    //
    // How to find your IP:
    // - macOS: System Settings > Wi-Fi > Details... > IP Address
    // - Windows: Open Command Prompt > type `ipconfig` > Look for "IPv4 Address"
    //
    // Example: 'http://192.168.1.100:5173'
    url: 'http://192.168.1.168:5173',
    // Allow the app to connect to a non-secure (http) server. Required for local dev.
    cleartext: true,
  },
  */
  plugins: {
    StatusBar: {
      // Set to true to allow the webview to render underneath the native status bar.
      // This is required for an edge-to-edge display.
      setOverlaysWebView: true,
      // Make the status bar background transparent so the webview content is visible.
      backgroundColor: '#00000000',
    },
  },
};

export default config;
