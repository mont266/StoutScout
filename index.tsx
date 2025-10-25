import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { trackEvent } from './analytics.js';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

// Capacitor-specific initialization for native platforms
if (Capacitor.isNativePlatform()) {
  try {
    // Add a class to the HTML root element if we're on native Android.
    // This allows for platform-specific CSS fixes.
    (async () => {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        document.documentElement.classList.add('native-android');
      }
    })();

    // Set StatusBar style. The app defaults to dark mode, so this is appropriate.
    StatusBar.setStyle({ style: Style.Dark });
    // Set the status bar background color to match the app's dark theme.
    // This is necessary now that the webview does not overlay the status bar.
    StatusBar.setBackgroundColor({ color: '#111827' });
    // Hide the native splash screen once the web view is ready.
    SplashScreen.hide();
  } catch (e) {
    console.error("Error initializing Capacitor plugins.", e);
  }
}

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// PWA Install Prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar from appearing on mobile.
  e.preventDefault();
  // Dispatch a custom event so the App component can capture the prompt.
  window.dispatchEvent(new CustomEvent('pwa-install-prompt-ready', { detail: e }));
  trackEvent('pwa_install_prompt_available');
});


// Track when the PWA has been successfully installed.
window.addEventListener('appinstalled', () => {
    trackEvent('pwa_install_success');
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);