let isAnalyticsInitialized = false;

/**
 * Dynamically loads the Google Analytics script and initializes it.
 * This function should only be called once, after user consent is given.
 */
export const initializeAnalytics = () => {
  if (isAnalyticsInitialized || !import.meta.env.VITE_GA_MEASUREMENT_ID) {
    return;
  }

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  // Create the first script tag for gtag.js
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Create the second script tag for initialization
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
  
  isAnalyticsInitialized = true;
  console.log('Google Analytics initialized.');
};


/**
 * Sends a custom event to Google Analytics.
 * This is a wrapper around the gtag function to provide a consistent interface
 * and handle cases where gtag might not be available.
 * @param {string} eventName The name of the event (e.g., 'login', 'rate_pub').
 * @param {object} [eventParams={}] The parameters to send with the event.
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (isAnalyticsInitialized && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  } else {
    // In a real app, you might queue this or log it to a different service.
    // For now, a console warning is fine.
    console.warn(`GA4 event not sent (GA not initialized or gtag not available): ${eventName}`, eventParams);
  }
};
