import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const REPORT_REASONS = [
    "Spam or advertisement",
    "Hate speech or harassment",
    "Inappropriate or offensive content",
    "Irrelevant or off-topic",
];

const ReportCommentModal = ({ comment, onClose, onSubmit }) => {
    const [selectedReason, setSelectedReason] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedReason) {
            onSubmit(selectedReason);
        } else {
            alert('Please select a reason for the report.');
        }
    };

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/60 z-[1400] flex items-end sm:items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-comment-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-red-500 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                 <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close report modal"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="report-comment-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Report Comment
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Why are you reporting this comment by <span className="font-semibold">{comment?.user?.username}</span>? Your report is anonymous.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="space-y-2">
                        {REPORT_REASONS.map(reason => (
                            <label key={reason} className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                <input
                                    type="radio"
                                    name="report_reason"
                                    value={reason}
                                    checked={selectedReason === reason}
                                    onChange={() => setSelectedReason(reason)}
                                    className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">{reason}</span>
                            </label>
                        ))}
                    </div>
                     <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-1/2 mt-2 sm:mt-0 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                         <button
                            type="submit"
                            className="w-full sm:w-1/2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400"
                            disabled={!selectedReason}
                        >
                            Submit Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default ReportCommentModal;