import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase.js';

const StatCard = ({ label, value, change }) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const changeColor = isPositive 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    const changeIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex flex-col justify-between h-full">
            <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mt-1">{label}</div>
            </div>
            {change !== null && change !== undefined && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className={`inline-flex text-xs font-bold px-2 py-0.5 rounded-full items-center gap-1 ${changeColor}`}>
                        <i className={`fas ${changeIcon}`}></i>
                        <span>{Math.abs(change).toFixed(1)}% vs prior 7d</span>
                    </div>
                </div>
            )}
        </div>
    );
};


const MilestoneTable = ({ title, milestones, unit }) => {
    const formatDate = (dateString) => {
        if (!dateString) return <span className="text-gray-500">N/A</span>;
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    return (
        <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{title}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {milestones.length > 0 ? (
                        milestones.map(({ milestone_value, last_forecasted_at }) => (
                            <li key={milestone_value} className="flex justify-between items-center p-4">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{milestone_value.toLocaleString()} {unit}</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">{formatDate(last_forecasted_at)}</span>
                            </li>
                        ))
                    ) : (
                         <li className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No upcoming milestones to forecast.
                        </li>
                    )}
                </ul>
            </div>
        </section>
    );
};

const AchievedMilestoneTable = ({ title, milestones, unit }) => {
    const getScheduleStatus = (achievedAt, forecastedAt) => {
        if (!achievedAt || !forecastedAt) return { text: 'N/A', color: 'text-gray-500' };
        
        const achievedDate = new Date(achievedAt);
        const forecastedDate = new Date(forecastedAt);
        const diffTime = forecastedDate.getTime() - achievedDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) return { text: `${diffDays} days ahead`, color: 'text-green-500' };
        if (diffDays < -1) return { text: `${Math.abs(diffDays)} days behind`, color: 'text-red-500' };
        return { text: 'On schedule', color: 'text-blue-500' };
    };

    return (
        <section>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{title}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                {milestones.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Milestone</th>
                                    <th scope="col" className="px-4 py-3">Date Achieved</th>
                                    <th scope="col" className="px-4 py-3">Status vs. Forecast</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {milestones.map(m => {
                                    const status = getScheduleStatus(m.achieved_at, m.forecasted_at);
                                    return (
                                        <tr key={m.milestone_value}>
                                            <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{m.milestone_value.toLocaleString()} {unit}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{new Date(m.achieved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                            <td className={`px-4 py-3 font-bold ${status.color}`}>{status.text}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-4 text-center text-gray-500 dark:text-gray-400">No milestones achieved yet.</p>
                )}
            </div>
        </section>
    );
};

const ForecastsPage = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [allMilestones, setAllMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsResult, milestonesResult] = await Promise.all([
                supabase.rpc('get_dashboard_and_milestone_stats').single(),
                supabase.rpc('get_all_milestones')
            ]);

            if (statsResult.error) throw new Error(`Stats Error: ${statsResult.error.message}`);
            if (milestonesResult.error) throw new Error(`Milestones Error: ${milestonesResult.error.message}`);
            
            setStats(statsResult.data);
            setAllMilestones(milestonesResult.data || []);
        } catch (err) {
            console.error("Error fetching forecast data:", err);
            setError("Could not load forecast data. Please ensure the database functions are up to date and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { upcomingMilestones, achievedMilestones } = useMemo(() => {
        const upcoming = { users: [], ratings: [], pubs: [] };
        const achieved = { users: [], ratings: [], pubs: [] };

        for (const m of allMilestones) {
            if (m.achieved_at) {
                if (achieved[m.milestone_type]) achieved[m.milestone_type].push(m);
            } else {
                if (upcoming[m.milestone_type]) upcoming[m.milestone_type].push(m);
            }
        }
        
        // Sort achieved milestones descending by value
        Object.keys(achieved).forEach(key => {
            achieved[key].sort((a, b) => b.milestone_value - a.milestone_value);
        });

        return { upcomingMilestones: upcoming, achievedMilestones: achieved };
    }, [allMilestones]);

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

        if (!stats) {
            return <div className="text-center text-gray-500 p-6">No data available.</div>
        }

        return (
            <div className="space-y-10">
                <section>
                     <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Current Growth Rate <span className="text-base font-normal text-gray-500">(Last 7 Days)</span></h2>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard label="Avg. Daily Signups" value={parseFloat(stats.avg_daily_signups_7d).toFixed(2)} change={stats.signups_change_7d} />
                        <StatCard label="Avg. Daily Ratings" value={parseFloat(stats.avg_daily_ratings_7d).toFixed(2)} change={stats.ratings_change_7d} />
                        <StatCard label="Avg. Daily Pubs Added" value={parseFloat(stats.avg_daily_pubs_7d).toFixed(2)} change={stats.pubs_change_7d} />
                    </div>
                </section>
                
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 pb-2 border-b-2 border-amber-500">Upcoming Milestones</h2>
                    <div className="space-y-6">
                        <MilestoneTable title="User Forecasts" milestones={upcomingMilestones.users} unit="Users" />
                        <MilestoneTable title="Rating Forecasts" milestones={upcomingMilestones.ratings} unit="Ratings" />
                        <MilestoneTable title="Pub Forecasts" milestones={upcomingMilestones.pubs} unit="Pubs" />
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 pb-2 border-b-2 border-green-500">Achievement History</h2>
                    <div className="space-y-6">
                        <AchievedMilestoneTable title="User Achievements" milestones={achievedMilestones.users} unit="Users" />
                        <AchievedMilestoneTable title="Rating Achievements" milestones={achievedMilestones.ratings} unit="Ratings" />
                        <AchievedMilestoneTable title="Pub Achievements" milestones={achievedMilestones.pubs} unit="Pubs" />
                    </div>
                </div>
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
                               Growth Forecasts
                            </h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projected milestones based on current growth.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="Refresh forecasts"
                        title="Refresh forecasts"
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

export default ForecastsPage;