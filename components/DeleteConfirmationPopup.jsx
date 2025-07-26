import React from 'react';

const DeleteConfirmationPopup = () => {
  return (
    <div
      className="fixed bottom-24 left-1/2 w-auto pointer-events-none z-[1500] pb-safe"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-toast-in-out flex items-center space-x-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-base py-3 px-6 rounded-full shadow-2xl border border-red-300/50">
        <i className="fas fa-trash-alt"></i>
        <span>Rating Deleted!</span>
      </div>
    </div>
  );
};

export default DeleteConfirmationPopup;