import React, { useState, useEffect } from 'react';
import { RANK_DETAILS } from '../constants.js';
import { getRankData, formatTimeAgo, formatLocationDisplay } from '../utils.js';
import { supabase } from '../supabase.js';
import StarRating from './StarRating.jsx';
import Avatar from './Avatar.jsx';

const ProfilePage = ({ userProfile, userRatings, onViewPub, loggedInUserProfile, levelRequirements, onAvatarChangeClick }) => {
    // Component now manages its own profile state to update it after a moderation action.
    const [profile, setProfile] = useState(userProfile);
    const [isBanning, setIsBanning] = useState(false);
    const [isModerationVisible, setIsModerationVisible] = useState(false);

    // Keep state in sync with props from App.jsx
    useEffect(() => {
        setProfile(userProfile);
    }, [userProfile]);

    const { username, level, is_beta_tester, is_developer, is_banned, avatar_id } = profile;
    const reviews = profile.reviews || 0;
    
    const rankData = getRankData(level);

    // New progress calculation logic based on the scaled system
    const getLevelProgress = () => {
        if (!levelRequirements || levelRequirements.length === 0 || !level) {
            return {
                percentage: 0,
                progressText: 'Calculating...',
                nextLevelDisplay: `Lvl ${level + 1}`
            };
        }

        const currentLevelInfo = levelRequirements.find(lr => lr.level === level);
        const nextLevelInfo = levelRequirements.find(lr => lr.level === level + 1);
        
        if (!currentLevelInfo) {
             return { percentage: 0, progressText: 'Syncing...', nextLevelDisplay: `Lvl ${level + 1}` };
        }
        
        // Handle max level case
        if (!nextLevelInfo) {
            return { percentage: 100, progressText: 'Max Level Reached!', nextLevelDisplay: 'Max' };
        }
        
        const ratingsForThisLevel = nextLevelInfo.total_ratings_required - currentLevelInfo.total_ratings_required;
        const progressIntoThisLevel = reviews - currentLevelInfo.total_ratings_required;
        
        const percentage = ratingsForThisLevel > 0 ? (progressIntoThisLevel / ratingsForThisLevel) * 100 : 0;
        
        return {
            percentage: Math.min(100, Math.max(0, percentage)), // Clamp between 0 and 100
            progressText: `${progressIntoThisLevel} / ${ratingsForThisLevel} Ratings to next level`,
            nextLevelDisplay: `Lvl ${level + 1}`
        };
    };

    const { percentage: progressPercentage, progressText: reviewsForNextLevelText, nextLevelDisplay } = getLevelProgress();
    
    const [isRankProgressionVisible, setIsRankProgressionVisible] = useState(false);

    // Determine if the logged-in user can see moderation tools for the viewed profile
    const isViewingOwnProfile = !loggedInUserProfile || profile.id === loggedInUserProfile.id;
    const canModerate = loggedInUserProfile?.is_developer && !isViewingOwnProfile;

    const handleBanUser = async () => {
        if (!window.confirm(`Are you sure you want to ban ${username}? This action is permanent and will hide all their contributions.`)) {
            return;
        }
        setIsBanning(true);
        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: true })
            .eq('id', profile.id);

        if (error) {
            alert(`Failed to ban user: ${error.message}`);
        } else {
            // Update local state to immediately reflect the change
            setProfile(p => ({ ...p, is_banned: true }));
        }
        setIsBanning(false);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <main className="flex-grow p-4 overflow-y-auto">
                {/* Profile Card */}
                <div className={`relative bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 text-center border-t-4 ${is_beta_tester ? 'border-blue-500' : 'border-amber-400'}`}>
                    {is_banned && (
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white font-bold px-4 py-1 rounded-full text-sm uppercase tracking-wider shadow-lg">
                            Banned
                        </div>
                    )}
                    <div className="absolute top-4 right-4 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        {is_developer && (
                            <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border-2 border-white dark:border-gray-800 shadow">
                                Developer
                            </span>
                        )}
                        {is_beta_tester && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wide border-2 border-white dark:border-gray-800 shadow">
                                Beta Tester
                            </span>
                        )}
                    </div>

                    <div className="flex justify-center mb-4">
                        {isViewingOwnProfile ? (
                            <button 
                                onClick={onAvatarChangeClick} 
                                className="relative group rounded-full focus:outline-none focus:ring-4 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                aria-label="Change avatar"
                            >
                                <Avatar avatarId={avatar_id} className="w-28 h-28" />
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <i className="fas fa-pen text-white text-2xl"></i>
                                </div>
                            </button>
                        ) : (
                            <Avatar avatarId={avatar_id} className="w-28 h-28" />
                        )}
                    </div>
                    
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white">{username}</h2>
                    
                    <div className="flex items-center justify-center space-x-3 mt-2">
                        <i className={`fas ${rankData.icon} text-2xl text-amber-500 dark:text-amber-400`} aria-label={`Rank icon for ${rankData.name}`}></i>
                        <p className="text-2xl font-semibold text-amber-500 dark:text-amber-400">{rankData.name}</p>
                    </div>
                    
                    <div className="mt-4 flex justify-center items-center space-x-6 text-lg">
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{level}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Level</p>
                        </div>
                        <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{reviews}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{reviews === 1 ? 'Rating' : 'Ratings'}</p>
                        </div>
                    </div>

                    {/* Review Progress Bar */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                            <span>Progress to Next Level</span>
                            <span>{nextLevelDisplay}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 border border-gray-300 dark:border-gray-600">
                            <div
                                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-300 mt-1 text-center">
                            {reviewsForNextLevelText}
                        </p>
                    </div>
                </div>

                {/* Moderation Tools Section */}
                {canModerate && (
                    <div className="mb-6">
                        <button
                            onClick={() => setIsModerationVisible(!isModerationVisible)}
                            className="w-full flex justify-between items-center text-left text-lg font-semibold text-red-500 dark:text-red-400 p-4 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-expanded={isModerationVisible}
                            aria-controls="moderation-tools-panel"
                        >
                            <span><i className="fas fa-gavel mr-2"></i>Moderation Tools</span>
                            <i className={`fas fa-chevron-down text-red-500/70 dark:text-red-400/70 transition-transform duration-300 ${isModerationVisible ? 'rotate-180' : ''}`}></i>
                        </button>
                        {isModerationVisible && (
                            <div id="moderation-tools-panel" className="mt-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                        Status: <span className={`font-bold ${is_banned ? 'text-red-500' : 'text-green-500'}`}>{is_banned ? 'Banned' : 'Active'}</span>
                                    </p>
                                    <button
                                        onClick={handleBanUser}
                                        disabled={is_banned || isBanning}
                                        className="w-full sm:w-auto bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                    >
                                        {isBanning ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-user-slash"></i>}
                                        <span>{is_banned ? 'User Banned' : 'Ban User'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Rank Progression */}
                <div className="mb-6">
                    <button
                        onClick={() => setIsRankProgressionVisible(!isRankProgressionVisible)}
                        className="w-full flex justify-between items-center text-left text-xl font-semibold text-gray-900 dark:text-white p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                        aria-expanded={isRankProgressionVisible}
                        aria-controls="rank-progression-list"
                    >
                        <span>Rank Progression</span>
                        <i className={`fas fa-chevron-down text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isRankProgressionVisible ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isRankProgressionVisible && (
                         <div id="rank-progression-list" className="mt-2">
                            <ul className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                                {RANK_DETAILS.map((rankDetail, index) => {
                                    const isCurrentRank = rankDetail.name === rankData.name;
                                    const nextRank = RANK_DETAILS[index + 1];
                                    const levelRange = nextRank
                                        ? `Levels ${rankDetail.minLevel} - ${nextRank.minLevel - 1}`
                                        : `Level ${rankDetail.minLevel}+`;

                                    return (
                                        <li key={rankDetail.name} className={`flex justify-between items-center p-2 rounded-md transition-colors ${isCurrentRank ? 'bg-amber-500/10' : ''}`}>
                                            <div className="flex items-center space-x-3">
                                                <i className={`fas ${rankDetail.icon} w-6 text-center text-lg ${isCurrentRank ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}/>
                                                <span className={`font-semibold ${isCurrentRank ? 'text-amber-500 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'}`}>{rankDetail.name}</span>
                                            </div>
                                            <span className={`text-sm ${isCurrentRank ? 'text-amber-600 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>{levelRange}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Recent Ratings */}
                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Ratings ({userRatings.length})</h3>
                    {userRatings.length > 0 ? (
                        <ul className="space-y-3">
                            {userRatings.slice(0, 10).map((r) => ( // Show latest 10
                                <li key={r.id}
                                    className={`bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md transition-colors ${r.pubLocation ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''}`}
                                    onClick={() => r.pubLocation && onViewPub({ id: r.pubId, location: r.pubLocation })}
                                    role={r.pubLocation ? "button" : "listitem"}
                                    tabIndex={r.pubLocation ? "0" : "-1"}
                                    onKeyDown={(e) => {
                                        if (r.pubLocation && (e.key === 'Enter' || e.key === ' ')) {
                                            onViewPub({ id: r.pubId, location: r.pubLocation });
                                        }
                                    }}
                                    aria-label={r.pubLocation ? `View details for ${r.pubName}` : undefined}
                                >
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex-grow pr-4 min-w-0">
                                            <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{r.pubName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formatLocationDisplay(r.pubAddress)}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(r.timestamp)}</p>
                                             {r.pubLocation && <i className="fas fa-map-pin text-amber-500 dark:text-amber-400 mt-2" title="View on map"></i>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">Price Rating:</span>
                                            <StarRating rating={r.rating.price} color="text-green-400" />
                                        </div>
                                        {r.rating.exact_price > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">Price Paid:</span>
                                                <span className="font-bold text-gray-900 dark:text-white">£{r.rating.exact_price.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">Quality Rating:</span>
                                            <StarRating rating={r.rating.quality} color="text-amber-400" />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p>This user hasn't rated any pubs yet.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;