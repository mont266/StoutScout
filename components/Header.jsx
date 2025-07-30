import React from 'react';
import ProfileAvatar from './ProfileAvatar.jsx';

const getTitle = (tab) => {
    switch(tab) {
        case 'map':
            return 'Stoutly';
        case 'community':
            return 'Community';
        case 'leaderboard':
            return 'Top Reviewers';
        case 'profile':
            return 'Profile';
        case 'settings':
            return 'Settings';
        case 'stats':
            return 'Analytics Dashboard';
        default:
            return 'Stoutly';
    }
}

const Header = ({ activeTab, userProfile, levelRequirements, onProfileClick, onLoginRequest }) => {
  const title = getTitle(activeTab);

  return (
    <header className="flex-shrink-0 px-2 h-16 bg-white dark:bg-gray-800 shadow-md z-20 flex justify-between items-center">
        {/* Left Spacer to balance the right-side avatar */}
        <div className="w-12"></div>
        
        {/* Centered Title */}
        <h1 className="text-xl font-bold text-amber-500 dark:text-amber-400 tracking-tight">{title}</h1>

        {/* Right-side Profile Avatar/Login Button */}
        <div className="w-12 flex justify-center items-center">
            {userProfile ? (
                <ProfileAvatar 
                    userProfile={userProfile}
                    levelRequirements={levelRequirements}
                    size={40}
                    onClick={onProfileClick}
                />
            ) : (
                <button 
                    onClick={onLoginRequest}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 text-3xl hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                    aria-label="Sign In"
                >
                    <i className="fas fa-user-circle"></i>
                </button>
            )}
        </div>
    </header>
  );
};

export default Header;