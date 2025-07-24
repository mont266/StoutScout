import React from 'react';

const Avatar = ({ avatarId, className = 'w-24 h-24' }) => {
  let avatarContent;
  let isDicebear = false;

  if (avatarId) {
    try {
      const parsedAvatar = JSON.parse(avatarId);
      if (parsedAvatar && parsedAvatar.type === 'dicebear') {
        const { style, seed } = parsedAvatar;
        const dicebearUrl = `https://api.dicebear.com/8.x/${style}/svg?seed=${encodeURIComponent(seed || 'default')}&radius=50`;
        avatarContent = (
          <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700">
            <img
              src={dicebearUrl}
              alt="User-generated avatar"
              className="w-full h-full object-cover"
              // Add an error handler to fall back to the default icon
              onError={(e) => {
                e.target.onerror = null; // prevent infinite loops
                e.target.style.display = 'none'; // hide the broken image
                const parent = e.target.parentElement;
                if (parent) {
                    // This is a bit of a hack to re-render a default, but it works
                    const iconContainer = parent.closest(`.${className.split(' ')[0]}`);
                    if (iconContainer) {
                        iconContainer.innerHTML = `<div class="w-full h-full rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700"><i class="fas fa-user text-4xl text-gray-400 dark:text-gray-500"></i></div>`;
                    }
                }
              }}
            />
          </div>
        );
        isDicebear = true;
      }
    } catch (e) {
      // It's not a valid JSON string (e.g., legacy avatar or null), so we'll fall through to the default.
    }
  }

  // Fallback for null, undefined, or invalid avatar IDs
  if (!isDicebear) {
     avatarContent = (
      <div className="w-full h-full rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
        <i className="fas fa-user text-4xl text-gray-400 dark:text-gray-500"></i>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-full overflow-hidden`}>
      {avatarContent}
    </div>
  );
};

export default Avatar;