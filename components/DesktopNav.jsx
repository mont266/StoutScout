import React from 'react';
import Icon from './Icon.jsx';
import ProfileAvatar from './ProfileAvatar.jsx';
import useRegion from '../hooks/useRegion.js';

const NavButton = ({ tab, activeTab, onTabChange, onLoginRequest, userProfile, tooltipPosition = 'right', notificationCount = 0 }) => {
  const isActive = activeTab === tab.id;

  const handleClick = () => {
    if ((tab.id === 'profile' || tab.id === 'moderation' || tab.id === 'shop' || tab.id === 'pub_crawl') && !userProfile) {
      onLoginRequest();
    } else {
      onTabChange(tab.id);
    }
  };

  const baseTooltipClasses = "absolute px-3 py-2 text-sm font-semibold text-white bg-gray-900/80 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all delay-300 pointer-events-none";
  
  const positionClasses = tooltipPosition === 'top'
    ? 'bottom-full mb-2 left-1/2 -translate-x-1/2 translate-y-2 group-hover:translate-y-0' // Position above, animate up
    : 'left-full ml-4 top-1/2 -translate-y-1/2 -translate-x-2 group-hover:translate-x-0'; // Position right, animate right

  return (
    <div className="group relative">
      <button
        onClick={handleClick}
        className={`w-14 h-14 flex items-center justify-center rounded-2xl text-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
          isActive
            ? 'bg-amber-500 text-black scale-100 rounded-xl shadow-lg'
            : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 hover:rounded-xl'
        }`}
        aria-label={tab.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
        )}
        <i className={`fas ${tab.icon} fa-fw`}></i>
      </button>
      <div className={`${baseTooltipClasses} ${positionClasses}`}>
        {tab.label}
      </div>
    </div>
  );
};

const DesktopNav = ({ activeTab, onTabChange, onLogout, userProfile, onLoginRequest, levelRequirements, unreadNotificationsCount, settings, handleChangePassword, isPubCrawlPlannerEnabled }) => {
  const region = useRegion();

  const mainTabs = [
    { id: 'map', icon: 'fa-map-marked-alt', label: 'Explore' },
    { id: 'community', icon: 'fa-users', label: 'Community' },
  ];

  if (isPubCrawlPlannerEnabled) {
      mainTabs.splice(2, 0, { id: 'pub_crawl', icon: 'fa-route', label: 'Pub Crawl' });
  }
  
  const shopTab = { id: 'shop', icon: 'fa-shopping-bag', label: 'Shop' };

  const bottomTabs = [
      { id: 'settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <nav className="h-full w-24 flex flex-col items-center p-4 space-y-4 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-20">
      <div className="w-14 h-14 flex items-center justify-center rounded-2xl p-1">
        <Icon className="w-full h-full" />
      </div>

      <div className="w-full border-t border-gray-200 dark:border-gray-700 my-2"></div>
      
      {mainTabs.map(tab => (
        <NavButton
            key={tab.id}
            tab={tab}
            {...{ activeTab, onTabChange, onLoginRequest, userProfile }}
            tooltipPosition="right"
            notificationCount={tab.id === 'community' ? unreadNotificationsCount : 0}
        />
      ))}

      {(userProfile?.is_developer && settings?.developerMode && settings?.isShopEnabled) && (
          <NavButton
            key={shopTab.id}
            tab={shopTab}
            {...{ activeTab, onTabChange, onLoginRequest, userProfile }}
            tooltipPosition="right"
          />
      )}
      
      <div className="!mt-auto flex flex-col items-center space-y-4">
        <div className="w-full border-t border-gray-200 dark:border-gray-700 my-2"></div>
         
         {userProfile ? (
            <ProfileAvatar 
                userProfile={userProfile}
                levelRequirements={levelRequirements}
                size={56}
                onClick={() => onTabChange('profile')}
            />
         ) : (
            <NavButton
                tab={{ id: 'login', icon: 'fa-sign-in-alt', label: 'Sign In / Sign Up' }}
                activeTab={null} onTabChange={onLoginRequest}
                tooltipPosition="top"
            />
         )}

         {bottomTabs.map(tab => (
            <NavButton key={tab.id} tab={tab} {...{ activeTab, onTabChange, onLoginRequest, userProfile }} tooltipPosition="top" />
         ))}

        {(userProfile?.is_developer || userProfile?.is_team_member) && (
            <div className="group relative">
                <button
                    onClick={() => window.open('https://analytics.stoutly.co.uk', '_blank')}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl text-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-gray-900 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 hover:rounded-xl"
                    aria-label="Stats"
                >
                    <i className="fas fa-chart-bar fa-fw"></i>
                </button>
                <div className="absolute px-3 py-2 text-sm font-semibold text-white bg-gray-900/80 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all delay-300 pointer-events-none bottom-full mb-2 left-1/2 -translate-x-1/2 translate-y-2 group-hover:translate-y-0">
                    Stats
                </div>
            </div>
        )}
        {userProfile?.is_developer && (
            <NavButton
                tab={{ id: 'moderation', icon: 'fa-shield-alt', label: 'Moderation' }}
                {...{ activeTab, onTabChange, onLoginRequest, userProfile }}
                tooltipPosition="top"
            />
        )}
        {userProfile && (
          <NavButton tab={{ id: 'logout', icon: 'fa-sign-out-alt', label: 'Sign Out' }} activeTab={null} onTabChange={onLogout} tooltipPosition="top" />
        )}
      </div>
    </nav>
  );
};

export default DesktopNav;