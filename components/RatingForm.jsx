import React, { useState, useEffect } from 'react';
import StarRating from './StarRating.jsx';

// Labels to guide the user on price rating. Higher stars mean cheaper price.
// The \n character is used to create a two-line label in the StarRating component.
const priceLabels = [
  'Very Expensive\n£8.50+',      // 1 star
  'Expensive\n£7.50 - £8.49',   // 2 stars
  'Average\n£6.50 - £7.49',     // 3 stars
  'Cheap\n£5.50 - £6.49',       // 4 stars
  'Very Cheap\n< £5.50'          // 5 stars
];


const RatingForm = ({ onSubmit, existingRating }) => {
  const [price, setPrice] = useState(0);
  const [quality, setQuality] = useState(0);

  useEffect(() => {
    // Pre-fill the form if an existing rating is provided
    setPrice(existingRating?.price || 0);
    setQuality(existingRating?.quality || 0);
  }, [existingRating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (price > 0 && quality > 0) {
      onSubmit({ price, quality });
      // Don't reset form on update, but do on initial submit
      if (!existingRating) {
        setPrice(0);
        setQuality(0);
      }
    } else {
        alert("Please select a rating for both price and quality.");
    }
  };

  const buttonText = existingRating ? 'Update Rating' : 'Submit Rating';

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-4">
      <div>
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Price Rating: (Higher is cheaper)</label>
        <StarRating
          rating={price}
          onRatingChange={setPrice}
          interactive
          color="text-green-400"
          labels={priceLabels}
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Quality Rating:</label>
        <StarRating rating={quality} onRatingChange={setQuality} interactive color="text-amber-400" />
      </div>
      <button
        type="submit"
        disabled={price === 0 || quality === 0}
        className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {buttonText}
      </button>
    </form>
  );
};

export default RatingForm;