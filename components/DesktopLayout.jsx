import React from 'react';

import DesktopNav from './DesktopNav.jsx';
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
import ModerationPage from './ModerationPage.jsx';
import StatsPage from './StatsPage.jsx';

const BackButton = ({ onClick, text = "Back" }) => (
    <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button onClick={onClick} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors w-full">
            <i className="fas fa-arrow-left"></i>
            <span className="font-semibold">{text}</span>
        </button>
    </div>
);

const DesktopLayout = (props) => {
    const {
        isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
        activeTab, handleTabChange, locationError, settings, filter, handleFilterChange,
        handleRefresh, isRefreshing, sortedPubs, userLocation, searchCenter,
        handleSelectPub, selectedPubId, handlePlacesFound, handleCenterChange,
        refreshTrigger, handleFindCurrentPub, getDistance,
        getAverageRating, resultsAreCapped, isDbPubsLoaded, initialSearchComplete,
        renderProfile, session, userProfile, handleViewProfile, handleBackFromProfileView,
        handleSettingsChange, handleSetSimulatedLocation, handleLogout,
        selectedPub, existingUserRatingForSelectedPub, handleRatePub,
        reviewPopupInfo, leveledUpInfo, rankUpInfo,
        isAvatarModalOpen, setIsAvatarModalOpen,
        handleUpdateAvatar, viewedProfile
    } = props;
    
    const isInitialDataLoading = !isDbPubsLoaded || !initialSearchComplete;

    const renderContentPanel = () => {
        if (activeTab === 'map') {
            if (selectedPub) {
                return (
                    <div className="h-full flex flex-col">
                        <BackButton onClick={() => handleSelectPub(null)} text="Back to List" />
                        <div className="flex-grow overflow-y-auto">
                            <PubDetails 
                                pub={selectedPub} 
                                onClose={() => handleSelectPub(null)}
                                onRate={handleRatePub}
                                getAverageRating={getAverageRating}
                                existingUserRating={existingUserRatingForSelectedPub}
                                session={session}
                                onLoginRequest={() => setIsAuthOpen(true)}
                                onViewProfile={handleViewProfile}
                                showCloseButton={false}
                            />
                        </div>
                    </div>
                );
            }
            return (
                <div className="h-full flex flex-col">
                    <FilterControls
                        currentFilter={filter}
                        onFilterChange={handleFilterChange}
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                    />
                    <div className="flex-grow overflow-y-auto">
                         <PubList 
                            pubs={sortedPubs}
                            selectedPubId={selectedPubId}
                            onSelectPub={handleSelectPub}
                            filter={filter}
                            getAverageRating={getAverageRating}
                            getDistance={(loc) => getDistance(loc, searchCenter)}
                            distanceUnit={settings.unit}
                            isExpanded={true}
                            showToggleHeader={false}
                            onToggle={() => {}}
                            resultsAreCapped={resultsAreCapped}
                            searchRadius={settings.radius}
                            isLoading={isInitialDataLoading || isRefreshing}
                        />
                    </div>
                </div>
            );
        }

        if (activeTab === 'leaderboard') {
            if (viewedProfile) {
                return renderProfile(handleBackFromProfileView);
            }
            return <LeaderboardPage onViewProfile={handleViewProfile} />;
        }

        if (activeTab === 'profile') {
             if (viewedProfile && userProfile?.id !== viewedProfile.id) {
                // This case happens if a dev views a profile from settings, then switches to the profile tab
                return renderProfile(handleBackFromProfileView);
             }
            return renderProfile(); // Renders the logged-in user's profile
        }

        if (activeTab === 'settings') {
             return (
                <SettingsPage
                    settings={settings} onSettingsChange={handleSettingsChange}
                    onSetSimulatedLocation={handleSetSimulatedLocation}
                    userProfile={userProfile} 
                    onViewProfile={handleViewProfile}
                    onLogout={handleLogout}
                />
            );
        }
        
        if (activeTab === 'moderation') {
            return (
                <ModerationPage
                    onViewProfile={handleViewProfile}
                    onBack={() => handleTabChange('settings')}
                />
            );
        }

        if (activeTab === 'stats') {
            return <StatsPage />;
        }

        return null;
    };

    return (
        <div className="w-full h-screen flex bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-sans antialiased">
            <DesktopNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={handleLogout}
                userProfile={userProfile}
                onLoginRequest={() => setIsAuthOpen(true)}
            />

            <aside className="w-[480px] flex-shrink-0 h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-10">
               {renderContentPanel()}
            </aside>
            
            <main className="flex-grow h-full relative bg-gray-200 dark:bg-gray-900">
                <MapComponent
                    pubs={sortedPubs} userLocation={userLocation}
                    searchCenter={searchCenter} searchRadius={settings.radius}
                    onSelectPub={handleSelectPub} selectedPubId={selectedPubId}
                    onPlacesFound={handlePlacesFound} theme={settings.theme} filter={filter}
                    onCenterChange={handleCenterChange}
                    refreshTrigger={refreshTrigger}
                />
                 {locationError && !(settings.developerMode && settings.simulatedLocation) && 
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-2 bg-red-500/90 dark:bg-red-800/90 text-white text-center text-sm rounded-md shadow-lg" role="alert">{locationError}</div>
                }
                <button
                    onClick={handleFindCurrentPub}
                    title="Recenter map on your location"
                    className="absolute bottom-4 left-4 z-10 bg-amber-500 text-black rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300"
                    aria-label="Recenter map on your location"
                >
                    <i className="fas fa-crosshairs text-2xl"></i>
                </button>
            </main>
            
            {/* Popups and Modals */}
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}
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

export default DesktopLayout;