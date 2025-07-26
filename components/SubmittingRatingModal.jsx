import React from 'react';
import { createPortal } from 'react-dom';

const SubmittingRatingModal = ({ isVisible }) => {
    if (!isVisible) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center p-4 animate-modal-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submitting-rating-title"
        >
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-400 mb-6"></div>
            <h2 id="submitting-rating-title" className="text-2xl font-bold text-white mb-2">Submitting Your Masterpiece...</h2>
            <p className="text-gray-300">Just a moment while we save your rating.</p>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default SubmittingRatingModal;
