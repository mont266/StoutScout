import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { AVATAR_LIST } from '../avatars.js';

const AvatarSelectionModal = ({ currentAvatarId, onSelect, onClose }) => {
  const [selectedId, setSelectedId] = useState(currentAvatarId);

  const handleSave = () => {
    onSelect(selectedId);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-select-title"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-amber-400"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
          aria-label="Close avatar selection"
        >
          <i className="fas fa-times fa-lg"></i>
        </button>

        <h3 id="avatar-select-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Choose Your Avatar
        </h3>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4 max-h-60 overflow-y-auto">
          {AVATAR_LIST.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              className={`p-2 rounded-full transition-all duration-200 focus:outline-none ${
                selectedId === id
                  ? 'ring-4 ring-amber-500'
                  : 'ring-2 ring-transparent hover:ring-amber-400/50'
              }`}
            >
              <Avatar avatarId={id} className="w-full h-auto" />
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
            onClick={onClose}
            className="w-full sm:w-1/2 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
            Cancel
            </button>
            <button
                onClick={handleSave}
                className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
            >
                Save
            </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectionModal;
