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
    // Fix: Moved Info.plist keys to their respective plugin configurations.
    Geolocation: {
      NSLocationWhenInUseUsageDescription: "We use your location to find the best pints of Guinness near you.",
    },
    Camera: {
      NSCameraUsageDescription: "Stoutly needs access to your camera so you can take photos of your pints.",
      NSPhotoLibraryUsageDescription: "Stoutly needs access to your photo library so you can upload photos of your pints.",
      NSPhotoLibraryAddUsageDescription: "Stoutly needs permission to save photos to your library."
    },
    SplashScreen: {
      backgroundColor: '#1A120F', // This matches your universal splash screen background
    }
  },
  ios: {
    path: 'ios',
    // Fix: Removed the invalid 'infoPlist' property. General Info.plist keys like
    // ITSAppUsesNonExemptEncryption and UIUserInterfaceStyle must be configured
    // in the native project's Info.plist file directly.
  }
};

export default config;
