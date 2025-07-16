


import React, { useState } from 'react';
import { REVIEWS_PER_LEVEL, RANK_DETAILS } from '../constants.js';
import { getRankData, formatTimeAgo, formatLocationDisplay } from '../utils.js';
import StarRating from './StarRating.jsx';

const ProfilePage = ({ userProfile, userRatings, onClose, onLogout }) => {
    const { username, level, is_beta_tester, is_developer } = userProfile;
    const reviews = userProfile.reviews || 0;
    
    const rankData = getRankData(level);
    const reviewsForCurrentLevel = reviews % REVIEWS_PER_LEVEL;
    const progressPercentage = (reviewsForCurrentLevel / REVIEWS_PER_LEVEL) * 100;

    const [isRankProgressionVisible, setIsRankProgressionVisible] = useState(false);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <header className="p-2 bg-gray-50 dark:bg-gray-800 shadow-lg z-20 flex items-center">
                <button
                    onClick={onClose}
                    className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-4"
                    aria-label="Back to map"
                >
                    <i className="fas fa-arrow-left fa-lg"></i>
                </button>
                <h1 className="text-2xl font-bold text-amber-500 dark:text-amber-400">Your Profile</h1>
            </header>

            <main className="flex-grow p-4 overflow-y-auto">
                {/* Profile Card */}
                <div className="relative bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 text-center border-t-4 border-amber-400">
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

                    <i className="fas fa-user-circle text-7xl text-gray-400 dark:text-gray-500 mb-4"></i>
                    
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
                            <span>Lvl {level + 1}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 border border-gray-300 dark:border-gray-600">
                            <div
                                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-300 mt-1 text-center">
                            {reviewsForCurrentLevel} / {REVIEWS_PER_LEVEL} Ratings to next level
                        </p>
                    </div>
                </div>

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
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Your Recent Ratings ({userRatings.length})</h3>
                    {userRatings.length > 0 ? (
                        <ul className="space-y-3">
                            {userRatings.slice(0, 10).map((r) => ( // Show latest 10
                                <li key={r.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex-grow pr-4 min-w-0">
                                            <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{r.pubName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formatLocationDisplay(r.pubAddress)}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(r.timestamp)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">Price:</span>
                                            <StarRating rating={r.rating.price} color="text-green-400" />
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">Quality:</span>
                                            <StarRating rating={r.rating.quality} color="text-amber-400" />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p>You haven't rated any pubs yet.</p>
                            <p>Go find a pint and start your journey!</p>
                        </div>
                    )}
                </div>

                {/* Sign Out Button */}
                <div className="mt-auto pt-4">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Sign Out</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;