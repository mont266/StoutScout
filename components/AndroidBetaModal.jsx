import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../analytics.js';

const AndroidBetaModal = ({ onJoin, onClose }) => {

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="android-beta-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-green-500"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <i className="fab fa-android text-5xl text-green-500 dark:text-green-400 mb-4"></i>
                    <h2 id="android-beta-title" className="text-xl font-bold text-gray-900 dark:text-white">
                        Join the Android Beta!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        You're on Android! For a faster, smoother experience, try our new native app.
                    </p>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/60 rounded-lg text-yellow-800 dark:text-yellow-200 text-xs text-center">
                    <i className="fas fa-bug mr-2"></i>
                    This is a <strong className="font-semibold">beta test</strong>, so you may encounter issues. Please report any bugs using the feedback form in the settings.
                </div>

                <div className="mt-6 space-y-3">
                    <a
                        href="https://play.google.com/apps/internaltest/4700428345964627145"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onJoin}
                        className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
                    >
                        <span>Join the Beta</span>
                        <i className="fas fa-arrow-right"></i>
                    </a>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default AndroidBetaModal;
