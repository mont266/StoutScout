import React, { useEffect, useRef, useState } from 'react';
import { FilterType } from '../types.js';
import StarRating from './StarRating.jsx';
import { getCurrencyInfo, getPriceRangeFromStars } from '../utils.js';
import CoachMark from './CoachMark.jsx';

const PubList = ({ pubs, selectedPubId, onSelectPub, filter, getAverageRating, getDistance, distanceUnit, isExpanded, onToggle, resultsAreCapped, searchRadius, isLoading, showToggleHeader = true, onOpenScoreExplanation }) => {
  const selectedItemRef = useRef(null);
  const listRef = useRef(null);
  const [showCoachMark, setShowCoachMark] = useState(false);

  useEffect(() => {
    if (isExpanded && selectedItemRef.current) {
        selectedItemRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }
  }, [selectedPubId, isExpanded]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const hasSeenCoachMark = localStorage.getItem('stoutly-pubscore-coachmark-seen');
    if (isMobile && filter === FilterType.PubScore && !hasSeenCoachMark && pubs.length > 0) {
      setShowCoachMark(true);
    } else {
      setShowCoachMark(false);
    }
  }, [filter, pubs]);

  const handleDismissCoachMark = () => {
    localStorage.setItem('stoutly-pubscore-coachmark-seen', 'true');
    setShowCoachMark(false);
  };

  const handleLearnMore = () => {
    handleDismissCoachMark();
    onOpenScoreExplanation();
  };

  const renderMetric = (pub) => {
    switch(filter) {
        case FilterType.PubScore:
            const score = pub.pub_score;
            if (score === null || score === undefined) {
                return <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>;
            }
            const getScoreColorClasses = (s) => {
                if (s >= 80) return 'bg-yellow-400 text-black';
                if (s >= 65) return 'bg-green-500 text-white';
                if (s >= 45) return 'bg-yellow-500 text-black';
                return 'bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200';
            };
            const colorClasses = getScoreColorClasses(score);
            return (
                <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-md ${colorClasses}`}>
                    <span className="font-bold text-xl leading-none">{score}</span>
                </div>
            );
        case FilterType.Price:
            const ratingsWithPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
            const currencyInfo = getCurrencyInfo(pub);

            if (ratingsWithPrice.length > 0) {
                const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
                const average = total / ratingsWithPrice.length;
                return <span className="text-lg font-semibold text-green-600 dark:text-green-400">{currencyInfo.symbol}{average.toFixed(2)}</span>
            }
            
            const avgPrice = getAverageRating(pub.ratings, 'price');

            if (avgPrice > 0) {
                const priceRange = getPriceRangeFromStars(avgPrice, currencyInfo.symbol);
                return (
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{priceRange}</span>
                        <StarRating rating={avgPrice} color="text-green-400" />
                    </div>
                );
            }
            
            // Fallback for no price rating at all
            return (
                <div className="flex flex-col items-end">
                    <StarRating rating={0} color="text-green-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">No rating</span>
                </div>
            );
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
      {showToggleHeader && (
        <header onClick={onToggle} className="py-3 cursor-pointer flex justify-center items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0" aria-label={isExpanded ? 'Collapse list' : 'Expand list'}>
            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </header>
      )}

      {isExpanded && (
        <div className="overflow-y-auto flex-grow">
           <div className="p-2 text-center text-xs bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-search-location mr-1.5"></i>
              Searching within <strong className="text-gray-800 dark:text-gray-200">{displayRadius} {distanceUnit}</strong>
            </div>
          {resultsAreCapped && (
            <div className="p-2 text-center text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-info-circle mr-1"></i>
              Result list is capped in this dense area. Reduce your search radius in Settings for a more detailed list.
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
              <p className="mt-4">Finding the best pints...</p>
            </div>
          ) : pubs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
                <p>No pubs found in this area. Try dragging the map or expanding the search radius in Settings to find a great pint of Guinness.</p>
            </div>
          ) : (
            <ul ref={listRef} className="divide-y divide-gray-200 dark:divide-gray-700">
              {pubs.map((pub, index) => {
                const isSelected = pub.id === selectedPubId;
                const sellsGuinnessZero = (pub.guinness_zero_confirmations || 0) > (pub.guinness_zero_denials || 0);
                return (
                  <li
                    key={pub.id}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => onSelectPub(pub)}
                    className={`relative p-4 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-amber-500/10 border-amber-500' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                  >
                     <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-4 min-w-0">
                            <span className={`text-lg font-bold w-6 text-center ${index < 3 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {sellsGuinnessZero && <span className="flex-shrink-0 text-xs font-bold bg-black text-white px-1.5 py-0.5 rounded-md border-2 border-amber-400" title="Sells Guinness 0.0">0.0</span>}
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">{pub.name}</p>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{pub.address}</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            {renderMetric(pub)}
                        </div>
                    </div>
                    {index === 0 && showCoachMark && (
                      <CoachMark 
                        text="This is the Pub Score! It helps you find the best overall pubs."
                        onDismiss={handleDismissCoachMark}
                        onLearnMore={handleLearnMore}
                      />
                    )}
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