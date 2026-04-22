import React from 'react';
import { RANK_DETAILS } from '../constants.js';

const RankExplanationModal = ({ isOpen, onClose, currentLevel, userRatings, levelRequirements }) => {
    if (!isOpen) return null;

    // Determine the user's current rank
    const currentRankIndex = RANK_DETAILS.map(r => r.minLevel).reverse().findIndex(lvl => currentLevel >= lvl);
    const actualRankIndex = currentRankIndex === -1 ? 0 : RANK_DETAILS.length - 1 - currentRankIndex;
    const currentRank = RANK_DETAILS[actualRankIndex];

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const currentRatingsCount = userRatings ? userRatings.length : 0;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-scale-up border border-gray-200 dark:border-gray-700">
                <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Rank Progression</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Level up to earn new titles</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors focus:outline-none"
                        aria-label="Close modal"
                    >
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </header>
                
                <div className="flex-grow overflow-y-auto p-2">
                    <ul className="space-y-2">
                        {RANK_DETAILS.map((rank, index) => {
                            const isCurrent = index === actualRankIndex;
                            const isLocked = currentLevel < rank.minLevel;
                            const isAchieved = currentLevel >= rank.minLevel && !isCurrent;
                            
                            return (
                                <li 
                                    key={rank.name}
                                    className={`flex items-center p-4 rounded-xl transition-all ${
                                        isCurrent 
                                            ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-500 transform scale-[1.02] shadow-sm' 
                                            : isLocked
                                                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60 border border-transparent'
                                                : 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30'
                                    }`}
                                >
                                    <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full text-xl ${
                                        isCurrent ? 'bg-amber-500 text-white shadow-md' :
                                        isLocked ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' :
                                        'bg-green-500 text-white'
                                    }`}>
                                        <i className={`fas ${rank.icon}`}></i>
                                    </div>
                                    <div className="ml-4 flex-grow">
                                        <div className="flex justify-between items-center">
                                            <span className={`font-bold ${
                                                isCurrent ? 'text-amber-700 dark:text-amber-400 text-lg' : 
                                                isLocked ? 'text-gray-500 dark:text-gray-400' :
                                                'text-green-700 dark:text-green-400'
                                            }`}>
                                                {rank.name}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 bg-amber-200 dark:bg-amber-900/50 px-2 py-1 rounded-full">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className={`text-sm mt-1 ${isCurrent ? 'text-amber-600 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                            Requires Level {rank.minLevel}
                                        </div>
                                        {isCurrent && levelRequirements && levelRequirements.length > 0 && index < RANK_DETAILS.length - 1 && (
                                            <div className="mt-3 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                                                {(() => {
                                                    const nextRank = RANK_DETAILS[index + 1];
                                                    if (nextRank) {
                                                        const nextLevelReq = levelRequirements.find(lr => lr.level === nextRank.minLevel);
                                                        const currentLevelReq = levelRequirements.find(lr => lr.level === rank.minLevel);
                                                        if (nextLevelReq && currentLevelReq) {
                                                            const startRatings = currentLevelReq.total_ratings_required;
                                                            const endRatings = nextLevelReq.total_ratings_required;
                                                            const progress = Math.max(0, currentRatingsCount - startRatings);
                                                            const totalNeedForTier = endRatings - startRatings;
                                                            const percent = Math.min(100, Math.max(0, (progress / totalNeedForTier) * 100));
                                                            const ratingsNeeded = Math.max(0, endRatings - currentRatingsCount);
                                                            
                                                            return (
                                                                <div className="flex flex-col space-y-3">
                                                                    <div className="flex justify-between items-end">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] uppercase font-bold text-amber-700/70 dark:text-amber-500/70 tracking-widest leading-none mb-1">Current</span>
                                                                            <span className="text-lg font-black text-amber-900 dark:text-amber-400 leading-none">{currentRatingsCount} <span className="text-sm tracking-normal">Pints</span></span>
                                                                        </div>
                                                                        <div className="flex flex-col text-right">
                                                                            <span className="text-[10px] uppercase font-bold text-amber-700/70 dark:text-amber-500/70 tracking-widest leading-none mb-1">{ratingsNeeded} More To</span>
                                                                            <span className="text-[13px] sm:text-sm font-black text-amber-900 dark:text-amber-400 leading-none line-clamp-1">{nextRank.name}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full bg-amber-200/50 dark:bg-gray-800 rounded-full h-2.5 shadow-inner overflow-hidden">
                                                                        <div 
                                                                            className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-700 ease-out shadow-[inset_0_1px_rgba(255,255,255,0.3)] relative"
                                                                            style={{ width: `${percent}%` }}
                                                                        >
                                                                             <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-white/30 to-transparent"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    return <p className="text-xs font-bold text-green-500 dark:text-green-400 mt-1">Max Rank Reached!</p>;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    {isAchieved && (
                                        <div className="ml-2 text-green-500 dark:text-green-400">
                                            <i className="fas fa-check-circle fa-lg"></i>
                                        </div>
                                    )}
                                    {isLocked && (
                                        <div className="ml-2 text-gray-300 dark:text-gray-600">
                                            <i className="fas fa-lock mt-1"></i>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
                    <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                        Earn XP by rating pubs, adding new spots, and getting likes to level up and unlock higher ranks.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RankExplanationModal;
