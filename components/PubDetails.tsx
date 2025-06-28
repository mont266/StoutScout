


import React from 'react';
import { Pub, Rating, UserRating } from '../types';
import StarRating from './StarRating';
import RatingForm from './RatingForm';

interface PubDetailsProps {
  pub: Pub;
  onClose: () => void;
  onRate: (pubId: string, pubName: string, pubAddress: string, rating: Rating) => void;
  getAverageRating: (ratings: Rating[], key: keyof Rating) => number;
  existingUserRating?: UserRating;
}

const PubDetails: React.FC<PubDetailsProps> = ({ pub, onClose, onRate, getAverageRating, existingUserRating }) => {
  const avgPrice = getAverageRating(pub.ratings, 'price');
  const avgQuality = getAverageRating(pub.ratings, 'quality');

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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Average Ratings</h3>
          {pub.ratings.length > 0 ? (
            <div className="space-y-3 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Price (Higher is Cheaper):</span>
                <StarRating rating={avgPrice} color="text-green-400" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Quality:</span>
                <StarRating rating={avgQuality} color="text-amber-400" />
              </div>
               <p className="text-right text-xs text-gray-500">Based on {pub.ratings.length} rating(s)</p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic text-center p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">No ratings yet. Be the first!</p>
          )}
        </div>

        <div className="space-y-4">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
             {existingUserRating ? 'Update Your Rating' : 'Rate Your Pint'}
            </h3>
           <RatingForm 
             onSubmit={(rating) => onRate(pub.id, pub.name, pub.address, rating)}
             existingRating={existingUserRating?.rating}
            />
        </div>
      </div>
    </div>
  );
};

export default PubDetails;