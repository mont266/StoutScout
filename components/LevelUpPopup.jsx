import React from 'react';

const LevelUpPopup = ({ newLevel }) => {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[1500] animate-modal-fade-in"
      aria-live="polite"
      role="alert"
    >
      <div className="relative text-center bg-gray-800 border-4 border-amber-400 rounded-2xl shadow-2xl p-8 max-w-sm w-full transform transition-all">
         <h2 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
            <span className="text-amber-400">LEVEL</span> UP!
        </h2>
        <div className="my-6">
            <div className="text-8xl font-black text-white drop-shadow-[0_5px_15px_rgba(251,191,36,0.4)]">{newLevel}</div>
        </div>
        <p className="text-lg font-medium text-gray-300">You're getting stronger, scout!</p>
      </div>
    </div>
  );
};

export default LevelUpPopup;
