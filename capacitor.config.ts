import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.co.stoutly.twa',
  appName: 'Stoutly',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      // By setting this to false, the webview will be pushed down below the
      // status bar, which will have its own background color.
      overlaysWebView: false,
    },
  },
};

export default config;