import React, { useState } from 'react';

import Header from './Header.jsx';
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
import IOSInstallInstructionsModal from './IOSInstallInstructionsModal.jsx';
import PlacementConfirmationBar from './PlacementConfirmationBar.jsx';
import FriendsListPage from './FriendsListPage.jsx';
import SubmittingRatingModal from './SubmittingRatingModal.jsx';
import AddPubConfirmationPopup from './AddPubConfirmationPopup.jsx';
import MapSearchBar from './MapSearchBar.jsx';
import ReportCommentModal from './ReportCommentModal.jsx';
import NotificationToast from './NotificationToast.jsx';
import SocialContentHub from './SocialContentHub.jsx';

const TabBar = ({ activeTab, onTabChange, unreadNotificationsCount }) => {
  const tabs = [
    { id: 'map', icon: 'fa-map-marked-alt', label: 'Explore' },
    { id: 'community', icon: 'fa-users', label: 'Community' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <nav className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-inner z-40">
      <div className="max-w-md mx-auto flex justify-around py-2 px-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center justify-center w-24 h-16 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              activeTab === tab.id
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.id === 'community' && unreadNotificationsCount > 0 && (
              <span className="absolute top-3 right-7 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            )}
            <i className={`fas ${tab.icon} fa-lg`}></i>
            <span className="text-xs mt-1 font-semibold">{tab.label}</span>
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
        activeTab, handleTabChange, locationError, settings, filter, handleFilterChange,
        filterGuinnessZero, onFilterGuinnessZeroChange,
        handleRefresh, isRefreshing, sortedPubs, userLocation, mapCenter, searchOrigin,
        handleSelectPub, selectedPubId, highlightedRatingId, highlightedCommentId, handleNominatimResults, handleMapMove,
        refreshTrigger, handleFindCurrentPub, getDistance, isListExpanded,
        setIsListExpanded, getAverageRating, resultsAreCapped,
        isDbPubsLoaded, initialSearchComplete, profilePage, session, handleViewProfile,
        handleSettingsChange, userProfile, handleLogout,
        existingUserRatingForSelectedPub, handleRatePub,
        reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo, addPubSuccessInfo,
        isAvatarModalOpen, setIsAvatarModalOpen,
        handleUpdateAvatar, viewedProfile, handleBackFromProfileView,
        legalPageView, handleViewLegal, handleDataRefresh,
        installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
        showSearchAreaButton, handleSearchThisArea,
        searchOnNextMoveEnd, handleSearchAfterMove,
        handleAddPubClick, pubPlacementState, handleConfirmNewPub, handleCancelPubPlacement,
        isConfirmingLocation, finalPlacementLocation, handlePlacementPinMove, isSubmittingRating,
        handleFindPlace,
        levelRequirements,
        locationPermissionStatus, onRequestPermission,
        mapTileRefreshKey,
        // Community props
        CommunityPage, friendships, userLikes, onToggleLike, onFriendRequest, onFriendAction,
        // Friends List props
        viewingFriendsOf, friendsList, isFetchingFriendsList, handleViewFriends, handleBackFromFriendsList,
        deleteConfirmationInfo,
        // Stats & Admin
        StatsPage,
        settingsSubView, handleViewAdminPage,
        onOpenScoreExplanation,
        // "Suggest Edit" handlers
        onOpenSuggestEditModal,
        unreadNotificationsCount,
        // Comments and notifications
        notifications, onMarkNotificationsAsRead, onDeleteNotification,
        commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment,
        reportCommentInfo, onCloseReportCommentModal, onSubmitReportComment,
        // Moderation
        reportedComments, onFetchReportedComments, onResolveCommentReport, onAdminDeleteComment,
        toastNotification, onCloseToast, onToastClick,
        handleMarketingConsentChange,
        userZeroVotes, onGuinnessZeroVote, onClearGuinnessZeroVote,
        setAlertInfo,
        showAllDbPubs, onToggleShowAllDbPubs,
        onOpenShareModal, onOpenShareRatingModal,
        scrollToSection, onScrollComplete,
        setConfettiState,
        // Password change
        isChangingPassword, handleChangePassword,
        userTrophies,
        allTrophies,
        dbPubs,
        onViewSocialHub,
        isDesktop,
        isPriceByCountryModalOpen,
        onSetIsPriceByCountryModalOpen,
        allRatings, communitySubTab, setCommunitySubTab,
        onOpenAndroidBetaModal,
        enrichingPubIds,
    } = props;

    const isInitialDataLoading = !isDbPubsLoaded || !initialSearchComplete;
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    return (
        <div className="mobile-layout-container w-full max-w-md mx-auto h-full flex flex-col overflow-hidden">
            {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
            {isPasswordRecovery && <UpdatePasswordPage onSuccess={() => setIsPasswordRecovery(false)} />}
            {isIosInstallModalOpen && <IOSInstallInstructionsModal onClose={() => setIsIosInstallModalOpen(false)} />}
            {reportCommentInfo.isOpen && <ReportCommentModal comment={reportCommentInfo.comment} onClose={onCloseReportCommentModal} onSubmit={onSubmitReportComment} />}
            <SubmittingRatingModal isVisible={isSubmittingRating} />
            {toastNotification && (
                <NotificationToast
                    key={toastNotification.id} // Use key to force re-mount on new notification
                    notification={toastNotification}
                    onClick={onToastClick}
                    onClose={onCloseToast}
                />
            )}

            <Header 
                activeTab={activeTab}
                userProfile={userProfile}
                levelRequirements={levelRequirements}
                onProfileClick={() => handleTabChange('profile')}
                onLoginRequest={() => setIsAuthOpen(true)}
            />

            <main className="relative flex-grow flex flex-col overflow-hidden">
                <div className={`flex-grow flex flex-col overflow-y-auto ${activeTab !== 'map' ? '' : 'hidden'}`}>
                    {activeTab === 'profile' && profilePage}
                    {activeTab === 'community' && session && (
                        <CommunityPage 
                            userProfile={userProfile}
                            onViewProfile={handleViewProfile}
                            friendships={friendships}
                            onFriendRequest={onFriendRequest}
                            onFriendAction={onFriendAction}
                            userLikes={userLikes}
                            onToggleLike={onToggleLike}
                            onLoginRequest={() => setIsAuthOpen(true)}
                            allRatings={allRatings}
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
                            onOpenShareRatingModal={onOpenShareRatingModal}
                            dbPubs={dbPubs}
                        />
                    )}
                    {activeTab === 'settings' && (() => {
                        if (settingsSubView === 'stats') {
                            return <StatsPage 
                                onBack={() => handleViewAdminPage(null)} 
                                onViewProfile={handleViewProfile} 
                                onViewPub={handleSelectPub} 
                                userProfile={userProfile} 
                                onAdminDeleteComment={onAdminDeleteComment} 
                                isPriceByCountryModalOpen={props.isPriceByCountryModalOpen}
                                onSetIsPriceByCountryModalOpen={props.onSetIsPriceByCountryModalOpen}
                            />;
                        }
                        if (settingsSubView === 'moderation') {
                            return <ModerationPage onBack={() => handleViewAdminPage(null)} onViewProfile={handleViewProfile} onDataRefresh={handleDataRefresh} reportedComments={reportedComments} onFetchReportedComments={onFetchReportedComments} onResolveCommentReport={onResolveCommentReport} />;
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
                            <SettingsPage
                                settings={settings} onSettingsChange={handleSettingsChange}
                                userProfile={userProfile} onLogout={handleLogout}
                                session={session}
                                onViewProfile={handleViewProfile}
                                onViewLegal={handleViewLegal}
                                onViewStats={() => handleViewAdminPage('stats')}
                                onViewModeration={() => handleViewAdminPage('moderation')}
                                onViewSocialHub={onViewSocialHub}
                                onDataRefresh={handleDataRefresh}
                                installPromptEvent={installPromptEvent}
                                setInstallPromptEvent={setInstallPromptEvent}
                                onShowIosInstall={() => setIsIosInstallModalOpen(true)}
                                onMarketingConsentChange={handleMarketingConsentChange}
                                setAlertInfo={setAlertInfo}
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
                                onOpenAndroidBetaModal={onOpenAndroidBetaModal}
                            />
                        );
                    })()}
                </div>
                
                {/* Map View Container - kept visible to preserve map state */}
                <div className={`flex-grow flex flex-col overflow-hidden ${activeTab === 'map' ? '' : 'hidden'}`}>
                    {locationError && locationPermissionStatus !== 'denied' && (
                        <div className="p-2 bg-red-500 dark:bg-red-800 text-white text-center text-sm" role="alert">{locationError}</div>
                    )}
                    
                    <FilterControls
                        currentFilter={filter}
                        onFilterChange={handleFilterChange}
                        onRefresh={handleRefresh}
                        isRefreshing={isRefreshing}
                        filterGuinnessZero={filterGuinnessZero}
                        onFilterGuinnessZeroChange={onFilterGuinnessZeroChange}
                    />
                    <div className="flex-grow min-h-0 relative">
                        {isSearchExpanded ? (
                             <div className="absolute top-4 left-4 right-4 z-[1000] animate-fade-in-down">
                                <MapSearchBar
                                    onPlaceSelected={(location) => {
                                        handleFindPlace(location);
                                        setIsSearchExpanded(false);
                                    }}
                                    onClose={() => setIsSearchExpanded(false)}
                                    isExpanded={true}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsSearchExpanded(true)}
                                className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300"
                                aria-label="Search for a location"
                            >
                                <i className="fas fa-search text-xl"></i>
                            </button>
                        )}
                        <MapComponent
                            pubs={sortedPubs} userLocation={userLocation}
                            center={mapCenter}
                            onSelectPub={handleSelectPub} selectedPubId={selectedPubId}
                            onNominatimResults={handleNominatimResults} theme={settings.theme}
                            onMapMove={handleMapMove}
                            refreshTrigger={refreshTrigger}
                            showSearchAreaButton={showSearchAreaButton}
                            onSearchThisArea={handleSearchThisArea}
                            searchOnNextMoveEnd={searchOnNextMoveEnd}
                            onSearchAfterMove={handleSearchAfterMove}
                            pubPlacementState={pubPlacementState}
                            finalPlacementLocation={finalPlacementLocation}
                            onPlacementPinMove={handlePlacementPinMove}
                            isDesktop={isDesktop}
                            mapTileRefreshKey={mapTileRefreshKey}
                            searchOrigin={searchOrigin}
                            radius={settings.radius}
                        />
                         <button
                            onClick={handleFindCurrentPub}
                            title="Recenter map on your location"
                            className={`absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300`}
                            aria-label="Recenter map on your location"
                        >
                            <i className="fas fa-location-arrow text-xl"></i>
                        </button>
                        
                        <button
                            onClick={handleAddPubClick}
                            title="Add a missing pub"
                            className={`absolute bottom-4 right-4 z-[1000] bg-amber-500 text-black rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-amber-600 transition-all duration-300`}
                            aria-label="Add a missing pub"
                        >
                            <i className="fas fa-plus text-xl"></i>
                        </button>
                    </div>
                    <div className={`flex-shrink-0 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isListExpanded ? 'max-h-[45%]' : 'max-h-12'}`}>
                        <PubList
                            pubs={sortedPubs} selectedPubId={selectedPubId} onSelectPub={handleSelectPub}
                            filter={filter} getAverageRating={getAverageRating}
                            getDistance={(loc) => getDistance(loc, searchOrigin)}
                            distanceUnit={settings.unit} isExpanded={isListExpanded}
                            onToggle={() => setIsListExpanded(p => !p)}
                            resultsAreCapped={resultsAreCapped}
                            searchRadius={settings.radius}
                            isLoading={isInitialDataLoading || isRefreshing}
                            onOpenScoreExplanation={onOpenScoreExplanation}
                            enrichingPubIds={enrichingPubIds}
                        />
                    </div>
                </div>

                {/* Full Screen Pub Details View (within main content area) */}
                <div className={`absolute inset-0 z-[1100] bg-gray-100 dark:bg-gray-900 transition-transform duration-300 ease-in-out ${selectedPubId ? 'translate-x-0' : 'translate-x-full'}`}>
                    {props.selectedPub && (
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
                        />
                    )}
                </div>

                {/* Full Screen Friends List View */}
                 <div className={`absolute inset-0 z-[1150] bg-gray-100 dark:bg-gray-900 transition-transform duration-300 ease-in-out ${viewingFriendsOf ? 'translate-x-0' : 'translate-x-full'}`}>
                    {viewingFriendsOf && (
                        <FriendsListPage
                            targetUser={viewingFriendsOf}
                            loggedInUser={userProfile}
                            friendsList={friendsList}
                            isLoading={isFetchingFriendsList}
                            onBack={() => handleBackFromFriendsList()}
                            onViewProfile={handleViewProfile}
                            onFriendAction={onFriendAction}
                        />
                    )}
                </div>


                {pubPlacementState && (
                    <PlacementConfirmationBar
                        onConfirm={handleConfirmNewPub}
                        onCancel={handleCancelPubPlacement}
                        isLoading={isConfirmingLocation}
                    />
                )}
            </main>

            <TabBar activeTab={activeTab} onTabChange={handleTabChange} unreadNotificationsCount={unreadNotificationsCount} />

            {/* Popups and Modals (sit outside main content flow) */}
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
        </div>
    );
};

export default MobileLayout;