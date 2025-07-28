import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

const UserListPage = ({ totalUsers, onBack, onViewProfile }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        trackEvent('view_user_list');

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_id, level, is_banned, created_at')
                .order('created_at', { ascending: false }); // <-- FIX: Sort by most recently joined

            if (error) throw error;
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

    const filteredProfiles = profiles.filter(p =>
        p.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        if (filteredProfiles.length === 0) {
            return (
                <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg m-4">
                    <p>No profiles found matching "{searchTerm}".</p>
                </div>
            );
        }
        return (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProfiles.map(profile => (
                    <li key={profile.id}>
                        <button
                            onClick={() => onViewProfile(profile.id, 'user_list')}
                            className="w-full flex items-center space-x-4 text-left p-3 hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors"
                        >
                            <Avatar avatarId={profile.avatar_id} className="w-12 h-12 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <p className={`font-semibold text-lg text-gray-900 dark:text-white truncate ${profile.is_banned ? 'line-through text-red-500/80 dark:text-red-500/80' : ''}`}>{profile.username}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Level {profile.level}</p>
                            </div>
                            {profile.is_banned && (
                                <span className="flex-shrink-0 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">Banned</span>
                            )}
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
                <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">All Users</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    A list of all registered users ({totalUsers.toLocaleString()} total).
                </p>
                <div className="relative mt-4">
                    <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by username..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </header>
            
            <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                {renderListContent()}
            </main>
        </div>
    );
};

export default UserListPage;