import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import StarRating from './StarRating.jsx';

const LeaderboardPage = ({ onViewPub }) => {
    const [activeBoard, setActiveBoard] = useState('pubs'); // 'pubs' or 'reviewers'
    const [activePeriod, setActivePeriod] = useState('all'); // 'all', 'year', 'month', 'day'
    
    const [leaderboardData, setLeaderboardData] = useState({ pubs: [], reviewers: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaderboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const rpcName = activeBoard === 'pubs' ? 'get_top_pubs' : 'get_top_reviewers';
        const { data, error: rpcError } = await supabase.rpc(rpcName, {
            time_period: activePeriod
        });

        if (rpcError) {
            console.error('Leaderboard RPC Error:', rpcError);
            setError('Could not load leaderboard data. The backend might need an update!');
            setLeaderboardData({ pubs: [], reviewers: [] });
        } else {
            if (activeBoard === 'pubs') {
                setLeaderboardData(prev => ({ ...prev, pubs: data }));
            } else {
                setLeaderboardData(prev => ({ ...prev, reviewers: data }));
            }
        }
        setLoading(false);
    }, [activeBoard, activePeriod]);

    useEffect(() => {
        fetchLeaderboardData();
    }, [fetchLeaderboardData]);

    const renderMedal = (rank) => {
        const medals = {
            1: { icon: 'fa-medal', color: 'text-yellow-400' },
            2: { icon: 'fa-medal', color: 'text-gray-400' },
            3: { icon: 'fa-medal', color: 'text-orange-400' }
        };
        const medal = medals[rank];
        return medal ? <i className={`fas ${medal.icon} ${medal.color} text-2xl`}></i> : <span className="font-bold text-lg">{rank}</span>;
    };

    const boardTabs = [
        { id: 'pubs', label: 'Top Pubs', icon: 'fa-beer' },
        { id: 'reviewers', label: 'Top Reviewers', icon: 'fa-users' }
    ];

    const periodFilters = [
        { id: 'all', label: 'All Time' },
        { id: 'year', label: 'This Year' },
        { id: 'month', label: 'This Month' },
        { id: 'day', label: 'Today' }
    ];
    
    const currentData = activeBoard === 'pubs' ? leaderboardData.pubs : leaderboardData.reviewers;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <div className="p-2 bg-gray-100 dark:bg-gray-800/50 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                {/* Board Tabs */}
                <div className="flex justify-center bg-gray-200 dark:bg-gray-700/50 rounded-full p-1 space-x-1 mb-2">
                    {boardTabs.map(({ id, label, icon }) => (
                        <button key={id} onClick={() => setActiveBoard(id)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex-grow flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                                activeBoard === id ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                            }`}>
                            <i className={`fas ${icon} w-4 text-center`}></i>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
                 {/* Period Filters */}
                <div className="flex justify-around">
                    {periodFilters.map(({ id, label }) => (
                        <button key={id} onClick={() => setActivePeriod(id)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
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
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md animate-pulse flex items-center space-x-4">
                                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                <div className="flex-grow space-y-2">
                                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
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
                {!loading && !error && currentData.length === 0 && (
                    <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <i className="fas fa-ghost fa-2x mb-2"></i>
                        <p>Nothing to see here... yet!</p>
                        <p className="text-sm">No ratings have been submitted for this period.</p>
                    </div>
                )}
                {!loading && !error && currentData.length > 0 && (
                    <ul className="space-y-3">
                        {currentData.map((item, index) => (
                            <li key={item.id}
                                className={`bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-md border-l-4 ${item.lat ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''} ${index < 3 ? 'border-amber-400' : 'border-transparent'}`}
                                onClick={() => item.lat && onViewPub({ id: item.id, location: { lat: item.lat, lng: item.lng }})}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-8 text-center flex-shrink-0">{renderMedal(index + 1)}</div>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{item.name || item.username}</p>
                                        {activeBoard === 'pubs' && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.address}</p>}
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        {activeBoard === 'pubs' ? (
                                            <>
                                                <StarRating rating={item.avg_quality} color="text-amber-400" />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{item.rating_count} {item.rating_count === 1 ? 'rating' : 'ratings'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-bold text-lg text-gray-900 dark:text-white">{item.review_count}</p>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{item.review_count === 1 ? 'rating' : 'ratings'}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;
