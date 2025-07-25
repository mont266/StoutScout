import React from 'react';

const UpdateConfirmationPopup = () => {
  return (
    <div
      className="fixed bottom-24 left-1/2 w-auto pointer-events-none z-[1500] pb-safe"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-toast-in-out flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-base py-3 px-6 rounded-full shadow-2xl border border-green-300/50">
        <i className="fas fa-check-circle"></i>
        <span>Rating Updated!</span>
      </div>
    </div>
  );
};

export default UpdateConfirmationPopup;