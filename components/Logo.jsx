import React from 'react';

// This component has been repurposed to serve as the main App Header
// to fit the new tab-based navigation design.

const getTitle = (tab) => {
    switch(tab) {
        case 'map':
            return 'StoutScout';
        case 'profile':
            return 'Your Profile';
        case 'settings':
            return 'Settings';
        default:
            return 'StoutScout';
    }
}

const Header = ({ activeTab }) => {
  const title = getTitle(activeTab);

  return (
    <header className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 shadow-md z-20 flex justify-center items-center">
      <h1 className="text-xl font-bold text-amber-500 dark:text-amber-400 tracking-tight">{title}</h1>
    </header>
  );
};

export default Header;