import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { trackEvent } from '../analytics.js';

const GuideStep = ({ number, icon, title, description }) => (
    <li className="flex items-start space-x-4">
        <div className="flex-shrink-0 flex flex-col items-center">
            <span className="flex-shrink-0 w-8 h-8 bg-amber-500 text-black text-sm font-bold rounded-full flex items-center justify-center">
                <i className={`fas ${icon}`}></i>
            </span>
        </div>
        <div>
            <p className="font-bold text-gray-800 dark:text-white">{title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    </li>
);


const CoasterWelcomeModal = ({ onClose }) => {
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
        trackEvent('close_coaster_welcome_modal');
        localStorage.setItem('stoutly-coaster-welcome-seen', 'true');
        onClose();
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1500] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="coaster-welcome-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4">
                        <Icon className="w-full h-full" />
                    </div>
                    <h2 id="coaster-welcome-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                        Welcome to Stoutly!
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Thanks for scanning one of our coasters.
                    </p>
                </div>

                <div className="mt-6 text-left">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Your quest for the perfect pint starts here:</h3>
                    <ul className="space-y-4">
                        <GuideStep
                            number="1"
                            icon="fa-user-plus"
                            title="Create an Account"
                            description="Join the community, track your ratings, and climb the ranks."
                        />
                         <GuideStep
                            number="2"
                            icon="fa-map-marked-alt"
                            title="Find a Pub"
                            description="Explore the map to see nearby pubs and their community-driven scores."
                        />
                         <GuideStep
                            number="3"
                            icon="fa-beer"
                            title="Rate Your Pint"
                            description="Share your experience on price and quality to help others find the perfect pour!"
                        />
                    </ul>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleClose}
                        className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                        Cheers!
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default CoasterWelcomeModal;