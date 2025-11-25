import React from 'react';

const ScrollToTopButton = ({ show, onClick, isDesktop }) => {
    const positionClasses = isDesktop 
        ? 'absolute bottom-4 right-4' // Positioned within the relative parent feed on desktop
        : 'fixed bottom-24 right-4 scroll-to-top-android-fix'; // Fixed to the viewport on mobile

    return (
        <button
            onClick={onClick}
            className={`${positionClasses} z-[1000] w-14 h-14 bg-amber-500 text-black rounded-full shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300 ease-in-out ${
                show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
            aria-label="Scroll to top"
            title="Scroll to top"
        >
            <i className="fas fa-arrow-up text-2xl"></i>
        </button>
    );
};

export default ScrollToTopButton;