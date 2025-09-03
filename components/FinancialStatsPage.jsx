import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import Avatar from './Avatar.jsx';
import { formatCurrency } from '../utils.js';
import { formatTimeAgo } from '../utils.js';

const StatCard = ({ label, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center space-x-4">
        <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
            <i className={`fas ${icon} text-xl text-green-500 dark:text-green-400 w-7 h-7 flex items-center justify-center`}></i>
        </div>
        <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</div>
        </div>
    </div>
);

const TimePeriodFilter = ({ activePeriod, onPeriodChange }) => {
    const periods = [
        { id: '24h', label: '24h' },
        { id: '7d', label: '7d' },
        { id: 'month', label: 'Month' },
        { id: 'year', label: 'Year' },
        { id: 'all', label: 'All Time' },
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

const FinancialStatsPage = ({ onBack, onViewProfile }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timePeriod, setTimePeriod] = useState('all');

    const fetchFinancialStats = useCallback(async (period) => {
        setLoading(true);
        setError(null);
        trackEvent('view_financial_stats', { time_period: period });

        try {
            const { data, error: functionError } = await supabase.functions.invoke('get-financial-stats', {
                body: { time_period: period },
            });
            if (functionError) throw new Error(functionError.message);
            if (data.error) throw new Error(data.error);
            setStats(data);
        } catch (err) {
            console.error("Error fetching financial stats:", err);
            setError(err.message || 'Could not load financial data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFinancialStats(timePeriod);
    }, [timePeriod, fetchFinancialStats]);

    const renderContent = () => {
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
                </div>
            );
        }

        if (!stats) return <div className="text-center text-gray-500 p-6">No data available.</div>;

        return (
            <div className="space-y-8">
                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard 
                            label="Gross Donations (GBP)" 
                            value={formatCurrency(stats.totalAmountGbp / 100, 'GBP')}
                            icon="fa-donate" 
                        />
                         <StatCard 
                            label="Stripe Fees (GBP)" 
                            value={formatCurrency(stats.totalFeesGbp / 100, 'GBP')}
                            icon="fa-percentage"
                        />
                        <StatCard 
                            label="Net Donations (GBP)" 
                            value={formatCurrency(stats.netAmountGbp / 100, 'GBP')}
                            icon="fa-piggy-bank"
                        />
                        <div className="sm:col-span-2 lg:col-span-3">
                            <StatCard 
                                label="Number of Donations" 
                                value={stats.totalDonations.toLocaleString()}
                                icon="fa-receipt"
                            />
                        </div>
                    </div>
                </section>
                
                <section>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Top Donator</h2>
                    {stats.topDonator ? (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex justify-between items-center">
                            <button onClick={() => onViewProfile(stats.topDonator.id, 'financial_stats_top')} className="flex items-center space-x-4">
                                <Avatar avatarId={stats.topDonator.avatar_id} className="w-12 h-12" />
                                <div>
                                    <p className="font-bold text-lg text-amber-600 dark:text-amber-400">{stats.topDonator.username}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Our biggest supporter!</p>
                                </div>
                            </button>
                            <div className="text-right">
                                <p className="font-bold text-xl text-green-600 dark:text-green-400">
                                    {formatCurrency(stats.topDonator.totalAmount / 100, 'GBP')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total Donated (Gross)</p>
                            </div>
                        </div>
                    ) : (
                         <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                            No donations in this period.
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Recent Donations</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        {stats.recentDonations.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stats.recentDonations.map((donation, index) => (
                                    <li key={index} className="flex items-center justify-between p-3">
                                        <button onClick={() => onViewProfile(donation.user.id, 'financial_stats_recent')} className="flex items-center space-x-3">
                                            <Avatar avatarId={donation.user.avatar_id} className="w-10 h-10" />
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">{donation.user.username}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(donation.created * 1000)}</p>
                                            </div>
                                        </button>
                                        <span className="font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(donation.amount / 100, donation.currency.toUpperCase())}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                             <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                No recent donations to show.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50">
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 -ml-2 rounded-lg transition-colors">
                            <i className="fas fa-arrow-left"></i>
                            <span className="font-semibold hidden sm:inline">Back to Stats</span>
                        </button>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-amber-500 dark:text-amber-400">
                               Financial Dashboard
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Donation and support metrics.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TimePeriodFilter activePeriod={timePeriod} onPeriodChange={setTimePeriod} />
                        <button
                            onClick={() => fetchFinancialStats(timePeriod)}
                            disabled={loading}
                            className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh stats"
                            title="Refresh stats"
                        >
                            <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto p-4 md:p-6">
                {renderContent()}
            </main>
        </div>
    );
};

export default FinancialStatsPage;