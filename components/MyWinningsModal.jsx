import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const MyWinningsModal = ({ isOpen, onClose, userProfile }) => {
    const [winnings, setWinnings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !userProfile?.id) return;
        
        const fetchWinnings = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('giveaway_prizes')
                    .select('*, period:period_id(giveaway:giveaway_id(title))')
                    .eq('winner_id', userProfile.id)
                    .order('status', { ascending: true }); // 'claimed' vs 'won'
                if (error) throw error;
                setWinnings(data || []);
            } catch (err) {
                console.error("Error fetching winnings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWinnings();
    }, [isOpen, userProfile?.id]);

    const handleMarkAsUsed = async (prizeId) => {
        try {
            const { error } = await supabase
                .from('giveaway_prizes')
                .update({ status: 'claimed' })
                .eq('id', prizeId);
                
            if (error) throw error;
            
            setWinnings(winnings.map(w => 
                w.id === prizeId ? { ...w, status: 'claimed' } : w
            ));
        } catch (err) {
            console.error("Error updating prize status:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 w-full">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                <button 
                    onClick={onClose}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                    <span className="font-semibold">Back to Settings</span>
                </button>
            </div>
            
            <div className="flex-grow p-4 sm:p-6 overflow-y-auto animate-fade-in-up">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500">
                            <i className="fas fa-trophy text-3xl text-amber-500"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Winnings</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                            Keep track of your prizes and vouchers.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-6">
                                <i className="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
                            </div>
                        ) : winnings.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                No winnings yet. Participate in giveaways to win!
                            </div>
                        ) : (
                            winnings.map(prize => (
                                <div key={prize.id} className={`p-4 rounded-xl border shadow-sm ${prize.status === 'claimed' ? 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-60' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{prize.prize_name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{prize.period?.giveaway?.title}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${prize.status === 'claimed' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'}`}>
                                            {prize.status === 'notified' ? 'won' : prize.status}
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 rounded p-2 mb-3 text-center border border-dashed border-gray-300 dark:border-gray-600 font-mono text-lg font-bold tracking-wider select-all">
                                        {prize.prize_code}
                                    </div>
                                    {prize.how_to_redeem && prize.status !== 'claimed' && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 bg-white/50 dark:bg-black/20 p-2 rounded">
                                            <i className="fas fa-info-circle mr-1"></i> {prize.how_to_redeem}
                                        </p>
                                    )}
                                    {prize.status !== 'claimed' && (
                                        <button 
                                            onClick={() => handleMarkAsUsed(prize.id)}
                                            className="w-full py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            Mark as Used
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyWinningsModal;
