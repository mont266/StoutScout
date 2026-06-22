import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const GiveawayBanner = ({ userProfile, isMini, onClick }) => {
    const [activeGiveaway, setActiveGiveaway] = useState(null);
    const [currentPeriod, setCurrentPeriod] = useState(null);
    const [allPeriods, setAllPeriods] = useState([]);
    const [isEligible, setIsEligible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem('giveawayBannerCollapsed');
        return stored === 'true';
    });

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('giveawayBannerCollapsed', String(newState));
    };

    useEffect(() => {
        const fetchGiveaway = async () => {
            if (!userProfile?.id) return;
            try {
                const now = new Date().toISOString();
                
                // Find active giveaway
                const { data: giveaways, error: gError } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('is_active', true)
                    .lte('start_date', now)
                    .gte('end_date', now)
                    .limit(1);

                if (gError) throw gError;
                
                if (giveaways && giveaways.length > 0) {
                    const giveaway = giveaways[0];
                    setActiveGiveaway(giveaway);
                    
                    // Find all periods for this giveaway
                    const { data: periods, error: pError } = await supabase
                        .from('giveaway_periods')
                        .select('*')
                        .eq('giveaway_id', giveaway.id)
                        .order('start_date', { ascending: true });
                        
                    if (periods && periods.length > 0) {
                        setAllPeriods(periods);
                        const current = periods.find(p => p.start_date <= now && p.end_date >= now);
                        
                        if (current) {
                            setCurrentPeriod(current);
                        
                            // Check if user is eligible for this period
                            const { data: entries, error: eError } = await supabase
                                .from('giveaway_entries')
                                .select('*')
                                .eq('period_id', current.id)
                                .eq('user_id', userProfile.id)
                                .limit(1);
                                
                            if (entries && entries.length > 0) {
                                setIsEligible(true);
                            } else {
                                // Check criteria
                                let isMet = false;
                                
                                if (giveaway.criteria_type === 'check_in_or_rating' || giveaway.criteria_type === 'rating_only') {
                                    const { count } = await supabase.from('ratings')
                                        .select('*', { count: 'exact', head: true })
                                        .eq('user_id', userProfile.id)
                                        .gte('created_at', current.start_date)
                                        .lte('created_at', current.end_date);
                                    if (count > 0) isMet = true;
                                }
                                
                                if (!isMet && (giveaway.criteria_type === 'check_in_or_rating' || giveaway.criteria_type === 'check_in_only')) {
                                    const { count } = await supabase.from('pub_checkins')
                                        .select('*', { count: 'exact', head: true })
                                        .eq('user_id', userProfile.id)
                                        .gte('created_at', current.start_date)
                                        .lte('created_at', current.end_date);
                                    if (count > 0) isMet = true;
                                }
                                
                                if (isMet) {
                                    // Auto-enter them
                                    await supabase.from('giveaway_entries').insert({
                                        giveaway_id: giveaway.id,
                                        period_id: current.id,
                                        user_id: userProfile.id
                                    });
                                    setIsEligible(true);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching giveaway info:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGiveaway();
    }, [userProfile?.id]);

    if (loading || !activeGiveaway) return null;

    if (isMini) {
        return (
            <div onClick={onClick} className="bg-amber-100 dark:bg-amber-900/40 rounded-xl p-3 mb-4 border border-amber-200 dark:border-amber-800 shadow-sm cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition flex justify-between items-center animate-fade-in-up">
                <div className="flex items-center space-x-3">
                    <i className="fas fa-gift text-2xl text-amber-500 animate-pulse"></i>
                    <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm">Active Giveaway: {activeGiveaway.title}</h3>
                        <p className="text-xs text-amber-800/80 dark:text-amber-200/80">Click here to view details and check eligibility!</p>
                    </div>
                </div>
                <i className="fas fa-chevron-right text-amber-500"></i>
            </div>
        );
    }

    const getCriteriaText = (type) => {
        if (type === 'check_in_or_rating') return 'Check into or rate at least one pub';
        if (type === 'rating_only') return 'Rate at least one pub';
        if (type === 'check_in_only') return 'Check into at least one pub';
        return 'Perform the required action';
    };

    let displayDescription = activeGiveaway.description || '';
    let displayPrize = activeGiveaway.prize_description || '';

    if (displayDescription.includes('|||PRIZE|||')) {
        const parts = displayDescription.split('|||PRIZE|||');
        displayDescription = parts[0];
        displayPrize = parts[1];
    }

    return (
        <div className="bg-amber-100 dark:bg-amber-900/40 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800 shadow-sm animate-fade-in-up transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                    <i className="fas fa-gift text-2xl text-amber-500"></i>
                    <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-100">{activeGiveaway.title}</h3>
                        {currentPeriod && <p className="text-xs text-amber-800/80 dark:text-amber-200/80 font-medium">Currently active: {currentPeriod.period_name}</p>}
                    </div>
                </div>
                <button onClick={toggleCollapse} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-2 rounded-full hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors">
                    <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
                </button>
            </div>
            
            {!isCollapsed && (
                <div className="animate-fade-in-up mt-3 space-y-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                        {displayDescription}
                    </p>

                    {displayPrize && (
                        <div className="inline-flex items-center space-x-2 bg-amber-500/20 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 px-3 py-1.5 rounded-lg text-sm font-semibold">
                            <i className="fas fa-trophy text-amber-600 dark:text-amber-400"></i>
                            <span>Prize: {displayPrize}</span>
                        </div>
                    )}
            
            <div className="mb-4 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
                <h4 className="text-xs font-bold text-amber-900/70 dark:text-amber-400/80 mb-1 uppercase tracking-wider">How to enter this week</h4>
                <p className="text-sm text-amber-900 dark:text-amber-100 font-medium flex items-center">
                    <i className="fas fa-arrow-right text-amber-500 mr-2"></i>
                    {getCriteriaText(activeGiveaway.criteria_type)} inside the active period.
                </p>
                {currentPeriod && (
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1">
                        Closes: {new Date(currentPeriod.end_date).toLocaleDateString()} at {new Date(currentPeriod.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                )}
            </div>

            {allPeriods.length > 1 && (
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-amber-900/70 dark:text-amber-400/80 mb-2 uppercase tracking-wider">Giveaway Timeline</h4>
                    <div className="flex space-x-1">
                        {allPeriods.map((p, idx) => {
                            const now = new Date().toISOString();
                            let state = 'upcoming';
                            if (p.start_date <= now && p.end_date >= now) state = 'active';
                            else if (p.end_date < now) state = 'past';
                            
                            return (
                                <div key={p.id} className="flex-1 flex flex-col group relative">
                                    <div className={`h-2 rounded-full mb-1 transition-colors ${
                                        state === 'active' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                                        state === 'past' ? 'bg-amber-300 dark:bg-amber-700' : 
                                        'bg-amber-200/50 dark:bg-amber-800/30'
                                    }`}></div>
                                    <span className={`text-[10px] text-center font-bold font-mono ${
                                        state === 'active' ? 'text-amber-700 dark:text-amber-400' : 'text-amber-600/50 dark:text-amber-500/40'
                                    }`}>
                                        {p.period_name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="bg-white/70 dark:bg-black/30 rounded-lg p-3 mt-2 shadow-inner">
                {isEligible ? (
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 font-semibold text-sm">
                        <i className="fas fa-check-circle"></i>
                        <span>You are entered into this week's draw!</span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
                        <i className="fas fa-circle-xmark"></i>
                        <span>Not entered yet. Complete the required action to enter!</span>
                    </div>
                )}
            </div>
            </div>
            )}
        </div>
    );
};

export default GiveawayBanner;
