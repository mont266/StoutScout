import React from 'react';

const WinnerModal = ({ isOpen, onClose, onViewWinnings, prizeName, giveawayTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 relative animate-[customPulse_1s_ease-in-out_infinite] shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                <style>{`
                    @keyframes customPulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                        100% { transform: scale(1); }
                    }
                `}</style>
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-gray-800 shadow-xl">
                        <i className="fas fa-gift text-4xl text-white"></i>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-400">
                        You Won!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-4 text-lg">
                        Congratulations! You've been selected as a winner in the <strong className="text-amber-500">{giveawayTitle}</strong>.
                    </p>
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-700/50">
                        <p className="text-sm text-amber-800 dark:text-amber-200 uppercase font-bold tracking-widest mb-1">Your Prize</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{prizeName}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={onViewWinnings}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white rounded-xl text-lg font-bold shadow-lg transform transition-all active:scale-95"
                    >
                        View My Winnings <i className="fas fa-arrow-right ml-1"></i>
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WinnerModal;

