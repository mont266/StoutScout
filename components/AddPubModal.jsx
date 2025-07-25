import React, { useState } from 'react';

const AddPubModal = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) {
            alert('Please enter both a name and an address for the pub.');
            return;
        }
        setIsLoading(true);
        try {
            // This now only triggers the geocoding step in the parent.
            await onSubmit({
                name: name.trim(),
                address: address.trim(),
            });
        } catch (error) {
            // Error is handled in the App component with an alert, so we just log it here.
            console.error("Submission failed:", error);
        } finally {
            // The parent component is responsible for closing the modal on success now.
            setIsLoading(false);
        }
    };
    
    return (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-pub-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close add pub modal"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="add-pub-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                    Add a Missing Pub
                </h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">Help the community by adding this new discovery!</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="pub-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pub Name
                        </label>
                        <input
                            id="pub-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                            placeholder="e.g., The Black Frog"
                        />
                    </div>
                     <div>
                        <label htmlFor="pub-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Full Address
                        </label>
                        <textarea
                            id="pub-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                             className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            rows="3"
                            required
                            placeholder="e.g., 123 Main Street, Dublin, D01 F1G2, Ireland"
                        />
                    </div>
                     <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-1/2 mt-2 sm:mt-0 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                         <button
                            type="submit"
                            className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 disabled:cursor-wait flex items-center justify-center"
                            disabled={!name.trim() || !address.trim() || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                                    <span>Finding...</span>
                                </>
                            ) : (
                                'Find on Map'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPubModal;