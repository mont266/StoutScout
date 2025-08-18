import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';

const UtmStatCard = ({ source, count }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center space-x-4">
        <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full">
            <i className="fas fa-bullhorn text-xl text-purple-500 dark:text-purple-400 w-7 h-7 flex items-center justify-center"></i>
        </div>
        <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{count.toLocaleString()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium capitalize">{source} Signups</div>
        </div>
    </div>
);

const UtmStatsPage = ({ onBack }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUtmStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        trackEvent('view_utm_stats');

        try {
            const { data, error: rpcError } = await supabase.rpc('get_utm_stats');
            if (rpcError) throw rpcError;
            setStats(data || []);
        } catch (err) {
            console.error("Error fetching UTM stats:", err);
            setError(err.message || 'Could not load UTM statistics. Please ensure the database function is deployed correctly.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUtmStats();
    }, [fetchUtmStats]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-24"></div>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                    <p>{error}</p>
                </div>
            );
        }

        if (stats.length === 0) {
            return (
                <div className="text-center text-gray-500 p-8">
                    <p>No signup data from UTM sources found yet.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map(stat => (
                    <UtmStatCard key={stat.source} source={stat.source} count={stat.signup_count} />
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50">
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 -ml-2 rounded-lg transition-colors">
                            <i className="fas fa-arrow-left"></i>
                            <span className="font-semibold hidden sm:inline">Back to Stats</span>
                        </button>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-amber-500 dark:text-amber-400">
                               UTM Stats
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">User signups by acquisition source.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchUtmStats}
                        disabled={loading}
                        className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh stats"
                        title="Refresh stats"
                    >
                        <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto p-4 md:p-6">
                {renderContent()}
            </main>
        </div>
    );
};

export default UtmStatsPage;