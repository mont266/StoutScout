import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DeleteAccountModal = ({ userProfile, onClose, onConfirm, isLoading }) => {
    const [confirmationText, setConfirmationText] = useState('');

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const isMatch = confirmationText === userProfile.username;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-red-500"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50">
                        <i className="fas fa-exclamation-triangle text-2xl text-red-600 dark:text-red-400"></i>
                    </div>
                    <h3 id="delete-account-title" className="text-lg leading-6 font-bold text-gray-900 dark:text-white mt-3">
                        Delete Your Account?
                    </h3>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-2">
                        <p>This is a permanent action and cannot be undone.</p>
                        <p>All of your ratings, posts, comments, photos, and profile data will be erased forever.</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 pt-2">
                            To confirm, please type your username: <strong className="text-red-500">{userProfile.username}</strong>
                        </p>
                    </div>
                </div>

                <div className="mt-4">
                    <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        className="w-full text-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full sm:w-1/2 mt-2 sm:mt-0 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading || !isMatch}
                        className="w-full sm:w-1/2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                <span>Deleting...</span>
                            </>
                        ) : (
                            'Permanently Delete Account'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default DeleteAccountModal;
