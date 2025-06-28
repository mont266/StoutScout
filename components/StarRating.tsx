
import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  count?: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  color?: string;
  labels?: string[];
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count = 5,
  onRatingChange,
  interactive = false,
  color = 'text-yellow-400',
  labels,
}) => {
  const [hover, setHover] = useState(0);

  // Use the hovered value for display if interactive, otherwise the passed rating.
  const displayRating = interactive ? hover || rating : rating;
  // Get the corresponding label for the displayed rating.
  const displayLabel = labels && displayRating > 0 ? labels[displayRating - 1] : '';

  return (
    // The onMouseLeave handler resets the hover state when the mouse moves away.
    <div onMouseLeave={interactive ? () => setHover(0) : undefined}>
      <div className="flex items-center space-x-1">
        {[...Array(count)].map((_, i) => {
          const ratingValue = i + 1;
          return (
            <label key={i}>
              <input
                type="radio"
                name="rating"
                value={ratingValue}
                onClick={() => onRatingChange?.(ratingValue)}
                className="hidden"
              />
              <i
                className={`fas fa-star ${ratingValue <= displayRating ? color : 'text-gray-300 dark:text-gray-500'} ${interactive ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
                // onMouseEnter updates the hover state to show live feedback.
                onMouseEnter={interactive ? () => setHover(ratingValue) : undefined}
              ></i>
            </label>
          );
        })}
      </div>
      {/* Display the text label below the stars for interactive ratings */}
      {interactive && labels && (
        <div className="mt-1 h-10"> {/* Fixed height to prevent layout shift */}
          {displayLabel && (
            <div className="text-sm">
              <span className="font-semibold block leading-tight text-gray-700 dark:text-gray-300">
                {displayLabel.split('\n')[0]}
              </span>
              <span className="text-xs block leading-tight text-gray-600 dark:text-gray-400">
                {displayLabel.split('\n')[1]}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StarRating;
