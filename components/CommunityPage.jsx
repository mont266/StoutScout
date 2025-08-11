import React, { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../analytics.js';
import LeaderboardPage from './LeaderboardPage.jsx';
import CommunityFeed from './CommunityFeed.jsx';
import FriendsFeed from './FriendsFeed.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import ImageModal from './ImageModal.jsx';

const CommunityPage = ({ userProfile, onViewProfile, friendships, onFriendRequest, onFriendAction, userLikes, onToggleLike, onLoginRequest, allRatings, onDataRefresh, activeSubTab, onSubTabChange, onViewPub, unreadNotificationsCount, notifications, onMarkNotificationsAsRead, commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment }) => {
    const [imageToView, setImageToView] = useState(null);
    const [feedFilter, setFeedFilter] = useState({ sortBy: 'created_at', timePeriod: 'all' });

    const handleTabChange = (tab) => {
        // Reset filter when switching tabs to ensure a fresh start
        if (tab !== activeSubTab) {
            setFeedFilter({ sortBy: 'created_at', timePeriod: 'all' });
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

    const subTabs = [
        { id: 'community', label: 'Community', icon: 'fa-globe-europe' },
        { id: 'friends', label: 'Friends', icon: 'fa-user-friends' },
        { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-trophy' },
        { id: 'notifications', label: 'Notifications', icon: 'fa-bell', notificationCount: unreadNotificationsCount },
    ];

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
                />
            )}
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
                {/* Responsive Tab Bar */}
                <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                                    {/* Responsive content container */}
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 py-2">
                                        <i className={`fas ${tab.icon} text-lg md:text-base`}></i>
                                        <span className="text-xs md:text-sm font-semibold">{tab.label}</span>
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
                <main className="flex-grow overflow-hidden">
                    {activeSubTab === 'community' && <CommunityFeed onViewProfile={(id) => onViewProfile(id, 'community')} userLikes={userLikes} onToggleLike={onToggleLike} onLoginRequest={onLoginRequest} onViewImage={handleViewImage} allRatings={allRatings} onViewPub={onViewPub} filter={feedFilter} onFilterChange={setFeedFilter} loggedInUserProfile={userProfile} commentsByRating={commentsByRating} isCommentsLoading={isCommentsLoading} onFetchComments={onFetchComments} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onReportComment={onReportComment} />}
                    {activeSubTab === 'friends' && <FriendsFeed onViewProfile={(id) => onViewProfile(id, 'friends')} userLikes={userLikes} onToggleLike={onToggleLike} onLoginRequest={onLoginRequest} onViewImage={handleViewImage} userProfile={userProfile} friendships={friendships} onFriendRequest={onFriendRequest} onFriendAction={onFriendAction} allRatings={allRatings} onViewPub={onViewPub} filter={feedFilter} onFilterChange={setFeedFilter} loggedInUserProfile={userProfile} commentsByRating={commentsByRating} isCommentsLoading={isCommentsLoading} onFetchComments={onFetchComments} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onReportComment={onReportComment} />}
                    {activeSubTab === 'leaderboard' && <LeaderboardPage onViewProfile={(id) => onViewProfile(id, 'leaderboard')} />}
                    {activeSubTab === 'notifications' && <NotificationsPage notifications={notifications} onFriendAction={onFriendAction} onViewProfile={(id) => onViewProfile(id, 'notifications')} onDataRefresh={onDataRefresh} onViewPub={onViewPub} friendships={friendships} />}
                </main>

            </div>
        </>
    );
};

export default CommunityPage;