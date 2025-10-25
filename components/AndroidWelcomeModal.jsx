import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const AndroidWelcomeModal = ({ onClose, onGoToFeedback }) => {
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
            className="fixed inset-0 bg-black/60 z-[1500] flex items-center justify-center p-4 animate-modal-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="android-welcome-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-green-500"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <i className="fab fa-android text-5xl text-green-500 dark:text-green-400 mb-4"></i>
                    <h2 id="android-welcome-title" className="text-xl font-bold text-gray-900 dark:text-white">
                        Welcome to the Stoutly Beta!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Thank you for being one of the first to test our native Android app. Your feedback is crucial for making it great!
                    </p>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/60 rounded-lg text-yellow-800 dark:text-yellow-200 text-xs">
                    <p className="mb-2"><strong className="font-semibold">Found a bug?</strong> Please report it using the feedback form in the settings.</p>
                    <p><strong className="font-semibold">Experiencing issues?</strong> You can always continue using the web app at <a href="https://stoutly.co.uk" target="_blank" rel="noopener noreferrer" className="underline font-bold">stoutly.co.uk</a>.</p>
                </div>

                <div className="mt-6 space-y-3">
                    <button
                        onClick={onGoToFeedback}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <i className="fas fa-comment-alt"></i>
                        <span>Go to Feedback Form</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                        Continue to App
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default AndroidWelcomeModal;
