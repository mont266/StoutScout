

import React, { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../analytics.js';
import LeaderboardPage from './LeaderboardPage.jsx';
import CommunityFeed from './CommunityFeed.jsx';
import FriendsFeed from './FriendsFeed.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import ImageModal from './ImageModal.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import ReportImageModal from './ReportImageModal.jsx';
import { supabase } from '../supabase.js';

const EMPTY_SET = new Set();

const CommunityPage = ({ userProfile, onViewProfile, friendships, onFriendRequest, onFriendAction, userLikes, onToggleLike, onLoginRequest, onDataRefresh, activeSubTab, onSubTabChange, onViewPub, unreadNotificationsCount, notifications, onMarkNotificationsAsRead, commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onDeleteNotification, onOpenShareRatingModal, dbPubs, setAlertInfo, onOpenCreatePostModal, userPostLikes, onTogglePostLike, postSuccessCount, commentsByPost, isPostCommentsLoading, onFetchCommentsForPost, onAddPostComment, onDeletePostComment, pubScores, isNavShrunk, onEditPost, onDeletePost, onOpenSharePostModal, onReportContent, blockList = EMPTY_SET, socialsUpdateCount }) => {
    const [imageToView, setImageToView] = useState(null);
    const [feedFilter, setFeedFilter] = useState({ sortBy: 'created_at', timePeriod: 'all' });
    const [contentFilter, setContentFilter] = useState('all');
    const [postSubFilter, setPostSubFilter] = useState('all'); // 'all' or 'announcements'
    const isDesktop = useIsDesktop();
    const [reportModalInfo, setReportModalInfo] = useState({ isOpen: false, rating: null });

    const handleInitiateReport = (ratingToReport) => {
        setImageToView(null);
        setReportModalInfo({ isOpen: true, rating: ratingToReport });
    };

    const handleReportImage = async (rating, reason) => {
        if (!userProfile) {
            setAlertInfo({ isOpen: true, title: 'Login Required', message: 'You must be logged in to report an image.', theme: 'info' });
            return;
        }
        trackEvent('report_image', { rating_id: rating.id, reason });
        try {
            const { error } = await supabase.functions.invoke('report-image', {
                body: { rating_id: rating.id, reason },
            });
            if (error) throw error;
            setAlertInfo({ isOpen: true, title: 'Report Submitted', message: 'Thank you. The image has been reported and will be reviewed.', theme: 'success' });
        } catch (error) {
            console.error("Failed to report image:", error);
            setAlertInfo({ isOpen: true, title: 'Report Failed', message: `Could not report image: ${error.context?.responseJson?.error || error.message}`, theme: 'error' });
        }
        setReportModalInfo({ isOpen: false, rating: null });
    };

    const handleContentFilterChange = (newFilter) => {
        setContentFilter(newFilter);
        if (newFilter !== 'posts') {
            setPostSubFilter('all'); // Reset sub-filter
        }
    };

    const handleTabChange = (tab) => {
        // Reset filters when switching tabs to ensure a fresh start
        if (tab !== activeSubTab) {
            setFeedFilter({ sortBy: 'created_at', timePeriod: 'all' });
            setContentFilter('all');
            setPostSubFilter('all'); // Also reset post sub-filter
        }
        onSubTabChange(tab);
        trackEvent('change_community_subtab', { sub_tab: tab });
    };
    
    // Mark notifications as read when the tab is viewed
    useEffect(() => {
        if (activeSubTab === 'notifications' && unreadNotificationsCount > 0) {
            onMarkNotificationsAsRead();
        }
    }, [activeSubTab, unreadNotificationsCount, onMarkNotificationsAsRead]);

    // If the user logs out while on a protected tab, switch to the community feed.
    useEffect(() => {
        if (!userProfile && (activeSubTab === 'friends' || activeSubTab === 'notifications')) {
            onSubTabChange('community');
        }
    }, [userProfile, activeSubTab, onSubTabChange]);

    const allSubTabs = [
        { id: 'community', label: 'Community', icon: 'fa-globe-europe', requiresAuth: false },
        { id: 'friends', label: 'Friends', icon: 'fa-user-friends', requiresAuth: true },
        { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-trophy', requiresAuth: false },
        { id: 'notifications', label: 'Notifications', icon: 'fa-bell', notificationCount: unreadNotificationsCount, requiresAuth: true },
    ];

    const subTabs = allSubTabs.filter(tab => !tab.requiresAuth || !!userProfile);


    const handleViewImage = (rating) => {
        const ratingForModal = { ...rating, uploaderName: rating.user.username };
        setImageToView(ratingForModal);
    }
    
    return (
        <>
            {imageToView && (
                <ImageModal 
                    rating={imageToView}
                    onClose={() => setImageToView(null)}
                    canReport={userProfile && userProfile.id !== imageToView.user.id}
                    onReport={() => handleInitiateReport(imageToView)}
                />
            )}
            {reportModalInfo.isOpen && <ReportImageModal onClose={() => setReportModalInfo({ isOpen: false, rating: null })} onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)} />}
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white relative">
                {/* Responsive Tab Bar */}
                <div className={`community-tabs-container z-20 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm`}>
                    <nav className="flex justify-around -mb-px">
                        {subTabs.map(tab => {
                            const isActive = tab.id === activeSubTab;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`relative flex-grow text-center border-b-4 p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:z-10 ${
                                        isActive
                                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
                                    }`}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-label={tab.label}
                                >
                                    {/* Responsive content container - reduced padding */}
                                    <div className="tab-button-inner flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 py-3">
                                        <i className={`tab-icon fas ${tab.icon} text-lg md:text-base`}></i>
                                        <span className="tab-label text-xs md:text-sm font-semibold">{tab.label}</span>
                                    </div>

                                    {tab.notificationCount > 0 && (
                                        <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                            {tab.notificationCount > 9 ? '9+' : tab.notificationCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-grow min-h-0">
                    {activeSubTab === 'community' && <CommunityFeed 
                        onViewProfile={(id) => onViewProfile(id, 'community')}
                        userLikes={userLikes}
                        onToggleLike={onToggleLike}
                        onLoginRequest={onLoginRequest}
                        onViewImage={handleViewImage}
                        onViewPub={onViewPub}
                        filter={feedFilter}
                        onFilterChange={setFeedFilter}
                        contentFilter={contentFilter}
                        onContentFilterChange={handleContentFilterChange}
                        postSubFilter={postSubFilter}
                        onPostSubFilterChange={setPostSubFilter}
                        loggedInUserProfile={userProfile}
                        commentsByRating={commentsByRating}
                        isCommentsLoading={isCommentsLoading}
                        onFetchComments={onFetchComments}
                        onAddComment={onAddComment}
                        onDeleteComment={onDeleteComment}
                        onReportContent={onReportContent}
                        onOpenShareRatingModal={onOpenShareRatingModal}
                        onOpenSharePostModal={onOpenSharePostModal}
                        dbPubs={dbPubs}
                        onOpenCreatePostModal={onOpenCreatePostModal}
                        userPostLikes={userPostLikes}
                        onTogglePostLike={onTogglePostLike}
                        postSuccessCount={postSuccessCount}
                        socialsUpdateCount={socialsUpdateCount}
                        commentsByPost={commentsByPost}
                        isPostCommentsLoading={isPostCommentsLoading}
                        onFetchCommentsForPost={onFetchCommentsForPost}
                        onAddPostComment={onAddPostComment}
                        onDeletePostComment={onDeletePostComment}
                        pubScores={pubScores}
                        onEditPost={onEditPost}
                        onDeletePost={onDeletePost}
                        blockList={blockList}
                    />}
                    {activeSubTab === 'friends' && <FriendsFeed 
                        onViewProfile={(id) => onViewProfile(id, 'friends')}
                        userLikes={userLikes}
                        onToggleLike={onToggleLike}
                        onLoginRequest={onLoginRequest}
                        onViewImage={handleViewImage}
                        userProfile={userProfile}
                        friendships={friendships}
                        onFriendRequest={onFriendRequest}
                        onFriendAction={onFriendAction}
                        onViewPub={onViewPub}
                        filter={feedFilter}
                        onFilterChange={setFeedFilter}
                        contentFilter={contentFilter}
                        onContentFilterChange={handleContentFilterChange}
                        postSubFilter={postSubFilter}
                        onPostSubFilterChange={setPostSubFilter}
                        loggedInUserProfile={userProfile}
                        commentsByRating={commentsByRating}
                        isCommentsLoading={isCommentsLoading}
                        onFetchComments={onFetchComments}
                        onAddComment={onAddComment}
                        onDeleteComment={onDeleteComment}
                        onReportContent={onReportContent}
                        onOpenShareRatingModal={onOpenShareRatingModal}
                        onOpenSharePostModal={onOpenSharePostModal}
                        dbPubs={dbPubs}
                        onOpenCreatePostModal={onOpenCreatePostModal}
                        userPostLikes={userPostLikes}
                        onTogglePostLike={onTogglePostLike}
                        postSuccessCount={postSuccessCount}
                        socialsUpdateCount={socialsUpdateCount}
                        commentsByPost={commentsByPost}
                        isPostCommentsLoading={isPostCommentsLoading}
                        onFetchCommentsForPost={onFetchCommentsForPost}
                        onAddPostComment={onAddPostComment}
                        onDeletePostComment={onDeletePostComment}
                        pubScores={pubScores}
                        onEditPost={onEditPost}
                        onDeletePost={onDeletePost}
                        blockList={blockList}
                    />}
                    {activeSubTab === 'leaderboard' && <LeaderboardPage onViewProfile={(id) => onViewProfile(id, 'leaderboard')} />}
                    {activeSubTab === 'notifications' && <NotificationsPage notifications={notifications} onFriendAction={onFriendAction} onViewProfile={(id) => onViewProfile(id, 'notifications')} onDataRefresh={onDataRefresh} onViewPub={onViewPub} friendships={friendships} onDeleteNotification={onDeleteNotification} />}
                </div>

            </div>
        </>
    );
};

export default CommunityPage;