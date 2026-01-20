import React, { useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { OnlineStatusContext } from '../contexts/OnlineStatusContext.jsx';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

const OnlineUsersPage = ({ onBack, onViewProfile }) => {
    const { onlineUserIds } = useContext(OnlineStatusContext);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (onlineUserIds.size === 0) {
            setProfiles([]);
            setLoading(false);
            return;
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('id, username, avatar_id, level')
                .in('id', Array.from(onlineUserIds))
                .order('username', { ascending: true });
            
            if (fetchError) throw fetchError;
            setProfiles(data || []);
        } catch (err) {
            console.error("Error fetching online user profiles:", err);
            setError("Could not load online users. Please try again.");
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    }, [onlineUserIds]);

    useEffect(() => {
        trackEvent('view_online_users_list');
        fetchProfiles();
    }, [fetchProfiles]);

    const handleRefresh = () => {
        trackEvent('refresh_online_users_list');
        fetchProfiles();
    };

    const renderListContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
                </div>
            );
        }
        if (error) {
            return (
                <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg m-4">
                    <p>{error}</p>
                    <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                </div>
            );
        }
        if (profiles.length === 0) {
            return (
                <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg m-4">
                    <p>No users are currently online.</p>
                </div>
            );
        }
        return (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {profiles.map(profile => (
                    <li key={profile.id}>
                        <button
                            onClick={() => onViewProfile(profile.id, 'online_users_list')}
                            className="w-full flex items-center space-x-4 text-left p-3 hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors"
                        >
                            <Avatar avatarId={profile.avatar_id} className="w-12 h-12 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-lg text-gray-900 dark:text-white truncate">{profile.username}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Level {profile.level}</p>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 -ml-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold hidden sm:inline">Back to Stats</span>
                    </button>
                    <div>
                        <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">Users Online</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{onlineUserIds.size.toLocaleString()} online</p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Refresh list"
                    title="Refresh list"
                >
                    <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </header>
            
            <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                {renderListContent()}
            </main>
        </div>
    );
};

export default OnlineUsersPage;
