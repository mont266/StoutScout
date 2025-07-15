import React from 'react';

// This component is triggered when a new review is submitted.
const XPPopup = () => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-xp-popup bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-green-500 dark:text-green-400 font-bold text-5xl py-4 px-8 rounded-2xl shadow-xl border-2 border-green-500 dark:border-green-400">
        +1 Rating
      </div>
    </div>
  );
};

export default XPPopup;