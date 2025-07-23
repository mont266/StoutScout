import React from 'react';
import { trackEvent } from '../analytics.js';

const IOSInstallInstructionsModal = ({ onClose }) => {

    const handleClose = () => {
        trackEvent('ios_install_instructions_closed');
        onClose();
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-modal-fade-in"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-blue-500 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close instructions"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>

                <h2 id="ios-install-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Install Stoutly on your iPhone
                </h2>

                <ol className="space-y-4 text-gray-700 dark:text-gray-300">
                    <li className="flex items-center space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center">1</span>
                        <p>Tap the 'Share' button in your browser's toolbar.</p>
                        <i className="fas fa-arrow-up-from-square text-blue-500 text-2xl ml-auto"></i>
                    </li>
                    <li className="flex items-center space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center">2</span>
                        <p>Scroll down the list and tap 'Add to Home Screen'.</p>
                        <i className="fas fa-plus-square text-blue-500 text-2xl ml-auto"></i>
                    </li>
                </ol>

                <div className="mt-6">
                    <button
                        onClick={handleClose}
                        className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IOSInstallInstructionsModal;