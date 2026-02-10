import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RANK_DETAILS } from '../constants.js';
import { getRankData, formatTimeAgo, getCurrencyInfo } from '../utils.js';
import { supabase } from '../supabase.js';
import StarRating from './StarRating.jsx';
import ProfileAvatar from './ProfileAvatar.jsx';
import ImageModal from './ImageModal.jsx';
import ReportImageModal from './ReportImageModal.jsx';
import { trackEvent } from '../analytics.js';
import BanUserModal from './BanUserModal.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';
import { OnlineStatusContext } from '../contexts/OnlineStatusContext.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import TrophyModal from './TrophyModal.jsx';
import ProfileStatsView from './ProfileStatsView.jsx';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import PostCard from './PostCard.jsx';

// Action sheet modal for profile editing options
const EditProfileActionsModal = ({ isOpen, onClose, onEditAvatar, onEditUsername, onEditBio, onEditSocials, onOpenUpdateDetailsModal, userProfile }) => {
    if (!isOpen) return null;

    const needsDetailsUpdate = userProfile && (!userProfile.dob || !userProfile.country_code);

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-[1300] flex items-end" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 animate-fade-in-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
                <ul className="space-y-2 text-gray-800 dark:text-gray-200">
                    {needsDetailsUpdate && (
                        <li>
                            <button onClick={onOpenUpdateDetailsModal} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 text-amber-600 dark:text-amber-400 font-semibold">
                                <i className="fas fa-calendar-check w-6 text-center"></i>
                                <span>Set Date of Birth</span>
                            </button>
                        </li>
                    )}
                    <li><button onClick={onEditAvatar} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"><i className="fas fa-user-circle w-6 text-center text-gray-500"></i><span>Change Avatar</span></button></li>
                    <li><button onClick={onEditUsername} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"><i className="fas fa-id-card w-6 text-center text-gray-500"></i><span>Edit Username</span></button></li>
                    <li><button onClick={onEditBio} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"><i className="fas fa-book-open w-6 text-center text-gray-500"></i><span>Edit Bio</span></button></li>
                    <li><button onClick={onEditSocials} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"><i className="fas fa-share-alt w-6 text-center text-gray-500"></i><span>Edit Socials</span></button></li>
                </ul>
                <button onClick={onClose} className="w-full mt-4 bg-gray-200 dark:bg-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <div className="pb-safe"></div>
            </div>
        </div>
    );
};

// New Modal component for mobile stats view
const StatsModal = ({ isOpen, onClose, userRatings, onViewPub, rankData, userProfile, levelRequirements, pubScores }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[1300] flex flex-col animate-fade-in-up pt-[env(safe-area-inset-top)]">
            <header className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                <button onClick={onClose} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                    <i className="fas fa-arrow-left"></i>
                    <span className="font-semibold whitespace-nowrap">Back to Profile</span>
                </button>
            </header>
            <div className="flex-grow overflow-y-auto">
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Profile Stats</h2>
                </div>
                <ProfileStatsView userRatings={userRatings} onViewPub={onViewPub} rankData={rankData} userProfile={userProfile} levelRequirements={levelRequirements} pubScores={pubScores} />
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};

// New Modal component for desktop stats view
const DesktopStatsModal = ({ isOpen, onClose, userRatings, onViewPub, rankData, userProfile, levelRequirements, pubScores }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="desktop-stats-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 id="desktop-stats-title" className="text-xl font-bold text-gray-800 dark:text-white">Profile Stats</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900">
                    <ProfileStatsView userRatings={userRatings} onViewPub={onViewPub} rankData={rankData} userProfile={userProfile} levelRequirements={levelRequirements} pubScores={pubScores} />
                </div>
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};


// Helper component for badges
const UserBadges = ({ profile, className = '', justification = 'justify-center' }) => {
    const badges = [];

    if (profile.is_developer) {
        badges.push({
            label: 'Developer',
            icon: 'fa-code',
            color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
            title: 'This user is a Stoutly developer.'
        });
    }
    if (profile.is_team_member) {
        badges.push({
            label: 'Team',
            icon: 'fa-shield-alt',
            color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
            title: 'This user is part of the Stoutly team.'
        });
    }
    if (profile.is_early_bird) {
        badges.push({
            label: 'Early Bird',
            icon: 'fa-feather-alt',
            color: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
            title: 'This user was one of the first to join Stoutly!'
        });
    }

    if (badges.length === 0) {
        return null;
    }

    return (
        <div className={`flex items-center flex-wrap gap-2 ${justification} ${className}`}>
            {badges.map(badge => (
                <div key={badge.label} title={badge.title} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
                    <i className={`fas ${badge.icon}`}></i>
                    <span>{badge.label}</span>
                </div>
            ))}
        </div>
    );
};

// Helper component to render bio with links
const BioRenderer = ({ text }) => {
    if (!text) return null;

    // Regex to find URLs
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
    // Split the text by the regex, keeping the delimiters
    const parts = text.split(urlRegex).filter(Boolean);

    return (
        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    const href = part.startsWith('www.') ? `http://${part}` : part;
                    return (
                        <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-amber-600 dark:text-amber-400 hover:underline">
                            {part}
                        </a>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
};

const SocialLinks = ({ handles, className = '' }) => {
    if (!handles) return null;

    const { instagram_handle, youtube_handle, x_handle } = handles;

    if (!instagram_handle && !youtube_handle && !x_handle) {
        return null;
    }

    const socials = [
        { platform: 'instagram', handle: instagram_handle, icon: 'fab fa-instagram', url: `https://www.instagram.com/${instagram_handle}` },
        { platform: 'youtube', handle: youtube_handle, icon: 'fab fa-youtube', url: `https://www.youtube.com/@${youtube_handle}` },
        { platform: 'x', handle: x_handle, icon: 'fab fa-twitter', url: `https://x.com/${x_handle}` }
    ];

    return (
        <div className={`flex items-center gap-4 ${className}`}>
            {socials.map(social => social.handle && (
                <a 
                    key={social.platform} 
                    href={social.url} 
                    target="_blank" 
                    rel="noopener noreferrer nofollow" 
                    className="text-gray-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors text-2xl"
                    aria-label={`View ${handles.username}'s ${social.platform} profile`}
                >
                    <i className={social.icon}></i>
                </a>
            ))}
        </div>
    );
};

const FriendshipButton = ({ loggedInUser, targetUser, friendships, onFriendRequest, onFriendAction }) => {
    const [status, setStatus] = useState('loading');
    const [friendshipId, setFriendshipId] = useState(null);

    useEffect(() => {
        if (!loggedInUser || !targetUser || !friendships) {
            setStatus('hidden');
            return;
        }

        if (loggedInUser.id === targetUser.id) {
            setStatus('hidden');
            return;
        }

        const f = friendships.find(fs =>
            (fs.user_id_1 === loggedInUser.id && fs.user_id_2 === targetUser.id) ||
            (fs.user_id_1 === targetUser.id && fs.user_id_2 === loggedInUser.id)
        );

        if (f) {
            setFriendshipId(f.id);
            if (f.status === 'accepted') {
                setStatus('friends');
            } else if (f.status === 'pending') {
                if (f.action_user_id === loggedInUser.id) {
                    setStatus('request_sent');
                } else {
                    setStatus('request_received');
                }
            } else {
                setStatus('add');
            }
        } else {
            setStatus('add');
        }
    }, [loggedInUser, targetUser, friendships]);

    const handleAction = (action) => {
        if (action === 'add') {
            onFriendRequest(targetUser.id);
            setStatus('request_sent'); // Optimistic update
        } else if (action === 'accept' && friendshipId) {
            onFriendAction(friendshipId, 'accepted');
            setStatus('friends'); // Optimistic update
        } else if (action === 'decline' && friendshipId) {
            onFriendAction(friendshipId, 'declined');
            setStatus('add'); // Optimistic update
        } else if (action === 'unfriend' && friendshipId) {
            if (window.confirm(`Are you sure you want to remove ${targetUser.username} as a friend?`)) {
                onFriendAction(friendshipId, 'declined'); // 'declined' effectively deletes the friendship
                setStatus('add'); // Optimistic update
            }
        }
    };

    switch (status) {
        case 'loading':
            return <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-11 w-32 rounded-lg"></div>;
        case 'add':
            return <button onClick={() => handleAction('add')} className="w-full bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"><i className="fas fa-user-plus"></i><span>Add Friend</span></button>;
        case 'request_sent':
            return <button disabled className="w-full bg-gray-400 dark:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"><i className="fas fa-paper-plane"></i><span>Request Sent</span></button>;
        case 'request_received':
            return (
                <div className="flex gap-2">
                    <button onClick={() => handleAction('accept')} className="flex-1 bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-600 transition-colors">Accept</button>
                    <button onClick={() => handleAction('decline')} className="flex-1 bg-gray-300 dark:bg-gray-600 text-black dark:text-white font-bold py-2.5 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Decline</button>
                </div>
            );
        case 'friends':
            return <button onClick={() => handleAction('unfriend')} className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center space-x-2 group"><i className="fas fa-user-check group-hover:hidden"></i><i className="fas fa-user-times hidden group-hover:inline-block"></i><span className="group-hover:hidden">Friends</span><span className="hidden group-hover:inline-block">Unfriend</span></button>;
        default:
            return null; // 'hidden' case
    }
}

const TrophyCabinet = ({ trophies, onOpenTrophyModal, onNavigateToSettings }) => {
    const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';
    const isNativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    const displayItems = [...(trophies || [])];
    while (displayItems.length < 4) {
        displayItems.push(null);
    }
    const finalItems = displayItems.slice(0, 4);

    return (
        <section className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trophy Cabinet</h2>
                <button onClick={onOpenTrophyModal} className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                    View All
                </button>
            </div>
            <div className="flex justify-around items-center pt-4 pb-2">
                {finalItems.map((trophy, i) => {
                    const isFirst = i === 0;
                    const isLast = i === finalItems.length - 1;
                    
                    let tooltipPositionClasses = 'left-1/2 -translate-x-1/2';
                    let arrowPositionClasses = 'left-1/2 -translate-x-1/2';

                    if (isFirst) {
                        tooltipPositionClasses = 'left-0';
                        arrowPositionClasses = 'left-4';
                    } else if (isLast) {
                        tooltipPositionClasses = 'right-0';
                        arrowPositionClasses = 'right-4';
                    }
                    
                    return (
                        <div key={trophy?.id || i} className="group relative flex flex-col items-center">
                            {/* Wrap icon in a button to make it focusable on tap */}
                            <button
                                type="button"
                                className="focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-full p-2 -m-2"
                                aria-label={trophy ? `View trophy: ${trophy.name}` : 'Locked trophy'}
                            >
                                <i className={`fas ${trophy ? trophy.icon_name : 'fa-trophy'} fa-2x transition-transform group-hover:scale-110 ${trophy?.isUnlocked ? 'text-amber-500' : 'text-gray-400 dark:text-gray-600'}`}></i>
                            </button>
                            {trophy && (
                                <div className={`absolute bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-300 z-10 ${tooltipPositionClasses}`}>
                                    <h5 className={`font-bold text-base ${trophy.isUnlocked ? 'text-amber-400' : 'text-gray-400'}`}>{trophy.name} {!trophy.isUnlocked && '(Locked)'}</h5>
                                    <p className="text-gray-300 mt-1">{trophy.description}</p>
                                    {!trophy.isUnlocked && trophy.id === PATRON_TROPHY_ID && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            {isNativeIos ? (
                                                <p className="text-xs text-center text-amber-400">
                                                    To unlock, please visit <strong className="font-bold">app.stoutly.co.uk</strong> and donate via the web app.
                                                </p>
                                            ) : onNavigateToSettings ? (
                                                <button
                                                    onClick={() => onNavigateToSettings('settings', 'support')}
                                                    className="w-full bg-amber-500 text-black text-xs font-bold py-1.5 px-3 rounded-md hover:bg-amber-400 transition-colors flex items-center justify-center space-x-1.5 pointer-events-auto"
                                                >
                                                    <i className="fas fa-heart"></i>
                                                    <span>Support Us to Unlock</span>
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                    <div className={`absolute top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900 ${arrowPositionClasses}`}></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const hasMetConditions = (trophy, stats) => {
    const conditions = trophy.trigger_conditions;

    // A trophy with no conditions, or an empty condition object, is not stat-based.
    if (!conditions || Object.keys(conditions).length === 0) {
        return false;
    }
    
    let conditionChecked = false;

    // Using 'in' for safer property checking
    if ('min_ratings' in conditions) {
        conditionChecked = true;
        if ((stats.ratingsCount || 0) < conditions.min_ratings) return false;
    }
    if ('min_unique_pubs' in conditions) {
        conditionChecked = true;
        if ((stats.uniquePubsCount || 0) < conditions.min_unique_pubs) return false;
    }
    if ('min_countries' in conditions) {
        conditionChecked = true;
        if ((stats.uniqueCountriesCount || 0) < conditions.min_countries) return false;
    }
    if ('min_pubs_added' in conditions) {
        conditionChecked = true;
        if ((stats.pubsAddedCount || 0) < conditions.min_pubs_added) return false;
    }
    if ('min_ratings_with_photo' in conditions) {
        conditionChecked = true;
        if ((stats.ratingsWithPhotoCount || 0) < conditions.min_ratings_with_photo) return false;
    }
    if ('has_perfect_quality_rating' in conditions) {
        conditionChecked = true;
        if (!stats.has_perfect_quality_rating) return false;
    }
    if ('has_perfect_price_rating' in conditions) {
        conditionChecked = true;
        if (!stats.has_perfect_price_rating) return false;
    }

    // If we checked valid stats and didn't return false, it's true.
    // If we didn't find any known stats (e.g. only date based conditions), return false to rely on DB.
    return conditionChecked;
};

// A reusable card component for consistent styling
const StatCard = ({ icon, title, children, className = '', onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md ${onClick ? 'cursor-pointer transition-transform hover:scale-105' : ''} ${className}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className="flex items-center space-x-3 mb-2">
            <i className={`fas ${icon} text-amber-500 dark:text-amber-400 w-5 text-center`}></i>
            <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
        </div>
        <div className="pl-8">{children}</div>
    </div>
);

const ProfilePage = ({ userProfile, userRatings, userPosts, userTrophies, allTrophies, onViewPub, loggedInUserProfile, levelRequirements, onAvatarChangeClick, onEditUsernameClick, onEditBioClick, onEditSocialsClick, onOpenUpdateDetailsModal, onBack, onProfileUpdate, friendships, onFriendRequest, onFriendAction, onViewFriends, onDeleteRating, onOpenShareProfileModal, onNavigateToSettings, pubScores, isStatsModalOpen, onSetIsStatsModalOpen, userPostLikes, onTogglePostLike, onViewProfile, onReportContent, onEditPost, onDeletePost, onOpenSharePostModal, blockList, onBlockUser, onUnblockUser, blockedUsersProfiles }) => {
    const isDesktop = useIsDesktop();
    const [isBanning, setIsBanning] = useState(false);
    const [isUnbanning, setIsUnbanning] = useState(false);
    const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);
    const [isModerationVisible, setIsModerationVisible] = useState(false);
    const [isRankProgressionVisible, setIsRankProgressionVisible] = useState(false);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [imageToView, setImageToView] = useState(null);
    const [reportModalInfo, setReportModalInfo] = useState({ isOpen: false, rating: null });
    const [deletingRatingId, setDeletingRatingId] = useState(null);
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [alertInfo, setAlertInfo] = useState({ isOpen: false });
    const { onlineUserIds } = useContext(OnlineStatusContext);
    const [isEditActionsModalOpen, setIsEditActionsModalOpen] = useState(false);
    const [isTrophyModalOpen, setIsTrophyModalOpen] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const mainScrollRef = useRef(null);
    const [isDevInfoVisible, setIsDevInfoVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('ratings');
    const [visibleRatingsCount, setVisibleRatingsCount] = useState(5);

    const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';

    const isViewingOwnProfile = loggedInUserProfile && userProfile && userProfile.id === loggedInUserProfile.id;
    const isDeveloper = loggedInUserProfile?.is_developer;
    const canViewStats = isViewingOwnProfile || isDeveloper;

    const displayFriendCount = useMemo(() => {
        if (isViewingOwnProfile && friendships) {
            return friendships.filter(f => f.status === 'accepted').length;
        }
        return userProfile?.friends_count || 0;
    }, [isViewingOwnProfile, friendships, userProfile]);

    // Collapsing header logic for mobile
    useEffect(() => {
        if (isDesktop) return;

        const scrollContainer = mainScrollRef.current;
        if (!scrollContainer) return;

        const handleScroll = () => {
            const SCROLL_THRESHOLD = 50;
            const scrollTop = scrollContainer.scrollTop;
            setIsHeaderCollapsed(scrollTop > SCROLL_THRESHOLD);
        };

        scrollContainer.addEventListener('scroll', handleScroll);
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [isDesktop]);

    const userStatsForTrophies = useMemo(() => ({
        ratingsCount: userRatings.length,
        uniquePubsCount: new Set(userRatings.map(r => r.pubId)).size,
        uniqueCountriesCount: new Set(userRatings.map(r => r.pubCountryCode).filter(Boolean)).size,
        pubsAddedCount: userProfile?.pubs_added_count || 0,
        ratingsWithPhotoCount: userRatings.filter(r => r.image_url).length,
        has_perfect_quality_rating: userRatings.some(r => r.rating.quality === 5),
        has_perfect_price_rating: userRatings.some(r => r.rating.price === 5),
    }), [userRatings, userProfile]);
    
    const trophiesWithStatus = useMemo(() => {
        if (!allTrophies || !userProfile) return [];
        
        // userTrophies is passed from parent. If viewing another user, App.jsx must ensure this contains THAT user's trophies.
        const unlockedTrophyIdsFromDb = new Set((userTrophies || []).map(ut => ut.trophy_id));
        const userStats = userStatsForTrophies;

        return allTrophies.map(trophy => {
            let isUnlocked = false;
            // Check 1: Patron trophy (special case)
            if (trophy.id === PATRON_TROPHY_ID) {
                isUnlocked = !!userProfile.has_donated;
            } 
            // Check 2: Stat-based trophies (Inclusive Check: Database OR Stats)
            // This ensures that if the DB record exists, it's unlocked. If not, we check stats for instant feedback.
            else if (trophy.trigger_conditions && Object.keys(trophy.trigger_conditions).length > 0) {
                const inDb = unlockedTrophyIdsFromDb.has(trophy.id);
                const metStats = hasMetConditions(trophy, userStats);
                isUnlocked = inDb || metStats;
            }
            // Check 3: Event-based trophies (must be in the DB)
            else {
                isUnlocked = unlockedTrophyIdsFromDb.has(trophy.id);
            }
            return { ...trophy, isUnlocked };
        });
    }, [allTrophies, userTrophies, userProfile, userStatsForTrophies]);

    const trophiesForCabinet = useMemo(() => {
        const CABINET_SIZE = 4;
        
        const achievementDateMap = new Map((userTrophies || []).map(ut => [ut.trophy_id, new Date(ut.achieved_at).getTime()]));

        const sortedTrophies = [...trophiesWithStatus].sort((a, b) => {
            // Prioritize unlocked trophies
            if (a.isUnlocked && !b.isUnlocked) return -1;
            if (!a.isUnlocked && b.isUnlocked) return 1;

            // If both are unlocked, prioritize Patron then recency
            if (a.isUnlocked && b.isUnlocked) {
                if (a.id === PATRON_TROPHY_ID && b.id !== PATRON_TROPHY_ID) return -1;
                if (a.id !== PATRON_TROPHY_ID && b.id === PATRON_TROPHY_ID) return 1;
                const dateA = achievementDateMap.get(a.id) || 0;
                const dateB = achievementDateMap.get(b.id) || 0;
                return dateB - dateA;
            }
            
            // If both are locked, maintain original sort order
            return 0;
        });

        return sortedTrophies.slice(0, CABINET_SIZE);
    }, [trophiesWithStatus, userTrophies]);

    if (!userProfile) {
        return (
             <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
            </div>
        );
    }

    const handleOpenModal = (modalOpener) => {
        setIsEditActionsModalOpen(false);
        if (modalOpener) modalOpener();
    };

    const { username, level, is_beta_tester, is_banned, avatar_id, removed_image_count, is_early_bird, is_team_member, bio } = userProfile;
    const reviews = userProfile.reviews || 0;
    
    const rankData = getRankData(level);
    
    const canModerate = isDeveloper && !isViewingOwnProfile;
    const isActionLoading = isBanning || isUnbanning || isUpdatingRoles || !!deletingRatingId;
    const isOnline = onlineUserIds.has(userProfile.id);

    const handleBanUser = async (reason) => {
        setIsBanning(true);
        setIsBanModalOpen(false);
        const { error } = await supabase.functions.invoke('ban-user', {
            body: { user_id: userProfile.id, reason },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Ban Failed', message: error.context?.responseJson?.error || error.message, theme: 'error' });
            trackEvent('ban_user_failed', { banned_user_id: userProfile.id, error: error.message });
        } else {
            trackEvent('ban_user_success', { banned_user_id: userProfile.id, reason });
             if (onProfileUpdate) {
                onProfileUpdate(userProfile.id);
            }
        }
        setIsBanning(false);
    };

    const confirmUnbanUser = () => {
        setConfirmation({
            isOpen: true,
            title: 'Unban User',
            message: `Are you sure you want to unban ${username}? Their ratings will become public again.`,
            onConfirm: async () => {
                await handleUnbanUser();
                setConfirmation({ isOpen: false });
            },
            confirmText: 'Unban',
            theme: 'green'
        });
    };
    
    const handleUnbanUser = async () => {
        setIsUnbanning(true);
        const { error } = await supabase.functions.invoke('unban-user', {
            body: { user_id: userProfile.id },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Unban Failed', message: error.context?.responseJson?.error || error.message, theme: 'error' });
            trackEvent('unban_user_failed', { unbanned_user_id: userProfile.id, error: error.message });
        } else {
            trackEvent('unban_user_success', { unbanned_user_id: userProfile.id });
            if (onProfileUpdate) {
                onProfileUpdate(userProfile.id);
            }
        }
        setIsUnbanning(false);
    };

    const confirmSetRole = (roleName, roleValue) => {
        setConfirmation({
            isOpen: true,
            title: 'Confirm Role Change',
            message: `Are you sure you want to ${roleValue ? 'grant' : 'revoke'} the '${roleName.replace('is_', '')}' role for ${username}? This is a significant permission change.`,
            onConfirm: async () => {
                await handleSetRole(roleName, roleValue);
                setConfirmation({ isOpen: false });
            },
            confirmText: 'Confirm',
            theme: 'blue'
        });
    };

    const handleSetRole = async (roleName, roleValue) => {
        setIsUpdatingRoles(true);
        
        const { error } = await supabase.functions.invoke('set-user-role', {
            body: { 
                user_id: userProfile.id,
                roleName: roleName,
                roleValue: roleValue
            },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Failed to Update Role', message: error.context?.responseJson?.error || error.message, theme: 'error' });
            trackEvent('set_role_failed', { target_user_id: userProfile.id, role_name: roleName, error: error.message });
        } else {
            trackEvent('set_role_success', { target_user_id: userProfile.id, role_name: roleName, role_value: roleValue });
            if (onProfileUpdate) {
                onProfileUpdate(userProfile.id);
            }
        }
        setIsUpdatingRoles(false);
    };

    const toggleSection = (sectionName, isVisible, setVisible) => {
        const nextState = !isVisible;
        setVisible(nextState);
        trackEvent('toggle_profile_section', { section_name: sectionName, is_visible: nextState });
    };

    const handleInitiateReport = (ratingToReport) => {
        setImageToView(null);
        setReportModalInfo({ isOpen: true, rating: ratingToReport });
    };

    const handleReportImage = async (rating, reason) => {
        if (!loggedInUserProfile) {
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
        setImageToView(null);
    };

    const requestDeleteRating = (rating) => {
        setConfirmation({
            isOpen: true,
            title: 'Delete Rating?',
            message: 'This rating and any associated photo will be permanently deleted.',
            onConfirm: async () => {
                if (!rating || !onDeleteRating) return;
                setDeletingRatingId(rating.id);
                await onDeleteRating(rating);
                setDeletingRatingId(null);
                setConfirmation({ isOpen: false });
            },
            confirmText: 'Delete',
            theme: 'red'
        });
    };

    const getProfileBorderColor = () => {
        if (userProfile.is_developer) return 'border-amber-500';
        if (is_beta_tester) return 'border-blue-500';
        if (is_team_member) return 'border-purple-500';
        if (is_early_bird) return 'border-green-500';
        return 'border-amber-400';
    };
    
    const TabButton = ({ tabId, label, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`flex-grow py-3 text-sm font-bold transition-colors border-b-4 ${
                isActive
                ? 'border-amber-500 text-amber-500 dark:text-amber-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            role="tab"
            aria-selected={isActive}
        >
            {label}
        </button>
    );
    
    const RatingsList = () => {
        const ratingsToShow = userRatings.slice(0, visibleRatingsCount);
        const hasMoreRatings = userRatings.length > visibleRatingsCount;

        if (ratingsToShow.length === 0) {
            return (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p>No ratings submitted yet.</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {ratingsToShow.map((r) => {
                    const currencyInfo = getCurrencyInfo({ country_code: r.pubCountryCode, country_name: r.pubCountryName });
                    return (
                        <li key={r.id} className="list-none bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <div className="p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <button onClick={() => onViewPub({ id: r.pubId, name: r.pubName, address: r.pubAddress, location: r.pubLocation, country_code: r.pubCountryCode, country_name: r.pubCountryName })} className="font-bold text-gray-800 dark:text-white hover:underline truncate" disabled={!onViewPub}>
                                        {r.pubName}
                                    </button>
                                     {isViewingOwnProfile && (
                                        <button onClick={() => requestDeleteRating(r)} disabled={deletingRatingId === r.id} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-50">
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                     )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.pubAddress}</p>
                                {r.rating.message && (
                                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md border-l-4 border-gray-200 dark:border-gray-600 whitespace-pre-wrap">
                                        "{r.rating.message}"
                                    </p>
                                )}
                                <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center space-x-1 text-sm"><i className="fas fa-tag text-green-500/80"></i><StarRating rating={r.rating.price} color="text-green-400" /></div>
                                    <div className="flex items-center space-x-1 text-sm"><i className="fas fa-beer text-amber-500/80"></i><StarRating rating={r.rating.quality} color="text-amber-400" /></div>
                                </div>
                                 {r.rating.exact_price && (
                                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
                                        Paid: <span className="font-bold text-gray-700 dark:text-white">{currencyInfo.symbol}{r.rating.exact_price.toFixed(2)}</span>
                                    </p>
                                 )}
                                {r.image_url && (
                                    <div className="mt-2">
                                        <button onClick={() => setImageToView({ ...r, user: userProfile, uploaderName: username })} className="rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none transition">
                                            <img src={r.image_url} alt="Pint of Guinness" className="w-24 h-24 object-cover" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1 text-right">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(r.timestamp)}</span>
                            </div>
                        </li>
                    );
                })}
                {hasMoreRatings && (
                    <div className="mt-4">
                        <button 
                            onClick={() => setVisibleRatingsCount(prev => prev + 5)}
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const PostsList = () => {
        if (!userPosts || userPosts.length === 0) {
            return (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                    <p>No posts yet.</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {userPosts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        userPostLikes={userPostLikes}
                        onToggleLike={onTogglePostLike}
                        onViewProfile={onViewProfile}
                        onLoginRequest={() => {}} // User is already logged in to see their own profile
                        onViewPub={onViewPub}
                        pubScores={pubScores}
                        onEditPost={onEditPost}
                        onDeletePost={onDeletePost}
                        loggedInUserProfile={loggedInUserProfile}
                        onReportContent={onReportContent}
                        onOpenSharePostModal={onOpenSharePostModal}
                    />
                ))}
            </div>
        );
    };

    const ModerationTools = () => (
        canModerate && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <button
                    onClick={() => toggleSection('moderation', isModerationVisible, setIsModerationVisible)}
                    className="w-full flex justify-between items-center text-left text-xl font-semibold text-red-500 dark:text-red-400 p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-expanded={isModerationVisible}
                    aria-controls="moderation-tools-panel"
                >
                    <span><i className="fas fa-gavel mr-2"></i>Moderation</span>
                    <i className={`fas fa-chevron-down text-red-500/70 dark:text-red-400/70 transition-transform duration-300 ${isModerationVisible ? 'rotate-180' : ''}`}></i>
                </button>
                {isModerationVisible && (
                    <div id="moderation-tools-panel" className="mt-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                            {is_banned ? (
                                <button onClick={confirmUnbanUser} disabled={isUnbanning} className="flex-1 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 disabled:bg-green-400 transition-colors">
                                    {isUnbanning ? 'Unbanning...' : 'Unban User'}
                                </button>
                            ) : (
                                <button onClick={() => setIsBanModalOpen(true)} disabled={isBanning} className="flex-1 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 disabled:bg-red-400 transition-colors">
                                    {isBanning ? 'Banning...' : 'Ban User'}
                                </button>
                            )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                             <p><strong>Images Removed:</strong> {removed_image_count || 0}</p>
                        </div>

                         <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                             <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Set Roles</h4>
                             <div className="space-y-2">
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-700 dark:text-gray-300">Developer</span>
                                    <input type="checkbox" checked={userProfile.is_developer || false} onChange={(e) => confirmSetRole('is_developer', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                                </label>
                                 <label className="flex items-center justify-between">
                                    <span className="text-gray-700 dark:text-gray-300">Beta Tester</span>
                                    <input type="checkbox" checked={userProfile.is_beta_tester || false} onChange={(e) => confirmSetRole('is_beta_tester', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                                </label>
                                 <label className="flex items-center justify-between">
                                    <span className="text-gray-700 dark:text-gray-300">Team Member</span>
                                    <input type="checkbox" checked={userProfile.is_team_member || false} onChange={(e) => confirmSetRole('is_team_member', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                                </label>
                            </div>
                         </div>
                    </div>
                )}
            </div>
        )
    );
    
    return (
        <>
            {/* These modals are used across the component */}
            {imageToView && <ImageModal rating={imageToView} onClose={() => setImageToView(null)} onReport={() => handleInitiateReport(imageToView)} canReport={loggedInUserProfile && loggedInUserProfile.id !== imageToView.user.id} />}
            {reportModalInfo.isOpen && <ReportImageModal onClose={() => setReportModalInfo({ isOpen: false, rating: null })} onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)} />}
            {isBanModalOpen && <BanUserModal username={username} onClose={() => setIsBanModalOpen(false)} onConfirm={handleBanUser} />}
            {confirmation.isOpen && <ConfirmationModal {...confirmation} isLoading={isUnbanning || isUpdatingRoles || !!deletingRatingId} onClose={() => setConfirmation({ isOpen: false })} />}
            {alertInfo.isOpen && <AlertModal {...alertInfo} onClose={() => setAlertInfo({ isOpen: false })} />}
            {isEditActionsModalOpen && <EditProfileActionsModal userProfile={userProfile} isOpen={isEditActionsModalOpen} onClose={() => setIsEditActionsModalOpen(false)} onEditAvatar={() => handleOpenModal(onAvatarChangeClick)} onEditUsername={() => handleOpenModal(onEditUsernameClick)} onEditBio={() => handleOpenModal(onEditBioClick)} onEditSocials={() => handleOpenModal(onEditSocialsClick)} onOpenUpdateDetailsModal={() => handleOpenModal(onOpenUpdateDetailsModal)} />}
            {isTrophyModalOpen && <TrophyModal isOpen={isTrophyModalOpen} onClose={() => setIsTrophyModalOpen(false)} trophiesWithStatus={trophiesWithStatus} userStats={userStatsForTrophies} onNavigateToSettings={isViewingOwnProfile ? onNavigateToSettings : null} />}
            {!isDesktop && <StatsModal isOpen={isStatsModalOpen} onClose={() => onSetIsStatsModalOpen(false)} userRatings={userRatings} onViewPub={onViewPub} rankData={rankData} userProfile={userProfile} levelRequirements={levelRequirements} pubScores={pubScores} />}
            {isDesktop && <DesktopStatsModal isOpen={isStatsModalOpen} onClose={() => onSetIsStatsModalOpen(false)} userRatings={userRatings} onViewPub={onViewPub} rankData={rankData} userProfile={userProfile} levelRequirements={levelRequirements} pubScores={pubScores} />}
            
            <div
                ref={mainScrollRef}
                className="h-full bg-gray-100 dark:bg-gray-900 overflow-y-auto"
            >
                <div className={`p-4 sm:p-6 space-y-6 ${!isDesktop ? 'pb-24' : ''} lg:grid lg:grid-cols-3 lg:gap-x-8 lg:space-y-0 lg:max-w-7xl lg:mx-auto`}>
                    {onBack && (
                        <div className={`fixed top-0 left-0 right-0 z-30 p-2 sm:p-4 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity duration-300 ${isHeaderCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'} lg:hidden`}>
                            <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg">
                                <i className="fas fa-arrow-left"></i>
                                <span className="font-semibold">{username}</span>
                            </button>
                        </div>
                    )}
                    
                    {/* Left Column (Profile Info) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 lg:p-6">
                             <div className="relative pt-12 sm:pt-0">
                                {onBack && !isDesktop && (
                                    <div className="absolute top-0 left-0">
                                        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg">
                                            <i className="fas fa-arrow-left"></i>
                                        </button>
                                    </div>
                                )}
                                
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <div className={`p-1.5 rounded-full border-4 ${getProfileBorderColor()}`}>
                                            <ProfileAvatar userProfile={userProfile} levelRequirements={levelRequirements} size={isDesktop ? 128 : 96} onClick={isViewingOwnProfile ? onAvatarChangeClick : null} />
                                        </div>
                                        {isOnline && <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" title="Online"></div>}
                                    </div>

                                    <div className="mt-4 text-center">
                                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span>{username}</span>
                                        </h1>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Joined {new Date(userProfile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                                    </div>
                                    
                                    <UserBadges profile={userProfile} className="mt-3" />
                                </div>

                                <div className="mt-4 flex justify-center items-center space-x-6 text-center">
                                    <div>
                                        <p className="text-2xl font-bold">{reviews}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Ratings</p>
                                    </div>
                                    <button onClick={() => onViewFriends(userProfile)} className="text-center" disabled={!onViewFriends}>
                                        <p className="text-2xl font-bold">{displayFriendCount}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Friends</p>
                                    </button>
                                    <div>
                                        <p className="text-2xl font-bold">{level}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Level</p>
                                    </div>
                                </div>
                                
                                {(bio || userProfile.instagram_handle || userProfile.youtube_handle || userProfile.x_handle) && (
                                    <div className="mt-4 text-center max-w-lg mx-auto">
                                        <BioRenderer text={bio} />
                                        <SocialLinks handles={userProfile} className="mt-3 justify-center" />
                                    </div>
                                )}
                                
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    {isViewingOwnProfile && <button onClick={() => setIsEditActionsModalOpen(true)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Edit Profile</button>}
                                    {!isViewingOwnProfile && <FriendshipButton {...{ loggedInUser: loggedInUserProfile, targetUser: userProfile, friendships, onFriendRequest, onFriendAction }} />}
                                    <button onClick={() => onOpenShareProfileModal(userProfile)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><i className="fas fa-share-alt"></i> Share</button>
                                    {!isViewingOwnProfile && loggedInUserProfile && (
                                        blockList.has(userProfile.id)
                                            ? <button onClick={() => onUnblockUser(userProfile.id, userProfile.username)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><i className="fas fa-user-check"></i> Unblock</button>
                                            : <button onClick={() => onBlockUser(userProfile.id, userProfile.username)} className="flex-1 bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors"><i className="fas fa-user-slash"></i> Block</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ModerationTools />
                        
                        <TrophyCabinet trophies={trophiesForCabinet} onOpenTrophyModal={() => setIsTrophyModalOpen(true)} onNavigateToSettings={isViewingOwnProfile ? onNavigateToSettings : null} />

                        {canViewStats && (
                            <StatCard icon="fa-chart-bar" title="Profile Stats" onClick={() => onSetIsStatsModalOpen(true)}>
                                <p className="text-sm text-gray-600 dark:text-gray-300">View detailed statistics about your rating history, achievements, and more.</p>
                            </StatCard>
                        )}
                        
                        {isDeveloper && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                                <button onClick={() => setIsDevInfoVisible(v => !v)} className="w-full font-bold text-amber-600 dark:text-amber-400 text-left">Developer Info</button>
                                {isDevInfoVisible && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-400 break-all space-y-1">
                                        <p><strong>ID:</strong> {userProfile.id}</p>
                                        <p><strong>Email:</strong> {userProfile.email || 'Not available'}</p>
                                        <p><strong>Last Sign In:</strong> {userProfile.last_sign_in_at ? new Date(userProfile.last_sign_in_at).toLocaleString() : 'N/A'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Right Column (Activity Feed) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tab Navigation for Posts/Ratings */}
                        <div className="sticky top-0 z-10 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                    <TabButton tabId="ratings" label={`Ratings (${userRatings?.length || 0})`} isActive={activeTab === 'ratings'} onClick={() => setActiveTab('ratings')} />
                                    <TabButton tabId="posts" label={`Posts (${userPosts?.length || 0})`} isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
                                </nav>
                            </div>
                        </div>
                        
                        <div>
                            {activeTab === 'ratings' ? <RatingsList /> : <PostsList />}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfilePage;
