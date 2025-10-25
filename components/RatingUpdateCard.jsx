import React from 'react';
import Avatar from './Avatar.jsx';
import StarRating from './StarRating.jsx';
import { getRankData, formatTimeAgo, getCurrencyInfo } from '../utils.js';
import CommentsSection from './CommentsSection.jsx';

const DiffRow = ({ label, before, after }) => (
    <div className="grid grid-cols-3 items-center gap-2 text-sm py-2 border-b border-gray-200 dark:border-gray-700/50 last:border-b-0">
        <span className="font-semibold text-gray-600 dark:text-gray-400 col-span-1">{label}</span>
        <div className="col-span-2 flex items-center justify-end gap-2 text-right">
            <span className="text-gray-500 dark:text-gray-500 line-through">{before}</span>
            <i className="fas fa-arrow-right text-amber-500 text-xs"></i>
            <span className="font-bold text-gray-800 dark:text-white">{after}</span>
        </div>
    </div>
);

const ImageDiff = ({ before, after }) => {
    let beforeContent = <span className="text-gray-500">None</span>;
    if (before) {
        beforeContent = <img src={before} alt="Previous pint" className="w-10 h-10 object-cover rounded-md" />;
    }

    let afterContent = <span className="text-gray-500">None</span>;
    if (after) {
        afterContent = <img src={after} alt="New pint" className="w-10 h-10 object-cover rounded-md" />;
    }

    return <DiffRow label="Image" before={beforeContent} after={afterContent} />;
};


const RatingUpdateCard = ({ update, onToggleLike, userLikes, onViewProfile, onLoginRequest, onViewImage, onViewPub, loggedInUserProfile, comments, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment, onOpenShareRatingModal }) => {
    const { user, rating, created_at, previous_data, new_data } = update;

    const isLiked = userLikes && userLikes.has(rating.id);
    const currencyInfo = getCurrencyInfo(rating.pub);
    const rankData = user.level ? getRankData(user.level) : null;
    
    const changes = [];

    if (previous_data.quality !== new_data.quality) {
        changes.push(<DiffRow key="quality" label="Quality" before={<StarRating rating={previous_data.quality} />} after={<StarRating rating={new_data.quality} />} />);
    }
    if (previous_data.price !== new_data.price) {
        changes.push(<DiffRow key="price" label="Price" before={<StarRating rating={previous_data.price} color="text-green-400" />} after={<StarRating rating={new_data.price} color="text-green-400" />} />);
    }
    if (previous_data.exact_price !== new_data.exact_price) {
        changes.push(<DiffRow key="exact_price" label="Exact Price" before={previous_data.exact_price ? currencyInfo.symbol + previous_data.exact_price.toFixed(2) : 'N/A'} after={new_data.exact_price ? currencyInfo.symbol + new_data.exact_price.toFixed(2) : 'N/A'} />);
    }
    if (previous_data.message?.trim() !== new_data.message?.trim()) {
        const oldMsg = previous_data.message?.trim() || 'No message';
        const newMsg = new_data.message?.trim() || 'No message';
        changes.push(<DiffRow key="message" label="Message" before={<span className="italic">"{oldMsg}"</span>} after={<span className="italic">"{newMsg}"</span>} />);
    }
    if (previous_data.image_url !== new_data.image_url) {
        changes.push(<ImageDiff key="image" before={previous_data.image_url} after={new_data.image_url} />);
    }
    if (previous_data.is_private !== new_data.is_private) {
        changes.push(<DiffRow key="privacy" label="Privacy" before={previous_data.is_private ? 'Private' : 'Public'} after={new_data.is_private ? 'Private' : 'Public'} />);
    }
    
    // Fallback in case there's an update event with no discernible change
    if (changes.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            {/* Card Header */}
            <div className="p-3 flex items-center space-x-3">
                <button onClick={() => onViewProfile(user.id, 'community_update')} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                    <Avatar avatarId={user.avatar_id} className="w-10 h-10" />
                </button>
                <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-1.5">
                        <button onClick={() => onViewProfile(user.id, 'community_update')} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline truncate">
                            {user.username}
                        </button>
                        {rankData && (
                            <i className={`fas ${rankData.icon} text-sm text-amber-500 dark:text-amber-400`} title={rankData.name}></i>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words" title={rating.pub.name}>
                        updated their rating at{' '}
                        <button
                            onClick={() => onViewPub(rating.pub, { highlightRatingId: rating.id })}
                            disabled={!onViewPub}
                            className="font-medium hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded disabled:no-underline disabled:cursor-default"
                        >
                            {rating.pub.name}
                        </button>
                    </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimeAgo(new Date(created_at).getTime())}</span>
            </div>

            {/* Changes Body */}
            <div className="px-3 pb-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2">Changes:</h4>
                    {changes}
                </div>
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
                  >
                      <i className={`${isLiked ? 'fas' : 'far'} fa-heart transition-transform ${isLiked ? 'scale-110' : ''}`}></i>
                      <span>{rating.like_count || 0}</span>
                </button>
                 <button
                    disabled
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-semibold w-full justify-center text-gray-400 dark:text-gray-500 cursor-not-allowed"
                >
                    <i className="far fa-comment"></i>
                    <span>{rating.comment_count || 0}</span>
                </button>
                <button
                    onClick={() => onOpenShareRatingModal(rating)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <i className="far fa-share-square"></i>
                    <span>Share</span>
                </button>
            </div>
        </div>
    );
};

export default RatingUpdateCard;