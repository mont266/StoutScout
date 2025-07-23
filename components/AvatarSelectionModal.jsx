import React, { useState, useEffect } from 'react';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

// A curated list of good-looking, varied styles
const DICEBEAR_STYLES = [
  { id: 'adventurer', name: 'Adventurer' },
  { id: 'bottts', name: 'Robots' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: 'miniavs', name: 'Miniavs' },
  { id: 'lorelei', name: 'Fantasy' },
  { id: 'micah', name: 'Avatars' },
  { id: 'notionists', name: 'Notion Style' },
  { id: 'fun-emoji', name: 'Emoji' },
];

const AvatarSelectionModal = ({ userProfile, currentAvatarId, onSelect, onClose }) => {
  const [dicebearStyle, setDicebearStyle] = useState(DICEBEAR_STYLES[0].id);
  const [dicebearSeed, setDicebearSeed] = useState(userProfile?.username || 'stoutly-user');

  useEffect(() => {
    // Attempt to parse the current avatar ID to pre-fill the form
    try {
      const parsed = JSON.parse(currentAvatarId);
      if (parsed && parsed.type === 'dicebear') {
        setDicebearStyle(parsed.style || DICEBEAR_STYLES[0].id);
        setDicebearSeed(parsed.seed || userProfile?.username || 'stoutly-user');
      }
    } catch (e) {
      // It's a legacy ID, null, or invalid JSON. Default to a new DiceBear avatar based on username.
      setDicebearSeed(userProfile?.username || 'stoutly-user');
    }
  }, [currentAvatarId, userProfile?.username]);
  
  const handleStyleChange = (e) => {
    const newStyle = e.target.value;
    setDicebearStyle(newStyle);
    trackEvent('customize_dicebear_avatar', { action: 'change_style', style: newStyle });
  }

  const handleRandomizeSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 12);
    setDicebearSeed(randomSeed);
    trackEvent('customize_dicebear_avatar', { action: 'randomize_seed' });
  }

  const handleSave = () => {
    const dicebearAvatarData = {
      type: 'dicebear',
      style: dicebearStyle,
      seed: dicebearSeed,
    };
    onSelect(JSON.stringify(dicebearAvatarData));
  };

  const getDicebearPreviewId = () => {
     const dicebearAvatarData = {
        type: 'dicebear',
        style: dicebearStyle,
        seed: dicebearSeed,
      };
      return JSON.stringify(dicebearAvatarData);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-select-title"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-amber-400"
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
          Create Your Avatar
        </h3>

        {/* Preview Area */}
        <div className="flex justify-center my-4">
            <div className="w-40 h-40">
                <Avatar avatarId={getDicebearPreviewId()} className="w-full h-full" />
            </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
            <div>
                <label htmlFor="dicebear-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style</label>
                <select
                    id="dicebear-style"
                    value={dicebearStyle}
                    onChange={handleStyleChange}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-no-repeat bg-right pr-8"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}
                >
                    {DICEBEAR_STYLES.map(style => (
                    <option key={style.id} value={style.id}>{style.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="dicebear-seed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seed</label>
                <div className="flex space-x-2">
                    <input
                    id="dicebear-seed"
                    type="text"
                    value={dicebearSeed}
                    onChange={(e) => setDicebearSeed(e.target.value)}
                    placeholder="Enter any text..."
                    className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button 
                    onClick={handleRandomizeSeed} 
                    className="flex-shrink-0 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold p-2 w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
                    title="Randomize Seed"
                    aria-label="Randomize Seed"
                    >
                    <i className="fas fa-random fa-lg"></i>
                    </button>
                </div>
            </div>
        </div>


        <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
                onClick={onClose}
                className="w-full sm:w-1/2 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
            >
                Save
            </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectionModal;