import React, { useState, useEffect } from 'react';
import Avatar from './Avatar.jsx';
import StarRating from './StarRating.jsx';
import { getRankData, formatTimeAgo, getCurrencyInfo } from '../utils.js';
import CommentsSection from './CommentsSection.jsx';

const RatingCard = ({ rating, onToggleLike, userLikes, onViewProfile, onLoginRequest, onViewImage, onViewPub, loggedInUserProfile, comments, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment }) => {

    const { user, pub_name, pub_address, image_url, created_at, quality, price, like_count, id, exact_price, pub_id, pub_lat, pub_lng, comment_count, message, pub_country_code, pub_country_name } = rating;
    const [isCommentsVisible, setIsCommentsVisible] = useState(false);

    const isLiked = userLikes && userLikes.has(id);
    const currencyInfo = getCurrencyInfo({ address: pub_address, country_code: pub_country_code, country_name: pub_country_name });
    const rankData = user.level ? getRankData(user.level) : null;

    useEffect(() => {
        if (isCommentsVisible && onFetchComments) {
            // Only fetch if comments aren't already loaded for this rating
            if (!comments) {
                onFetchComments(id);
            }
        }
    }, [isCommentsVisible, id, onFetchComments, comments]);

    const handlePubClick = () => {
        if (!onViewPub) return;
        if (pub_lat && pub_lng) {
            const pubForSelection = {
                id: pub_id,
                name: pub_name,
                address: pub_address,
                location: { lat: pub_lat, lng: pub_lng },
                country_code: pub_country_code,
                country_name: pub_country_name,
            };
            onViewPub(pubForSelection);
        } else {
            console.warn("Cannot view pub on map: missing location data.", rating);
        }
    };

    return (
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md">
            {/* Card Header */}
            <div className="p-3 flex items-center space-x-3">
                <button onClick={() => onViewProfile(user.id, 'community')} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                     <Avatar avatarId={user.avatar_id} className="w-10 h-10" />
                </button>
                <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-1.5">
                        <button onClick={() => onViewProfile(user.id, 'community')} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline truncate">
                            {user.username}
                        </button>
                        {rankData && (
                            <i className={`fas ${rankData.icon} text-sm text-amber-500 dark:text-amber-400`} title={rankData.name}></i>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words" title={pub_name}>
                        rated a pint at{' '}
                        <button
                            onClick={handlePubClick}
                            disabled={!onViewPub || !pub_lat || !pub_lng}
                            className="font-medium hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded disabled:no-underline disabled:cursor-default"
                        >
                            {pub_name}
                        </button>
                    </p>
                </div>
                 <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimeAgo(new Date(created_at).getTime())}</span>
            </div>

            {/* Message */}
            {message && (
                <div className="px-3 pb-2">
                    <p className="text-gray-800 dark:text-gray-200 text-sm italic bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md border-l-4 border-gray-200 dark:border-gray-600">
                        "{message}"
                    </p>
                </div>
            )}

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

             {/* Action Bar */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-around">
                 <button
                    onClick={() => onToggleLike ? onToggleLike(rating) : onLoginRequest()}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center ${
                        isLiked
                        ? 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={isLiked}
                    aria-label={isLiked ? `Unlike rating, currently ${like_count} likes` : `Like rating, currently ${like_count} likes`}
                  >
                      <i className={`${isLiked ? 'fas' : 'far'} fa-heart transition-transform ${isLiked ? 'scale-110' : ''}`}></i>
                      <span>{like_count || 0}</span>
                </button>
                 <button
                    onClick={() => setIsCommentsVisible(prev => !prev)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-expanded={isCommentsVisible}
                >
                    <i className="far fa-comment"></i>
                    <span>{comment_count || 0}</span>
                </button>
            </div>

            {isCommentsVisible && (
                <CommentsSection 
                    ratingId={id}
                    comments={comments}
                    isLoading={isCommentsLoading}
                    currentUserProfile={loggedInUserProfile}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onReportComment={onReportComment}
                    onLoginRequest={onLoginRequest}
                    onViewProfile={onViewProfile}
                />
            )}
        </div>
    );
};

export default RatingCard;
