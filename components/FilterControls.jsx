import React from 'react';
import { FilterType } from '../types.js';

const FilterControls = ({ currentFilter, onFilterChange, onRefresh, isRefreshing }) => {
  const filters = [
    { key: FilterType.Distance, label: 'Nearest', icon: 'fa-map-marker-alt' },
    { key: FilterType.Price, label: 'Best Price', icon: 'fa-tag' },
    { key: FilterType.Quality, label: 'Best Quality', icon: 'fa-beer' },
  ];

  return (
    <div className="p-2 bg-gray-100 dark:bg-gray-900 flex justify-center flex-shrink-0">
      <div className="flex justify-center items-center space-x-2">
        <div className="flex items-center bg-gray-200 dark:bg-gray-700/50 rounded-full p-1 space-x-1">
          {filters.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                currentFilter === key
                  ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
              }`}
            >
              <i className={`fas ${icon} w-4 text-center`}></i>
              <span>{label}</span>
            </button>
          ))}
          <div className="border-l border-gray-300 dark:border-gray-600 mx-1 h-6 self-center"></div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-wait"
            aria-label="Refresh pub list"
            title="Refresh pub list"
          >
            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;