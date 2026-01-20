import React from 'react';

import DesktopNav from './DesktopNav.jsx';
import FilterControls from './FilterControls.jsx';
import MapComponent from './Map.jsx';
import PubList from './PubList.jsx';
import PubDetails from './PubDetails.jsx';
import SettingsPage from './SettingsPage.jsx';
import AuthPage from './AuthPage.jsx';
import UpdatePasswordPage from './UpdatePasswordPage.jsx';
import XPPopup from './XPPopup.jsx';
import UpdateConfirmationPopup from './UpdateConfirmationPopup.jsx';
import DeleteConfirmationPopup from './DeleteConfirmationPopup.jsx';
import LevelUpPopup from './LevelUpPopup.jsx';
import RankUpPopup from './RankUpPopup.jsx';
import AvatarSelectionModal from './AvatarSelectionModal.jsx';
import ModerationPage from './ModerationPage.jsx';
import TermsOfUsePage from './TermsOfUsePage.jsx';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';
import DesktopPlacementConfirmation from './DesktopPlacementConfirmation.jsx';
import FriendsListPage from './FriendsListPage.jsx';
import SubmittingRatingModal from './SubmittingRatingModal.jsx';
import AddPubConfirmationPopup from './AddPubConfirmationPopup.jsx';
import MapSearchBar from './MapSearchBar.jsx';
import ReportCommentModal from './ReportCommentModal.jsx';
import NotificationToast from './NotificationToast.jsx';
import SocialContentHub from './SocialContentHub.jsx';
import ActiveCrawlTracker from './ActiveCrawlTracker.jsx';
import ShopPage from './ShopPage.jsx';

const DesktopLayout = (props) => {
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
        handleUpdateAvatar, viewedProfile, handleViewProfile, legalPageView, handleViewLegal, handleDataRefresh,
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
        panelHeight, setPanelHeight, COLLAPSED_PANEL_HEIGHT,
        handleDonationSuccess,
    } = props;
    
    const isSocialHubFullScreen = activeTab === 'settings' && settingsSubView === 'social';

    const renderContentPanel = () => {
        if (viewingFriendsOf) {
            return (
                <FriendsListPage
                    targetUser={viewingFriendsOf}
                    loggedInUser={userProfile}
                    friendsList={friendsList}
                    isLoading={isFetchingFriendsList}
                    onBack={() => handleBackFromFriendsList()}
                    onViewProfile={handleViewProfile}
                    onFriendAction={onFriendAction}
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
            if (props.selectedPub) {
                return (
                    <PubDetails 
                        pub={props.selectedPub} 
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
                        onOpenScoreExplanation={onOpenScoreExplanation}
                        onOpenSuggestEditModal={onOpenSuggestEditModal}
                        commentsByRating={commentsByRating}
                        isCommentsLoading={isCommentsLoading}
                        onFetchComments={onFetchComments}
                        onAddComment={onAddComment}
                        onDeleteComment={onDeleteComment}
                        onReportComment={onReportComment}
                        highlightedRatingId={highlightedRatingId}
                        highlightedCommentId={highlightedCommentId}
                        userZeroVotes={userZeroVotes}
                        onGuinnessZeroVote={onGuinnessZeroVote}
                        onClearGuinnessZeroVote={onClearGuinnessZeroVote}
                        onOpenShareModal={onOpenShareModal}
                        onOpenShareRatingModal={onOpenShareRatingModal}
                        setAlertInfo={props.setAlertInfo}
                        top10PubIds={top10PubIds}
                    />
                );
            }
            return (
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <MapSearchBar
                            onPlaceSelected={handleFindPlace}
                            userProfile={userProfile}
                            onPubSelected={onPubSelected}
                        />
                    </div>
                    <FilterControls
                        currentFilter={filter}
                        onFilterChange={handleFilterChange}
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                        filterGuinnessZero={filterGuinnessZero}
                        onFilterGuinnessZeroChange={onFilterGuinnessZeroChange}
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
                            resultsAreCapped={resultsAreCapped}
                            searchRadius={settings.radius}
                            isInitialLoading={isInitialDataLoading}
                            isRefreshing={isRefreshing}
                            onOpenScoreExplanation={onOpenScoreExplanation}
                            geocodingPubIds={geocodingPubIds}
                        />
                    </div>
                    <div className="flex-shrink-0 p-2 text-center border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => handleViewLegal('terms')}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                        >
                            Terms of Use
                        </button>
                        <span className="mx-2 text-gray-400 dark:text-gray-500">&middot;</span>
                        <button
                            onClick={() => handleViewLegal('privacy')}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                        >
                            Privacy Policy
                        </button>
                    </div>
                </div>
            );
        }

        if (activeTab === 'community') {
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
        }

        if (activeTab === 'settings') {
            if (settingsSubView === 'moderation') {
                return <ModerationPage onBack={() => handleViewAdminPage(null)} onViewProfile={handleViewProfile} onDataRefresh={handleDataRefresh} reportedComments={reportedComments} onFetchReportedComments={onFetchReportedComments} onResolveCommentReport={onResolveCommentReport} onAdminDeleteComment={onAdminDeleteComment} />;
            }
            if (settingsSubView === 'social') {
                return <SocialContentHub onBack={() => handleViewAdminPage(null)} userProfile={userProfile} />;
            }
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
                            userProfile={userProfile} 
                            session={session}
                            onViewProfile={handleViewProfile}
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
                            onViewChangelog={onViewChangelog}
                            onManageChangelog={onManageChangelog}
                            hasUnreadChangelog={hasUnreadChangelog}
                        />
                    </div>
                </div>
            );
        }
        
        return null;
    };
    
    const isFullScreenTab = ['moderation', 'profile', 'shop', 'pub_crawl'].includes(activeTab) || (activeTab === 'settings' && !!settingsSubView);

    return (
        <div className="w-full h-dvh flex">
            <DesktopNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={onLogout}
                userProfile={userProfile}
                levelRequirements={levelRequirements}
                onLoginRequest={() => setIsAuthOpen(true)}
                unreadNotificationsCount={unreadNotificationsCount}
                settings={settings}
                isPubCrawlPlannerEnabled={isPubCrawlPlannerEnabled}
            />

            {/* Main Content Area */}
            <div className="flex-grow h-full flex flex-col">
                <div className="flex-grow min-h-0 relative">
                    {/* Map & Aside Layout */}
                    <div className={`absolute inset-0 flex ${!isFullScreenTab ? '' : 'hidden'}`}>
                        <aside className={`
                            ${isDesktopSidebarCollapsed ? 'w-0' : 'w-[380px] lg:w-[420px] xl:w-[480px]'}
                            transition-all duration-300 ease-in-out
                            flex-shrink-0 h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-10 overflow-hidden
                        `}>
                            {renderContentPanel()}
                        </aside>
                        <main className="flex-grow h-full relative bg-gray-200 dark:bg-gray-900">
                            <button
                                onClick={() => setIsDesktopSidebarCollapsed(prev => !prev)}
                                className="absolute top-1/2 -translate-y-1/2 -left-px z-[1000] bg-white dark:bg-gray-800 w-6 h-24 rounded-r-lg shadow-lg flex items-center justify-center border-y border-r border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                <i className={`fas ${isDesktopSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-gray-600 dark:text-gray-300`}></i>
                            </button>
                            {activeCrawl && (
                                <ActiveCrawlTracker
                                    activeCrawl={activeCrawl}
                                    onEnterCrawlMode={onEnterCrawlMode}
                                    onEndCrawl={onEndCrawl}
                                />
                            )}
                            <MapComponent
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
                                showSearchOrigin={showSearchOrigin}
                                isRefreshing={isRefreshing}
                            />
                            {(locationError && locationPermissionStatus !== 'denied') && 
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
                    </div>

                    {/* Shop Page */}
                    <div className={`absolute inset-0 ${activeTab === 'shop' ? '' : 'hidden'}`}>
                        <ShopPage userProfile={userProfile} />
                    </div>

                    
                    {/* Moderation Page (when accessed from main nav) */}
                    <div className={`absolute inset-0 ${activeTab === 'moderation' ? '' : 'hidden'}`}>
                        <ModerationPage 
                            onViewProfile={handleViewProfile} 
                            onDataRefresh={handleDataRefresh} 
                            reportedComments={reportedComments} 
                            onFetchReportedComments={onFetchReportedComments} 
                            onResolveCommentReport={onResolveCommentReport} 
                            onAdminDeleteComment={onAdminDeleteComment}
                        />
                    </div>

                    {/* Moderation, Social Hub (when accessed from settings) */}
                    <div className={`absolute inset-0 ${activeTab === 'settings' && settingsSubView ? '' : 'hidden'}`}>
                        {renderContentPanel()}
                    </div>
                    
                    {/* Full Screen Profile Page */}
                    <div className={`absolute inset-0 ${activeTab === 'profile' ? '' : 'hidden'}`}>
                        {profilePage}
                    </div>

                    {/* Full Screen Pub Crawl Planner */}
                    <div className={`absolute inset-0 ${activeTab === 'pub_crawl' ? '' : 'hidden'}`}>
                        <PubCrawlPage 
                            userProfile={userProfile} 
                            setAlertInfo={props.setAlertInfo} 
                            handleSelectPub={handleSelectPub}
                            activeCrawl={activeCrawl}
                            onStartCrawl={onStartCrawl}
                            onEndCrawl={onEndCrawl}
                            onToggleCrawlStop={onToggleCrawlStop}
                            onReorderStops={onReorderStops}
                            settings={settings}
                            pubScores={pubScores}
                            userLocation={userLocation}
                            locationPermissionStatus={locationPermissionStatus}
                            onRequestPermission={onRequestPermission}
                        />
                    </div>
                </div>
            </div>
            
            {/* Popups and Modals */}
            <SubmittingRatingModal isVisible={isSubmittingRating} />
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}
            {reportCommentInfo.isOpen && <ReportCommentModal comment={reportCommentInfo.comment} onClose={onCloseReportCommentModal} onSubmit={onSubmitReportComment} />}
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
                    key={toastNotification.id} // Use key to force re-mount on new notification
                    notification={toastNotification}
                    onClick={onToastClick}
                    onClose={onCloseToast}
                />
            )}
        </div>
    );
};

export default DesktopLayout;
