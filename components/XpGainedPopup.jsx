import React from 'react';

const XpGainedPopup = ({ amount, actionName }) => {
  return (
    <div
      className="fixed bottom-36 left-1/2 -translate-x-1/2 w-auto pointer-events-none z-[1500] pb-safe"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-toast-in-out flex items-center space-x-3 bg-gray-900/95 backdrop-blur-md border border-amber-500/30 text-white font-bold text-base py-2.5 px-6 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)]">
        <i className="fas fa-star text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" aria-hidden="true"></i>
        <span className="text-amber-50 tracking-wide">{actionName}: <span className="text-amber-400 font-extrabold drop-shadow-sm">+{amount} XP</span></span>
      </div>
    </div>
  );
};

export default XpGainedPopup;
