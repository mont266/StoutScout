import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

const TabButton = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
            isActive 
                ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                : 'border-transparent text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        role="tab"
        aria-selected={isActive}
    >
        <span>{label}</span>
        {count > 0 && <span className="bg-gray-200 dark:bg-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
    </button>
);

const FriendsListPage = ({ targetUser, loggedInUser, friendsList, isLoading, onBack, onViewProfile, onFriendAction, blockedUsersProfiles, onUnblockUser }) => {
    const [activeTab, setActiveTab] = useState('friends');
    const [searchTerm, setSearchTerm] = useState('');

    const isViewingOwnFriends = loggedInUser?.id === targetUser?.id;

    const handleUnfriend = (friendshipId, username) => {
        if (window.confirm(`Are you sure you want to remove ${username} as a friend?`)) {
            trackEvent('unfriend', { unfriend_from: 'friends_list' });
            onFriendAction(friendshipId, 'declined');
        }
    };
    
    const itemsToDisplay = (isViewingOwnFriends && activeTab === 'blocks') ? (blockedUsersProfiles || []) : (friendsList || []);
    const filteredItems = itemsToDisplay.filter(item =>
        item.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderListContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
                </div>
            );
        }

        if (filteredItems.length === 0) {
            if (searchTerm) {
                return <div className="text-center text-gray-500 p-8">No users found matching "{searchTerm}".</div>;
            }
            if (activeTab === 'friends') {
                return (
                    <div className="text-center text-gray-500 p-8">
                         <i className="fas fa-user-friends fa-3x mb-4"></i>
                         <h3 className="text-xl font-semibold">No Friends Yet</h3>
                         <p className="mt-2 text-sm">
                            {isViewingOwnFriends ? "You haven't added any friends yet." : `${targetUser.username} hasn't added any friends yet.`}
                         </p>
                    </div>
                );
            }
            if (activeTab === 'blocks') {
                return (
                     <div className="text-center text-gray-500 p-8">
                         <i className="fas fa-user-slash fa-3x mb-4"></i>
                         <h3 className="text-xl font-semibold">Block List is Empty</h3>
                         <p className="mt-2 text-sm">You haven't blocked any users.</p>
                    </div>
                );
            }
        }

        return (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map(item => (
                    <li key={item.id} className="flex items-center space-x-4 p-3 group">
                        <button onClick={() => onViewProfile(item.id, activeTab === 'friends' ? 'friends_list' : 'block_list')} className="flex items-center space-x-4 flex-grow min-w-0 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md p-1 -m-1">
                             <Avatar avatarId={item.avatar_id} className="w-12 h-12 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-lg text-gray-900 dark:text-white truncate">{item.username}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Level {item.level}</p>
                            </div>
                        </button>
                        {isViewingOwnFriends && activeTab === 'friends' && (
                             <button
                                onClick={() => handleUnfriend(item.friendship_id, item.username)}
                                className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold py-2 px-3 rounded-lg hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors text-xs"
                            >
                                Unfriend
                            </button>
                        )}
                        {isViewingOwnFriends && activeTab === 'blocks' && (
                             <button
                                onClick={() => onUnblockUser(item.id, item.username)}
                                className="flex-shrink-0 bg-blue-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-xs"
                            >
                                Unblock
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors w-full text-left">
                    <i className="fas fa-arrow-left"></i>
                    <span className="font-semibold">Back to Profile</span>
                </button>
            </div>
             <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <div className="p-4">
                    <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400 truncate">
                        {isViewingOwnFriends ? "Your Social Circle" : `${targetUser.username}'s Friends`}
                    </h3>
                    <div className="relative mt-4">
                        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search ${activeTab === 'friends' ? 'friends' : 'blocked users'}...`}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                </div>
                 {isViewingOwnFriends && (
                    <div className="px-4">
                        <nav className="flex space-x-4" aria-label="Tabs">
                           <TabButton label="Friends" count={friendsList.length} isActive={activeTab === 'friends'} onClick={() => setActiveTab('friends')} />
                           <TabButton label="Blocked" count={blockedUsersProfiles.length} isActive={activeTab === 'blocks'} onClick={() => setActiveTab('blocks')} />
                        </nav>
                    </div>
                )}
            </header>
            <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                {renderListContent()}
            </main>
        </div>
    );
};

export default FriendsListPage;