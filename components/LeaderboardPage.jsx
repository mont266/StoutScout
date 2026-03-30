import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { getRankData } from '../utils.js';
import Avatar from './Avatar.jsx';
import CrownIcon from './CrownIcon.jsx';
import { trackEvent } from '../analytics.js';
import StarRating from './StarRating.jsx';

const LeaderboardPage = ({ onViewProfile, onViewPub }) => {
    const [leaderboardType, setLeaderboardType] = useState('users'); // 'users', 'pubs'
    const [activePeriod, setActivePeriod] = useState('all'); // 'all', 'year', 'month', 'day'
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaderboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (leaderboardType === 'users') {
            const { data, error: rpcError } = await supabase.rpc('get_top_reviewers', {
                time_period: activePeriod
            });

            if (rpcError) {
                console.error('Leaderboard RPC Error:', rpcError);
                setError('Could not load leaderboard data. The backend might need an update!');
                setLeaderboardData([]);
            } else {
                setLeaderboardData((data || []).slice(0, 50));
            }
        } else {
            try {
                let topScores = [];
                let pubStatsMap = new Map();

                if (activePeriod === 'all') {
                    const { data: scoresData, error: scoresError } = await supabase
                        .from('pub_scores')
                        .select('pub_id, pub_score')
                        .not('pub_score', 'is', null)
                        .order('pub_score', { ascending: false })
                        .limit(50);

                    if (scoresError) throw scoresError;
                    topScores = scoresData || [];

                    if (topScores.length > 0) {
                        const pubIds = topScores.map(s => s.pub_id);
                        const { data: ratings, error: ratingsError } = await supabase
                            .from('ratings')
                            .select('pub_id, quality')
                            .in('pub_id', pubIds);
                            
                        if (ratingsError) throw ratingsError;
                        
                        ratings.forEach(r => {
                            if (!pubStatsMap.has(r.pub_id)) pubStatsMap.set(r.pub_id, { qualitySum: 0, ratingCount: 0 });
                            const stats = pubStatsMap.get(r.pub_id);
                            stats.qualitySum += r.quality;
                            stats.ratingCount++;
                        });
                    }
                } else {
                    let query = supabase.from('ratings').select('pub_id, quality');
                    
                    const now = new Date();
                    if (activePeriod === 'year') {
                        const oneYearAgo = new Date(now);
                        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                        query = query.gte('created_at', oneYearAgo.toISOString());
                    } else if (activePeriod === 'month') {
                        const oneMonthAgo = new Date(now);
                        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                        query = query.gte('created_at', oneMonthAgo.toISOString());
                    } else if (activePeriod === 'day') {
                        const oneDayAgo = new Date(now);
                        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                        query = query.gte('created_at', oneDayAgo.toISOString());
                    }

                    const { data: ratings, error: ratingsError } = await query;
                    if (ratingsError) throw ratingsError;

                    if (ratings && ratings.length > 0) {
                        ratings.forEach(r => {
                            if (!pubStatsMap.has(r.pub_id)) pubStatsMap.set(r.pub_id, { qualitySum: 0, ratingCount: 0 });
                            const stats = pubStatsMap.get(r.pub_id);
                            stats.qualitySum += r.quality;
                            stats.ratingCount++;
                        });

                        const minRatings = activePeriod === 'year' ? 3 : (activePeriod === 'month' ? 2 : 1);
                        
                        topScores = Array.from(pubStatsMap.entries())
                            .map(([pub_id, stats]) => ({
                                pub_id,
                                pub_score: stats.qualitySum / stats.ratingCount,
                                ratingCount: stats.ratingCount
                            }))
                            .filter(s => s.ratingCount >= minRatings)
                            .sort((a, b) => {
                                if (b.pub_score !== a.pub_score) return b.pub_score - a.pub_score;
                                return b.ratingCount - a.ratingCount;
                            })
                            .slice(0, 50);
                    }
                }

                if (!topScores || topScores.length === 0) {
                    setLeaderboardData([]);
                    setLoading(false);
                    return;
                }

                const pubIds = topScores.map(s => s.pub_id);
                const { data: pubDetails, error: pubDetailsError } = await supabase
                    .from('pubs')
                    .select('id, name, address, country_code')
                    .in('id', pubIds);

                if (pubDetailsError) throw pubDetailsError;

                const pubDetailsMap = new Map(pubDetails.map(p => [p.id, p]));
                
                let overallScoresMap = new Map();
                if (activePeriod !== 'all') {
                    const { data: overallScores, error: overallScoresError } = await supabase
                        .from('pub_scores')
                        .select('pub_id, pub_score')
                        .in('pub_id', pubIds);
                    if (!overallScoresError && overallScores) {
                        overallScores.forEach(s => overallScoresMap.set(s.pub_id, s.pub_score));
                    }
                }

                const formattedData = topScores.map(s => {
                    const details = pubDetailsMap.get(s.pub_id);
                    const stats = pubStatsMap.get(s.pub_id);
                    
                    let town = null;
                    if (details?.address) {
                        const parts = details.address.split(',').map(p => p.trim());
                        if (details.country_code === 'gb' && (details.address.includes('Northern Ireland') || details.address.includes('BT'))) {
                             if (parts.length > 1) {
                                let potentialTown = parts[1];
                                potentialTown = potentialTown.replace(/\b(BT\d{1,2}\s?\d[A-Z]{2})\b/gi, '').trim();
                                town = potentialTown;
                            } else if (parts.length === 1) {
                                const match = parts[0].match(/,\s*([^,]+?)\s+BT\d/i);
                                if (match && match[1]) town = match[1];
                            }
                            if (town && town.toLowerCase() === 'londonderry') town = 'Derry/Londonderry';
                        } else {
                            if (parts.length > 2) town = parts[parts.length - 2];
                            else if (parts.length > 1) town = parts[0];
                            else town = details.address.split(' ')[0];
                        }
                    }

                    const displayScore = activePeriod === 'all' 
                        ? s.pub_score 
                        : (overallScoresMap.get(s.pub_id) || 'N/A');

                    return {
                        id: s.pub_id,
                        name: details?.name || 'Unknown Pub',
                        address: details?.address || '',
                        town: town || '',
                        score: typeof displayScore === 'number' ? Math.round(displayScore) : displayScore,
                        periodScore: s.pub_score,
                        ratingCount: stats?.ratingCount || 0,
                        avgQuality: stats && stats.ratingCount > 0 ? stats.qualitySum / stats.ratingCount : 0
                    };
                });

                setLeaderboardData(formattedData);
            } catch (err) {
                console.error('Pub Leaderboard Error:', err);
                setError('Could not load pub leaderboard data.');
                setLeaderboardData([]);
            }
        }
        setLoading(false);
    }, [activePeriod, leaderboardType]);

    useEffect(() => {
        fetchLeaderboardData();
    }, [fetchLeaderboardData]);

    const handlePeriodChange = (id) => {
        setActivePeriod(id);
        trackEvent('change_leaderboard_filter', { period: id });
    };
    
    const handleRefresh = () => {
        trackEvent('refresh_leaderboard');
        fetchLeaderboardData();
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
        { id: 'year', label: 'Last Year' },
        { id: 'month', label: 'Last Month' },
        { id: 'day', label: 'Last 24h' }
    ];
    
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <div className="p-2 bg-gray-100 dark:bg-gray-800/50 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                {/* Leaderboard Type Toggle */}
                <div className="flex justify-center mb-2">
                    <div className="bg-gray-200 dark:bg-gray-700/50 rounded-full p-1 flex items-center space-x-1">
                        <button
                            onClick={() => { setLeaderboardType('users'); trackEvent('change_leaderboard_type', { type: 'users' }); }}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                leaderboardType === 'users' ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            Top Users
                        </button>
                        <button
                            onClick={() => { setLeaderboardType('pubs'); setActivePeriod('all'); trackEvent('change_leaderboard_type', { type: 'pubs' }); }}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                leaderboardType === 'pubs' ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            Top Pubs
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    {/* Period Filters */}
                    <div className="flex justify-around flex-grow">
                        {leaderboardType === 'users' ? (
                            periodFilters.map(({ id, label }) => (
                                <button key={id} onClick={() => handlePeriodChange(id)}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                        activePeriod === id ? 'bg-amber-500 text-black' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}>
                                    {label}
                                </button>
                            ))
                        ) : (
                            <span className="px-3 py-1 text-sm font-semibold text-gray-500 dark:text-gray-400">All Time</span>
                        )}
                    </div>
                     {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="ml-2 w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh leaderboard"
                        title="Refresh leaderboard"
                    >
                        <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
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
                        <p className="text-sm">
                            {leaderboardType === 'users' ? 'No ratings have been submitted for this period.' : 'No pubs found.'}
                        </p>
                    </div>
                )}
                {!loading && !error && leaderboardData.length > 0 && (
                    <ul className="space-y-3">
                        {leaderboardData.map((item, index) => {
                            if (leaderboardType === 'users') {
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
                                            <div className={`flex-shrink-0 rounded-full ${item.is_stoutly_legend ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
                                                <Avatar avatarId={item.avatar_id} className="w-12 h-12" />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-lg text-gray-900 dark:text-white truncate group-hover:underline flex items-center gap-1" title={item.username}>
                                                    {item.username}
                                                    {item.is_stoutly_legend && <CrownIcon className="w-4 h-4 text-amber-500 flex-shrink-0" title="Stoutly Legend" />}
                                                </p>
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
                            } else {
                                return (
                                    <li key={item.id}
                                        onClick={() => onViewPub && onViewPub({ id: item.id, name: item.name })}
                                        className={`group bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-md border-l-4 transition-colors cursor-pointer hover:bg-amber-500/10 dark:hover:bg-gray-700/50 ${index < 3 ? 'border-amber-400' : 'border-transparent'}`}
                                        role="button"
                                        tabIndex="0"
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onViewPub && onViewPub({ id: item.id, name: item.name }) }}}
                                        aria-label={`View pub ${item.name}`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-8 text-center flex-shrink-0">{renderMedal(index + 1)}</div>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-lg text-gray-900 dark:text-white truncate group-hover:underline" title={item.name}>
                                                    {item.name}
                                                </p>
                                                <div className="mt-1">
                                                    <StarRating rating={item.avgQuality} />
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className="font-bold text-lg text-gray-900 dark:text-white">{item.score} <span className="text-xs font-normal text-gray-500">Score</span></p>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{item.ratingCount} {item.ratingCount === 1 ? 'rating' : 'ratings'}</span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            }
                        })}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default LeaderboardPage;