import React, { useState, useEffect, useMemo } from 'react';
import { trackEvent } from '../analytics.js';

const EditUsernameModal = ({ userProfile, onClose, onSubmit }) => {
    const [newUsername, setNewUsername] = useState(userProfile.username);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const cooldownInfo = useMemo(() => {
        if (!userProfile.last_username_change_at) {
            return { onCooldown: false, canChangeOn: null };
        }
        
        const lastChangeDate = new Date(userProfile.last_username_change_at);
        const cooldownEndDate = new Date(lastChangeDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();

        const onCooldown = now < cooldownEndDate;

        return {
            onCooldown,
            canChangeOn: onCooldown ? cooldownEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null,
        };
    }, [userProfile.last_username_change_at]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (newUsername === userProfile.username) {
            onClose(); // No change made
            return;
        }

        // Basic frontend validation
        if (newUsername.length < 3 || newUsername.length > 20) {
            setError('Username must be between 3 and 20 characters.');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            setError('Username can only contain letters, numbers, and underscores.');
            return;
        }

        setIsLoading(true);
        const submissionError = await onSubmit(newUsername);
        setIsLoading(false);
        
        if (submissionError) {
            setError(submissionError);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-username-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="edit-username-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Change Username
                </h2>

                {cooldownInfo.onCooldown ? (
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <i className="fas fa-history text-3xl text-blue-500 dark:text-blue-400 mb-2"></i>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">On Cooldown</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            You can change your username again after {cooldownInfo.canChangeOn}.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Username
                            </label>
                            <input
                                id="username-input"
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                                minLength="3"
                                maxLength="20"
                                pattern="^[a-zA-Z0-9_]+$"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Must be 3-20 characters using only letters, numbers, and underscores. You can change this once every 30 days.
                        </p>
                        {error && (
                            <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/30 p-2 rounded-md">{error}</p>
                        )}
                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-1/2 mt-2 sm:mt-0 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || newUsername === userProfile.username}
                                className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                                ) : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EditUsernameModal;
