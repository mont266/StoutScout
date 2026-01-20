import React, { useState, useEffect, useCallback, useRef } from 'react';

import Header from './Header.jsx';
import FilterControls from './FilterControls.jsx';
import MapComponent from './Map.jsx';
import PubList from './PubList.jsx';
import PubDetails from './PubDetails.jsx';
import AuthPage from './AuthPage.jsx';
import UpdatePasswordPage from './UpdatePasswordPage.jsx';
import XPPopup from './XPPopup.jsx';
import UpdateConfirmationPopup from './UpdateConfirmationPopup.jsx';
import DeleteConfirmationPopup from './DeleteConfirmationPopup.jsx';
import LevelUpPopup from './LevelUpPopup.jsx';
import RankUpPopup from './RankUpPopup.jsx';
import AvatarSelectionModal from './AvatarSelectionModal.jsx';
import IOSInstallInstructionsModal from './IOSInstallInstructionsModal.jsx';
import LocationPermissionPrompt from './LocationPermissionPrompt.jsx';
import PlacementConfirmationBar from './PlacementConfirmationBar.jsx';
import FriendsListPage from './FriendsListPage.jsx';
import SubmittingRatingModal from './SubmittingRatingModal.jsx';
import AddPubConfirmationPopup from './AddPubConfirmationPopup.jsx';
import MapSearchBar from './MapSearchBar.jsx';
import ReportCommentModal from './ReportCommentModal.jsx';
import NotificationToast from './NotificationToast.jsx';
import ActiveCrawlTracker from './ActiveCrawlTracker.jsx';
import TermsOfUsePage from './TermsOfUsePage.jsx';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';
import ModerationPage from './ModerationPage.jsx';
import SocialContentHub from './SocialContentHub.jsx';
import SettingsPage from './SettingsPage.jsx';

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
    <nav className={`main-tab-bar shrinking-nav-bar flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-inner z-40 ${isNavShrunk ? 'shrunk' : ''}`}>
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
        isDesktop,
        isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
        activeTab, handleTabChange, locationError, settings, handleSettingsChange, filter, handleFilterChange,
        filterGuinnessZero, onFilterGuinnessZeroChange,
        handleRefresh, isRefreshing, isInitialDataLoading, sortedPubs, userLocation, mapCenter, searchOrigin,
        handleSelectPub, selectedPubId, highlightedRatingId, highlightedCommentId, highlightedPostId,
        handleMapMove,
        handleFindCurrentPub, getDistance,
        getAverageRating, resultsAreCapped, 
        profilePage, session, userProfile, onLogout,
        selectedPub, existingUserRatingForSelectedPub, handleRatePub,
        reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo, addPubSuccessInfo,
        isAvatarModalOpen, setIsAvatarModalOpen,
        handleUpdateAvatar, viewedProfile, handleBackFromProfileView,
        legalPageView, handleViewLegal, handleDataRefresh, handleViewProfile,
        installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
        showSearchAreaButton, handleSearchThisArea,
        searchOnNextMoveEnd, handleSearchAfterMove,
        pubPlacementState, finalPlacementLocation, isConfirmingLocation,
        handlePlacementPinMove, handleConfirmNewPub, handleCancelPubPlacement, isSubmittingRating,
        handleFindPlace,
        onPubSelected,
        searchRadius,
        showSearchRadius,
        showSearchOrigin,
        levelRequirements,
        locationPermissionStatus, onRequestPermission,
        CommunityPage,
        friendships, userLikes, onToggleLike, onFriendRequest, onFriendAction,
        viewingFriendsOf, friendsList, isFetchingFriendsList, handleViewFriends, handleBackFromFriendsList,
        deleteConfirmationInfo,
        settingsSubView, handleViewAdminPage,
        onOpenScoreExplanation,
        isPubScoreModalOpen, onSetIsPubScoreModalOpen,
        onOpenSuggestEditModal,
        unreadNotificationsCount,
        notifications, onMarkNotificationsAsRead, onDeleteNotification,
        commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment,
        commentsByPost, isPostCommentsLoading, onFetchCommentsForPost, onAddPostComment, onDeletePostComment,
        reportCommentInfo, onCloseReportCommentModal, onSubmitReportComment,
        reportedComments, onFetchReportedComments, onResolveCommentReport, onAdminDeleteComment,
        toastNotification, onCloseToast, onToastClick,
        handleMarketingConsentChange,
        userZeroVotes, onGuinnessZeroVote, onClearGuinnessZeroVote,
        showAllDbPubs, onToggleShowAllDbPubs,
        onOpenShareModal,
        onOpenShareRatingModal,
        onOpenSharePostModal,
        scrollToSection, onScrollComplete,
        confettiState, setConfettiState,
        isChangingPassword, handleChangePassword,
        userTrophies, allTrophies,
        dbPubs,
        onViewSocialHub,
        geocodingPubIds,
        isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed,
        isStPaddysModeActive,
        top10PubIds,
        systemFlags, localStPaddysOverride, onToggleGlobalStPaddysMode, onToggleLocalStPaddysMode,
        isPubCrawlPlannerEnabled, onTogglePubCrawlPlanner,
        PubCrawlPage,
        activeCrawl, onStartCrawl, onEndCrawl, onToggleCrawlStop, onReorderStops,
        pubScores,
        onEnterCrawlMode,
        handleAddPubClick,
        isBackfilling, onBackfillCountryData,
        onTestTrophyPopup,
        onTestDonationPopup,
        mapRef, onMapLoad,
        communitySubTab, setCommunitySubTab,
        isAppHeaderVisible, onMobileScroll, isNavShrunk,
        // Changelog handlers
        hasUnreadChangelog,
        onViewChangelog,
        onManageChangelog,
        // Post handlers
        isCreatePostModalOpen,
        createPostModalOrigin,
        onOpenCreatePostModal,
        postToEdit,
        onEditPost,
        onDeletePost,
        userPostLikes,
        onTogglePostLike,
        postSuccessCount,
        // Mobile Panel
        panelHeight, setPanelHeight, COLLAPSED_PANEL_HEIGHT,
        handleDonationSuccess,
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
    }, [isDragging, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT]);

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
    }, [DEFAULT_PANEL_HEIGHT, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT]);

    const handleDragHandleClick = () => {
        setPanelHeight(currentHeight => 
            currentHeight > MIN_PANEL_HEIGHT + 20 ? MIN_PANEL_HEIGHT : DEFAULT_PANEL_HEIGHT
        );
    };

    // Logic to render the correct view based on the active tab and other state
    const renderContent = () => {
        if (viewingFriendsOf) {
            return (
                <FriendsListPage
                    targetUser={viewingFriendsOf}
                    loggedInUser={userProfile}
                    friendsList={friendsList}
                    isLoading={isFetchingFriendsList}
                    onBack={handleBackFromFriendsList}
                    onViewProfile={handleViewProfile}
                    onFriendAction={onFriendAction}
                />
            );
        }

        if (legalPageView === 'terms') return <TermsOfUsePage onBack={() => handleViewLegal(null)} />;
        if (legalPageView === 'privacy') return <PrivacyPolicyPage onBack={() => handleViewLegal(null)} />;
        if (settingsSubView === 'moderation') return <ModerationPage onBack={() => handleViewAdminPage(null)} onViewProfile={handleViewProfile} onDataRefresh={handleDataRefresh} reportedComments={reportedComments} onFetchReportedComments={onFetchReportedComments} onResolveCommentReport={onResolveCommentReport} onAdminDeleteComment={onAdminDeleteComment} />;
        if (settingsSubView === 'social') return <SocialContentHub onBack={() => handleViewAdminPage(null)} userProfile={userProfile} />;

        switch (activeTab) {
            case 'community':
                return (
                    <CommunityPage 
                        userProfile={userProfile}
                        onViewProfile={handleViewProfile}
                        friendships={friendships}
                        onFriendRequest={onFriendRequest}
                        onFriendAction={onFriendAction}
                        userLikes={userLikes}
                        onToggleLike={onToggleLike}
                        onLoginRequest={() => setIsAuthOpen(true)}
                        onDataRefresh={handleDataRefresh}
                        activeSubTab={communitySubTab}
                        onSubTabChange={setCommunitySubTab}
                        onViewPub={handleSelectPub}
                        unreadNotificationsCount={unreadNotificationsCount}
                        notifications={notifications}
                        onMarkNotificationsAsRead={onMarkNotificationsAsRead}
                        onDeleteNotification={onDeleteNotification}
                        commentsByRating={commentsByRating}
                        isCommentsLoading={isCommentsLoading}
                        onFetchComments={onFetchComments}
                        onAddComment={onAddComment}
                        onDeleteComment={onDeleteComment}
                        onReportComment={onReportComment}
                        commentsByPost={commentsByPost}
                        isPostCommentsLoading={isPostCommentsLoading}
                        onFetchCommentsForPost={onFetchCommentsForPost}
                        onAddPostComment={onAddPostComment}
                        onDeletePostComment={onDeletePostComment}
                        onOpenShareRatingModal={onOpenShareRatingModal}
                        onOpenSharePostModal={onOpenSharePostModal}
                        dbPubs={dbPubs}
                        onMobileScroll={onMobileScroll}
                        isNavShrunk={isNavShrunk}
                        setAlertInfo={props.setAlertInfo}
                        onOpenCreatePostModal={onOpenCreatePostModal}
                        userPostLikes={userPostLikes}
                        onTogglePostLike={onTogglePostLike}
                        postSuccessCount={postSuccessCount}
                        pubScores={pubScores}
                        onEditPost={onEditPost}
                        onDeletePost={onDeletePost}
                    />
                );
            case 'profile':
                return profilePage;
            case 'settings':
                return (
                    <SettingsPage 
                        settings={settings} onSettingsChange={handleSettingsChange}
                        userProfile={userProfile} 
                        session={session}
                        onLogout={onLogout}
                        onViewLegal={handleViewLegal}
                        onViewModeration={() => handleViewAdminPage('moderation')}
                        onViewSocialHub={onViewSocialHub}
                        onDonationSuccess={handleDonationSuccess}
                        installPromptEvent={installPromptEvent}
                        setInstallPromptEvent={setInstallPromptEvent}
                        onShowIosInstall={() => setIsIosInstallModalOpen(true)}
                        onMarketingConsentChange={handleMarketingConsentChange}
                        setAlertInfo={props.setAlertInfo}
                        showAllDbPubs={showAllDbPubs}
                        onToggleShowAllDbPubs={onToggleShowAllDbPubs}
                        onLoginRequest={() => setIsAuthOpen(true)}
                        setConfettiState={setConfettiState}
                        handleChangePassword={handleChangePassword}
                        isChangingPassword={isChangingPassword}
                        scrollToSection={scrollToSection}
                        onScrollComplete={onScrollComplete}
                        userTrophies={userTrophies}
                        allTrophies={allTrophies}
                        isBackfilling={isBackfilling}
                        onBackfillCountryData={onBackfillCountryData}
                        systemFlags={systemFlags}
                        localStPaddysOverride={localStPaddysOverride}
                        onToggleGlobalStPaddysMode={onToggleGlobalStPaddysMode}
                        onToggleLocalStPaddysMode={onToggleLocalStPaddysMode}
                        isPubCrawlPlannerEnabled={isPubCrawlPlannerEnabled}
                        onTogglePubCrawlPlanner={onTogglePubCrawlPlanner}
                        onTestTrophyPopup={onTestTrophyPopup}
                        onTestDonationPopup={onTestDonationPopup}
                        hasUnreadChangelog={hasUnreadChangelog}
                        onViewChangelog={onViewChangelog}
                        onManageChangelog={onManageChangelog}
                    />
                );
            case 'pub_crawl':
                return <PubCrawlPage {...props} />;
            case 'shop':
                return <ShopPage userProfile={userProfile} />;
            default: // Map view
                return null;
        }
    };
    
    // The map view is always present but hidden when another tab is active
    const isFullscreenTab = ['profile', 'settings', 'community', 'pub_crawl', 'shop'].includes(activeTab) || !!legalPageView || !!settingsSubView || !!viewingFriendsOf;

    return (
        <div className="h-dvh w-full flex flex-col mobile-layout-container overflow-x-hidden">
            <Header
                activeTab={activeTab}
                userProfile={userProfile}
                levelRequirements={levelRequirements}
                onProfileClick={() => handleTabChange('profile')}
                onLoginRequest={() => setIsAuthOpen(true)}
                className={isAppHeaderVisible ? '' : 'hide-header'}
            />

            <div className="flex-grow min-h-0 relative">
                {/* Main Content Area */}
                <div className={`absolute inset-0 flex flex-col ${isSearchExpanded ? 'z-30' : 'z-10'} ${selectedPub ? 'hidden' : ''}`}>
                    {(isSearchExpanded) && (
                        <div className="p-2 bg-gray-100 dark:bg-gray-900 shadow-sm flex-shrink-0">
                             <MapSearchBar 
                                onPlaceSelected={(location) => { handleFindPlace(location); setIsSearchExpanded(false); }}
                                onPubSelected={(pub) => { onPubSelected(pub); setIsSearchExpanded(false); }}
                                userProfile={userProfile}
                                onClose={() => setIsSearchExpanded(false)}
                                isExpanded={isSearchExpanded}
                            />
                        </div>
                    )}
                    
                    <div className={`flex-grow min-h-0 relative ${isFullscreenTab ? 'hidden' : ''}`}>
                         {locationPermissionStatus !== 'granted' && locationError && (
                            <LocationPermissionPrompt
                                status={locationPermissionStatus}
                                onRequestPermission={onRequestPermission}
                            />
                        )}

                        {!pubPlacementState && !selectedPub && (
                            <button
                                onClick={() => setIsSearchExpanded(true)}
                                className="absolute top-16 right-4 z-[1002] w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Search"
                            >
                                <i className="fas fa-search text-xl text-gray-700 dark:text-gray-200"></i>
                            </button>
                        )}
                        
                        <MapComponent
                            mapRef={mapRef}
                            pubs={sortedPubs} userLocation={userLocation}
                            center={mapCenter}
                            onSelectPub={handleSelectPub} selectedPubId={selectedPubId}
                            theme={settings.theme}
                            onMapMove={handleMapMove}
                            onMapLoad={onMapLoad}
                            showSearchAreaButton={showSearchAreaButton}
                            onSearchThisArea={handleSearchThisArea}
                            searchOnNextMoveEnd={searchOnNextMoveEnd}
                            onSearchAfterMove={handleSearchAfterMove}
                            pubPlacementState={pubPlacementState}
                            finalPlacementLocation={finalPlacementLocation}
                            onPlacementPinMove={handlePlacementPinMove}
                            isDesktop={props.isDesktop}
                            searchOrigin={searchOrigin}
                            isSidebarCollapsed={isDesktopSidebarCollapsed}
                            isStPaddysModeActive={isStPaddysModeActive}
                            searchRadius={searchRadius}
                            showSearchRadius={showSearchRadius}
                            isRefreshing={isRefreshing}
                        />
                        {activeCrawl && <ActiveCrawlTracker activeCrawl={activeCrawl} onEnterCrawlMode={onEnterCrawlMode} onEndCrawl={onEndCrawl} />}

                        <div 
                            className="absolute bottom-0 left-0 right-0 z-[1000] flex flex-col bg-white dark:bg-gray-800 shadow-lg-top rounded-t-2xl"
                            style={{ 
                                height: `${panelHeight}px`, 
                                transition: isDragging ? 'none' : 'height 0.3s ease-in-out, transform 0.3s ease-in-out',
                                transform: selectedPub ? 'translateY(100%)' : 'translateY(0)'
                            }}
                        >
                            <div
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onClick={handleDragHandleClick}
                                className="py-3 cursor-grab flex justify-center items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
                                aria-label="Resize panel"
                            >
                                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                            </div>
                            <div className="flex-grow min-h-0">
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
                                    isInitialLoading={isInitialDataLoading}
                                    isRefreshing={isRefreshing}
                                    onOpenScoreExplanation={onOpenScoreExplanation}
                                    geocodingPubIds={geocodingPubIds}
                                />
                            </div>
                        </div>
                        
                         {!pubPlacementState && !selectedPub && (
                            <>
                                <button
                                    onClick={handleFindCurrentPub}
                                    title="Recenter map on your location"
                                    className="absolute left-4 z-[1001] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300"
                                    style={{ bottom: `calc(${panelHeight}px + 1.5rem)` }}
                                    aria-label="Recenter map on your location"
                                >
                                    <i className="fas fa-location-arrow text-xl text-blue-500"></i>
                                </button>
                                <button
                                    onClick={handleAddPubClick}
                                    className="absolute right-4 z-[1001] w-12 h-12 bg-amber-500 text-black rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-amber-400"
                                    style={{ bottom: `calc(${panelHeight}px + 1.5rem)` }}
                                    aria-label="Add a missing pub"
                                >
                                    <i className="fas fa-plus text-xl"></i>
                                </button>
                            </>
                        )}

                         {!selectedPub && !isSearchExpanded && (
                            <div className="absolute top-0 left-0 right-0 z-[1001]">
                                <FilterControls
                                    currentFilter={filter} onFilterChange={handleFilterChange}
                                    onRefresh={handleRefresh} isRefreshing={isRefreshing}
                                    filterGuinnessZero={filterGuinnessZero} onFilterGuinnessZeroChange={onFilterGuinnessZeroChange}
                                />
                            </div>
                        )}

                        {pubPlacementState && (
                            <PlacementConfirmationBar
                                onConfirm={handleConfirmNewPub}
                                onCancel={handleCancelPubPlacement}
                                isLoading={isConfirmingLocation}
                            />
                        )}
                    </div>
                </div>

                {selectedPub && (
                    <div className="absolute inset-0 z-[1100] bg-gray-100 dark:bg-gray-900 animate-fade-in-up overflow-y-auto overscroll-contain">
                        <PubDetails
                            pub={selectedPub}
                            onClose={() => handleSelectPub(null)}
                            {...props}
                        />
                    </div>
                )}

                <div className={`absolute inset-0 z-20 ${!isFullscreenTab ? 'hidden' : 'flex flex-col'}`}>
                    {renderContent()}
                </div>
            </div>

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
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}
            {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
            {updateConfirmationInfo && <UpdateConfirmationPopup key={updateConfirmationInfo.key} />}
            {deleteConfirmationInfo && <DeleteConfirmationPopup key={deleteConfirmationInfo.key} />}
            {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
            {rankUpInfo && <RankUpPopup key={rankUpInfo.key} newRank={rankUpInfo.newRank} />}
            {addPubSuccessInfo && <AddPubConfirmationPopup key={addPubSuccessInfo.key} />}
            {isIosInstallModalOpen && <IOSInstallInstructionsModal onClose={() => setIsIosInstallModalOpen(false)} />}
            {isAvatarModalOpen && userProfile && (
                <AvatarSelectionModal
                    userProfile={userProfile}
                    currentAvatarId={userProfile.avatar_id}
                    onSelect={handleUpdateAvatar}
                    onClose={() => setIsAvatarModalOpen(false)}
                />
            )}
             {reportCommentInfo.isOpen && <ReportCommentModal comment={reportCommentInfo.comment} onClose={onCloseReportCommentModal} onSubmit={onSubmitReportComment} />}
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
