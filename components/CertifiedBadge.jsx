import React from 'react';

const CertifiedBadge = ({ certifiedSince, className = '', showTooltip = true }) => {
    const formattedDate = new Date(certifiedSince).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
    });

    const badgeContent = (
        <div 
            className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center ${className}`}
            aria-label="Stoutly Certified Pub"
        >
            <svg viewBox="0 0 24 24" fill="#10B981" className="w-full h-full drop-shadow-md">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
            </svg>
            <i className="fas fa-check absolute text-white text-xs"></i>
        </div>
    );

    if (!showTooltip) {
        return badgeContent;
    }

    return (
        <div className="group relative">
            {badgeContent}
            <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900/90 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                <span className="font-bold block">Stoutly Certified</span>
                <span className="text-gray-300">Awarded for sustained excellence.</span>
                <span className="block text-amber-400 mt-1">Certified since {formattedDate}</span>
            </div>
        </div>
    );
};

export default CertifiedBadge;
