import React, { useEffect, useRef } from 'react';
import { FilterType } from '../types.js';
import StarRating from './StarRating.jsx';

const PubList = ({ pubs, selectedPubId, onSelectPub, filter, getAverageRating, getDistance, distanceUnit, isExpanded, onToggle, resultsAreCapped, searchRadius, isLoading }) => {
  const selectedItemRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isExpanded && selectedItemRef.current) {
        selectedItemRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }
  }, [selectedPubId, isExpanded]);

  const renderMetric = (pub) => {
    switch(filter) {
        case FilterType.Price:
            const ratingsWithPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
            if (ratingsWithPrice.length > 0) {
                const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
                const average = total / ratingsWithPrice.length;
                return <span className="text-lg font-semibold text-green-600 dark:text-green-400">£{average.toFixed(2)}</span>
            }
            
            const avgPrice = getAverageRating(pub.ratings, 'price');
            return <div className="flex flex-col items-end">
                <StarRating rating={avgPrice} color="text-green-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{avgPrice > 0 ? `${avgPrice.toFixed(1)} stars` : 'No rating'}</span>
            </div>;
        case FilterType.Quality:
            const avgQuality = getAverageRating(pub.ratings, 'quality');
            return <div className="flex flex-col items-end">
                <StarRating rating={avgQuality} color="text-amber-400" />
                 <span className="text-xs text-gray-500 dark:text-gray-400">{avgQuality > 0 ? `${avgQuality.toFixed(1)} stars` : 'No rating'}</span>
            </div>;
        case FilterType.Distance:
        default:
            const distanceInMeters = getDistance(pub.location);
            if (distanceUnit === 'mi') {
                const distanceInMi = distanceInMeters * 0.000621371;
                return <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{distanceInMi.toFixed(1)} mi</span>
            }
            const distanceInKm = distanceInMeters / 1000;
            return <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{distanceInKm.toFixed(1)} km</span>;
    }
  }

  const displayRadius = distanceUnit === 'mi'
    ? (searchRadius / 1609.34).toFixed(1)
    : (searchRadius / 1000).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 h-full flex flex-col shadow-lg rounded-t-2xl">
      <header onClick={onToggle} className="py-3 cursor-pointer flex justify-center items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0" aria-label={isExpanded ? 'Collapse list' : 'Expand list'}>
          <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      </header>

      {isExpanded && (
        <div className="overflow-y-auto">
           <div className="p-2 text-center text-xs bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-search-location mr-1.5"></i>
              Searching within <strong className="text-gray-800 dark:text-gray-200">{displayRadius} {distanceUnit}</strong>
            </div>
          {resultsAreCapped && (
            <div className="p-2 text-center text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-info-circle mr-1"></i>
              Showing top 20 results. Reduce search radius in Settings to find more.
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
              <p className="mt-4">Merging local ratings with live map data...</p>
            </div>
          ) : pubs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
                <p>No pubs found in this area. Try expanding the search radius in Settings.</p>
            </div>
          ) : (
            <ul ref={listRef} className="divide-y divide-gray-200 dark:divide-gray-700">
              {pubs.map((pub, index) => {
                const isSelected = pub.id === selectedPubId;
                return (
                  <li
                    key={pub.id}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => onSelectPub(pub.id)}
                    className={`p-4 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-amber-500/10 border-amber-500' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                  >
                     <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-4 min-w-0">
                            <span className={`text-lg font-bold w-6 text-center ${index < 3 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{pub.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{pub.address}</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            {renderMetric(pub)}
                        </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PubList;