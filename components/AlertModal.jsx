import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const THEME_CLASSES = {
    error: {
        icon: 'fa-times-circle',
        iconText: 'text-red-600 dark:text-red-400',
        border: 'border-red-500',
        button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    success: {
        icon: 'fa-check-circle',
        iconText: 'text-green-600 dark:text-green-400',
        border: 'border-green-500',
        button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    },
    info: {
        icon: 'fa-info-circle',
        iconText: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
};

const AlertModal = ({ onClose, title, message, theme = 'info' }) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const themeClasses = THEME_CLASSES[theme] || THEME_CLASSES.info;

    const modalContent = (
         <div 
            className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-title"
        >
            <div
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 ${themeClasses.border}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <i className={`fas ${themeClasses.icon} text-5xl ${themeClasses.iconText} mb-4`}></i>
                    <h3 id="alert-title" className="text-lg leading-6 font-bold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="mt-5 sm:mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${themeClasses.button}`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default AlertModal;