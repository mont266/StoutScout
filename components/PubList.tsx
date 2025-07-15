
import React, { useEffect, useRef } from 'react';
import { Pub, FilterType, Rating, Coordinates, DistanceUnit } from '../types';
import StarRating from './StarRating';

interface PubListProps {
  pubs: Pub[];
  selectedPubId: string | null;
  onSelectPub: (pubId: string | null) => void;
  filter: FilterType;
  getAverageRating: (ratings: Rating[], key: keyof Rating) => number;
  getDistance: (pubLocation: Coordinates) => number;
  distanceUnit: DistanceUnit;
  isExpanded: boolean;
  onToggle: () => void;
  resultsAreCapped: boolean;
}

const PubList: React.FC<PubListProps> = ({ pubs, selectedPubId, onSelectPub, filter, getAverageRating, getDistance, distanceUnit, isExpanded, onToggle, resultsAreCapped }) => {
  const selectedItemRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Scroll to selected item only if the list is expanded
    if (isExpanded && selectedItemRef.current) {
        selectedItemRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }
  }, [selectedPubId, isExpanded]);

  const renderMetric = (pub: Pub) => {
    switch(filter) {
        case FilterType.Price:
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

  return (
    <div className="bg-white dark:bg-gray-800 h-full flex flex-col">
      <header onClick={onToggle} className="p-3 cursor-pointer flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nearby Pubs ({pubs.length})</h3>
          <button aria-label={isExpanded ? 'Collapse list' : 'Expand list'}>
              <i className={`fas fa-chevron-down text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
          </button>
      </header>

      {isExpanded && (
        <div className="overflow-y-auto">
          {resultsAreCapped && (
            <div className="p-2 text-center text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-b border-gray-200 dark:border-gray-700">
              <i className="fas fa-info-circle mr-1"></i>
              Showing top 20 results. Reduce search radius in Settings to find more.
            </div>
          )}
          {pubs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
                <p>Searching for nearby pubs...</p>
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
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between space-x-4 ${isSelected ? 'bg-amber-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                        <span className={`text-lg font-bold w-6 text-center ${index < 3 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{pub.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{pub.address}</p>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {renderMetric(pub)}
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
