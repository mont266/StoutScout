import React from 'react';

import DesktopNav from './DesktopNav.jsx';
import FilterControls from './FilterControls.jsx';
import MapComponent from './Map.jsx';
import PubList from './PubList.jsx';
import PubDetails from './PubDetails.jsx';
import SettingsPage from './SettingsModal.jsx';
import AuthPage from './AuthPage.jsx';
import UpdatePasswordPage from './UpdatePasswordPage.jsx';
import XPPopup from './XPPopup.jsx';
import UpdateConfirmationPopup from './UpdateConfirmationPopup.jsx';
import DeleteConfirmationPopup from './DeleteConfirmationPopup.jsx';
import LevelUpPopup from './LevelUpPopup.jsx';
import RankUpPopup from './RankUpPopup.jsx';
import AvatarSelectionModal from './AvatarSelectionModal.jsx';
import ModerationPage from './ModerationPage.jsx';
import StatsPage from './StatsPage.jsx';
import TermsOfUsePage from './TermsOfUsePage.jsx';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';
import DesktopPlacementConfirmation from './DesktopPlacementConfirmation.jsx';
import FriendsListPage from './FriendsListPage.jsx';
import SubmittingRatingModal from './SubmittingRatingModal.jsx';

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
        handleRefresh, isRefreshing, sortedPubs, userLocation, mapCenter, searchOrigin,
        handleSelectPub, selectedPubId, handleNominatimResults, handleMapMove,
        refreshTrigger, handleFindCurrentPub, getDistance,
        getAverageRating, resultsAreCapped, isDbPubsLoaded, initialSearchComplete,
        renderProfile, session, userProfile, handleViewProfile, handleBackFromProfileView,
        handleSettingsChange, handleSetSimulatedLocation, handleLogout,
        selectedPub, existingUserRatingForSelectedPub, handleRatePub,
        reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo,
        isAvatarModalOpen, setIsAvatarModalOpen,
        handleUpdateAvatar, viewedProfile, legalPageView, handleViewLegal, handleDataRefresh,
        installPromptEvent, setInstallPromptEvent, setIsIosInstallModalOpen,
        showSearchAreaButton, handleSearchThisArea,
        searchOnNextMoveEnd, handleSearchAfterMove,
        handleAddPubClick, pubPlacementState, finalPlacementLocation, isConfirmingLocation,
        handlePlacementPinMove, handleConfirmNewPub, handleCancelPubPlacement, isSubmittingRating,
        // Community props
        CommunityPage, friendships, userLikes, onToggleLike, handleFriendRequest, handleFriendAction, allRatings,
        // Friends List props
        viewingFriendsOf, friendsList, isFetchingFriendsList, handleBackFromFriendsList,
        deleteConfirmationInfo,
    } = props;
    
    const isInitialDataLoading = !isDbPubsLoaded || !initialSearchComplete;

    const renderContentPanel = () => {
        if (viewingFriendsOf) {
            return (
                <FriendsListPage
                    targetUser={viewingFriendsOf}
                    loggedInUser={userProfile}
                    friendsList={friendsList}
                    isLoading={isFetchingFriendsList}
                    onBack={handleBackFromFriendsList}
                    onViewProfile={handleViewProfile}
                    onFriendAction={handleFriendAction}
                />
            );
        }

        if (pubPlacementState) {
            return (
                <DesktopPlacementConfirmation
                    pubName={pubPlacementState.name}
                    onConfirm={handleConfirmNewPub}
                    onCancel={handleCancelPubPlacement}
                    isLoading={isConfirmingLocation}
                />
            );
        }

        if (activeTab === 'map') {
            if (selectedPub) {
                return (
                    <PubDetails 
                        pub={selectedPub} 
                        onClose={() => handleSelectPub(null)}
                        onRate={handleRatePub}
                        getAverageRating={getAverageRating}
                        existingUserRating={existingUserRatingForSelectedPub}
                        session={session}
                        onLoginRequest={() => setIsAuthOpen(true)}
                        onViewProfile={handleViewProfile}
                        loggedInUserProfile={userProfile}
                        onDataRefresh={handleDataRefresh}
                        userLikes={userLikes}
                        onToggleLike={onToggleLike}
                        isSubmittingRating={isSubmittingRating}
                    />
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
                     <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleAddPubClick}
                            className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center space-x-2"
                        >
                            <i className="fas fa-plus"></i>
                            <span>Add a Missing Pub</span>
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                         <PubList 
                            pubs={sortedPubs}
                            selectedPubId={selectedPubId}
                            onSelectPub={handleSelectPub}
                            filter={filter}
                            getAverageRating={getAverageRating}
                            getDistance={(loc) => getDistance(loc, searchOrigin)}
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

        if (activeTab === 'community') {
            if (viewedProfile) { // If we clicked a profile from the community tab
                return renderProfile(handleBackFromProfileView);
            }
            return (
                <CommunityPage 
                    userProfile={userProfile}
                    onViewProfile={handleViewProfile}
                    friendships={friendships}
                    onFriendRequest={handleFriendRequest}
                    onFriendAction={handleFriendAction}
                    userLikes={userLikes}
                    onToggleLike={onToggleLike}
                    onLoginRequest={() => setIsAuthOpen(true)}
                    allRatings={allRatings}
                    onDataRefresh={handleDataRefresh}
                />
            );
        }

        if (activeTab === 'profile') {
             if (viewedProfile && userProfile?.id !== viewedProfile.id) {
                // This case happens if a dev views a profile from settings, then switches to the profile tab
                return renderProfile(handleBackFromProfileView);
             }
            return renderProfile(); // Renders the logged-in user's profile
        }

        if (activeTab === 'settings') {
             if (legalPageView === 'terms') {
                return <TermsOfUsePage onBack={() => handleViewLegal(null)} />;
            }
            if (legalPageView === 'privacy') {
                return <PrivacyPolicyPage onBack={() => handleViewLegal(null)} />;
            }
            return (
                <div className="h-full flex flex-col">
                    <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                        <SettingsPage
                            settings={settings} onSettingsChange={handleSettingsChange}
                            onSetSimulatedLocation={handleSetSimulatedLocation}
                            userProfile={userProfile} 
                            session={session}
                            onViewProfile={handleViewProfile}
                            onLogout={handleLogout}
                            onViewLegal={handleViewLegal}
                            onDataRefresh={handleDataRefresh}
                            installPromptEvent={installPromptEvent}
                            setInstallPromptEvent={setInstallPromptEvent}
                            onShowIosInstall={() => setIsIosInstallModalOpen(true)}
                        />
                    </div>
                </div>
            );
        }
        
        if (activeTab === 'moderation') {
            return (
                <ModerationPage
                    onViewProfile={handleViewProfile}
                    onBack={() => handleTabChange('settings')}
                    onDataRefresh={handleDataRefresh}
                />
            );
        }

        if (activeTab === 'stats') {
            return <StatsPage onBack={() => handleTabChange('settings')} onViewProfile={handleViewProfile} />;
        }

        return null;
    };

    return (
        <div className="w-full h-dvh flex bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-sans antialiased">
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
                    center={mapCenter}
                    onSelectPub={handleSelectPub} selectedPubId={selectedPubId}
                    onNominatimResults={handleNominatimResults} theme={settings.theme} filter={filter}
                    onMapMove={handleMapMove}
                    refreshTrigger={refreshTrigger}
                    showSearchAreaButton={showSearchAreaButton}
                    onSearchThisArea={handleSearchThisArea}
                    searchOnNextMoveEnd={searchOnNextMoveEnd}
                    onSearchAfterMove={handleSearchAfterMove}
                    pubPlacementState={pubPlacementState}
                    finalPlacementLocation={finalPlacementLocation}
                    onPlacementPinMove={handlePlacementPinMove}
                />
                 {locationError && !(settings.developerMode && settings.simulatedLocation) && 
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] p-2 bg-red-500/90 dark:bg-red-800/90 text-white text-center text-sm rounded-md shadow-lg" role="alert">{locationError}</div>
                }
                <button
                    onClick={handleFindCurrentPub}
                    title="Recenter map on your location"
                    className={`absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300`}
                    aria-label="Recenter map on your location"
                >
                    <i className="fas fa-location-arrow text-2xl"></i>
                </button>
            </main>
            
            {/* Popups and Modals */}
            <SubmittingRatingModal isVisible={isSubmittingRating} />
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}
            {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
            {updateConfirmationInfo && <UpdateConfirmationPopup key={updateConfirmationInfo.key} />}
            {deleteConfirmationInfo && <DeleteConfirmationPopup key={deleteConfirmationInfo.key} />}
            {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
            {rankUpInfo && <RankUpPopup key={rankUpInfo.key} newRank={rankUpInfo.newRank} />}
            {isAvatarModalOpen && userProfile && (
                <AvatarSelectionModal
                    userProfile={userProfile}
                    currentAvatarId={userProfile.avatar_id}
                    onSelect={handleUpdateAvatar}
                    onClose={() => setIsAvatarModalOpen(false)}
                />
            )}
        </div>
    );
};

export default DesktopLayout;