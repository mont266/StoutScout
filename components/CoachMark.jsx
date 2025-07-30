import React from 'react';

const CoachMark = ({ text, onDismiss, onLearnMore }) => {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-full mr-4 w-64 z-20 p-4 bg-gray-800 text-white rounded-lg shadow-2xl animate-fade-in-down">
      <div className="relative">
        {/* Arrow pointing right */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-800"></div>

        <button
          onClick={onDismiss}
          className="absolute -top-2 -right-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <i className="fas fa-times"></i>
        </button>

        <p className="text-sm mb-3">{text}</p>
        <button
          onClick={onLearnMore}
          className="w-full bg-amber-500 text-black text-sm font-bold py-1.5 px-3 rounded-md hover:bg-amber-400 transition-colors"
        >
          Learn More
        </button>
      </div>
    </div>
  );
};

export default CoachMark;