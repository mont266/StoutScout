import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import CertifiedBadge from './CertifiedBadge.jsx';

const CertifiedExplanationModal = ({ isOpen, onClose }) => {
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
      className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="certified-modal-title"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-green-500 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full z-10"
          aria-label="Close"
        >
          <i className="fas fa-times fa-lg"></i>
        </button>
        
        <div className="flex-grow overflow-y-auto p-6">
          <div className="text-center mb-6">
            <div className="inline-block">
              <CertifiedBadge className="w-16 h-16" showTooltip={false} />
            </div>
            <h2 id="certified-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
              What is "Stoutly Certified"?
            </h2>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            The Stoutly Certified badge is our seal of approval, awarded to pubs that consistently demonstrate excellence in both the quality and value of their Guinness.
          </p>

          <div className="space-y-4">
              <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">How it Works</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <li><strong>Sustained High Score:</strong> Pubs must maintain a very high Pub Score (typically 85+) for an extended period.</li>
                      <li><strong>High Rating Volume:</strong> A significant number of recent, positive ratings are required to prove consistency.</li>
                      <li><strong>Community Trust:</strong> The pub is recognized by the community as a reliable spot for a great pint.</li>
                      <li><strong>Manual Review:</strong> In some cases, a final check by the Stoutly team ensures the pub meets our quality standards.</li>
                  </ul>
              </div>
              <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">What it Means for You</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                      When you see the Certified badge, you can be confident you're in for a top-tier pint experience. It's a shortcut to finding the best of the best, as verified by fellow Guinness lovers.
                  </p>
              </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 px-6 pt-4 pb-6">
            <button
                onClick={onClose}
                className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
                Sounds Great!
            </button>
        </div>
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;
  return createPortal(modalContent, modalRoot);
};
export default CertifiedExplanationModal;