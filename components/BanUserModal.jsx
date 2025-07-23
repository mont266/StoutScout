import React, { useState } from 'react';

const BAN_REASONS = [
    "Spam / Review Bombing",
    "Inappropriate Username or Avatar",
    "Hate Speech or Harassment",
    "Abusing the System / Cheating",
];

const BanUserModal = ({ username, onClose, onConfirm }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalReason = selectedReason === 'Other' ? customReason : selectedReason;
        if (finalReason) {
            onConfirm(finalReason);
        } else {
            alert('Please select or enter a reason for the ban.');
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-user-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-red-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close ban user modal"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="ban-user-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Ban User: <span className="text-red-500">{username}</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a reason for the ban. This will be recorded and shown to the user.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        {BAN_REASONS.map(reason => (
                            <label key={reason} className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                <input
                                    type="radio"
                                    name="ban_reason"
                                    value={reason}
                                    checked={selectedReason === reason}
                                    onChange={() => setSelectedReason(reason)}
                                    className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">{reason}</span>
                            </label>
                        ))}
                         <label className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                            <input
                                type="radio"
                                name="ban_reason"
                                value="Other"
                                checked={selectedReason === 'Other'}
                                onChange={() => setSelectedReason('Other')}
                                className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">Other (please specify)</span>
                        </label>
                    </div>

                    {selectedReason === 'Other' && (
                        <div>
                            <label htmlFor="custom_reason" className="sr-only">Custom Ban Reason</label>
                            <textarea
                                id="custom_reason"
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter custom reason for ban..."
                                rows="3"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                        </div>
                    )}
                    
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
                            disabled={!selectedReason || (selectedReason === 'Other' && !customReason)}
                        >
                            Confirm Ban
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BanUserModal;
