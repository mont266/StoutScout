import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const THEME_CLASSES = {
    red: {
        icon: 'fa-exclamation-triangle',
        iconBg: 'bg-red-100 dark:bg-red-900/50',
        iconText: 'text-red-600 dark:text-red-400',
        border: 'border-red-500',
        button: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 focus:ring-red-500',
    },
    green: {
        icon: 'fa-check-circle',
        iconBg: 'bg-green-100 dark:bg-green-900/50',
        iconText: 'text-green-600 dark:text-green-400',
        border: 'border-green-500',
        button: 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 focus:ring-green-500',
    },
    blue: {
        icon: 'fa-info-circle',
        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        iconText: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:ring-blue-500',
    },
};


const ConfirmationModal = ({ 
    onClose, 
    onConfirm, 
    isLoading, 
    title, 
    message, 
    confirmText = "Confirm", 
    theme = 'red' 
}) => {
    
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const themeClasses = THEME_CLASSES[theme] || THEME_CLASSES.red;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
        >
            <div
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 ${themeClasses.border}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${themeClasses.iconBg}`}>
                        <i className={`fas ${themeClasses.icon} text-2xl ${themeClasses.iconText}`}></i>
                    </div>
                    <h3 id="confirmation-title" className="text-lg leading-6 font-bold text-gray-900 dark:text-white mt-3">
                        {title}
                    </h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
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
                        disabled={isLoading}
                        className={`w-full sm:w-1/2 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:cursor-wait flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${themeClasses.button}`}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            confirmText
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

export default ConfirmationModal;