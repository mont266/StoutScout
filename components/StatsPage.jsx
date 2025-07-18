import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';

const StatCard = ({ label, value, icon, format = (v) => v.toLocaleString() }) => (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4">
        <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
            <i className={`fas ${icon} text-2xl text-amber-500 dark:text-amber-400 w-8 h-8 flex items-center justify-center`}></i>
        </div>
        <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{value !== null && value !== undefined ? format(value) : '...'}</div>
        </div>
    </div>
);


const StatsPage = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        // trackEvent('view_stats_page'); // Event could be added here

        const { data, error: rpcError } = await supabase.rpc('get_app_stats').single();

        if (rpcError) {
            console.error('Error fetching app stats:', rpcError);
            setError('Could not load statistics. Please ensure the `get_app_stats` database function is set up correctly.');
            setStats(null);
        } else {
            setStats(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const renderContent = () => {
        if (loading) {
             return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4">
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-14 h-14"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                 <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                    <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>{error}</p>
                    <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                </div>
            );
        }
        
        if (!stats) return null;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatCard label="Total Users" value={stats.total_users} icon="fa-users" />
                <StatCard label="Active Users (30d)" value={stats.active_users_30d} icon="fa-user-clock" />
                <StatCard label="Total Ratings" value={stats.total_ratings} icon="fa-star-half-alt" />
                <StatCard label="Unique Pubs Rated" value={stats.total_pubs} icon="fa-beer" />
                <StatCard label="Avg. Quality" value={stats.avg_quality} icon="fa-star" format={(v) => `${parseFloat(v).toFixed(2)} / 5`} />
                <StatCard label="Avg. Price Rating" value={stats.avg_price_rating} icon="fa-tag" format={(v) => `${parseFloat(v).toFixed(2)} / 5`} />
            </div>
        );
    };

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
            <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">Application Statistics</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A high-level overview of app usage and data.</p>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default StatsPage;