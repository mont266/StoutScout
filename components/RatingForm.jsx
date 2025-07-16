import React, { useState, useEffect } from 'react';
import StarRating from './StarRating.jsx';

// Labels to guide the user on price rating. Higher stars mean cheaper price.
// The \n character is used to create a two-line label in the StarRating component.
const priceLabels = [
  'Very Expensive\n£7.00+',      // 1 star
  'Expensive\n£6.00 - £6.99',   // 2 stars
  'Average\n£5.50 - £5.99',     // 3 stars
  'Cheap\n£4.50 - £5.49',       // 4 stars
  'Very Cheap\n< £4.50'          // 5 stars
];

const getStarRatingFromPrice = (price) => {
    if (price === '' || isNaN(price)) return 0;
    const numericPrice = parseFloat(price);
    if (numericPrice < 4.50) return 5; // Very Cheap
    if (numericPrice <= 5.49) return 4; // Cheap
    if (numericPrice <= 5.99) return 3; // Average
    if (numericPrice <= 6.99) return 2; // Expensive
    return 1; // Very Expensive
};

const RatingForm = ({ onSubmit, existingRating }) => {
  const [price, setPrice] = useState(0);
  const [quality, setQuality] = useState(0);
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    // Pre-fill the form if an existing rating is provided
    setPrice(existingRating?.price || 0);
    setQuality(existingRating?.quality || 0);
    setPriceInput(existingRating?.exact_price?.toString() || '');
  }, [existingRating]);

  const handlePriceInputChange = (e) => {
    const newPrice = e.target.value;
    setPriceInput(newPrice);
    setPrice(getStarRatingFromPrice(newPrice));
  };
  
  const handlePriceStarChange = (newStarRating) => {
    setPrice(newStarRating);
    setPriceInput(''); // Clear text input when stars are manually set
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (price > 0 && quality > 0) {
      onSubmit({ price, quality, exact_price: parseFloat(priceInput) || null });
      // Don't reset form on update, but do on initial submit
      if (!existingRating) {
        setPrice(0);
        setQuality(0);
        setPriceInput('');
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
          onRatingChange={handlePriceStarChange}
          interactive
          color="text-green-400"
          labels={priceLabels}
        />
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">OR</div>

      <div>
        <label htmlFor="price-input" className="block text-gray-700 dark:text-gray-300 mb-2">Enter Exact Pint Price (Optional)</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">£</span>
          <input
            id="price-input"
            type="number"
            step="0.01"
            min="0"
            value={priceInput}
            onChange={handlePriceInputChange}
            placeholder="e.g., 5.70"
            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Quality Rating:</label>
        <StarRating rating={quality} onRatingChange={setQuality} interactive color="text-amber-400" />
      </div>

      <div>
        <p className="text-xs text-center text-gray-700 dark:text-yellow-200 italic mb-3 p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800/60">
          Please provide honest ratings to help keep Stoutly accurate for everyone.
        </p>
        <button
          type="submit"
          disabled={price === 0 || quality === 0}
          className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
};

export default RatingForm;
