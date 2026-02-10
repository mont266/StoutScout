import React, { useState, useEffect, useContext, useRef } from 'react';
import Avatar from './Avatar.jsx';
import StarRating from './StarRating.jsx';
import { getRankData, formatTimeAgo, getCurrencyInfo } from '../utils.js';
import CommentsSection from './CommentsSection.jsx';
import { ExchangeRatesContext } from '../contexts/ExchangeRatesContext.jsx';

const RatingCard = ({ rating, onToggleLike, userLikes, onViewProfile, onLoginRequest, onViewImage, onViewPub, loggedInUserProfile, comments, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onOpenShareRatingModal, fallbackLocationData = null, highlightedCommentId, onReportContent }) => {

    const { user, image_url, created_at, updated_at, quality, price, like_count, id, exact_price, comment_count, message } = rating;
    
    // Create "effective" variables to handle multiple possible data shapes for pub info
    const pubId = rating.pub_id || rating.pub?.id;
    const pubName = rating.pub?.name || rating.pub_name || rating.pubName || fallbackLocationData?.name;
    const pubAddress = rating.pub?.address || rating.pub_address || rating.pubAddress || fallbackLocationData?.address;
    const pubLat = rating.pub?.lat || rating.pub_lat || rating.pubLocation?.lat || fallbackLocationData?.location?.lat;
    const pubLng = rating.pub?.lng || rating.pub_lng || rating.pubLocation?.lng || fallbackLocationData?.location?.lng;
    const pubCountryCode = rating.pub?.country_code || rating.pub_country_code || rating.pubCountryCode || fallbackLocationData?.country_code;
    const pubCountryName = rating.pub?.country_name || rating.pub_country_name || rating.pubCountryName || fallbackLocationData?.country_name;

    const [isCommentsVisible, setIsCommentsVisible] = useState(false);
    const { rates: exchangeRates } = useContext(ExchangeRatesContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const isOwner = loggedInUserProfile?.id === user.id;
    const canReport = loggedInUserProfile && !isOwner;
    const showMenu = isOwner || canReport;

    const isLiked = userLikes && userLikes.has(id);

    const effectiveLocationData = {
        country_code: pubCountryCode,
        country_name: pubCountryName,
        address: pubAddress
    };
    
    const currencyInfo = getCurrencyInfo(effectiveLocationData);
    const rankData = user.level ? getRankData(user.level) : null;
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (highlightedCommentId) {
            setIsCommentsVisible(true);
        }
    }, [highlightedCommentId]);

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
        if (pubLat && pubLng) {
            const pubForSelection = {
                id: pubId,
                name: pubName,
                address: pubAddress,
                location: { lat: pubLat, lng: pubLng },
                country_code: pubCountryCode,
                country_name: pubCountryName,
            };
            onViewPub(pubForSelection, { highlightRatingId: id });
        } else {
            console.warn("Cannot view pub on map: missing location data.", rating);
        }
    };

    const handleShare = () => {
        // Create an enriched rating object right here to guarantee all data is present for the modal.
        const enrichedRating = {
            ...rating,
            pub_country_code: pubCountryCode,
            pub_country_name: pubCountryName,
            pub_name: pubName,
            pub_address: pubAddress,
            pub_lat: pubLat,
            pub_lng: pubLng,
        };
        onOpenShareRatingModal(enrichedRating);
    };

    const handleEdit = () => {
        setIsMenuOpen(false);
        if (!onViewPub) return;
        
        const pubForSelection = {
            id: pubId,
            name: pubName,
            address: pubAddress,
            location: (pubLat && pubLng) ? { lat: pubLat, lng: pubLng } : null,
            country_code: pubCountryCode,
            country_name: pubCountryName,
        };
        onViewPub(pubForSelection, { expandRatingForm: true, highlightRatingId: rating.id });
    };

    const userHomeCurrency = getCurrencyInfo(loggedInUserProfile || { country_code: 'gb' });
    let convertedPriceText = null;
    if (
        exact_price > 0 && 
        exchangeRates &&
        currencyInfo.code !== userHomeCurrency.code &&
        exchangeRates[currencyInfo.code] &&
        exchangeRates[userHomeCurrency.code]
    ) {
        // Convert the pint's price to the base currency (GBP)
        const priceInGbp = exact_price / exchangeRates[currencyInfo.code];
        // Convert from the base currency to the user's home currency
        const convertedPrice = priceInGbp * exchangeRates[userHomeCurrency.code];
        convertedPriceText = `${userHomeCurrency.symbol}${convertedPrice.toFixed(2)}`;
    }

    return (
        <div data-rating-id={id} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md">
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
                    {pubName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-words" title={pubName}>
                            rated a pint at{' '}
                            <button
                                onClick={handlePubClick}
                                disabled={!pubLat || !pubLng}
                                className="font-medium text-amber-600 dark:text-amber-400 hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded disabled:no-underline disabled:cursor-not-allowed"
                            >
                                {pubName}
                            </button>
                        </p>
                    )}
                </div>
                 <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatTimeAgo(new Date(created_at).getTime())}</span>
                    </div>
                    {showMenu && (
                        <div ref={menuRef} className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-haspopup="true"
                                aria-expanded={isMenuOpen}
                                aria-label="Rating options"
                            >
                                <i className="fas fa-ellipsis-h"></i>
                            </button>
                            {isMenuOpen && (
                                <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                                    {isOwner && (
                                        <button 
                                            onClick={handleEdit} 
                                            className={`w-full text-left text-sm px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 ${canReport ? 'rounded-t-md' : 'rounded-md'}`}
                                        >
                                            <i className="fas fa-pencil-alt w-4"></i>
                                            <span>Edit Rating</span>
                                        </button>
                                    )}
                                    {canReport && (
                                        <button
                                            onClick={() => {
                                                onReportContent({
                                                    contentId: rating.id,
                                                    contentType: 'rating',
                                                    contentCreatorUsername: user.username,
                                                });
                                                setIsMenuOpen(false);
                                            }}
                                            className={`w-full text-left text-sm px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 ${isOwner ? 'rounded-b-md' : 'rounded-md'}`}
                                        >
                                            <i className="fas fa-flag w-4"></i>
                                            <span>Report</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className="px-3 pb-2">
                    <p className="text-gray-800 dark:text-gray-200 text-sm italic bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md border-l-4 border-gray-200 dark:border-gray-600 whitespace-pre-wrap">
                        "{message}"
                    </p>
                </div>
            )}

            {image_url && (
                <button onClick={() => onViewImage(rating)} className="w-full aspect-square block bg-gray-100 dark:bg-gray-900">
                    <img src={image_url} alt={`Pint at ${pubName}`} loading="lazy" className="w-full h-full object-cover"/>
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
                        <div className="flex justify-between items-start">
                            <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">Price Paid:</span>
                            <div className="text-right">
                                <span className="font-bold text-lg text-gray-800 dark:text-white bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded" title={currencyInfo.code}>
                                    {currencyInfo.symbol}{exact_price.toFixed(2)}
                                </span>
                                {convertedPriceText && <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1" title={userHomeCurrency.code}>{convertedPriceText}</div>}
                            </div>
                        </div>
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
                      <i className={`${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart transition-transform ${isLiked ? 'scale-110' : ''}`}></i>
                      <span>{like_count || 0}</span>
                </button>
                 <button
                    onClick={() => setIsCommentsVisible(prev => !prev)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-expanded={isCommentsVisible}
                >
                    <i className="fa-regular fa-comment"></i>
                    <span>{comment_count || 0}</span>
                </button>
                <button
                    onClick={handleShare}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Share this rating"
                >
                    <i className="fa-solid fa-share-from-square"></i>
                    <span>Share</span>
                </button>
            </div>

            {isCommentsVisible && (
                <CommentsSection 
                    ratingId={id} // CommentsSection uses `ratingId` prop internally for any entity
                    comments={comments}
                    isLoading={isCommentsLoading}
                    currentUserProfile={loggedInUserProfile}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onReportContent={onReportContent}
                    onLoginRequest={onLoginRequest}
                    onViewProfile={onViewProfile}
                    highlightedCommentId={highlightedCommentId}
                />
            )}
        </div>
    );
};

export default RatingCard;