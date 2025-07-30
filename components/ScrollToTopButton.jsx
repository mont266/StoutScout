import React from 'react';

const ScrollToTopButton = ({ show, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`fixed bottom-24 right-4 z-50 w-14 h-14 bg-amber-500 text-black rounded-full shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300 ease-in-out ${
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
