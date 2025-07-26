import React, { useState } from 'react';
import { trackEvent } from '../analytics.js';
import LeaderboardPage from './LeaderboardPage.jsx';
import CommunityFeed from './CommunityFeed.jsx';
import FriendsFeed from './FriendsFeed.jsx';
import FriendRequestsPage from './FriendRequestsPage.jsx';
import ImageModal from './ImageModal.jsx';

const CommunityTabButton = ({ label, icon, isActive, onClick, notificationCount = 0 }) => (
    <button
        onClick={onClick}
        className={`relative flex-1 py-3 text-sm font-bold transition-all duration-300 border-b-2 flex items-center justify-center space-x-2 ${
            isActive 
                ? 'text-amber-500 border-amber-500' 
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-amber-500/70 hover:border-amber-500/30'
        }`}
    >
        <i className={`fas ${icon}`}></i>
        <span>{label}</span>
        {notificationCount > 0 && (
            <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCount}
            </span>
        )}
    </button>
);

const CommunityPage = ({ userProfile, onViewProfile, friendships, onFriendAction, userLikes, onToggleLike, onLoginRequest, allRatings, onDataRefresh }) => {
    const [activeSubTab, setActiveSubTab] = useState('community'); // community, friends, leaderboard, requests
    const [imageToView, setImageToView] = useState(null);

    const handleTabChange = (tab) => {
        setActiveSubTab(tab);
        trackEvent('change_community_subtab', { sub_tab: tab });
    };

    const pendingRequests = friendships.filter(f => f.status === 'pending' && f.action_user_id !== userProfile.id);

    const subTabs = [
        { id: 'community', label: 'Community', icon: 'fa-globe-europe' },
        { id: 'friends', label: 'Friends', icon: 'fa-user-friends' },
        { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-trophy' },
        { id: 'requests', label: 'Requests', icon: 'fa-envelope', notificationCount: pendingRequests.length },
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
            {/* Sub-navigation Header */}
            <header className="p-2 bg-gray-100 dark:bg-gray-800/50 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-around">
                    {subTabs.map(tab => (
                        <CommunityTabButton 
                            key={tab.id}
                            label={tab.label}
                            icon={tab.icon}
                            isActive={activeSubTab === tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            notificationCount={tab.notificationCount}
                        />
                    ))}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-grow overflow-y-auto">
                {activeSubTab === 'community' && <CommunityFeed onViewProfile={onViewProfile} userLikes={userLikes} onToggleLike={onToggleLike} onLoginRequest={onLoginRequest} onViewImage={handleViewImage} allRatings={allRatings} />}
                {activeSubTab === 'friends' && <FriendsFeed onViewProfile={onViewProfile} userLikes={userLikes} onToggleLike={onToggleLike} onLoginRequest={onLoginRequest} onViewImage={handleViewImage} userProfile={userProfile} friendships={friendships} allRatings={allRatings} />}
                {activeSubTab === 'leaderboard' && <LeaderboardPage onViewProfile={onViewProfile} />}
                {activeSubTab === 'requests' && <FriendRequestsPage requests={pendingRequests} onFriendAction={onFriendAction} onViewProfile={onViewProfile} onDataRefresh={onDataRefresh} />}
            </main>
        </div>
        </>
    );
};

export default CommunityPage;