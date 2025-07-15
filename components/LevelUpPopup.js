
import React from 'react';
import { getRankData } from '../utils.js';

const LevelUpPopup = ({ newLevel }) => {
  const oldLevel = newLevel - 1;
  const newRank = getRankData(newLevel);
  const oldRank = getRankData(oldLevel);
  const hasRankChanged = newRank.name !== oldRank.name;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      aria-live="polite"
      role="alert"
    >
      <div className="animate-level-up bg-gradient-to-br from-amber-400 to-amber-600 text-gray-900 font-bold text-center py-6 px-10 rounded-2xl shadow-2xl border-4 border-white/80">
        <div className="text-3xl mb-2 drop-shadow-md">🏆 LEVEL UP! 🏆</div>
        <div className="text-5xl mb-3 drop-shadow-lg">Level {newLevel}</div>
        {hasRankChanged && (
          <>
            <div className="text-xl font-normal">You're now a</div>
            <div className="text-2xl mt-1 font-extrabold tracking-wide">{newRank.name}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default LevelUpPopup;
