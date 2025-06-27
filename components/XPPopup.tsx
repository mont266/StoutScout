import React from 'react';

interface XPPopupProps {
  amount: number;
}

const XPPopup: React.FC<XPPopupProps> = ({ amount }) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-xp-popup bg-gray-900/80 backdrop-blur-sm text-amber-400 font-bold text-5xl py-4 px-8 rounded-2xl shadow-xl border-2 border-amber-400">
        +{amount} XP
      </div>
    </div>
  );
};

export default XPPopup;
