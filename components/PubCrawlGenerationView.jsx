import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const loadingMessages = [
    "Consulting the pint oracle...",
    "Mapping out the perfect pour...",
    "Calculating optimal routes between pubs...",
    "Avoiding backtracking... mostly.",
    "Finding the creamiest heads...",
    "Asking the AI for its favorite spots...",
    "Generating your legendary journey...",
    "Don't worry, it'll be worth the wait.",
];

const PubCrawlGenerationView = ({ onCancel }) => {
    const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % loadingMessages.length;
                return loadingMessages[nextIndex];
            });
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center p-4 animate-modal-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generation-title"
        >
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-400 mb-6"></div>
            <h2 id="generation-title" className="text-2xl font-bold text-white mb-2">
                Planning Your Crawl...
            </h2>
            <p className="text-gray-300 text-center transition-opacity duration-500">
                {currentMessage}
            </p>
            <button
                onClick={onCancel}
                className="mt-8 bg-gray-700/50 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-600/50 transition-colors"
            >
                Cancel
            </button>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default PubCrawlGenerationView;