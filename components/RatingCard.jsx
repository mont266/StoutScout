import React from 'react';
import Avatar from './Avatar.jsx';
import StarRating from './StarRating.jsx';
import { formatTimeAgo, getCurrencyInfo } from '../utils.js';

const RatingCard = ({ rating, onToggleLike, userLikes, onViewProfile, onLoginRequest, onViewImage }) => {

    const { user, pub_name, pub_address, image_url, created_at, quality, price, like_count, id, exact_price } = rating;

    const isLiked = userLikes && userLikes.has(id);
    const currencyInfo = getCurrencyInfo(pub_address);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Card Header */}
            <div className="p-3 flex items-center space-x-3 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => onViewProfile(user.id, 'community')} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                     <Avatar avatarId={user.avatar_id} className="w-10 h-10" />
                </button>
                <div className="flex-grow min-w-0">
                    <button onClick={() => onViewProfile(user.id, 'community')} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline">
                        {user.username}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={pub_name}>
                        rated a pint at <span className="font-medium">{pub_name}</span>
                    </p>
                </div>
                 <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimeAgo(new Date(created_at).getTime())}</span>
            </div>

            {/* Image */}
            {image_url && (
                <button onClick={() => onViewImage(rating)} className="w-full aspect-square block bg-gray-100 dark:bg-gray-900">
                    <img src={image_url} alt={`Pint at ${pub_name}`} loading="lazy" className="w-full h-full object-cover"/>
                </button>
            )}

            {/* Card Footer */}
            <div className="p-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 text-sm" title="Price">
                            <i className="fas fa-tag text-green-500/80"></i>
                            <StarRating rating={price} color="text-green-400" />
                        </div>
                            <div className="flex items-center space-x-1 text-sm" title="Quality">
                            <i className="fas fa-beer text-amber-500/80"></i>
                            <StarRating rating={quality} color="text-amber-400" />
                        </div>
                    </div>
                     <button
                        onClick={() => onToggleLike ? onToggleLike(id) : onLoginRequest()}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold ${
                            isLiked
                            ? 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-800/50'
                        }`}
                        aria-pressed={isLiked}
                        aria-label={isLiked ? `Unlike rating, currently ${like_count} likes` : `Like rating, currently ${like_count} likes`}
                      >
                          <i className={`${isLiked ? 'fas' : 'far'} fa-heart transition-transform ${isLiked ? 'scale-110' : ''}`}></i>
                          <span>{like_count || 0}</span>
                      </button>
                 </div>
                 
                 {exact_price > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex justify-between items-center">
                            <span>Price Paid:</span>
                            <span className="font-bold text-lg text-gray-800 dark:text-white bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded">
                                {currencyInfo.symbol}{exact_price.toFixed(2)}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RatingCard;