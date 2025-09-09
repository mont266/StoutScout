import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { formatTimeAgo } from '../utils.js';
import { supabase } from '../supabase.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';
import { trackEvent } from '../analytics.js';

const NotificationItem = ({ notification, onViewProfile, onFriendAction, onNavigate, onDeleteNotification }) => {
    const { id, actor, type, created_at, is_read, metadata, entity_id } = notification;

    const handleAction = (e, status) => {
        e.stopPropagation(); // Prevent card click
        if (onFriendAction) {
            // In the DB, friendship notifications have the friendship_id as the entity_id
            onFriendAction(entity_id, status);
        }
    };

    const isClickable = type === 'new_comment' || type === 'like_milestone' || type === 'mention' || type === 'friend_request_accepted';

    const handleNotificationClick = () => {
        if (isClickable && onNavigate) {
            onNavigate(notification);
        }
    };
    
    let content = null;
    let iconClass = 'fa-bell';

    switch (type) {
        case 'friend_request':
            iconClass = 'fa-user-plus';
            content = (
                <>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        <button onClick={(e) => { e.stopPropagation(); onViewProfile(actor.id, 'notifications'); }} className="font-semibold hover:underline">{actor.username}</button>
                        <span> wants to be your friend.</span>
                    </p>
                    <div className="mt-2 flex gap-2">
                        <button onClick={(e) => handleAction(e, 'accepted')} className="flex-1 bg-green-500 text-white font-bold py-1.5 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm">Accept</button>
                        <button onClick={(e) => handleAction(e, 'declined')} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-1.5 px-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm">Decline</button>
                    </div>
                </>
            );
            break;
        case 'friend_request_accepted':
            iconClass = 'fa-user-check';
            content = (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    <button onClick={(e) => { e.stopPropagation(); onViewProfile(actor.id, 'notifications'); }} className="font-semibold hover:underline">{actor.username}</button>
                    <span> has accepted your friend request.</span>
                </p>
            );
            break;
        case 'new_comment':
             iconClass = 'fa-comment';
             content = (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    <button onClick={(e) => { e.stopPropagation(); onViewProfile(actor.id, 'notifications'); }} className="font-semibold hover:underline">{actor.username}</button>
                    <span> commented on your rating.</span>
                </p>
            );
            break;
        case 'like_milestone':
            iconClass = 'fa-heart';
            content = (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Your rating received <span className="font-semibold">{metadata?.like_count || 'many'}</span> likes! 🎉
                </p>
            );
            break;
        default:
             // This type is not recognized or is a redundant generic notification. Do not render it.
             return null;
    }

    return (
        <li
            onClick={handleNotificationClick}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''} ${!is_read ? 'bg-amber-500/10' : ''}`}
            >
            <div className="flex-grow flex items-start space-x-3">
                {!is_read && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" aria-label="Unread notification"></div>}
                <div className={`relative flex-shrink-0 ${is_read ? 'ml-[1.375rem]' : ''}`}>
                    <button onClick={(e) => { e.stopPropagation(); onViewProfile(actor.id, 'notifications'); }} aria-label={`View profile of ${actor.username}`}>
                        <Avatar avatarId={actor.avatar_id} className="w-10 h-10" />
                    </button>
                    <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-gray-900">
                        <i className={`fas ${iconClass} text-xs`}></i>
                    </span>
                </div>
                <div className="flex-grow">
                    {content}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeAgo(new Date(created_at).getTime())}</p>
                </div>
            </div>
            <div className="flex-shrink-0 ml-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Delete notification"
                    title="Delete notification"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
        </li>
    );
};

const PULL_THRESHOLD = 80;

const NotificationsPage = ({ notifications, onFriendAction, onViewProfile, onDataRefresh, onViewPub, friendships, onDeleteNotification }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [alertInfo, setAlertInfo] = useState({ isOpen: false });
    const [pullPosition, setPullPosition] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const touchStartRef = useRef(0);
    const containerRef = useRef(null);

    // Filter out friend requests that have already been actioned (accepted/declined)
    const activeNotifications = notifications.filter(n => {
        if (n.type === 'friend_request') {
            const friendship = friendships.find(f => f.id === n.entity_id);
            // Hide the request if a friendship exists and its status has been changed from 'pending'
            return !friendship || friendship.status === 'pending';
        }
        return true;
    });

    const handleRefresh = async (method = 'button') => {
        if (isRefreshing) return;
        trackEvent('refresh_feed', { feed_type: 'notifications', method });
        setIsRefreshing(true);
        if (onDataRefresh) {
            await onDataRefresh();
        }
        setIsRefreshing(false);
    };
    
    const clearableNotifications = activeNotifications.filter(n => n.type !== 'friend_request');
    
    const handleClearNotifications = () => {
        if (clearableNotifications.length === 0) return;
        
        setConfirmation({
            isOpen: true,
            title: 'Clear Notifications?',
            message: 'This will remove all notifications except for pending friend requests. This action cannot be undone.',
            onConfirm: async () => {
                setIsClearing(true);
                const idsToClear = clearableNotifications.map(n => n.id);
                const { error } = await supabase
                    .from('notifications')
                    .delete()
                    .in('id', idsToClear);
                
                setIsClearing(false);
                setConfirmation({ isOpen: false });
                    
                if (error) {
                    setAlertInfo({
                        isOpen: true,
                        title: 'Error',
                        message: `Could not clear notifications: ${error.message}`,
                        theme: 'error'
                    });
                } else {
                    if (onDataRefresh) {
                        await onDataRefresh();
                    }
                }
            },
            confirmText: 'Clear All',
            theme: 'red'
        });
    };
    
    const handleNavigate = async (notification) => {
        if (isNavigating) return;
        setIsNavigating(true);

        try {
            let contextData = null;
            let highlightRatingId = null;
            let highlightCommentId = null;

            if (notification.type === 'new_comment' || notification.type === 'like_milestone') {
                const { data, error } = await supabase.rpc('get_context_for_rating', { p_rating_id: notification.entity_id }).single();
                if (error) throw error;
                contextData = data;
                if (data) {
                    highlightRatingId = notification.entity_id;
                }
            }

            // Defensive check to prevent crashes from bad data
            if (contextData && contextData.pub_lat != null && contextData.pub_lng != null) {
                const pubForSelection = {
                    id: contextData.pub_id,
                    name: contextData.pub_name,
                    address: contextData.pub_address,
                    location: { lat: contextData.pub_lat, lng: contextData.pub_lng },
                };
                onViewPub(pubForSelection, { highlightRatingId, highlightCommentId });
            } else if (notification.type === 'friend_request_accepted') {
                onViewProfile(notification.actor.id, 'notifications');
            }
             else {
                alert("Could not find the content associated with this notification. It may have been deleted or is missing location data.");
            }

        } catch (error) {
            console.error("Error navigating from notification:", error);
            alert(`Could not navigate: ${error.message}`);
        } finally {
            setIsNavigating(false);
        }
    };
    
    const handleTouchStart = (e) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            setIsPulling(true);
            touchStartRef.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling || isRefreshing) return;
        const touchY = e.touches[0].clientY;
        const pullDistance = touchY - touchStartRef.current;
        if (pullDistance > 0) {
            const dampenedPull = Math.pow(pullDistance, 0.85);
            setPullPosition(dampenedPull);
        }
    };

    const handleTouchEnd = () => {
        if (!isPulling || isRefreshing) return;
        setIsPulling(false);
        if (pullPosition > PULL_THRESHOLD) {
            handleRefresh('pull');
        } else {
            setPullPosition(0);
        }
    };
    
    useEffect(() => {
        if (!isRefreshing) {
            setPullPosition(0);
        }
    }, [isRefreshing]);

    return (
        <>
            {confirmation.isOpen && (
                <ConfirmationModal 
                    {...confirmation}
                    isLoading={isClearing}
                    onClose={() => setConfirmation({ isOpen: false })}
                />
            )}
            {alertInfo.isOpen && (
                <AlertModal 
                    {...alertInfo}
                    onClose={() => setAlertInfo({ isOpen: false })}
                />
            )}
            <div
                ref={containerRef}
                className="bg-white dark:bg-gray-900 h-full overflow-y-auto relative overscroll-y-contain"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className="absolute top-0 left-0 right-0 z-0"
                    style={{
                        transform: `translateY(${isRefreshing ? PULL_THRESHOLD : (isPulling ? pullPosition : 0)}px)`,
                        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
                    }}
                >
                    <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center -translate-y-full">
                        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg w-10 h-10 flex items-center justify-center">
                            {isRefreshing ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-400"></div>
                            ) : (
                                <i
                                    className="fas fa-arrow-down text-amber-500 text-xl transition-transform"
                                    style={{
                                        transform: `rotate(${pullPosition > PULL_THRESHOLD ? 180 : 0}deg)`,
                                        opacity: Math.min(pullPosition / (PULL_THRESHOLD / 1.5), 1)
                                    }}
                                ></i>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {clearableNotifications.length > 0 && (
                                        <button
                                            onClick={handleClearNotifications}
                                            disabled={isClearing}
                                            className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                                            aria-label="Clear all notifications"
                                            title="Clear all notifications"
                                        >
                                            {isClearing ? 'Clearing...' : 'Clear All'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRefresh('button')}
                                        disabled={isRefreshing}
                                        className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                                        aria-label="Refresh notifications"
                                        title="Refresh notifications"
                                    >
                                        <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {isNavigating && (
                            <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400"></div>
                            </div>
                        )}
                        {activeNotifications.length === 0 ? (
                            <div className="p-4 h-full flex items-center justify-center text-center">
                                <div className="text-gray-500 dark:text-gray-400">
                                    <i className="fas fa-bell-slash fa-3x mb-4"></i>
                                    <h2 className="text-xl font-bold">All caught up!</h2>
                                    <p className="mt-2">You have no new notifications.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2">
                                <ul className="space-y-1">
                                    {activeNotifications.map(n => (
                                        <NotificationItem 
                                            key={n.id} 
                                            notification={n}
                                            onViewProfile={onViewProfile}
                                            onFriendAction={onFriendAction}
                                            onNavigate={handleNavigate}
                                            onDeleteNotification={onDeleteNotification}
                                        />
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default NotificationsPage;
