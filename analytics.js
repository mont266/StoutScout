/**
 * Sends a custom event to Google Analytics.
 * This is a wrapper around the gtag function to provide a consistent interface
 * and handle cases where gtag might not be available.
 * @param {string} eventName The name of the event (e.g., 'login', 'rate_pub').
 * @param {object} [eventParams={}] The parameters to send with the event.
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  } else {
    // In a real app, you might queue this or log it to a different service.
    // For now, a console warning is fine.
    console.warn(`GA4 event not sent (gtag not available): ${eventName}`, eventParams);
  }
};