import React from 'react';

const CookieConsentBanner = ({ onAccept, onDecline }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-[2000] animate-fade-in-up">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong className="font-semibold">We value your privacy</strong>
          </p>
          <p>
            We use cookies to analyze traffic and improve your experience. This helps us understand how the app is used and make it better.
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-bold bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2 text-sm font-bold bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
      <div className="pb-safe"></div>
    </div>
  );
};

export default CookieConsentBanner;
