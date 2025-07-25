import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { getCurrencyInfo } from '../utils.js';
import { trackEvent } from '../analytics.js';
import ImageGallery from './ImageGallery.jsx';

const StatCard = ({ label, value, icon, format = (v) => v.toLocaleString(), onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center space-x-4 transition-all hover:shadow-lg hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
            <i className={`fas ${icon} text-xl text-amber-500 dark:text-amber-400 w-7 h-7 flex items-center justify-center`}></i>
        </div>
        <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value !== null && value !== undefined ? format(value) : '...'}</div>
        </div>
    </div>
);


const StatsPage = ({ onBack, onViewProfile }) => {
    const [stats, setStats] = useState(null);
    const [countryStats, setCountryStats] = useState([]);
    const [processedStats, setProcessedStats] = useState([]);
    const [isUkExpanded, setIsUkExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('main'); // 'main' or 'image_gallery'

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        trackEvent('view_stats_page');

        try {
            const [statsResult, countryStatsResult] = await Promise.all([
                supabase.rpc('get_app_stats').single(),
                supabase.rpc('get_price_stats_by_country'),
            ]);

            if (statsResult.error) throw new Error(`Stats fetch failed: ${statsResult.error.message}`);
            if (countryStatsResult.error) throw new Error(`Country stats fetch failed: ${countryStatsResult.error.message}`);
            
            setStats(statsResult.data);
            setCountryStats(countryStatsResult.data || []);

        } catch (rpcError) {
            console.error('Error fetching app stats:', rpcError);
            setError(rpcError.message || 'Could not load statistics. Please ensure the database functions are up to date.');
            setStats(null);
            setCountryStats([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view === 'main') {
            fetchStats();
        }
    }, [view, fetchStats]);
    
    useEffect(() => {
        if (!countryStats || countryStats.length === 0) {
            setProcessedStats([]);
            return;
        }

        const ukNations = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'UK (unspecified)'];
        const ukStats = countryStats.filter(stat => ukNations.includes(stat.country));
        const otherStats = countryStats.filter(stat => !ukNations.includes(stat.country));

        let finalStats = [...otherStats];

        if (ukStats.length > 0) {
            const totalUkRatings = ukStats.reduce((acc, stat) => acc + Number(stat.rating_count), 0);
            const totalUkValue = ukStats.reduce((acc, stat) => acc + (Number(stat.avg_price) * Number(stat.rating_count)), 0);
            const overallUkAvgPrice = totalUkRatings > 0 ? totalUkValue / totalUkRatings : 0;

            const aggregatedUkStat = {
                country: 'UK',
                avg_price: overallUkAvgPrice,
                rating_count: totalUkRatings,
                isAggregated: true,
                subStats: ukStats.sort((a,b) => Number(b.rating_count) - Number(a.rating_count))
            };
            
            finalStats.push(aggregatedUkStat);
        }
        
        finalStats.sort((a, b) => Number(b.rating_count) - Number(a.rating_count));
        setProcessedStats(finalStats);

    }, [countryStats]);


    const handleRefresh = () => {
        trackEvent('refresh_stats');
        fetchStats();
    };

    const handleViewImageGallery = () => {
        trackEvent('view_image_gallery');
        setView('image_gallery');
    };

    const renderLoading = () => (
         <div className="space-y-8 animate-pulse">
            <section>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-24"></div>
                    ))}
                </div>
            </section>
            <section>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-24"></div>
                    ))}
                </div>
            </section>
            <section>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="space-y-4">
                    <div className="bg-gray-200 dark:bg-gray-800 rounded-xl h-24"></div>
                    <div className="bg-gray-200 dark:bg-gray-800 rounded-xl h-48"></div>
                </div>
            </section>
        </div>
    );

    const renderError = () => (
         <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
            <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
            <p>{error}</p>
            <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
        </div>
    );
    
    const renderContent = () => (
        <div className="space-y-8">
            <section>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 px-1">Platform Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Total Users" value={stats.total_users} icon="fa-users" />
                    <StatCard label="Active Users (30d)" value={stats.active_users_30d} icon="fa-user-clock" />
                    <StatCard label="Total Ratings" value={stats.total_ratings} icon="fa-star-half-alt" />
                    <StatCard label="Unique Pubs Rated" value={stats.total_pubs} icon="fa-beer" />
                    <StatCard label="Avg. Quality" value={stats.avg_quality} icon="fa-star" format={(v) => `${parseFloat(v).toFixed(2)} / 5`} />
                    <StatCard label="Avg. Price Rating" value={stats.avg_price_rating} icon="fa-tag" format={(v) => `${parseFloat(v).toFixed(2)} / 5`} />
                </div>
            </section>

            <section>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 px-1">Content &amp; Moderation Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Images Uploaded" value={stats.total_uploaded_images} icon="fa-images" onClick={handleViewImageGallery} />
                    <StatCard label="Removed Images" value={stats.total_removed_images} icon="fa-trash-alt" />
                    <StatCard label="Banned Users" value={stats.total_banned_users} icon="fa-user-slash" />
                    <StatCard label="Hidden Reviews" value={stats.total_hidden_ratings} icon="fa-eye-slash" />
                </div>
            </section>
            
            <section>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 px-1">Pint Price Analysis</h4>
                <div className="space-y-4">
                     <StatCard 
                        label="Global Avg. Price" 
                        value={stats.global_avg_exact_price} 
                        icon="fa-globe-europe" 
                        // This is a rough indicator from mixed currencies.
                        format={(v) => `~${parseFloat(v).toFixed(2)}`}
                     />
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                       <h5 className="text-md font-semibold text-gray-700 dark:text-gray-300 p-4 border-b border-gray-200 dark:border-gray-700">Breakdown by Country</h5>
                        {processedStats.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {processedStats.map((stat) => {
                                    // Render expandable UK row
                                    if (stat.isAggregated) {
                                        const currency = getCurrencyInfo('UK');
                                        return (
                                            <React.Fragment key="uk-aggregated">
                                                <li
                                                    onClick={() => setIsUkExpanded(p => !p)}
                                                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                                    aria-expanded={isUkExpanded}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <i className={`fas fa-chevron-right text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isUkExpanded ? 'rotate-90' : ''}`}></i>
                                                        <span className="font-semibold text-gray-900 dark:text-white">{stat.country}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                                            {currency.symbol}{parseFloat(stat.avg_price).toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{stat.rating_count} ratings</div>
                                                    </div>
                                                </li>
                                                {isUkExpanded && stat.subStats.map(subStat => {
                                                    const subCurrency = getCurrencyInfo(subStat.country); // All will be £
                                                    return (
                                                        <li key={subStat.country} className="flex items-center justify-between pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                                                            <div className="font-medium text-gray-700 dark:text-gray-300">{subStat.country}</div>
                                                            <div className="text-right">
                                                                <div className="font-semibold text-md text-green-600 dark:text-green-400">
                                                                    {subCurrency.symbol}{parseFloat(subStat.avg_price).toFixed(2)}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">{subStat.rating_count} ratings</div>
                                                            </div>
                                                        </li>
                                                    )
                                                })}
                                            </React.Fragment>
                                        );
                                    }

                                    // Render normal, non-expandable row
                                    const currency = getCurrencyInfo(stat.country);
                                    return (
                                        <li key={stat.country} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="font-semibold text-gray-900 dark:text-white">{stat.country}</div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                                    {currency.symbol}{parseFloat(stat.avg_price).toFixed(2)}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{stat.rating_count} ratings</div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No price data available.</p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );

    if (view === 'image_gallery') {
        return <ImageGallery totalImages={stats?.total_uploaded_images || 0} onBack={() => setView('main')} onViewProfile={onViewProfile} />;
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {onBack && (
                 <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold">Back to Settings</span>
                    </button>
                </div>
            )}
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">Application Statistics</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A high-level overview of app usage and data.</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh statistics"
                        title="Refresh statistics"
                    >
                        <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6">
                {loading ? renderLoading() : error ? renderError() : stats ? renderContent() : null}
            </main>
        </div>
    );
};

export default StatsPage;