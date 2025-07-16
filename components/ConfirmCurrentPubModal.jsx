import React from 'react';

const ConfirmCurrentPubModal = ({ candidates, onSelect, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-pub-title"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-amber-400"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
          aria-label="Close selection"
        >
          <i className="fas fa-times fa-lg"></i>
        </button>

        <h3 id="confirm-pub-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Are you at one of these pubs?
        </h3>

        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {candidates.map((place) => (
            <li key={place.id}>
              <button
                onClick={() => onSelect(place)}
                className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-amber-100 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="font-semibold text-gray-800 dark:text-gray-100">{place.displayName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{place.formattedAddress}</p>
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSelect(null)}
          className="w-full mt-4 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
        >
          None of these
        </button>
      </div>
    </div>
  );
};

export default ConfirmCurrentPubModal;
