import React from 'react';

import Header from './Header.jsx';
import FilterControls from './FilterControls.jsx';
import MapComponent from './Map.jsx';
import PubList from './PubList.jsx';
import PubDetails from './PubDetails.jsx';
import SettingsPage from './SettingsModal.jsx';
import LeaderboardPage from './LeaderboardPage.jsx';
import AuthPage from './AuthPage.jsx';
import UpdatePasswordPage from './UpdatePasswordPage.jsx';
import XPPopup from './XPPopup.jsx';
import LevelUpPopup from './LevelUpPopup.jsx';
import RankUpPopup from './RankUpPopup.jsx';
import AvatarSelectionModal from './AvatarSelectionModal.jsx';

const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'map', icon: 'fa-map-marked-alt', label: 'Explore' },
    { id: 'leaderboard', icon: 'fa-trophy', label: 'Leaders' },
    { id: 'profile', icon: 'fa-user', label: 'Profile' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <nav className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-inner z-40">
      <div className="max-w-md mx-auto flex justify-around py-2 px-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center w-24 h-14 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              activeTab === tab.id
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <i className={`fas ${tab.icon} fa-lg`}></i>
            <span className="text-xs mt-1.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 pb-1 px-2">
        Stoutly is a fan project and is not sponsored by or affiliated with Guinness® or Diageo plc.
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};

const MobileLayout = (props) => {
    const {
        isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
        activeTab, locationError, settings, filter, handleFilterChange,
        handleRefresh, isRefreshing, sortedPubs, userLocation, searchCenter,
        handleSelectPub, selectedPubId, handlePlacesFound, handleCenterChange,
        refreshTrigger, handleFindCurrentPub, getDistance, isListExpanded,
        setIsListExpanded, getAverageRating, resultsAreCapped,
        isDbPubsLoaded, initialSearchComplete, renderProfile, session, handleViewProfile,
        handleSettingsChange, handleSetSimulatedLocation, userProfile, handleLogout,
        handleViewPub, selectedPub, existingUserRatingForSelectedPub, handleRatePub,
        reviewPopupInfo, leveledUpInfo, rankUpInfo,
        isAvatarModalOpen, setIsAvatarModalOpen,
        handleUpdateAvatar, viewedProfile, handleBackFromProfileView,
    } = props;

    const isInitialDataLoading = !isDbPubsLoaded || !initialSearchComplete;

    return (
        <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans antialiased relative">
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}

            <Header activeTab={activeTab} />

            <main className="flex-grow flex flex-col overflow-y-auto">
                {activeTab === 'map' && (
                    <div className="flex-grow flex flex-col overflow-hidden">
                        {locationError && !(settings.developerMode && settings.simulatedLocation) && <div className="p-2 bg-red-500 dark:bg-red-800 text-white text-center text-sm" role="alert">{locationError}</div>}
                        <FilterControls
                            currentFilter={filter}
                            onFilterChange={handleFilterChange}
                            onRefresh={handleRefresh}
                            isRefreshing={isRefreshing}
                        />

                        <div className="flex-grow min-h-0 relative">
                            <MapComponent
                                pubs={sortedPubs} userLocation={userLocation}
                                searchCenter={searchCenter} searchRadius={settings.radius}
                                onSelectPub={handleSelectPub} selectedPubId={selectedPubId}
                                onPlacesFound={handlePlacesFound} theme={settings.theme} filter={filter}
                                onCenterChange={handleCenterChange}
                                refreshTrigger={refreshTrigger}
                            />
                            <button
                                onClick={handleFindCurrentPub}
                                title="Recenter map on your location"
                                className="absolute bottom-4 left-4 z-20 bg-amber-500 text-black rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300"
                                aria-label="Recenter map on your location"
                            >
                                <i className="fas fa-crosshairs text-2xl"></i>
                            </button>
                        </div>
                        <div className={`flex-shrink-0 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isListExpanded ? 'max-h-[45%]' : 'max-h-12'}`}>
                            <PubList
                                pubs={sortedPubs} selectedPubId={selectedPubId} onSelectPub={handleSelectPub}
                                filter={filter} getAverageRating={getAverageRating}
                                getDistance={(loc) => getDistance(loc, searchCenter)}
                                distanceUnit={settings.unit} isExpanded={isListExpanded}
                                onToggle={() => setIsListExpanded(p => !p)}
                                resultsAreCapped={resultsAreCapped}
                                searchRadius={settings.radius}
                                isLoading={isInitialDataLoading || isRefreshing}
                            />
                        </div>
                    </div>
                )}
                {activeTab === 'profile' && renderProfile(viewedProfile ? handleBackFromProfileView : undefined)}
                {activeTab === 'leaderboard' && session && (
                    <LeaderboardPage onViewProfile={handleViewProfile} />
                )}
                {activeTab === 'settings' && (
                    <SettingsPage
                        settings={settings} onSettingsChange={handleSettingsChange}
                        onSetSimulatedLocation={handleSetSimulatedLocation}
                        userProfile={userProfile} onLogout={handleLogout}
                        onViewProfile={handleViewProfile}
                    />
                )}
            </main>

            {activeTab === 'map' && (
                <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-in-out ${selectedPub ? 'translate-y-0' : 'translate-y-full'}`} style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
                    {selectedPub && (
                        <PubDetails
                            pub={selectedPub} onClose={() => handleSelectPub(null)} onRate={handleRatePub}
                            getAverageRating={getAverageRating} existingUserRating={existingUserRatingForSelectedPub}
                            session={session} onLoginRequest={() => setIsAuthOpen(true)}
                            onViewProfile={handleViewProfile}
                        />
                    )}
                </div>
            )}

            <TabBar activeTab={activeTab} onTabChange={props.handleTabChange} />

            {/* Popups and Modals */}
            {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
            {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
            {rankUpInfo && <RankUpPopup key={rankUpInfo.key} newRank={rankUpInfo.newRank} />}
            {isAvatarModalOpen && userProfile && (
                <AvatarSelectionModal
                    currentAvatarId={userProfile.avatar_id}
                    onSelect={handleUpdateAvatar}
                    onClose={() => setIsAvatarModalOpen(false)}
                />
            )}
        </div>
    );
};

export default MobileLayout;