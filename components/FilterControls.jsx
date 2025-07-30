import React, { useState } from 'react';
import { FilterType } from '../types.js';
import useIsDesktop from '../hooks/useIsDesktop.js';

const filters = [
    { key: FilterType.Distance, label: 'Nearest', icon: 'fa-map-marker-alt' },
    { key: FilterType.PubScore, label: 'Pub Score', icon: 'fa-award' },
    { key: FilterType.Quality, label: 'Best Quality', icon: 'fa-beer' },
    { key: FilterType.Price, label: 'Best Price', icon: 'fa-tag' },
];

// Modal component for mobile filter selection
const FilterModal = ({ isOpen, onClose, onSelectFilter, currentFilter }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-[1200] flex items-end"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Sort Pubs By</h3>
                <ul className="space-y-2">
                    {filters.map(({ key, label, icon }) => (
                        <li key={key}>
                            <button
                                onClick={() => { onSelectFilter(key); onClose(); }}
                                className={`w-full flex items-center space-x-4 p-3 text-left text-lg rounded-lg transition-colors ${currentFilter === key ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <i className={`fas ${icon} w-6 text-center text-gray-500 dark:text-gray-400`}></i>
                                <span>{label}</span>
                                {currentFilter === key && <i className="fas fa-check ml-auto text-amber-600 dark:text-amber-400"></i>}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="pb-safe"></div>
            </div>
        </div>
    );
};

const FilterControls = ({ currentFilter, onFilterChange, onRefresh, isRefreshing }) => {
    const isDesktop = useIsDesktop();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const currentFilterLabel = filters.find(f => f.key === currentFilter)?.label || 'Nearest';

    // Mobile View
    if (!isDesktop) {
        return (
            <>
                <div className="p-2 bg-gray-100 dark:bg-gray-900 flex justify-center flex-shrink-0">
                    <div className="flex justify-between items-center w-full px-2 space-x-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-grow text-left bg-white dark:bg-gray-800 rounded-full py-2 px-4 shadow-sm flex items-center justify-between"
                        >
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
                                <span className="font-bold ml-1 text-gray-800 dark:text-white">{currentFilterLabel}</span>
                            </div>
                            <i className="fas fa-chevron-down text-gray-400 dark:text-gray-500 text-xs"></i>
                        </button>
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="flex-shrink-0 w-11 h-11 text-lg font-semibold rounded-full transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 shadow-sm disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh pub list"
                        >
                            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
                <FilterModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSelectFilter={onFilterChange}
                    currentFilter={currentFilter}
                />
            </>
        );
    }
    
    // Desktop View
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