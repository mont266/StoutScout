import React, { useState } from 'react';

const MAX_BIO_LENGTH = 160;

const EditBioModal = ({ currentBio, onClose, onSubmit }) => {
    const [bio, setBio] = useState(currentBio || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (bio.trim() === (currentBio || '').trim()) {
            onClose();
            return;
        }

        setIsLoading(true);
        setError(null);
        const submissionError = await onSubmit(bio.trim());
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
            aria-labelledby="edit-bio-title"
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
                
                <h2 id="edit-bio-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Edit Bio
                </h2>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="bio-input" className="sr-only">Bio</label>
                        <textarea
                            id="bio-input"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full h-32 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                            placeholder="Tell us a little about yourself..."
                            maxLength={MAX_BIO_LENGTH}
                        />
                        <p className={`text-right text-xs mt-1 ${bio.length > MAX_BIO_LENGTH ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            {bio.length} / {MAX_BIO_LENGTH}
                        </p>
                    </div>
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
                            disabled={isLoading || bio.trim() === (currentBio || '').trim()}
                            className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                            ) : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBioModal;
