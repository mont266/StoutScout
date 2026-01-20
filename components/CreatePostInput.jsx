import React from 'react';
import Avatar from './Avatar.jsx';

const CreatePostInput = ({ userProfile, onClick }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md flex items-center space-x-3">
            <Avatar avatarId={userProfile.avatar_id} className="w-10 h-10 flex-shrink-0" />
            <button
                onClick={onClick}
                className="w-full text-left bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm"
                aria-label="Create a new post"
            >
                Spill the tea...
            </button>
        </div>
    );
};

export default CreatePostInput;