import React from 'react';

const PintCounter = ({ amount, onChange, maxAmount = 16, disabled = false }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="flex items-center space-x-6">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(1, amount - 1))}
                    disabled={amount <= 1 || disabled}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm text-lg
                        ${amount <= 1 || disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-2 border-transparent' : 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-gray-700 border-2 border-amber-500 hover:scale-105 active:scale-95'}`}
                >
                    <i className="fas fa-minus"></i>
                </button>
                <div className="w-16 text-center flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">{amount}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">Pints</span>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(Math.min(maxAmount, amount + 1))}
                    disabled={amount >= maxAmount || disabled}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm text-lg
                        ${amount >= maxAmount || disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-2 border-transparent' : 'bg-amber-500 text-black hover:bg-amber-400 border-2 border-amber-500 hover:scale-105 active:scale-95'}`}
                >
                    <i className="fas fa-plus"></i>
                </button>
            </div>
            {amount >= 7 && (
                <div className="mt-4 flex items-center justify-center space-x-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    <i className="fas fa-exclamation-triangle text-amber-500 text-sm"></i>
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        Please remember to drink responsibly.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PintCounter;
