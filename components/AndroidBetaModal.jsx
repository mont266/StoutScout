import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../analytics.js';

const AndroidBetaModal = ({ onClose }) => {

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleLinkClick = (step) => {
        trackEvent('click_join_android_beta_step', { step });
        // Mark as seen when they interact
        localStorage.setItem('stoutly-android-beta-prompt-seen', 'true');
    };

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
                        For a faster, smoother experience, try our new native app. Joining is a two-step process:
                    </p>
                </div>

                <div className="mt-6 space-y-4 text-left">
                    {/* Step 1 */}
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white font-bold rounded-full flex items-center justify-center">1</div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white">Join the Beta Group</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">First, you need to join our Google Group to become an eligible tester.</p>
                            <a
                                href="https://groups.google.com/g/stoutly-open-beta"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleLinkClick(1)}
                                className="inline-block mt-2 bg-blue-500 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Join Group
                            </a>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white font-bold rounded-full flex items-center justify-center">2</div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white">Become a Tester</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">After joining the group, use this link to opt-in on the Play Store and download the app.</p>
                             <a
                                href="https://play.google.com/apps/testing/uk.co.stoutly.twa"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleLinkClick(2)}
                                className="inline-block mt-2 bg-green-500 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Become a Tester
                            </a>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6 italic">
                    You can find these instructions again in the Settings panel.
                </p>

                <div className="mt-2">
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