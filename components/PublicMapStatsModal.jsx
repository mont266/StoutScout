import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const PublicMapStatsModal = ({ isOpen, onClose, userProfile }) => {
    const [stats, setStats] = useState({ total: 0, unique: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !userProfile?.id) return;

        const fetchStats = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { error, count } = await supabase
                    .from('public_map_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', userProfile.id);

                if (error) throw error;

                setStats({ total: count, unique: 0 });
            } catch (err) {
                console.error('Error fetching map stats:', err);
                setError('Failed to load stats.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [isOpen, userProfile?.id]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 sticky top-0 z-10 backdrop-blur">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-400">Map Analytics</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 w-8 h-8 rounded-full flex items-center justify-center">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-4"></div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Crunching the numbers...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <i className="fas fa-exclamation-circle text-2xl mb-2"></i>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm border border-gray-100 dark:border-gray-600/50">
                            <i className="fas fa-eye text-amber-500 text-3xl mb-3"></i>
                            <span className="text-4xl font-black text-gray-900 dark:text-white mb-2">{stats.total}</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Profile Views</span>
                        </div>
                    )}
                    
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        Stats are updated in real-time when users visit your public map.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicMapStatsModal;
