import React from 'react';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

const FriendRequestsPage = ({ requests, onFriendAction, onViewProfile, onDataRefresh }) => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        trackEvent('refresh_friend_requests');
        if (onDataRefresh) {
            await onDataRefresh();
        }
        setIsRefreshing(false);
    };
    
    if (requests.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 min-h-full">
                <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Friend Requests</h3>
                         <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh requests"
                            title="Refresh requests"
                        >
                            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
                <div className="p-4 h-full flex items-center justify-center text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                        <i className="fas fa-envelope-open-text fa-3x mb-4"></i>
                        <h2 className="text-xl font-bold">No Pending Requests</h2>
                        <p className="mt-2">Your friend request list is empty.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 min-h-full">
            <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {requests.length} Friend Request{requests.length > 1 ? 's' : ''}
                    </h3>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh requests"
                        title="Refresh requests"
                    >
                        <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>
            <div className="p-4 space-y-3">
                <ul className="space-y-3">
                    {requests.map(req => (
                        <RequestItem 
                            key={req.id} 
                            request={req} 
                            onFriendAction={onFriendAction}
                            onViewProfile={onViewProfile}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

const RequestItem = ({ request, onFriendAction, onViewProfile }) => {
    // This component needs to fetch the profile of the user who sent the request (user_id_1)
    const [profile, setProfile] = React.useState(null);

    React.useEffect(() => {
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_id')
                .eq('id', request.user_id_1)
                .single();
            if (!error) setProfile(data);
        };
        fetchProfile();
    }, [request.user_id_1]);

    if (!profile) {
        return (
            <li className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md animate-pulse flex items-center space-x-4 h-20"></li>
        );
    }
    
    return (
        <li className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-md border-l-4 border-amber-500 flex items-center space-x-4">
            <button onClick={() => onViewProfile(profile.id, 'community')} className="flex-shrink-0">
                <Avatar avatarId={profile.avatar_id} className="w-12 h-12" />
            </button>
            <div className="flex-grow min-w-0">
                <button onClick={() => onViewProfile(profile.id, 'community')} className="font-bold text-lg text-gray-900 dark:text-white truncate hover:underline">
                    {profile.username}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400">Wants to be your friend.</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                <button 
                    onClick={() => onFriendAction(request.id, 'declined')}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors text-xs"
                >
                    Decline
                </button>
                <button 
                    onClick={() => onFriendAction(request.id, 'accepted')}
                    className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                    Accept
                </button>
            </div>
        </li>
    );
}

export default FriendRequestsPage;