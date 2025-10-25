import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getCurrencyInfo } from '../utils.js';

const PriceByCountryModal = ({ isOpen, onClose, countryStats }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[1300] flex flex-col animate-fade-in-up pt-[env(safe-area-inset-top)]">
            <header className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                <button onClick={onClose} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                    <i className="fas fa-arrow-left"></i>
                    <span className="font-semibold whitespace-nowrap">Back to Stats</span>
                </button>
            </header>
            <div className="flex-grow overflow-y-auto">
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pint Price by Country</h2>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average prices based on user submissions with exact prices.</p>
                </div>
                 {countryStats.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {countryStats.map((stat) => {
                            const currency = getCurrencyInfo({ country_name: stat.country_display_name });
                            return (
                                <li key={stat.country_display_name} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800/50">
                                    <span className="font-semibold text-gray-900 dark:text-white">{stat.country_display_name}</span>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                            {stat.avg_price != null ? `${currency.symbol}${parseFloat(stat.avg_price).toFixed(2)}` : <span className="text-sm text-gray-500">No data</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{Number(stat.rating_count).toLocaleString()} ratings</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">No price data available.</p>
                )}
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};

export default PriceByCountryModal;