import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import useIsDesktop from '../hooks/useIsDesktop.js';

const PubScoreExplanationModal = ({ isOpen, onClose }) => {
  const isDesktop = useIsDesktop();

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
    <div
      className="fixed inset-0 bg-black/60 z-[1200] flex items-end sm:items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pub-score-title"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg border-t-4 border-amber-500 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
          aria-label="Close"
        >
          <i className="fas fa-times fa-lg"></i>
        </button>
        
        <h2 id="pub-score-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          What is Pub Score?
        </h2>
        
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          The Pub Score is a single, reliable metric out of 100 that helps you judge a pub's overall quality at a glance. It's calculated by combining three key factors:
        </p>

        <div className="space-y-4">
            <div className="flex items-start space-x-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <i className="fas fa-beer text-2xl text-amber-500 mt-1"></i>
                <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Pint Quality (60% weight)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">The average of all user quality ratings. A great-tasting pint is the most important factor.</p>
                </div>
            </div>
             <div className="flex items-start space-x-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <i className="fas fa-tag text-2xl text-green-500 mt-1"></i>
                <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Pint Price (40% weight)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">The average of all user price ratings. A cheaper pint means a better value score.</p>
                </div>
            </div>
             <div className="flex items-start space-x-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <i className="fas fa-shield-alt text-2xl text-blue-500 mt-1"></i>
                <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Confidence (Multiplier)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">This rewards pubs with more ratings. A pub with 50 great ratings is a more reliable choice than one with a single perfect rating.</p>
                </div>
            </div>
        </div>
        
        <div className="mt-6 text-center text-sm font-mono p-2 bg-gray-100 dark:bg-gray-900 rounded-md text-gray-500 dark:text-gray-400">
            (Quality + Price) × Confidence = Pub Score
        </div>

        <div className="mt-6">
            <button
                onClick={onClose}
                className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
            >
                Got it!
            </button>
        </div>

      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;
  return createPortal(modalContent, modalRoot);
};
export default PubScoreExplanationModal;