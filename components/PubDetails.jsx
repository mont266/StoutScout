import React, { useMemo } from 'react';
import StarRating from './StarRating.jsx';
import RatingForm from './RatingForm.jsx';
import { formatTimeAgo } from '../utils.js';

const PubDetails = ({ pub, onClose, onRate, getAverageRating, existingUserRating, session, onLoginRequest }) => {
  const avgPrice = getAverageRating(pub.ratings, 'price');
  const avgQuality = getAverageRating(pub.ratings, 'quality');

  const priceInfo = useMemo(() => {
    const ratingsWithPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
    if (ratingsWithPrice.length === 0) return null;

    const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
    const average = total / ratingsWithPrice.length;

    const lastUpdatedAt = ratingsWithPrice.reduce((latest, r) => {
        const rDate = new Date(r.created_at).getTime();
        return rDate > latest ? rDate : latest;
    }, 0);

    return {
        averagePrice: average.toFixed(2),
        lastUpdated: new Date(lastUpdatedAt),
        count: ratingsWithPrice.length,
    };
  }, [pub.ratings]);


  return (
    <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl p-4 border-t-4 border-amber-400 max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-amber-500 dark:text-amber-400">{pub.name}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{pub.address}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
          <i className="fas fa-times fa-2x"></i>
        </button>
      </div>

      <div className="overflow-y-auto flex-grow">
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Average Guinness Ratings</h3>
          {pub.ratings.length > 0 ? (
            <div className="space-y-3 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
              {priceInfo && (
                <div className="pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">Avg. Pint Price:</span>
                        <span className="font-bold text-lg text-gray-900 dark:text-white">£{priceInfo.averagePrice}</span>
                    </div>
                    <p className="text-right text-xs text-gray-500">Based on {priceInfo.count} submission(s). Last updated {formatTimeAgo(priceInfo.lastUpdated)}</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Price (Higher is Cheaper):</span>
                <StarRating rating={avgPrice} color="text-green-400" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Quality:</span>
                <StarRating rating={avgQuality} color="text-amber-400" />
              </div>
               <p className="text-right text-xs text-gray-500">Based on {pub.ratings.length} total rating(s)</p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic text-center p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">No Guinness ratings yet. Be the first!</p>
          )}
        </div>

        <div className="space-y-4">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
             {session && existingUserRating ? 'Update Your Guinness Rating' : 'Rate Your Pint of Guinness'}
            </h3>
            {session ? (
               <RatingForm 
                 onSubmit={(rating) => onRate(pub.id, pub.name, pub.address, rating)}
                 existingRating={existingUserRating?.rating}
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
      </div>
    </div>
  );
};

export default PubDetails;