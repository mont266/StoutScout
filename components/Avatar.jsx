import React, { useState, useEffect } from 'react';

const Avatar = ({ avatarId, className = 'w-24 h-24' }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the avatarId prop changes.
  useEffect(() => {
    setHasError(false);
  }, [avatarId]);
  
  let isDicebear = false;
  let dicebearUrl = '';

  // Only try to parse and use the avatarId if it exists and hasn't errored out.
  if (avatarId && !hasError) {
    try {
      const parsedAvatar = JSON.parse(avatarId);
      if (parsedAvatar && parsedAvatar.type === 'dicebear') {
        isDicebear = true;
        const { style, seed } = parsedAvatar;
        dicebearUrl = `https://api.dicebear.com/8.x/${style}/svg?seed=${encodeURIComponent(seed || 'default')}&radius=50`;
      }
    } catch (e) {
      // Not a valid JSON string (e.g., legacy or null), so it will fall through to the default icon.
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
      {isDicebear && !hasError ? (
        <img
          src={dicebearUrl}
          alt="User-generated avatar"
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