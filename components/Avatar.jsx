import React from 'react';
import AVATAR_COMPONENTS from '../avatars.jsx';

const Avatar = ({ avatarId, className = 'w-24 h-24' }) => {
  const AvatarComponent = AVATAR_COMPONENTS[avatarId] || AVATAR_COMPONENTS.default;

  return (
    <div className={className}>
      <AvatarComponent />
    </div>
  );
};

export default Avatar;