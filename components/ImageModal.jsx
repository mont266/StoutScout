import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ImageModal = ({ rating, onClose, onReport, canReport, canAdminRemove, onAdminRemove }) => {
    
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup the event listener on component unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1300] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-modal-title"
        >
            <div 
                className="relative"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={rating.image_url}
                    alt={`Pint rated by ${rating.user.username}`}
                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    id="image-modal-title"
                />

                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 z-20 bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/90 transition-all transform hover:scale-110"
                    aria-label="Close image view"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>

                {/* Action Buttons */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                    {canAdminRemove && (
                         <button
                            onClick={(e) => { e.stopPropagation(); onAdminRemove(rating); }}
                            className="bg-red-600 text-white rounded-full px-4 py-2 flex items-center justify-center space-x-2 shadow-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                            aria-label="Admin: Remove Photo"
                            title="Admin: Remove Photo"
                        >
                                <i className="fas fa-trash-alt"></i>
                                <span>Remove</span>
                        </button>
                    )}
                    {canReport && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReport(); }}
                            className="bg-gray-600/80 text-white rounded-full px-4 py-2 flex items-center justify-center space-x-2 shadow-lg hover:bg-gray-700/80 transition-colors text-sm font-semibold"
                            aria-label="Report image"
                        >
                                <i className="fas fa-flag"></i>
                                <span>Report</span>
                        </button>
                    )}
                </div>

                {/* Uploader Info */}
                <div 
                    className="absolute bottom-4 left-4 z-20 bg-black/50 text-white rounded-full px-4 py-2 text-sm"
                >
                    Rated by <span className="font-bold">{rating.uploaderName || rating.user.username}</span>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default ImageModal;