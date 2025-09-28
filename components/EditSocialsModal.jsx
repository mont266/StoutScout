import React, { useState } from 'react';

const EditSocialsModal = ({ userProfile, onClose, onSubmit }) => {
    const [instagram, setInstagram] = useState(userProfile?.instagram_handle || '');
    const [youtube, setYoutube] = useState(userProfile?.youtube_handle || '');
    const [x, setX] = useState(userProfile?.x_handle || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const submissionError = await onSubmit({
            instagram_handle: instagram.trim(),
            youtube_handle: youtube.trim(),
            x_handle: x.trim(),
        });
        
        setIsLoading(false);
        if (submissionError) {
            setError(submissionError);
        }
    };

    const cleanHandle = (setter) => (e) => {
        let value = e.target.value.trim();
        // Remove full URLs, @ symbols, and invalid characters, keeping it simple.
        value = value.split('/').pop().replace('@', '');
        value = value.replace(/[^a-zA-Z0-9_.]/g, ''); 
        setter(value);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-socials-title"
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
                
                <h2 id="edit-socials-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                    Edit Socials
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                    Add your handles to display them on your profile. Just the username, please!
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="instagram-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Instagram
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                                <i className="fab fa-instagram"></i>
                            </span>
                            <input
                                id="instagram-input"
                                type="text"
                                value={instagram}
                                onChange={cleanHandle(setInstagram)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="your_handle"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="youtube-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            YouTube
                        </label>
                        <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                                <i className="fab fa-youtube"></i>
                            </span>
                            <input
                                id="youtube-input"
                                type="text"
                                value={youtube}
                                onChange={cleanHandle(setYoutube)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="your_handle"
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="x-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            X (Twitter)
                        </label>
                        <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                                <i className="fab fa-twitter"></i>
                            </span>
                            <input
                                id="x-input"
                                type="text"
                                value={x}
                                onChange={cleanHandle(setX)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="your_handle"
                            />
                        </div>
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
                            disabled={isLoading}
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

export default EditSocialsModal;
