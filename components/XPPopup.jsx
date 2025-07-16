import React from 'react';

// This component is triggered when a new review is submitted.
// It's a "toast" style notification.
const XPPopup = () => {
  return (
    <div
      className="fixed bottom-24 left-1/2 w-auto pointer-events-none z-50 pb-safe"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-toast-in-out flex items-center space-x-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold text-base py-3 px-6 rounded-full shadow-2xl border border-amber-400/50">
        <i className="fas fa-plus-circle text-green-400"></i>
        <span>+1 Rating Submitted</span>
      </div>
    </div>
  );
};

export default XPPopup;