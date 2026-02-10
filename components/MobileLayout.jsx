

import React, { useState, useRef, useCallback } from 'react';

import Header from './Header.jsx';
import FilterControls from './FilterControls.jsx';
import MapComponent from './Map.jsx';
import PubList from './PubList.jsx';
import PubDetails from './PubDetails.jsx';
import SettingsPage from './SettingsPage.jsx';
import AuthPage from './AuthPage.jsx';
import UpdatePasswordPage from './UpdatePasswordPage.jsx';
import CommunityPage from './CommunityPage.jsx';
import PubCrawlPage from './PubCrawlPage.jsx';
import ShopPage from './ShopPage.jsx';

// Popups & Modals
import XPPopup from './XPPopup.jsx';
import UpdateConfirmationPopup from './UpdateConfirmationPopup.jsx';
import DeleteConfirmationPopup from './DeleteConfirmationPopup.jsx';
import LevelUpPopup from './LevelUpPopup.jsx';
import RankUpPopup from './RankUpPopup.jsx';
import AvatarSelectionModal from './AvatarSelectionModal.jsx';
import ModerationPage from './ModerationPage.jsx';
import TermsOfUsePage from './TermsOfUsePage.jsx';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';
import FriendsListPage from './FriendsListPage.jsx';
import SubmittingRatingModal from './SubmittingRatingModal.jsx';
import AddPubConfirmationPopup from './AddPubConfirmationPopup.jsx';
import MapSearchBar from './MapSearchBar.jsx';
import NotificationToast from './NotificationToast.jsx';
import SocialContentHub from './SocialContentHub.jsx';

// Specific UI Elements
import ActiveCrawlTracker from './ActiveCrawlTracker.jsx';
import LocationPermissionPrompt from './LocationPermissionPrompt.jsx';
import PlacementConfirmationBar from './PlacementConfirmationBar.jsx';
import IOSInstallInstructionsModal from './IOSInstallInstructionsModal.jsx';

const TabBar = ({ activeTab, onTabChange, unreadNotificationsCount, isPubCrawlPlannerEnabled, userProfile, settings, isNavShrunk }) => {
  const baseTabs = [
    { id: 'map', icon: 'fa-map-marked-alt', label: 'Explore' },
    { id: 'community', icon: 'fa-users', label: 'Community' },
  ];

  if (isPubCrawlPlannerEnabled) {
      const communityIndex = baseTabs.findIndex(tab => tab.id === 'community');
      if (communityIndex !== -1) {
        baseTabs.splice(communityIndex + 1, 0, { id: 'pub_crawl', icon: 'fa-route', label: 'Crawl' });
      } else {
        baseTabs.push({ id: 'pub_crawl', icon: 'fa-route', label: 'Crawl' });
      }
  }

  if (userProfile?.is_developer && settings?.developerMode && settings?.isShopEnabled) {
    baseTabs.push({ id: 'shop', icon: 'fa-shopping-bag', label: 'Shop' });
  }

  // Profile is accessed via the header avatar, not the main tab bar on mobile.
  baseTabs.push({ id: 'settings', icon: 'fa-cog', label: 'Settings' });

  const tabs = baseTabs;

  return (
    <nav className={`main-tab-bar flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-inner z-40 transition-transform duration-300 ${isNavShrunk ? 'translate-y-full' : 'translate-y-0'}`}>
      <div className="max-w-md mx-auto flex justify-around px-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center justify-center w-24 h-20 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              activeTab === tab.id
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <div className="tab-button-inner flex flex-col items-center justify-center">
              {tab.id === 'community' && unreadNotificationsCount > 0 && (
                <span className="absolute top-3 right-7 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
              )}
              <i className={`fas ${tab.icon} fa-lg tab-icon`}></i>
              <span className="text-xs mt-3 font-semibold tab-label">
                {tab.label}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};

const MobileLayout = (props) => {
    const {
        isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
        activeTab, handleTabChange, locationError, settings, handleSettingsChange, filter, handleFilterChange,
        filterGuinnessZero, onFilterGuinnessZeroChange,
        handleRefresh, isRefreshing, isInitialDataLoading, sortedPubs, userLocation, mapCenter, searchOrigin,
        handleSelectPub, selectedPubId, highlightedRatingId, highlightedCommentId,
        handleMapMove,
        handleFindCurrentPub, getDistance,
        getAverageRating, resultsAreCapped, isDbSLoaded, initialSearchComplete,
        profilePage, session, userProfile, onLogout,
        selectedPub, existingUserRating, handleRatePub,
        reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo, addPubSuccessInfo,
        isAvatarModalOpen, setIsAvatarModalOpen,
        handleUpdateAvatar, viewedProfile, onViewProfile, legalPageView, handleViewLegal, handleDataRefresh,
        installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
        showSearchAreaButton, handleSearchThisArea,
        searchOnNextMoveEnd, handleSearchAfterMove,
        pubPlacementState, finalPlacementLocation, isConfirmingLocation,
        handlePlacementPinMove, handleConfirmNewPub, handleCancelPubPlacement, isSubmittingRating,
        handleFindPlace, onPubSelected,
        searchRadius, showSearchRadius, showSearchOrigin,
        levelRequirements,
        locationPermissionStatus, onRequestPermission,
        friendships, userLikes, onToggleLike, onFriendRequest, onFriendAction,
        viewingFriendsOf, friendsList, isFetchingFriendsList, handleViewFriends, handleBackFromFriendsList,
        deleteConfirmationInfo,
        settingsSubView, handleViewAdminPage,
        onOpenScoreExplanation, onOpenSuggestEditModal,
        unreadNotificationsCount,
        notifications, onMarkNotificationsAsRead, onDeleteNotification,
        commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onReportContent,
        toastNotification, onCloseToast, onToastClick,
        handleMarketingConsentChange,
        userZeroVotes, onGuinnessZeroVote, onClearGuinnessZeroVote,
        onOpenShareModal,
        onOpenShareRatingModal,
        onOpenSharePostModal,
        scrollToSection, onScrollComplete,
        isChangingPassword, handleChangePassword,
        onViewSocialHub,
        geocodingPubIds,
        isStPaddysModeActive,
        isPubCrawlPlannerEnabled,
        activeCrawl, onStartCrawl, onEndCrawl,
        onEnterCrawlMode,
        handleAddPubClick,
        mapRef, onMapLoad,
        isAppHeaderVisible, onMobileScroll, isNavShrunk,
        isEditRatingFlow,
        panelHeight, setPanelHeight, COLLAPSED_PANEL_HEIGHT,
        ...restProps
    } = props;
    
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    
    const MIN_PANEL_HEIGHT = COLLAPSED_PANEL_HEIGHT;
    const DEFAULT_PANEL_HEIGHT = window.innerHeight * 0.35;
    const MAX_PANEL_HEIGHT = window.innerHeight * 0.85;

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ y: 0, height: 0 });
    const tapDetailsRef = useRef({ time: 0, y: 0 });
    
    const handleTouchStart = useCallback((e) => {
        setIsDragging(true);
        dragStartRef.current = { y: e.touches[0].clientY, height: panelHeight };
        tapDetailsRef.current = { time: Date.now(), y: e.touches[0].clientY };
        document.body.style.overflow = 'hidden'; // Prevent page scroll while dragging
    }, [panelHeight]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - dragStartRef.current.y;
        const newHeight = dragStartRef.current.height - deltaY;
        const clampedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(newHeight, MAX_PANEL_HEIGHT));
        setPanelHeight(clampedHeight);
    }, [isDragging, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT, setPanelHeight]);

    const handleTouchEnd = useCallback((e) => {
        setIsDragging(false);
        document.body.style.overflow = '';

        const tapDuration = Date.now() - tapDetailsRef.current.time;
        const endY = e.changedTouches[0].clientY;
        const tapDistance = Math.abs(endY - tapDetailsRef.current.y);

        // It's a tap, not a drag
        if (tapDuration < 250 && tapDistance < 10) {
            setPanelHeight(currentHeight => 
                currentHeight > MIN_PANEL_HEIGHT + 20 ? MIN_PANEL_HEIGHT : DEFAULT_PANEL_HEIGHT
            );
            return;
        }

        // It's a drag, perform snap
        setPanelHeight(currentHeight => {
            if (currentHeight < DEFAULT_PANEL_HEIGHT / 2) {
                return MIN_PANEL_HEIGHT;
            } else if (currentHeight > MAX_PANEL_HEIGHT * 0.85) {
                return MAX_PANEL_HEIGHT;
            } else {
                return DEFAULT_PANEL_HEIGHT;
            }
        });
    }, [DEFAULT_PANEL_HEIGHT, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT, setPanelHeight]);

    const handleDragHandleClick = () => {
        setPanelHeight(currentHeight => 
            currentHeight > MIN_PANEL_HEIGHT + 20 ? MIN_PANEL_HEIGHT : DEFAULT_PANEL_HEIGHT
        );
    };

    const renderContent = () => {
        if (viewingFriendsOf) {
            return (
                <FriendsListPage
                    targetUser={viewingFriendsOf}
                    loggedInUser={userProfile}
                    friendsList={friendsList}
                    isLoading={isFetchingFriendsList}
                    onBack={handleBackFromFriendsList}
                    onViewProfile={onViewProfile}
                    onFriendAction={onFriendAction}
                    blockedUsersProfiles={props.blockedUsersProfiles}
                    onUnblockUser={props.handleUnblockUser}
                />
            );
        }

        if (activeTab === 'profile') return profilePage;
        if (activeTab === 'community') return <CommunityPage {...props} />;
        if (activeTab === 'pub_crawl') return <PubCrawlPage {...props} />;
        if (activeTab === 'shop') return <ShopPage {...props} />;
        if (activeTab === 'settings') {
            if (settingsSubView === 'moderation') {
                return <ModerationPage onBack={() => handleViewAdminPage(null)} {...props} />;
            }
             if (settingsSubView === 'social') {
                return <SocialContentHub onBack={() => handleViewAdminPage(null)} {...props} />;
            }
            if (legalPageView === 'terms') return <TermsOfUsePage onBack={() => handleViewLegal(null)} />;
            if (legalPageView === 'privacy') return <PrivacyPolicyPage onBack={() => handleViewLegal(null)} />;
            return <SettingsPage {...props} onMarketingConsentChange={handleMarketingConsentChange} />;
        }
        return null;
    };
    
    const showMap = activeTab === 'map';

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
            {isAppHeaderVisible && (
                <Header 
                    activeTab={activeTab} 
                    userProfile={userProfile} 
                    levelRequirements={levelRequirements}
                    onProfileClick={() => handleTabChange('profile')}
                    onLoginRequest={() => setIsAuthOpen(true)}
                    className="transition-transform duration-300"
                />
            )}
            
            <main className="flex-grow min-h-0 relative">
                <div className={`h-full ${showMap ? 'hidden' : 'block'}`}>
                    {renderContent()}
                </div>
                
                {showMap && (
                     <div className="h-full relative">
                         <FilterControls
                            currentFilter={filter}
                            onFilterChange={handleFilterChange}
                            onRefresh={handleRefresh}
                            isRefreshing={isRefreshing}
                            filterGuinnessZero={filterGuinnessZero}
                            onFilterGuinnessZeroChange={onFilterGuinnessZeroChange}
                            onSearchClick={() => setIsSearchExpanded(true)}
                        />
                         <MapComponent
                            {...props}
                            theme={settings.theme}
                            pubs={sortedPubs}
                            isListExpanded={panelHeight > MIN_PANEL_HEIGHT + 20}
                        />
                        {showSearchAreaButton && !selectedPubId && (
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
                                <button
                                    onClick={handleSearchThisArea}
                                    className="bg-amber-500 text-black font-bold rounded-full shadow-lg hover:bg-amber-400 transition-colors flex items-center animate-fade-in-down px-3 py-1.5 text-sm space-x-1.5"
                                >
                                    <i className="fas fa-search-location"></i>
                                    <span>Search This Area</span>
                                </button>
                            </div>
                        )}
                        {(locationError && locationPermissionStatus !== 'denied') && 
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-2 bg-red-500/90 text-white text-center text-sm rounded-md shadow-lg">{locationError}</div>
                        }
                        <button
                            onClick={handleAddPubClick}
                            className={`absolute z-10 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300`}
                            style={{ bottom: `${panelHeight + 16}px`, left: '16px' }}
                            aria-label="Add a missing pub"
                        >
                            <i className="fas fa-plus text-2xl"></i>
                        </button>
                         <button
                            onClick={handleFindCurrentPub}
                            className={`absolute z-10 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300`}
                            style={{ bottom: `${panelHeight + 16}px`, right: '16px' }}
                            aria-label="Find my location"
                        >
                            <i className="fas fa-location-arrow text-2xl"></i>
                        </button>
                         {activeCrawl && (
                            <ActiveCrawlTracker
                                activeCrawl={activeCrawl}
                                onEnterCrawlMode={onEnterCrawlMode}
                                onEndCrawl={onEndCrawl}
                            />
                        )}
                        <div
                            id="details-panel"
                            className="absolute bottom-0 left-0 right-0 z-20"
                            style={{ height: `${panelHeight}px`, transition: isDragging ? 'none' : 'height 0.3s ease-out' }}
                        >
                            <div className="bg-gray-100 dark:bg-gray-900 h-full flex flex-col rounded-t-2xl shadow-lg-top">
                                <div
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onClick={handleDragHandleClick}
                                    className="flex-shrink-0 p-4 cursor-grab touch-none flex justify-center items-center"
                                >
                                    <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
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
                                        resultsAreCapped={resultsAreCapped}
                                        searchRadius={settings.radius}
                                        isRefreshing={isRefreshing}
                                        onOpenScoreExplanation={onOpenScoreExplanation}
                                        geocodingPubIds={geocodingPubIds}
                                    />
                                </div>
                            </div>
                        </div>
                        {isSearchExpanded && (
                            <div className="fixed inset-0 bg-black/50 z-30 animate-modal-fade-in" onClick={() => setIsSearchExpanded(false)}>
                                <div className="p-4 pt-20 bg-gray-100 dark:bg-gray-900" onClick={e => e.stopPropagation()}>
                                    <MapSearchBar 
                                      onPlaceSelected={(loc) => { handleFindPlace(loc); setIsSearchExpanded(false); }} 
                                      onClose={() => setIsSearchExpanded(false)} 
                                      isExpanded={isSearchExpanded} 
                                      onPubSelected={(pub) => { onPubSelected(pub); setIsSearchExpanded(false); }} 
                                      userProfile={userProfile} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                 {selectedPub && (
                    <div className="absolute inset-0 z-30 bg-gray-100 dark:bg-gray-900 animate-fade-in-up">
                        <PubDetails
                            {...props}
                            pub={selectedPub} 
                            onClose={() => handleSelectPub(null)}
                            loggedInUserProfile={userProfile}
                        />
                    </div>
                )}

                {pubPlacementState && <PlacementConfirmationBar onConfirm={handleConfirmNewPub} onCancel={handleCancelPubPlacement} isLoading={isConfirmingLocation} />}
                {locationPermissionStatus !== 'granted' && !locationError && <LocationPermissionPrompt status={locationPermissionStatus} onRequestPermission={() => onRequestPermission('prompt')} />}
            </main>
            
            <TabBar 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
                unreadNotificationsCount={unreadNotificationsCount} 
                isPubCrawlPlannerEnabled={isPubCrawlPlannerEnabled}
                userProfile={userProfile}
                settings={settings}
                isNavShrunk={isNavShrunk}
            />

            {/* Global Modals & Popups */}
            <SubmittingRatingModal isVisible={isSubmittingRating} />
            {isIosInstallModalOpen && <IOSInstallInstructionsModal onClose={() => setIsIosInstallModalOpen(false)} />}
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}
            {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
            {updateConfirmationInfo && <UpdateConfirmationPopup key={updateConfirmationInfo.key} />}
            {deleteConfirmationInfo && <DeleteConfirmationPopup key={deleteConfirmationInfo.key} />}
            {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
            {rankUpInfo && <RankUpPopup key={rankUpInfo.key} newRank={rankUpInfo.newRank} />}
            {addPubSuccessInfo && <AddPubConfirmationPopup key={addPubSuccessInfo.key} />}
            {isAvatarModalOpen && userProfile && (
                <AvatarSelectionModal
                    userProfile={userProfile}
                    currentAvatarId={userProfile.avatar_id}
                    onSelect={handleUpdateAvatar}
                    onClose={() => setIsAvatarModalOpen(false)}
                />
            )}
            {toastNotification && (
                <NotificationToast
                    key={toastNotification.id}
                    notification={toastNotification}
                    onClick={onToastClick}
                    onClose={onCloseToast}
                />
            )}
        </div>
    );
};

export default MobileLayout;
