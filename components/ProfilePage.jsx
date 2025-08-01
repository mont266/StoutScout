import React, { useState, useEffect } from 'react';
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

const ProfilePage = ({ userProfile, userRatings, onViewPub, loggedInUserProfile, levelRequirements, onAvatarChangeClick, onBack, onProfileUpdate, friendships, onFriendRequest, onFriendAction, onViewFriends, onDeleteRating }) => {
    // Component now manages its own profile state to update it after a moderation action.
    const [profile, setProfile] = useState(userProfile);
    const [isBanning, setIsBanning] = useState(false);
    const [isUnbanning, setIsUnbanning] = useState(false);
    const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);
    const [isModerationVisible, setIsModerationVisible] = useState(false);
    const [isRankProgressionVisible, setIsRankProgressionVisible] = useState(false);
    const [isRatingsVisible, setIsRatingsVisible] = useState(true);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [imageToView, setImageToView] = useState(null);
    const [reportModalInfo, setReportModalInfo] = useState({ isOpen: false, rating: null });
    const [ratingToDelete, setRatingToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [alertInfo, setAlertInfo] = useState({ isOpen: false });

    // Keep state in sync with props from App.jsx
    useEffect(() => {
        setProfile(userProfile);
    }, [userProfile]);

    const { username, level, is_beta_tester, is_developer, is_banned, avatar_id, removed_image_count, is_early_bird, is_team_member, friends_count } = profile;
    const reviews = profile.reviews || 0;
    
    const rankData = getRankData(level);
    
    // Determine if the logged-in user can see moderation tools for the viewed profile
    const isViewingOwnProfile = !loggedInUserProfile || profile.id === loggedInUserProfile.id;
    const canModerate = loggedInUserProfile?.is_developer && !isViewingOwnProfile;
    const isActionLoading = isBanning || isUnbanning || isUpdatingRoles || isDeleting;

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
             if (onProfileUpdate) { // Refresh data from parent
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
            if (onProfileUpdate) { // Refresh data from parent
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
        setImageToView(null); // Close the image modal first
        setReportModalInfo({ isOpen: true, rating: ratingToReport }); // Then open the report modal
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
        setRatingToDelete(rating);
        setConfirmation({
            isOpen: true,
            title: 'Delete Rating?',
            message: 'This rating and any associated photo will be permanently deleted.',
            onConfirm: handleDeleteConfirm,
            confirmText: 'Delete',
            theme: 'red'
        });
    };

    const handleDeleteConfirm = async () => {
        if (!ratingToDelete || !onDeleteRating) return;
        setIsDeleting(true);
        await onDeleteRating(ratingToDelete);
        setIsDeleting(false);
        setRatingToDelete(null);
        setConfirmation({ isOpen: false });
    };

    const getProfileBorderColor = () => {
        if (is_developer) return 'border-amber-500';
        if (is_beta_tester) return 'border-blue-500';
        if (is_team_member) return 'border-purple-500';
        if (is_early_bird) return 'border-green-500';
        return 'border-amber-400';
    };


    return (
        <>
        {alertInfo.isOpen && (
            <AlertModal 
                onClose={() => setAlertInfo({ isOpen: false })}
                title={alertInfo.title}
                message={alertInfo.message}
                theme={alertInfo.theme}
            />
        )}
        {confirmation.isOpen && (
            <ConfirmationModal
                onClose={() => setConfirmation({ isOpen: false })}
                onConfirm={confirmation.onConfirm}
                isLoading={isActionLoading}
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                theme={confirmation.theme}
            />
        )}
        {isBanModalOpen && (
            <BanUserModal 
                username={profile.username}
                onClose={() => setIsBanModalOpen(false)}
                onConfirm={handleBanUser}
            />
        )}
        {imageToView && (
            <ImageModal
                rating={imageToView}
                onClose={() => setImageToView(null)}
                onReport={() => handleInitiateReport(imageToView)}
                canReport={loggedInUserProfile && loggedInUserProfile.id !== imageToView.user.id}
            />
        )}
        {reportModalInfo.isOpen && (
            <ReportImageModal 
                onClose={() => setReportModalInfo({isOpen: false, rating: null})}
                onSubmit={(reason) => handleReportImage(reportModalInfo.rating, reason)}
            />
        )}
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
             {onBack && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span>Back</span>
                    </button>
                </div>
            )}
            <main className="flex-grow p-4 overflow-y-auto">
                {/* Profile Card */}
                <div className={`relative bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 text-center border-t-4 ${getProfileBorderColor()}`}>
                    {is_banned && (
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white font-bold px-4 py-1 rounded-full text-sm uppercase tracking-wider shadow-lg">
                            Banned
                        </div>
                    )}

                    {/* Badges & Avatar Section */}
                    <div className="flex flex-col items-center">
                        {/* Badges Container */}
                        <div className="flex flex-row flex-wrap items-center justify-center gap-2 mb-4 min-h-[4rem]">
                            {is_early_bird && (
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-green-900 dark:text-green-200 uppercase tracking-wide border-2 border-white dark:border-gray-800 shadow flex items-center gap-1.5" title="Been here since the beginning!">
                                    <i className="fas fa-feather-alt"></i>
                                    <span>Early Bird</span>
                                </span>
                            )}
                            {is_team_member && (
                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-purple-900 dark:text-purple-200 uppercase tracking-wide border-2 border-white dark:border-gray-800 shadow">
                                    Team Member
                                </span>
                            )}
                            {is_developer && (
                                <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border-2 border-white dark:border-gray-800 shadow">
                                    Developer
                                </span>
                            )}
                            {is_beta_tester && (
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wide border-2 border-white dark:border-gray-800 shadow">
                                    Beta Tester
                                </span>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="relative inline-block">
                             <ProfileAvatar 
                                userProfile={profile}
                                levelRequirements={levelRequirements}
                                size={112} // w-28
                                onClick={isViewingOwnProfile ? onAvatarChangeClick : undefined}
                            />
                            {isViewingOwnProfile && (
                                <button
                                    onClick={onAvatarChangeClick}
                                    className="absolute bottom-0 right-0 bg-amber-500 text-black rounded-full w-8 h-8 flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md hover:bg-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                    aria-label="Change avatar"
                                >
                                    <i className="fas fa-pen text-sm"></i>
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mt-4">{username}</h2>
                    
                    <div className="flex items-center justify-center space-x-3 mt-2">
                        <i className={`fas ${rankData.icon} text-2xl text-amber-500 dark:text-amber-400`} aria-label={`Rank icon for ${rankData.name}`}></i>
                        <p className="text-2xl font-semibold text-amber-500 dark:text-amber-400">{rankData.name}</p>
                    </div>
                    
                    <div className="mt-4 flex justify-center items-center space-x-6 text-lg">
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{level}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Level</p>
                        </div>
                        <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{reviews}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{reviews === 1 ? 'Rating' : 'Ratings'}</p>
                        </div>
                         <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
                        <button
                            onClick={() => onViewFriends && onViewFriends(profile)}
                            className="text-left hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-md p-1 -m-1"
                            disabled={!onViewFriends}
                        >
                            <p className="font-bold text-gray-900 dark:text-white">{friends_count || 0}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{friends_count === 1 ? 'Friend' : 'Friends'}</p>
                        </button>
                         {loggedInUserProfile?.is_developer && removed_image_count > 0 && (
                            <>
                                <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
                                <div>
                                    <p className="font-bold text-red-500">{removed_image_count}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Removed Photos</p>
                                </div>
                            </>
                         )}
                    </div>

                    {/* Friendship Button */}
                    <div className="mt-6">
                        <FriendshipButton 
                            loggedInUser={loggedInUserProfile}
                            targetUser={profile}
                            friendships={friendships}
                            onFriendRequest={onFriendRequest}
                            onFriendAction={onFriendAction}
                        />
                    </div>
                </div>

                {/* Moderation Tools Section */}
                {canModerate && (
                    <div className="mb-6">
                        <button
                            onClick={() => setIsModerationVisible(!isModerationVisible)}
                            className="w-full flex justify-between items-center text-left text-lg font-semibold text-red-500 dark:text-red-400 p-4 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-expanded={isModerationVisible}
                            aria-controls="moderation-tools-panel"
                        >
                            <span><i className="fas fa-gavel mr-2"></i>Moderation Tools</span>
                            <i className={`fas fa-chevron-down text-red-500/70 dark:text-red-400/70 transition-transform duration-300 ${isModerationVisible ? 'rotate-180' : ''}`}></i>
                        </button>
                        {isModerationVisible && (
                            <div id="moderation-tools-panel" className="mt-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-4">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                        Status: <span className={`font-bold ${is_banned ? 'text-red-500' : 'text-green-500'}`}>{is_banned ? 'Banned' : 'Active'}</span>
                                    </p>
                                    {is_banned ? (
                                        <button
                                            onClick={confirmUnbanUser}
                                            disabled={isActionLoading}
                                            className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                        >
                                            {isUnbanning ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-user-check"></i>}
                                            <span>Unban User</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setIsBanModalOpen(true)}
                                            disabled={isActionLoading}
                                            className="w-full sm:w-auto bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                        >
                                            {isBanning ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-user-slash"></i>}
                                            <span>Ban User</span>
                                        </button>
                                    )}
                                </div>
                                <div className="border-t border-red-500/20 pt-4">
                                    <h4 className="text-md font-semibold text-center text-gray-700 dark:text-gray-300 mb-3">Manage Roles</h4>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            onClick={() => confirmSetRole('is_team_member', !profile.is_team_member)}
                                            disabled={isActionLoading}
                                            className={`flex-1 flex items-center justify-center space-x-2 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${profile.is_team_member ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-300 hover:bg-purple-300 dark:hover:bg-purple-800'}`}
                                        >
                                            {isUpdatingRoles ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> : (profile.is_team_member ? <i className="fas fa-user-minus"></i> : <i className="fas fa-user-plus"></i>)}
                                            <span>{profile.is_team_member ? 'Revoke Team' : 'Grant Team'}</span>
                                        </button>
                                        <button
                                            onClick={() => confirmSetRole('is_beta_tester', !profile.is_beta_tester)}
                                            disabled={isActionLoading}
                                            className={`flex-1 flex items-center justify-center space-x-2 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${profile.is_beta_tester ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-800'}`}
                                        >
                                            {isUpdatingRoles ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> : (profile.is_beta_tester ? <i className="fas fa-user-minus"></i> : <i className="fas fa-user-plus"></i>)}
                                            <span>{profile.is_beta_tester ? 'Revoke Beta' : 'Grant Beta'}</span>
                                        </button>
                                        <button
                                            onClick={() => confirmSetRole('is_developer', !profile.is_developer)}
                                            disabled={isActionLoading}
                                            className={`flex-1 flex items-center justify-center space-x-2 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${profile.is_developer ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 hover:bg-amber-300 dark:hover:bg-amber-800'}`}
                                        >
                                            {isUpdatingRoles ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div> : (profile.is_developer ? <i className="fas fa-user-minus"></i> : <i className="fas fa-user-plus"></i>)}
                                            <span>{profile.is_developer ? 'Revoke Dev' : 'Grant Dev'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Rank Progression */}
                <div className="mb-6">
                    <button
                        onClick={() => toggleSection('rank_progression', isRankProgressionVisible, setIsRankProgressionVisible)}
                        className="w-full flex justify-between items-center text-left text-xl font-semibold text-gray-900 dark:text-white p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                        aria-expanded={isRankProgressionVisible}
                        aria-controls="rank-progression-list"
                    >
                        <span>Rank Progression</span>
                        <i className={`fas fa-chevron-down text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isRankProgressionVisible ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isRankProgressionVisible && (
                         <div id="rank-progression-list" className="mt-2">
                            <ul className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                                {RANK_DETAILS.map((rankDetail, index) => {
                                    const isCurrentRank = rankDetail.name === rankData.name;
                                    const nextRank = RANK_DETAILS[index + 1];
                                    const levelRange = nextRank
                                        ? `Levels ${rankDetail.minLevel} - ${nextRank.minLevel - 1}`
                                        : `Level ${rankDetail.minLevel}+`;

                                    return (
                                        <li key={rankDetail.name} className={`flex justify-between items-center p-2 rounded-md transition-colors ${isCurrentRank ? 'bg-amber-500/10' : ''}`}>
                                            <div className="flex items-center space-x-3">
                                                <i className={`fas ${rankDetail.icon} w-6 text-center text-lg ${isCurrentRank ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}/>
                                                <span className={`font-semibold ${isCurrentRank ? 'text-amber-500 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'}`}>{rankDetail.name}</span>
                                            </div>
                                            <span className={`text-sm ${isCurrentRank ? 'text-amber-600 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>{levelRange}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Recent Ratings */}
                <div className="mb-6">
                    <button
                        onClick={() => toggleSection('recent_ratings', isRatingsVisible, setIsRatingsVisible)}
                        className="w-full flex justify-between items-center text-left text-xl font-semibold text-gray-900 dark:text-white p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                        aria-expanded={isRatingsVisible}
                        aria-controls="recent-ratings-list"
                    >
                        <span>Recent Ratings ({userRatings.length})</span>
                        <i className={`fas fa-chevron-down text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isRatingsVisible ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isRatingsVisible && (
                        <div id="recent-ratings-list" className="mt-2">
                            {userRatings.length > 0 ? (
                                <ul className="space-y-3">
                                    {userRatings.slice(0, 10).map((r) => { // Show latest 10
                                        const currencyInfo = getCurrencyInfo(r.pubAddress);
                                        const ratingForModal = { ...r, user: { id: profile.id, username: profile.username } };
                                        return (
                                        <li key={r.id} className={`bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md`}>
                                            <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                <div 
                                                    className={`flex-grow pr-4 min-w-0 ${r.pubLocation ? 'cursor-pointer' : ''}`}
                                                    onClick={() => r.pubLocation && onViewPub({ id: r.pubId, name: r.pubName, address: r.pubAddress, location: r.pubLocation })}
                                                    role={r.pubLocation ? "button" : undefined}
                                                >
                                                    <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{r.pubName}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{r.pubAddress}</p>
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(r.timestamp)}</p>
                                                    <div className="flex items-center justify-end space-x-4 mt-2">
                                                        {r.pubLocation && <i className="fas fa-map-pin text-amber-500 dark:text-amber-400" title="View on map"></i>}
                                                        {isViewingOwnProfile && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); requestDeleteRating(r); }}
                                                                className="text-gray-400 hover:text-red-500 transition-colors text-lg w-6 h-6 flex items-center justify-center rounded"
                                                                aria-label="Delete rating"
                                                                title="Delete rating"
                                                            >
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex space-x-4 items-start">
                                                {r.image_url && (
                                                    <button onClick={() => setImageToView(ratingForModal)} className="flex-shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none transition">
                                                        <img src={r.image_url} alt="Pint of Guinness" className="w-24 h-24 object-cover" />
                                                    </button>
                                                )}
                                                <div className="flex-grow space-y-2">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-700 dark:text-gray-300">Price Rating:</span>
                                                        <StarRating rating={r.rating.price} color="text-green-400" />
                                                    </div>
                                                    {r.rating.exact_price > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-700 dark:text-gray-300">Price Paid:</span>
                                                            <span className="font-bold text-gray-900 dark:text-white">{currencyInfo.symbol}{(r.rating.exact_price).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-700 dark:text-gray-300">Quality Rating:</span>
                                                        <StarRating rating={r.rating.quality} color="text-amber-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    )})}
                                </ul>
                            ) : (
                                <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p>This user hasn't rated any pubs yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
        </>
    );
};

export default ProfilePage;