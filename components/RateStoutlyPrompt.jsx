import React from 'react';
import { Capacitor } from '@capacitor/core';

const RateStoutlyPrompt = ({ onRate, onRemind, onDismiss }) => {
  const platform = Capacitor.getPlatform();
  const storeName = platform === 'ios' ? 'App Store' : 'Play Store';

  return (
    <div className="fixed bottom-0 inset-x-0 pb-safe z-[1000] p-4 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md mx-auto border border-amber-500">
        <div className="text-center">
          <h3 className="font-bold text-lg">Enjoying Stoutly?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">A quick rating on the {storeName} helps our community grow.</p>
        </div>
        <div className="flex justify-center space-x-3 mt-4 text-sm font-medium">
          <button onClick={onDismiss} className="flex-1 px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            No, Thanks
          </button>
          <button onClick={onRemind} className="flex-1 px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Remind Me Later
          </button>
          <button onClick={onRate} className="flex-1 px-3 py-2 rounded-md bg-amber-500 text-black transition-colors">
            Rate Stoutly
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateStoutlyPrompt;
