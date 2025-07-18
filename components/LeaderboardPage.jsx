import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { getRankData } from '../utils.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';

const LeaderboardPage = ({ onViewProfile }) => {
    const [activePeriod, setActivePeriod] = useState('all'); // 'all', 'year', 'month', 'day'
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaderboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('get_top_reviewers', {
            time_period: activePeriod
        });

        if (rpcError) {
            console.error('Leaderboard RPC Error:', rpcError);
            setError('Could not load leaderboard data. The backend might need an update!');
            setLeaderboardData([]);
        } else {
            setLeaderboardData(data || []);
        }
        setLoading(false);
    }, [activePeriod]);

    useEffect(() => {
        fetchLeaderboardData();
    }, [fetchLeaderboardData]);

    const handlePeriodChange = (id) => {
        setActivePeriod(id);
        trackEvent('change_leaderboard_filter', { period: id });
    };

    const renderMedal = (rank) => {
        const medals = {
            1: { icon: 'fa-medal', color: 'text-yellow-400' },
            2: { icon: 'fa-medal', color: 'text-gray-400' },
            3: { icon: 'fa-medal', color: 'text-orange-400' }
        };
        const medal = medals[rank];
        return medal ? <i className={`fas ${medal.icon} ${medal.color} text-2xl`}></i> : <span className="font-bold text-lg">{rank}</span>;
    };
    
    const periodFilters = [
        { id: 'all', label: 'All Time' },
        { id: 'year', label: 'This Year' },
        { id: 'month', label: 'This Month' },
        { id: 'day', label: 'Today' }
    ];
    
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <div className="p-2 bg-gray-100 dark:bg-gray-800/50 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                 {/* Period Filters */}
                <div className="flex justify-around">
                    {periodFilters.map(({ id, label }) => (
                        <button key={id} onClick={() => handlePeriodChange(id)}
                            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                activePeriod === id ? 'bg-amber-500 text-black' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                {loading && (
                    <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md animate-pulse flex items-center space-x-4">
                                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                <div className="flex-grow space-y-2">
                                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                                </div>
                                <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && error && (
                     <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                        <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>{error}</p>
                        <button onClick={fetchLeaderboardData} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                    </div>
                )}
                {!loading && !error && leaderboardData.length === 0 && (
                    <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <i className="fas fa-ghost fa-2x mb-2"></i>
                        <p>Nothing to see here... yet!</p>
                        <p className="text-sm">No ratings have been submitted for this period.</p>
                    </div>
                )}
                {!loading && !error && leaderboardData.length > 0 && (
                    <ul className="space-y-3">
                        {leaderboardData.map((item, index) => {
                            const rankData = getRankData(item.level || 1);
                            return (
                                <li key={item.id}
                                    onClick={() => onViewProfile(item.id, 'leaderboard')}
                                    className={`group bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-md border-l-4 transition-colors cursor-pointer hover:bg-amber-500/10 dark:hover:bg-gray-700/50 ${index < 3 ? 'border-amber-400' : 'border-transparent'}`}
                                    role="button"
                                    tabIndex="0"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onViewProfile(item.id, 'leaderboard') }}}
                                    aria-label={`View profile for ${item.username}`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-8 text-center flex-shrink-0">{renderMedal(index + 1)}</div>
                                        <div className="flex-shrink-0">
                                            <Avatar avatarId={item.avatar_id} className="w-12 h-12" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-bold text-lg text-gray-900 dark:text-white truncate group-hover:underline" title={item.username}>{item.username}</p>
                                            <div className="flex items-center space-x-2">
                                                <i className={`fas ${rankData.icon} text-amber-500 dark:text-amber-400 text-xs w-3 text-center`} title={`Rank: ${rankData.name}`}></i>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Level {item.level || 1}</span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="font-bold text-lg text-gray-900 dark:text-white">{item.review_count}</p>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{item.review_count === 1 ? 'rating' : 'ratings'}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;