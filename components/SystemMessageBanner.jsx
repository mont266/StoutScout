import React from 'react';

const SystemMessageBanner = ({ onDismiss }) => {
  return (
    <div
      className="relative bg-amber-100 dark:bg-amber-900/50 border-b-2 border-amber-500 p-3 text-amber-800 dark:text-amber-200 animate-fade-in-down"
      role="alert"
    >
      <div className="flex items-start gap-3 max-w-4xl mx-auto">
        <i className="fas fa-wrench mt-1 flex-shrink-0"></i>
        <div className="flex-grow">
          <p className="font-bold">A quick update from Stoutly!</p>
          <p className="text-sm mt-1">
            We experienced an issue with the rating system earlier on Monday which has now been resolved. We sincerely apologise for any inconvenience this may have caused. Happy rating!
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-800/70 dark:text-amber-200/70 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
          aria-label="Dismiss message"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default SystemMessageBanner;
