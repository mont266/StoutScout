import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../analytics.js';

const StPaddysModal = ({ onClose, onCheckOut }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleClose = () => {
        trackEvent('close_st_paddys_modal');
        localStorage.setItem('stoutly-st-paddys-seen-2026', 'true'); // Versioned key for this year
        onClose();
    };

    const handleCheckOut = () => {
        trackEvent('click_st_paddys_checkout');
        localStorage.setItem('stoutly-st-paddys-seen-2026', 'true');
        onCheckOut();
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1500] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="st-paddys-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-4 border-green-500 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
                    <div className="absolute -top-10 -left-10 text-9xl text-green-600 rotate-12">☘️</div>
                    <div className="absolute top-20 -right-10 text-8xl text-green-600 -rotate-12">☘️</div>
                    <div className="absolute -bottom-10 left-20 text-9xl text-green-600 rotate-45">🍺</div>
                </div>

                <div className="relative z-10 text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-500">
                        <span className="text-5xl">☘️</span>
                    </div>
                    <h2 id="st-paddys-title" className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2 font-display">
                        Happy St. Paddy's!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        May your glass be ever full and your craic be mighty! 
                        <br/><br/>
                        To celebrate, we've launched our new <span className="font-bold text-amber-600 dark:text-amber-400">Pub Crawl (Beta)</span> feature. Plan your perfect route for the day!
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">
                        (You can switch off the St. Paddy's theme in Settings if you prefer)
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleCheckOut}
                            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-green-500 transition-colors shadow-lg transform hover:scale-105 active:scale-95"
                        >
                            Check out Pub Crawl Beta
                        </button>
                        <button
                            onClick={handleClose}
                            className="w-full bg-transparent text-gray-500 dark:text-gray-400 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};

export default StPaddysModal;
