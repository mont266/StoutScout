import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../supabase.js';
import { getCurrencyInfo } from '../utils.js';
import { trackEvent } from '../analytics.js';
import ImageGallery from './ImageGallery.jsx';
import UserListPage from './UserListPage.jsx';
import AllRatingsPage from './AllRatingsPage.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import TimeSeriesChart from './TimeSeriesChart.jsx';
import { OnlineStatusContext } from '../contexts/OnlineStatusContext.jsx';
import OnlineUsersPage from './OnlineUsersPage.jsx';
import AllCommentsPage from './AllCommentsPage.jsx';

const StatCard = ({ label, value, icon, format = (v) => v.toLocaleString(), onClick, className = '', subValue = null }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center space-x-4 transition-all hover:shadow-lg hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''} ${className}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
            <i className={`fas ${icon} text-xl text-amber-500 dark:text-amber-400 w-7 h-7 flex items-center justify-center`}></i>
        </div>
        <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {value !== null && value !== undefined ? format(value) : '...'}
                {subValue && <span className="text-base font-semibold text-gray-400 dark:text-gray-500 ml-2">{subValue}</span>}
            </div>
        </div>
    </div>
);

const TimePeriodFilter = ({ activePeriod, onPeriodChange }) => {
    const periods = [
        { id: '1d', label: '24h' },
        { id: '7d', label: '7d' },
        { id: '30d', label: '30d' },
        { id: '6m', label: '6m' },
        { id: '1y', label: '1y' },
        { id: 'all', label: 'All' },
    ];
    return (
        <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-700/50 rounded-full p-1 flex items-center space-x-1">
            {periods.map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => onPeriodChange(id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        activePeriod === id 
                            ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

const formatPercent = (numerator, denominator) => {
    if (denominator === 0 || numerator === null || denominator === null) return '(0.0%)';
    const percentage = (numerator / denominator) * 100;
    return `(${percentage.toFixed(1)}%)`;
}

const StatsPage = ({ onBack, onViewProfile, onViewPub, userProfile, onAdminDeleteComment }) => {
    const [stats, setStats] = useState({});
    const [countryStats, setCountryStats] = useState([]);
    const [timeSeriesData, setTimeSeriesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timePeriod, setTimePeriod] = useState('30d');
    const [currentView, setCurrentView] = useState('main');
    const isDesktop = useIsDesktop();
    const { onlineUserIds } = useContext(OnlineStatusContext);
    const onlineUsersCount = onlineUserIds.size;

    const fetchStats = useCallback(async (period) => {
        setLoading(true);
        setError(null);
        trackEvent('view_stats_page', { time_period: period });

        try {
            const promises = [
                supabase.rpc('get_dashboard_stats', { time_period: period }).single(),
                supabase.rpc('get_dashboard_timeseries', { time_period: period }),
                supabase.rpc('get_price_stats_by_country'),
            ];

            const [statsResult, timeSeriesResult, countryStatsResult] = await Promise.all(promises);

            if (statsResult.error) throw new Error(`Stats fetch failed: ${statsResult.error.message}`);
            if (timeSeriesResult.error) throw new Error(`Time series fetch failed: ${timeSeriesResult.error.message}`);
            if (countryStatsResult.error) throw new Error(`Country stats fetch failed: ${countryStatsResult.error.message}`);
            
            setStats(statsResult.data || {});
            setTimeSeriesData(timeSeriesResult.data || []);
            setCountryStats(countryStatsResult.data || []);

        } catch (rpcError) {
            console.error('Error fetching app stats:', rpcError);
            setError(rpcError.message || 'Could not load statistics. Please ensure the database functions are up to date.');
            setStats({});
            setTimeSeriesData([]);
            setCountryStats([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentView === 'main' || currentView === 'online_users') {
            fetchStats(timePeriod);
        }
    }, [currentView, timePeriod, fetchStats]);
    
    const handleRefresh = () => {
        trackEvent('refresh_stats', { time_period: timePeriod });
        fetchStats(timePeriod);
    };
    
    const handleViewChange = (viewName) => {
        trackEvent(`stats_navigate_to_${viewName}`);
        setCurrentView(viewName);
    };
    
    const handleBackFromSubView = useCallback(() => {
        setCurrentView('main');
    }, []);

    if (currentView === 'online_users') {
        return <OnlineUsersPage onBack={handleBackFromSubView} onViewProfile={onViewProfile} />;
    }
    
    if (currentView === 'user_list') {
        return <UserListPage totalUsers={stats?.total_users || 0} onBack={handleBackFromSubView} onViewProfile={onViewProfile} />;
    }
    
    if (currentView === 'all_ratings') {
        return <AllRatingsPage totalRatings={stats?.total_ratings || 0} onBack={handleBackFromSubView} onViewProfile={onViewProfile} />;
    }

    if (currentView === 'image_gallery') {
        return <ImageGallery totalImages={stats?.total_uploaded_images || 0} onBack={handleBackFromSubView} onViewProfile={onViewProfile} />;
    }
    
    if (currentView === 'all_comments') {
        return <AllCommentsPage totalComments={stats?.total_comments || 0} onBack={handleBackFromSubView} onViewProfile={onViewProfile} onViewPub={onViewPub} loggedInUserProfile={userProfile} onAdminDeleteComment={onAdminDeleteComment} />;
    }

    const renderLoading = () => (
         <div className="space-y-8 animate-pulse">
            <section>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl h-24"></div>
                    ))}
                </div>
            </section>
        </div>
    );

    const renderError = () => (
         <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
            <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
            <p>{error}</p>
            <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
        </div>
    );
    
    const renderMobileDashboard = () => {
        const timePeriodLabel = {
            '1d': 'Last 24 Hours',
            '7d': 'Last 7 Days',
            '30d': 'Last 30 Days',
            '6m': 'Last 6 Months',
            '1y': 'Last Year',
            'all': 'All Time',
        }[timePeriod] || 'Selected Period';
    
        return (
            <div className="space-y-6">
                <section>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 px-1">{timePeriodLabel}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Users Online" value={onlineUsersCount} icon="fa-wifi" onClick={() => handleViewChange('online_users')} />
                        <StatCard label="New Users" value={stats.new_users_in_period} icon="fa-user-plus" />
                        <StatCard label="New Ratings" value={stats.new_ratings_in_period} icon="fa-star" />
                        <StatCard label="Active Users" value={stats.active_users_in_period} icon="fa-user-clock" />
                        <StatCard label="Total Users" value={stats.total_users} icon="fa-users" onClick={() => handleViewChange('user_list')} className="col-span-2" />
                    </div>
                </section>
    
                <section>
                    <TimeSeriesChart data={timeSeriesData} dataKey="new_users" title="New Users" loading={loading} error={error} timePeriod={timePeriod} lineColor="#F59E0B" tooltipLabel="users" />
                </section>
                <section>
                    <TimeSeriesChart data={timeSeriesData} dataKey="new_ratings" title="New Ratings" loading={loading} error={error} timePeriod={timePeriod} lineColor="#10B981" tooltipLabel="ratings" />
                </section>
    
                <section>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-full flex flex-col max-h-[500px]">
                        <h5 className="text-md font-semibold text-gray-700 dark:text-gray-300 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">Pint Price by Country</h5>
                        <div className="overflow-y-auto">
                            {countryStats.length > 0 ? (
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {countryStats.map((stat) => {
                                        const currency = getCurrencyInfo(stat.country_display_name);
                                        return (
                                            <li key={stat.country_display_name} className="flex items-center justify-between p-3">
                                                <span className="font-semibold text-gray-900 dark:text-white">{stat.country_display_name}</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-base text-green-600 dark:text-green-400">
                                                        {stat.avg_price != null ? `${currency.symbol}${parseFloat(stat.avg_price).toFixed(2)}` : <span className="text-sm text-gray-500">No data</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{Number(stat.rating_count).toLocaleString()} ratings</div>
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
    
                <section>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 px-1">Global Stats</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Total Ratings" value={stats.total_ratings} icon="fa-star-half-alt" onClick={() => handleViewChange('all_ratings')} />
                        <StatCard label="Unique Pubs" value={stats.total_pubs} icon="fa-beer" />
                        <StatCard label="Total Comments" value={stats.total_comments} icon="fa-comments" onClick={() => handleViewChange('all_comments')} />
                        <StatCard label="Images Uploaded" value={stats.total_uploaded_images} icon="fa-images" onClick={() => handleViewChange('image_gallery')} />
                        <StatCard label="Banned Users" value={stats.total_banned_users} icon="fa-user-slash" />
                        <StatCard label="Avatar Adoption" value={stats.users_with_avatars} icon="fa-user-circle" subValue={formatPercent(stats.users_with_avatars, stats.total_users)} className="col-span-2" />
                        <StatCard label="1st Rating Conversion" value={stats.users_who_rated_once} icon="fa-user-check" subValue={formatPercent(stats.users_who_rated_once, stats.total_users)} className="col-span-2" />
                    </div>
                </section>
            </div>
        );
    };
    
    const renderDesktopDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Row 1: KPIs */}
            <StatCard label="Users Online" value={onlineUsersCount} icon="fa-wifi" onClick={() => handleViewChange('online_users')} />
            <StatCard label={`New Users (${timePeriod})`} value={stats.new_users_in_period} icon="fa-user-plus" />
            <StatCard label={`Active Users (${timePeriod})`} value={stats.active_users_in_period} icon="fa-user-clock" />
            <StatCard label={`New Ratings (${timePeriod})`} value={stats.new_ratings_in_period} icon="fa-star" />
            <StatCard label="Total Users" value={stats.total_users} icon="fa-users" onClick={() => handleViewChange('user_list')} className="md:col-span-2 lg:col-span-1" />
    
            {/* Row 2: Charts */}
            <div className="md:col-span-2 lg:col-span-3">
                <TimeSeriesChart data={timeSeriesData} dataKey="new_users" title="New Users" loading={loading} error={error} timePeriod={timePeriod} lineColor="#F59E0B" tooltipLabel="users" />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
                <TimeSeriesChart data={timeSeriesData} dataKey="new_ratings" title="New Ratings" loading={loading} error={error} timePeriod={timePeriod} lineColor="#10B981" tooltipLabel="ratings" />
            </div>
    
            {/* Row 3: Table and Secondary Stats */}
            <div className="md:col-span-2 lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-full flex flex-col max-h-[500px]">
                    <h5 className="text-md font-semibold text-gray-700 dark:text-gray-300 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">Pint Price by Country (All Time)</h5>
                    <div className="overflow-y-auto">
                        {countryStats.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                 {countryStats.map((stat) => {
                                    const currency = getCurrencyInfo(stat.country_display_name);
                                    return (
                                        <li key={stat.country_display_name} className="flex items-center justify-between p-4">
                                            <span className="font-semibold text-gray-900 dark:text-white">{stat.country_display_name}</span>
                                            <div className="text-right">
                                                <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                                    {stat.avg_price != null ? `${currency.symbol}${parseFloat(stat.avg_price).toFixed(2)}` : <span className="text-sm text-gray-500">No data</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{Number(stat.rating_count).toLocaleString()} ratings</div>
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
            </div>
            
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6 content-start">
                <StatCard label="Total Ratings" value={stats.total_ratings} icon="fa-star-half-alt" onClick={() => handleViewChange('all_ratings')} />
                <StatCard label="Unique Pubs" value={stats.total_pubs} icon="fa-beer" />
                <StatCard label="Total Comments" value={stats.total_comments} icon="fa-comments" onClick={() => handleViewChange('all_comments')} />
                <StatCard label="Images Uploaded" value={stats.total_uploaded_images} icon="fa-images" onClick={() => handleViewChange('image_gallery')} />
                <StatCard label="Banned Users" value={stats.total_banned_users} icon="fa-user-slash" />
                <StatCard label="Avatar Adoption Rate" value={stats.users_with_avatars} icon="fa-user-circle" subValue={formatPercent(stats.users_with_avatars, stats.total_users)} />
                <StatCard label="First Rating Conversion" value={stats.users_who_rated_once} icon="fa-user-check" subValue={formatPercent(stats.users_who_rated_once, stats.total_users)} />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50">
           {onBack && (
                 <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold">Back to Settings</span>
                    </button>
                </div>
            )}
            <header className="p-4 md:p-6 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-amber-500 dark:text-amber-400">
                            Analytics Dashboard
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A high-level overview of app usage and data.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <TimePeriodFilter activePeriod={timePeriod} onPeriodChange={setTimePeriod} />
                        <button
                            onClick={handleRefresh} disabled={loading}
                            className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh statistics" title="Refresh statistics"
                        >
                            <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto p-4 md:p-6">
                {loading ? renderLoading() : error ? renderError() : (isDesktop ? renderDesktopDashboard() : renderMobileDashboard())}
            </main>
        </div>
    );
};

export default StatsPage;