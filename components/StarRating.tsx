
import React from 'react';

interface StarRatingProps {
  rating: number;
  count?: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  color?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count = 5,
  onRatingChange,
  interactive = false,
  color = 'text-yellow-400'
}) => {
  return (
    <div className="flex items-center space-x-1">
      {[...Array(count)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <label key={i}>
            {interactive && <input type="radio" name="rating" value={ratingValue} onClick={() => onRatingChange?.(ratingValue)} className="hidden" />}
            <i
              className={`fas fa-star ${ratingValue <= rating ? color : 'text-gray-500'} ${interactive ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
            ></i>
          </label>
        );
      })}
    </div>
  );
};

export default StarRating;
