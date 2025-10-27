import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import { formatTimeAgo } from '../utils.js';

const UsersLoggedInTodayPage = ({ total, onBack, onViewProfile }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        trackEvent('view_users_logged_in_today');

        try {
            const { data, error: rpcError } = await supabase.rpc('get_users_logged_in_today');

            if (rpcError) throw rpcError;
            setProfiles(data || []);
        } catch (err) {
            console.error("Error fetching profiles:", err);
            setError(err.message || 'Could not load user list.');
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);


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
                    <button onClick={fetchProfiles} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                </div>
            );
        }
        if (profiles.length === 0) {
            return (
                <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg m-4">
                    <p>No users have logged in today yet.</p>
                </div>
            );
        }
        return (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {profiles.map(profile => (
                    <li key={profile.id}>
                        <button
                            onClick={() => onViewProfile(profile.id, 'users_logged_in_today')}
                            className="w-full flex items-center space-x-4 text-left p-3 hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors"
                        >
                            <Avatar avatarId={profile.avatar_id} className="w-12 h-12 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-lg text-gray-900 dark:text-white truncate">{profile.username}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Level {profile.level}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Last seen</p>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-300">{formatTimeAgo(new Date(profile.last_sign_in_at).getTime())}</p>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {onBack && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold">Back to Stats</span>
                    </button>
                </div>
            )}
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">Users Logged In Today</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {total ? `${total.toLocaleString()} user${total !== 1 ? 's' : ''} active today` : 'Loading...'}
                </p>
            </header>
            
            <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                {renderListContent()}
            </main>
        </div>
    );
};

export default UsersLoggedInTodayPage;