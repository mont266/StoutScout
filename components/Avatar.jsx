import React, { useState, useEffect } from 'react';

const Avatar = ({ avatarId, className = 'w-24 h-24' }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the avatarId prop changes.
  useEffect(() => {
    setHasError(false);
  }, [avatarId]);
  
  let avatarUrl = '';
  let avatarType = 'default';

  if (avatarId && !hasError) {
    try {
      const parsed = JSON.parse(avatarId);
      if (parsed) {
        if (parsed.type === 'dicebear' && parsed.style) {
          avatarType = 'dicebear';
          const { style, seed } = parsed;
          avatarUrl = `https://api.dicebear.com/8.x/${style}/svg?seed=${encodeURIComponent(seed || 'default')}&radius=50`;
        } else if (parsed.type === 'uploaded' && parsed.url) {
          avatarType = 'uploaded';
          avatarUrl = parsed.url;
        }
      }
    } catch (e) {
      // Not a valid JSON string, treat as default.
    }
  }
  
  // A consistent fallback icon.
  const fallbackIcon = (
    <i className="fas fa-user text-4xl text-gray-400 dark:text-gray-500"></i>
  );

  return (
    // This single div is now responsible for the final appearance.
    // It creates the circular shape, clips the content, has a fallback background,
    // and centers the fallback icon.
    <div className={`${className} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
      {avatarType !== 'default' && avatarUrl ? (
        <img
          src={avatarUrl}
          alt="User avatar"
          // object-cover ensures the image fills the circle, letting overflow-hidden clip it.
          className="w-full h-full object-cover"
          // If the image fails to load, trigger a re-render to show the fallback.
          onError={() => setHasError(true)}
        />
      ) : (
        // Render the fallback if the avatarId is invalid, missing, or the image failed to load.
        fallbackIcon
      )}
    </div>
  );
};

export default Avatar;