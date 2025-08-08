import React, { useState, useEffect } from 'react';

const SuggestEditModal = ({ pub, onClose, onSubmit }) => {
    const [correctedName, setCorrectedName] = useState('');
    const [isClosed, setIsClosed] = useState(false);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Pre-fill the form with the current pub name
        if (pub) {
            setCorrectedName(pub.name);
            setIsClosed(false);
            setNotes('');
        }
    }, [pub]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Ensure at least one change has been made
        const nameChanged = correctedName.trim() !== pub.name;
        if (!nameChanged && !isClosed) {
            alert("Please make a change before submitting.");
            return;
        }

        setIsLoading(true);

        const suggested_data = {
            name: nameChanged ? correctedName.trim() : pub.name,
            is_closed: isClosed,
        };
        
        await onSubmit({
            suggested_data,
            notes: notes.trim(),
        });

        // The parent component will handle closing the modal on success
        setIsLoading(false);
    };

    if (!pub) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggest-edit-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close suggest edit modal"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="suggest-edit-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                    Suggest an Edit
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                    Current name: <span className="font-semibold">{pub.name}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="corrected-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Correct Name
                        </label>
                        <input
                            id="corrected-name"
                            type="text"
                            value={correctedName}
                            onChange={(e) => setCorrectedName(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <label htmlFor="is-closed-toggle" className="flex items-center justify-between cursor-pointer p-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Mark as permanently closed</span>
                            <div className="relative">
                                <input
                                    id="is-closed-toggle"
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isClosed}
                                    onChange={() => setIsClosed(p => !p)}
                                />
                                <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 peer-checked:bg-red-500 dark:bg-gray-600"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes / Source (Optional)
                        </label>
                        <textarea
                            id="edit-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            rows="3"
                            placeholder="e.g., This pub was renamed last month. Source: their Facebook page."
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
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                'Submit Suggestion'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuggestEditModal;