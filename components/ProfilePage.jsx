import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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

// Action sheet modal for profile editing options
const EditProfileActionsModal = ({ isOpen, onClose, onEditAvatar, onEditUsername, onEditBio, onOpenUpdateDetailsModal, userProfile }) => {
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
                </ul>
                <button onClick={onClose} className="w-full mt-4 bg-gray-200 dark:bg-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <div className="pb-safe"></div>
            </div>
        </div>
    );
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
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
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
                                    <h5 className={`font-bold text-base ${trophy.isUnlocked ? 'text-amber-400' : 'text-gray-400'}`}>
                                        {trophy.name} {!trophy.isUnlocked && '(Locked)'}
                                    </h5>
                                    <p className="text-gray-300 mt-1">{trophy.description}</p>
                                    {!trophy.isUnlocked && trophy.id === PATRON_TROPHY_ID && onNavigateToSettings && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            <button
                                                onClick={() => onNavigateToSettings('settings', 'support')}
                                                className="w-full bg-amber-500 text-black text-xs font-bold py-1.5 px-3 rounded-md hover:bg-amber-400 transition-colors flex items-center justify-center space-x-1.5 pointer-events-auto"
                                            >
                                                <i className="fas fa-heart"></i>
                                                <span>Support Us to Unlock</span>
                                            </button>
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
    
    // Using 'in' for safer property checking
    if ('min_ratings' in conditions && (stats.ratingsCount || 0) < conditions.min_ratings) return false;
    if ('min_unique_pubs' in conditions && (stats.uniquePubsCount || 0) < conditions.min_unique_pubs) return false;
    if ('min_countries' in conditions && (stats.uniqueCountriesCount || 0) < conditions.min_countries) return false;
    if ('min_pubs_added' in conditions && (stats.pubsAddedCount || 0) < conditions.min_pubs_added) return false;
    if ('min_ratings_with_photo' in conditions && (stats.ratingsWithPhotoCount || 0) < conditions.min_ratings_with_photo) return false;
    if ('has_perfect_quality_rating' in conditions && !stats.has_perfect_quality_rating) return false;
    if ('has_perfect_price_rating' in conditions && !stats.has_perfect_price_rating) return false;

    // If all defined conditions are met, the re-validation passes.
    return true;
};

const ProfilePage = ({ userProfile, userRatings, userTrophies, allTrophies, onViewPub, loggedInUserProfile, levelRequirements, onAvatarChangeClick, onEditUsernameClick, onEditBioClick, onOpenUpdateDetailsModal, onBack, onProfileUpdate, friendships, onFriendRequest, onFriendAction, onViewFriends, onDeleteRating, onOpenShareProfileModal, onNavigateToSettings }) => {
    const isDesktop = useIsDesktop();
    const [profile, setProfile] = useState(userProfile);
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

    const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';

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


    useEffect(() => {
        setProfile(userProfile);
    }, [userProfile]);

    const userStatsForTrophies = useMemo(() => ({
        ratingsCount: userRatings.length,
        uniquePubsCount: new Set(userRatings.map(r => r.pubId)).size,
        uniqueCountriesCount: new Set(userRatings.map(r => r.pubCountryCode).filter(Boolean)).size,
        pubsAddedCount: profile?.pubs_added_count || 0,
        ratingsWithPhotoCount: userRatings.filter(r => r.image_url).length,
        has_perfect_quality_rating: userRatings.some(r => r.rating.quality === 5),
        has_perfect_price_rating: userRatings.some(r => r.rating.price === 5),
    }), [userRatings, profile]);
    
    const trophiesForCabinet = useMemo(() => {
        const CABINET_SIZE = 4;
        const userStats = userStatsForTrophies;

        // First, determine the definitive `isUnlocked` status for every trophy.
        const allTrophiesWithStatus = (allTrophies || []).map(trophy => {
            let isUnlocked;

            // The "Stoutly Patron" trophy is unlocked *only* if the user has donated.
            if (trophy.id === PATRON_TROPHY_ID) {
                isUnlocked = !!profile?.has_donated;
            } else {
                // For all other trophies, check the DB record first.
                let isUnlockedInDb = (userTrophies || []).some(ut => ut.trophy_id === trophy.id);
                const isStatBased = trophy.trigger_conditions && Object.keys(trophy.trigger_conditions).length > 0;

                if (isUnlockedInDb && isStatBased) {
                    // If it's unlocked in the DB and is stat-based, re-validate against current stats.
                    isUnlocked = hasMetConditions(trophy, userStats);
                } else {
                    // If not stat-based or not unlocked in DB, the DB status is final.
                    isUnlocked = isUnlockedInDb;
                }
            }
            return { ...trophy, isUnlocked };
        });

        // Now, build the cabinet display from this definitive list.
        const unlockedTrophies = allTrophiesWithStatus.filter(t => t.isUnlocked);
        
        // Create a map for quick lookup of achievement dates
        const achievementDateMap = new Map((userTrophies || []).map(ut => [ut.trophy_id, new Date(ut.achieved_at).getTime()]));

        // Sort the unlocked trophies to prioritize Patron and then by most recent
        unlockedTrophies.sort((a, b) => {
            // Prioritize the Patron trophy
            if (a.id === PATRON_TROPHY_ID && b.id !== PATRON_TROPHY_ID) return -1;
            if (a.id !== PATRON_TROPHY_ID && b.id === PATRON_TROPHY_ID) return 1;

            // Sort by most recently achieved
            const dateA = achievementDateMap.get(a.id) || 0;
            const dateB = achievementDateMap.get(b.id) || 0;
            return dateB - dateA;
        });

        const unlockedForCabinet = unlockedTrophies.slice(0, CABINET_SIZE);
        
        if (unlockedForCabinet.length >= CABINET_SIZE) {
            return unlockedForCabinet;
        }

        const needed = CABINET_SIZE - unlockedForCabinet.length;
        const unlockedIds = new Set(unlockedForCabinet.map(t => t.id));

        const lockedForCabinet = allTrophiesWithStatus
            .filter(t => !unlockedIds.has(t.id))
            .slice(0, needed);
        
        return [...unlockedForCabinet, ...lockedForCabinet];

    }, [userTrophies, allTrophies, userStatsForTrophies, profile]);


    if (!profile) {
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

    const { username, level, is_beta_tester, is_banned, avatar_id, removed_image_count, is_early_bird, is_team_member, friends_count, bio } = profile;
    const reviews = profile.reviews || 0;
    
    const rankData = getRankData(level);
    
    const isViewingOwnProfile = !loggedInUserProfile || profile.id === loggedInUserProfile.id;
    const isDeveloper = loggedInUserProfile?.is_developer;
    const canModerate = isDeveloper && !isViewingOwnProfile;
    const isActionLoading = isBanning || isUnbanning || isUpdatingRoles || !!deletingRatingId;
    const isOnline = onlineUserIds.has(profile.id);

    const handleBanUser = async (reason) => {
        setIsBanning(true);
        setIsBanModalOpen(false);
        const { error } = await supabase.functions.invoke('ban-user', {
            body: { user_id: profile.id, reason },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Ban Failed', message: error.context?.responseJson?.error || error.message, theme: 'error' });
            trackEvent('ban_user_failed', { banned_user_id: profile.id, error: error.message });
        } else {
            setProfile(p => ({ ...p, is_banned: true, ban_reason: reason }));
            trackEvent('ban_user_success', { banned_user_id: profile.id, reason });
             if (onProfileUpdate) {
                onProfileUpdate(profile.id);
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
            body: { user_id: profile.id },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Unban Failed', message: error.context?.responseJson?.error || error.message, theme: 'error' });
            trackEvent('unban_user_failed', { unbanned_user_id: profile.id, error: error.message });
        } else {
            setProfile(p => ({ ...p, is_banned: false, ban_reason: null, banned_at: null }));
            trackEvent('unban_user_success', { unbanned_user_id: profile.id });
            if (onProfileUpdate) {
                onProfileUpdate(profile.id);
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
                user_id: profile.id,
                roleName: roleName,
                roleValue: roleValue
            },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Failed to Update Role', message: error.context?.responseJson?.error || error.message, theme: 'error' });
            trackEvent('set_role_failed', { target_user_id: profile.id, role_name: roleName, error: error.message });
        } else {
            setProfile(p => ({ ...p, [roleName]: roleValue }));
            trackEvent('set_role_success', { target_user_id: profile.id, role_name: roleName, role_value: roleValue });
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
        if (profile.is_developer) return 'border-amber-500';
        if (is_beta_tester) return 'border-blue-500';
        if (is_team_member) return 'border-purple-500';
        if (is_early_bird) return 'border-green-500';
        return 'border-amber-400';
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
                        <div className="text-sm">
                            <h4 className="font-bold mb-2">Roles</h4>
                            <div className="space-y-2">
                                <label className="flex items-center justify-between"><span className="font-semibold text-amber-600 dark:text-amber-400">Developer</span><input type="checkbox" checked={profile.is_developer} onChange={(e) => confirmSetRole('is_developer', e.target.checked)} disabled={isUpdatingRoles} className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500" /></label>
                                <label className="flex items-center justify-between"><span className="font-semibold text-purple-600 dark:text-purple-400">Team Member</span><input type="checkbox" checked={is_team_member} onChange={(e) => confirmSetRole('is_team_member', e.target.checked)} disabled={isUpdatingRoles} className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500" /></label>
                            </div>
                        </div>
                        {is_banned && profile.ban_reason && (
                             <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-md">
                                <p className="text-xs text-red-800 dark:text-red-300"><strong className="block">Ban Reason:</strong> {profile.ban_reason}</p>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">Removed images: {removed_image_count || 0}</p>
                    </div>
                )}
            </div>
        )
    );

    const RankProgression = () => (
         <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
            <button
                onClick={() => toggleSection('rank_progression', isRankProgressionVisible, setIsRankProgressionVisible)}
                className="w-full flex justify-between items-center text-left text-xl font-semibold p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-expanded={isRankProgressionVisible}
                aria-controls="rank-progression-panel"
            >
                <span><i className="fas fa-chart-line mr-2"></i>Rank Progression</span>
                <i className={`fas fa-chevron-down text-gray-500/70 dark:text-gray-400/70 transition-transform duration-300 ${isRankProgressionVisible ? 'rotate-180' : ''}`}></i>
            </button>
            {isRankProgressionVisible && (
                <div id="rank-progression-panel" className="mt-4">
                    <ul className="space-y-3">
                        {RANK_DETAILS.map(rank => {
                            const isAchieved = level >= rank.minLevel;
                            return (
                                <li key={rank.name} className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${isAchieved ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    <i className={`fas ${rank.icon} text-2xl w-8 text-center ${isAchieved ? '' : 'opacity-50'}`}></i>
                                    <div>
                                        <p className={`font-bold ${isAchieved ? 'text-amber-800 dark:text-amber-200' : ''}`}>{rank.name}</p>
                                        <p className="text-xs">Requires Level {rank.minLevel}</p>
                                    </div>
                                    {isAchieved && <i className="fas fa-check-circle ml-auto text-green-500"></i>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
    
    const DevInfo = () => (
        isDeveloper && (
            <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <button
                    onClick={() => setIsDevInfoVisible(prev => !prev)}
                    className="w-full flex justify-between items-center text-left text-xl font-semibold text-gray-800 dark:text-white p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-expanded={isDevInfoVisible}
                >
                    <span><i className="fas fa-code mr-2"></i>Developer Info</span>
                    <i className={`fas fa-chevron-down text-gray-500/70 dark:text-gray-400/70 transition-transform duration-300 ${isDevInfoVisible ? 'rotate-180' : ''}`}></i>
                </button>
                {isDevInfoVisible && (
                    <div className="mt-4 p-3 bg-gray-200 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 break-all animate-fade-in-down">
                        <p><strong>User ID:</strong> {profile.id}</p>
                        <p><strong>Created:</strong> {new Date(profile.created_at).toLocaleString('en-GB')}</p>
                        {profile.signup_utm_source && <p><strong>UTM Source:</strong> {profile.signup_utm_source}</p>}
                    </div>
                )}
            </section>
        )
    );

    const RatingsList = () => (
        <div className="space-y-3">
            {userRatings.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p>No ratings submitted yet.</p>
                </div>
            ) : (
                userRatings.map((r) => {
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
                                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md border-l-4 border-gray-200 dark:border-gray-600">
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
                                        <button onClick={() => setImageToView({ ...r, user: profile, uploaderName: username })} className="rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none transition">
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
                })
            )}
        </div>
    );
    
    return (
    <>
        {isBanModalOpen && <BanUserModal username={username} onClose={() => setIsBanModalOpen(false)} onConfirm={handleBanUser} />}
        {imageToView && <ImageModal rating={imageToView} onClose={() => setImageToView(null)} onReport={() => handleInitiateReport(imageToView)} canReport={loggedInUserProfile && loggedInUserProfile.id !== imageToView.user.id} />}
        {reportModalInfo.isOpen && <ReportImageModal onClose={() => setReportModalInfo({ isOpen: false, rating: null })} onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)} />}
        {confirmation.isOpen && <ConfirmationModal {...confirmation} isLoading={isActionLoading} onClose={() => setConfirmation({ isOpen: false })} />}
        {alertInfo.isOpen && <AlertModal {...alertInfo} onClose={() => setAlertInfo({ isOpen: false })} />}
        {isViewingOwnProfile && <EditProfileActionsModal isOpen={isEditActionsModalOpen} onClose={() => setIsEditActionsModalOpen(false)} onEditAvatar={() => handleOpenModal(onAvatarChangeClick)} onEditUsername={() => handleOpenModal(onEditUsernameClick)} onEditBio={() => handleOpenModal(onEditBioClick)} onOpenUpdateDetailsModal={() => handleOpenModal(onOpenUpdateDetailsModal)} userProfile={profile} />}
        {isTrophyModalOpen && (
            <TrophyModal
                isOpen={isTrophyModalOpen}
                onClose={() => setIsTrophyModalOpen(false)}
                allTrophies={allTrophies}
                unlockedTrophyIds={new Set(userTrophies.map(t => t.trophy_id))}
                userStats={userStatsForTrophies}
                onNavigateToSettings={onNavigateToSettings}
                userProfile={profile}
            />
        )}

        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {/* STATIC COLLAPSED HEADER (Mobile only) */}
            {!isDesktop && (
                <header className={`sticky top-0 z-20 flex items-center justify-between px-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md transition-all duration-300 ease-in-out ${isHeaderCollapsed ? 'h-16 opacity-100' : 'h-0 opacity-0 pointer-events-none'}`}>
                    <div className="flex items-center gap-3">
                        <ProfileAvatar userProfile={profile} size={32} />
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{username}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {isViewingOwnProfile ? (
                            <>
                                <button onClick={() => onOpenShareProfileModal(profile)} className="text-gray-600 dark:text-gray-300 bg-black/5 dark:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20" aria-label="Share profile"><i className="fas fa-share-alt"></i></button>
                                <button onClick={() => setIsEditActionsModalOpen(true)} className="text-gray-600 dark:text-gray-300 bg-black/5 dark:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20" aria-label="Profile settings"><i className="fas fa-cog"></i></button>
                            </>
                        ) : (
                            <button onClick={() => onOpenShareProfileModal(profile)} className="text-gray-600 dark:text-gray-300 bg-black/5 dark:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20" aria-label="Share this profile"><i className="fas fa-share-alt"></i></button>
                        )}
                    </div>
                </header>
            )}

            {/* SINGLE SCROLL CONTAINER */}
            <main ref={mainScrollRef} className="flex-grow overflow-y-auto overflow-x-hidden">
                <div className="relative">
                    {/* Cover Photo */}
                    <div className="h-48 sm:h-56 md:h-64 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 dark:from-black dark:via-gray-900 dark:to-amber-900">
                        <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-black/80 dark:via-black/50 dark:to-transparent"></div>
                    </div>
                    
                    {/* Buttons over Cover Photo */}
                    <div className="absolute top-4 left-4 z-10">{onBack && <button onClick={onBack} className="text-white bg-black/30 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/50" aria-label="Back"><i className="fas fa-arrow-left"></i></button>}</div>
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                        {isViewingOwnProfile ? (
                            <>
                                <button onClick={() => onOpenShareProfileModal(profile)} className="text-white bg-black/30 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/50" aria-label="Share profile"><i className="fas fa-share-alt"></i></button>
                                <button onClick={() => setIsEditActionsModalOpen(true)} className="text-white bg-black/30 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/50" aria-label="Profile settings"><i className="fas fa-cog"></i></button>
                            </>
                        ) : (
                            <button onClick={() => onOpenShareProfileModal(profile)} className="text-white bg-black/30 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/50" aria-label="Share this profile"><i className="fas fa-share-alt"></i></button>
                        )}
                    </div>
                    
                    {/* Desktop Stats Overlay */}
                    {isDesktop && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6">
                            <div className="flex justify-between items-center text-center p-4 px-12 bg-white/20 dark:bg-gray-900/30 backdrop-blur-sm rounded-t-xl shadow-lg">
                                {/* Left Group (Level & Ratings) */}
                                <div className="flex items-center gap-8">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{level}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{reviews}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ratings</p>
                                    </div>
                                </div>

                                {/* Right Group (Trophies & Friends) */}
                                <div className="flex items-center gap-8">
                                    <button
                                        onClick={() => setIsTrophyModalOpen(true)}
                                        className="text-center transition-colors group"
                                    >
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">{userTrophies?.length || 0}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trophies</p>
                                    </button>
                                    <button
                                        onClick={() => onViewFriends(profile)}
                                        className="text-center disabled:cursor-default transition-colors group"
                                        disabled={!onViewFriends}
                                    >
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">{friends_count}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Friends</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Main Content Area */}
                <div className="relative px-4 lg:px-6 z-10">
                    {/* AVATAR SECTION */}
                    <section className="flex flex-col items-center text-center -mt-14 lg:-mt-20">
                        <div className={`relative w-32 h-32 rounded-full border-4 ${getProfileBorderColor()}`}>
                            <ProfileAvatar userProfile={profile} levelRequirements={levelRequirements} size={120} onClick={isViewingOwnProfile ? onAvatarChangeClick : undefined} />
                            {isOnline && <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-900" title="Online"></div>}
                        </div>
                        <div className="mt-4">
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">{username}</h1>
                            <div className="mt-2 flex items-center justify-center space-x-3 text-amber-500 dark:text-amber-400">
                                <i className={`fas ${rankData.icon} text-xl lg:text-2xl`}></i>
                                <span className="text-lg lg:text-xl font-semibold">{rankData.name}</span>
                            </div>
                            <UserBadges profile={profile} className="mt-4" />
                        </div>
                    </section>
                    
                    <div className="max-w-7xl mx-auto mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
                            <aside className="lg:col-span-1 space-y-6">
                                {!isDesktop && (
                                    <section>
                                        <div className="flex justify-around text-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                                            <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{level}</p><p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</p></div>
                                            <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{reviews}</p><p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ratings</p></div>
                                            <div><button onClick={() => onViewFriends(profile)} className="disabled:cursor-default" disabled={!onViewFriends}><p className="text-2xl font-bold text-gray-900 dark:text-white">{friends_count}</p><p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Friends</p></button></div>
                                        </div>
                                    </section>
                                )}
                                {!isViewingOwnProfile && loggedInUserProfile && <section><FriendshipButton loggedInUser={loggedInUserProfile} targetUser={profile} friendships={friendships} onFriendRequest={onFriendRequest} onFriendAction={onFriendAction} /></section>}
                                {bio && <section className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl shadow-md text-center lg:text-left"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 hidden lg:block">Bio</h2><BioRenderer text={bio} /></section>}
                                <TrophyCabinet trophies={trophiesForCabinet} onOpenTrophyModal={() => setIsTrophyModalOpen(true)} onNavigateToSettings={onNavigateToSettings} />
                                <ModerationTools />
                                <RankProgression />
                                <DevInfo />
                            </aside>

                            <div className="lg:col-span-2 space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 lg:mt-0">Ratings</h2>
                                <RatingsList />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pb-safe"></div>
            </main>
        </div>
    </>
    );
};

export default ProfilePage;