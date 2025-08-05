import React, { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';

const NotificationToast = ({ notification, onClick, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 6000); // Auto-dismiss after 6 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    // Wait for animation to finish before calling the parent's close function
    setTimeout(onClose, 300); 
  };
  
  const handleClick = () => {
    onClick();
    handleClose(); // Also close it when clicked
  };

  const { actor, type, metadata } = notification;

  let message = 'sent you a notification.';
  if (type === 'friend_request') {
    message = 'sent you a friend request.';
  } else if (type === 'new_comment') {
    message = 'commented on your rating.';
  } else if (type === 'like_milestone') {
    message = `Your rating received ${metadata?.like_count || 'many'} likes! 🎉`;
  }
  
  // For like milestones, the actor is the user themselves, so we don't show "You"
  const isSelfNotification = type === 'like_milestone';

  return (
    <div
      className={`fixed top-20 md:top-6 left-4 right-4 md:left-auto md:right-6 w-auto max-w-sm z-[2000] transition-all duration-300 ease-in-out ${isExiting ? 'animate-fade-out-up' : 'animate-fade-in-down'}`}
      role="alert"
    >
      <div className="relative bg-gray-800 dark:bg-gray-900 text-white rounded-xl shadow-2xl border border-amber-500/50 overflow-hidden">
        <div 
          onClick={handleClick} 
          className="flex items-start space-x-4 p-4 cursor-pointer"
        >
          <div className="flex-shrink-0 relative">
            <Avatar avatarId={actor?.avatar_id} className="w-10 h-10" />
            <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-800 dark:border-gray-900">
                <i className={`fas ${type === 'friend_request' ? 'fa-user-plus' : 'fa-bell'} text-xs`}></i>
            </span>
          </div>
          <div className="flex-grow pt-1 min-w-0">
            <p className="text-sm">
              {isSelfNotification ? (
                message
              ) : (
                <>
                  <span className="font-bold">{actor?.username || 'Someone'}</span> {message}
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 text-gray-400 hover:text-white transition-colors p-2 rounded-full"
          aria-label="Close notification"
        >
          <i className="fas fa-times text-sm"></i>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;