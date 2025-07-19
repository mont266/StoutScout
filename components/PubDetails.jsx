import React, { useMemo, useState } from 'react';
import StarRating from './StarRating.jsx';
import RatingForm from './RatingForm.jsx';
import { formatTimeAgo, getCurrencyInfo } from '../utils.js';
import Avatar from './Avatar.jsx';

const StatCard = ({ label, value, icon, color }) => (
    <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-xl flex items-center space-x-3">
        <div className={`text-2xl ${color}`}>
            <i className={`fas ${icon}`}></i>
        </div>
        <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
        </div>
    </div>
);

const TabButton = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-bold transition-all duration-300 border-b-2 ${
            isActive 
                ? 'text-amber-500 dark:text-amber-400 border-amber-500' 
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-amber-500/70 hover:border-amber-500/30'
        }`}
        role="tab"
        aria-selected={isActive}
    >
        {label}
    </button>
);

const PubDetails = ({ pub, onClose, onRate, getAverageRating, existingUserRating, session, onLoginRequest, onViewProfile, showCloseButton = true }) => {
  const [activeTab, setActiveTab] = useState(session && !existingUserRating ? 'your-rating' : 'overview');

  const avgPrice = getAverageRating(pub.ratings, 'price');
  const avgQuality = getAverageRating(pub.ratings, 'quality');
  
  const currencyInfo = getCurrencyInfo(pub.address);
  
  const priceInfo = useMemo(() => {
    const ratingsWithPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
    if (ratingsWithPrice.length === 0) return null;

    const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
    const average = total / ratingsWithPrice.length;

    return { averagePrice: average.toFixed(2) };
  }, [pub.ratings]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Average Ratings</h3>
            {pub.ratings.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex space-x-3">
                        <StatCard label="Price" value={priceInfo ? `${currencyInfo.symbol}${priceInfo.averagePrice}` : `${avgPrice.toFixed(1)} / 5`} icon="fa-tag" color="text-green-500" />
                        <StatCard label="Quality" value={`${avgQuality.toFixed(1)} / 5`} icon="fa-star" color="text-amber-500" />
                    </div>
                    <p className="text-right text-xs text-gray-500 dark:text-gray-400">Based on {pub.ratings.length} total rating(s)</p>
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 italic text-center p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">No Guinness ratings yet. Be the first!</p>
            )}
        </div>
        <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Ratings</h3>
            {pub.ratings.length > 0 ? (
                <ul className="space-y-3">
                    {pub.ratings.slice(0, 5).map((rating, index) => (
                        <li key={index} className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex space-x-3">
                            <button
                                onClick={() => onViewProfile && onViewProfile(rating.user.id, 'pubDetails')}
                                disabled={!onViewProfile}
                                className="rounded-full flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900/50"
                                aria-label={`View profile for ${rating.user.username}`}
                            >
                                <Avatar avatarId={rating.user.avatar_id} className="w-10 h-10" />
                            </button>
                            <div className="flex-grow">
                                <div className="flex justify-between items-center">
                                    <button
                                        onClick={() => onViewProfile && onViewProfile(rating.user.id, 'pubDetails')}
                                        disabled={!onViewProfile}
                                        className="font-semibold text-gray-800 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                                        aria-label={`View profile for ${rating.user.username}`}
                                    >
                                        {rating.user.username}
                                    </button>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(new Date(rating.created_at).getTime())}</span>
                                </div>
                                <div className="flex items-center space-x-4 mt-1">
                                    <div className="flex items-center space-x-1 text-sm">
                                        <i className="fas fa-tag text-green-500/80"></i>
                                        <StarRating rating={rating.price} color="text-green-400" />
                                    </div>
                                     <div className="flex items-center space-x-1 text-sm">
                                        <i className="fas fa-star text-amber-500/80"></i>
                                        <StarRating rating={rating.quality} color="text-amber-400" />
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                 <p className="text-gray-500 dark:text-gray-400 italic text-center p-4">No recent ratings.</p>
            )}
        </div>
    </div>
  );
  
  const renderYourRatingTab = () => (
      <div className="space-y-4">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
             {session && existingUserRating ? 'Update Your Guinness Rating' : 'Rate Your Pint of Guinness'}
            </h3>
            {session ? (
               <RatingForm 
                 onSubmit={(rating) => onRate(pub.id, pub.name, pub.address, rating)}
                 existingRating={existingUserRating?.rating}
                 currencySymbol={currencyInfo.symbol}
                />
            ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg text-center">
                    <p className="text-gray-700 dark:text-gray-300 mb-3">Want to rate this pub?</p>
                    <button
                        onClick={onLoginRequest}
                        className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                        Sign In or Create Account
                    </button>
                </div>
            )}
        </div>
  );


  return (
    <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl p-4 border-t-4 border-amber-400 max-h-[80vh] flex flex-col">
      <header className="flex-shrink-0 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div className="flex-grow pr-4">
              <h2 className="text-2xl font-bold text-amber-500 dark:text-amber-400">{pub.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{pub.address}</p>
            </div>
            {showCloseButton && (
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <i className="fas fa-times fa-2x"></i>
                </button>
            )}
        </div>
      </header>

      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist" aria-label="Pub Details">
        <div className="flex">
            <TabButton label="Overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <TabButton label="Your Rating" isActive={activeTab === 'your-rating'} onClick={() => setActiveTab('your-rating')} />
        </div>
      </div>

      <div className="overflow-y-auto flex-grow">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'your-rating' && renderYourRatingTab()}
      </div>
    </div>
  );
};

export default PubDetails;