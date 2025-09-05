// This flag prevents the script from being added multiple times.
let isAnalyticsInitialized = false;

/**
 * Dynamically loads the Google Analytics script and initializes it with the Measurement ID.
 * This function should only be called once, after user consent is given.
 * It uses the 'onload' callback to prevent race conditions and ensures GA is configured
 * only after the gtag.js script has fully loaded.
 */
export const initializeAnalytics = () => {
  if (isAnalyticsInitialized || !import.meta.env.VITE_GA_MEASUREMENT_ID) {
    return;
  }
  isAnalyticsInitialized = true; // Set immediately to prevent re-entry

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  // 1. Set up the dataLayer and the gtag function stub. This ensures trackEvent calls don't fail
  // even if they happen before the GA script is fully loaded.
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // 2. Since this function is only called AFTER consent is granted, we can
  // immediately update the consent state. We also set the default state first as a best practice.
  gtag('consent', 'default', {
    'analytics_storage': 'denied'
  });
  gtag('consent', 'update', {
    'analytics_storage': 'granted'
  });

  // 3. This is the initial "page view" equivalent for a single-page app.
  gtag('js', new Date());

  // 4. Create the main script tag for gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  
  // 5. CRITICAL: The config command must run *after* the script has loaded.
  // The 'onload' event guarantees this, fixing the potential race condition.
  script.onload = () => {
    // Now window.gtag is the full function from Google's script, not our stub.
    window.gtag('config', measurementId);
    console.log('Google Analytics initialized and configured.');
  };

  // 6. Append the script to the document head to begin loading.
  document.head.appendChild(script);
};


/**
 * Sends a custom event to Google Analytics.
 * This is a wrapper around the gtag function to provide a consistent interface
 * and handle cases where gtag might not be available.
 * @param {string} eventName The name of the event (e.g., 'login', 'rate_pub').
 * @param {object} [eventParams={}] The parameters to send with the event.
 */
export const trackEvent = (eventName, eventParams = {}) => {
  // Check if the gtag function exists on the window object.
  // This check is robust because our initializeAnalytics function creates a stub immediately.
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  } else {
    // This warning should rarely, if ever, appear with the new setup.
    console.warn(`GA4 event not sent (gtag not available): ${eventName}`, eventParams);
  }
};