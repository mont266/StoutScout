import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

const ModerationPage = ({ onViewProfile, onBack }) => {
    const [flaggedUsers, setFlaggedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFlaggedUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        trackEvent('refresh_moderation_list');

        const { data, error: rpcError } = await supabase.rpc('get_flagged_users');

        if (rpcError) {
            console.error('Error fetching flagged users:', rpcError);
            setError('Could not load flagged users. Please ensure the `get_flagged_users` database function is set up correctly.');
            setFlaggedUsers([]);
        } else {
            setFlaggedUsers(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchFlaggedUsers();
    }, [fetchFlaggedUsers]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                    <i className="fas fa-arrow-left"></i>
                    <span className="font-semibold">Back to Settings</span>
                </button>
            </div>
            <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-red-500 dark:text-red-400">Moderation Center</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Users flagged for potentially suspicious activity (e.g., high ratio of 1-star quality ratings).</p>
            </div>

            {/* Content */}
            <div className="flex-grow p-4 overflow-y-auto">
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400"></div>
                    </div>
                )}

                {!loading && error && (
                    <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                        <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>{error}</p>
                        <button onClick={fetchFlaggedUsers} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                    </div>
                )}
                
                {!loading && !error && flaggedUsers.length === 0 && (
                    <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <i className="fas fa-check-circle fa-2x mb-2 text-green-500"></i>
                        <p className="font-semibold">All clear!</p>
                        <p className="text-sm">No users are currently matching the flagging criteria.</p>
                    </div>
                )}

                {!loading && !error && flaggedUsers.length > 0 && (
                    <ul className="space-y-3">
                        {flaggedUsers.map(user => (
                            <li key={user.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-md border-l-4 border-red-500">
                                <div className="flex items-center space-x-4">
                                    <Avatar avatarId={user.avatar_id} className="w-12 h-12 flex-shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{user.username}</p>
                                        <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                                            Flagged: {user.one_star_quality_ratings} of {user.total_ratings} ratings are 1-star quality.
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button 
                                            onClick={() => onViewProfile(user.id, 'moderation')}
                                            className="bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors text-sm"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ModerationPage;