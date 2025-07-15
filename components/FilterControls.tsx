

import React from 'react';
import { FilterType } from '../types.ts';

interface FilterControlsProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ currentFilter, onFilterChange }) => {
  const filters = [
    { key: FilterType.Distance, label: 'Nearest', icon: 'fa-map-marker-alt' },
    { key: FilterType.Price, label: 'Best Price', icon: 'fa-tag' },
    { key: FilterType.Quality, label: 'Best Quality', icon: 'fa-star' },
  ];

  return (
    <div className="p-2 bg-gray-100 dark:bg-gray-800 flex justify-around">
      {filters.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2 ${
            currentFilter === key
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <i className={`fas ${icon}`}></i>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default FilterControls;