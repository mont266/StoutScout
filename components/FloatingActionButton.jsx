import React from 'react';

const FloatingActionButton = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-4 z-50 w-16 h-16 bg-amber-500 text-black rounded-full shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300 flex items-center justify-center animate-fade-in-up"
            aria-label="Create a new post"
            title="Create a new post"
        >
            <i className="fas fa-pen text-2xl"></i>
        </button>
    );
};

export default FloatingActionButton;
