
import React from 'react';
import { UserProfile, UserRating } from '../types';
import { XP_PER_LEVEL } from '../constants';
import { getRank, formatTimeAgo, formatLocationDisplay } from '../utils';
import StarRating from './StarRating';

interface ProfilePageProps {
  userProfile: UserProfile;
  userRatings: UserRating[];
  onClose: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, userRatings, onClose }) => {
    const { xp, level } = userProfile;
    const rank = getRank(level);
    const xpForCurrentLevel = xp - (level * XP_PER_LEVEL);
    const progressPercentage = (xpForCurrentLevel / XP_PER_LEVEL) * 100;

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            <header className="p-2 bg-gray-800 shadow-lg z-20 flex items-center">
                <button
                    onClick={onClose}
                    className="text-gray-300 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700 mr-4"
                    aria-label="Back to map"
                >
                    <i className="fas fa-arrow-left fa-lg"></i>
                </button>
                <h1 className="text-2xl font-bold text-amber-400">Your Profile</h1>
            </header>

            <main className="flex-grow p-4 overflow-y-auto">
                {/* Profile Card */}
                <div className="bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 text-center border-t-4 border-amber-400">
                    <i className="fas fa-user-circle text-7xl text-gray-400 mb-4"></i>
                    <h2 className="text-3xl font-bold text-amber-400">{rank}</h2>
                    <p className="text-gray-300">Level {level}</p>
                    
                    {/* XP Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                            <span>XP: {xp}</span>
                            <span>Next Level: {(level + 1) * XP_PER_LEVEL} XP</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 border border-gray-600">
                            <div
                                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-amber-300 mt-1">{xpForCurrentLevel} / {XP_PER_LEVEL} XP to next level</p>
                    </div>
                </div>

                {/* Recent Ratings */}
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-white">Your Recent Ratings</h3>
                    {userRatings.length > 0 ? (
                        <ul className="space-y-3">
                            {userRatings.slice(0, 10).map((r) => ( // Show latest 10
                                <li key={r.timestamp} className="bg-gray-800 p-4 rounded-lg shadow-md">
                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-700">
                                        <div className="flex-grow pr-4 min-w-0">
                                            <p className="font-bold text-lg text-white truncate">{r.pubName}</p>
                                            <p className="text-sm text-gray-400 truncate">{formatLocationDisplay(r.pubAddress)}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-xs text-gray-500">{formatTimeAgo(r.timestamp)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Price:</span>
                                            <StarRating rating={r.rating.price} color="text-green-400" />
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">Quality:</span>
                                            <StarRating rating={r.rating.quality} color="text-amber-400" />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-gray-500 p-6 bg-gray-800 rounded-lg">
                            <p>You haven't rated any pubs yet.</p>
                            <p>Go find a pint and start your journey!</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
