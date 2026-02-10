

import React, { useState, useRef, useEffect } from 'react';
import { FilterType } from '../types.js';
import useIsDesktop from '../hooks/useIsDesktop.js';

const filters = [
    { key: FilterType.Distance, label: 'Nearest', icon: 'fa-map-marker-alt' },
    { key: FilterType.PubScore, label: 'Pub Score', icon: 'fa-award' },
    { key: FilterType.Quality, label: 'Best Quality', icon: 'fa-beer' },
    { key: FilterType.Price, label: 'Best Price', icon: 'fa-tag' },
];

// Modal component for mobile filter selection
const FilterModal = ({ isOpen, onClose, onSelectFilter, currentFilter, filterGuinnessZero, onFilterGuinnessZeroChange }) => {
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
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                     <label htmlFor="guinness-zero-toggle-mobile" className="flex items-center justify-between cursor-pointer p-2">
                        <span className="flex flex-col">
                            <span className="font-medium text-lg text-gray-700 dark:text-gray-300">Show 0.0 Pubs Only</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Only display pubs that sell Guinness 0.0</span>
                        </span>
                        <div className="relative">
                            <input
                            id="guinness-zero-toggle-mobile"
                            type="checkbox"
                            className="sr-only peer"
                            checked={filterGuinnessZero}
                            onChange={(e) => onFilterGuinnessZeroChange(e.target.checked)}
                            />
                            <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
                        </div>
                    </label>
                </div>
                <div className="pb-safe"></div>
            </div>
        </div>
    );
};

const FilterControls = ({ currentFilter, onFilterChange, onRefresh, isRefreshing, filterGuinnessZero, onFilterGuinnessZeroChange, onSearchClick }) => {
    const isDesktop = useIsDesktop();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const filterMenuRef = useRef(null);

    const currentFilterLabel = filters.find(f => f.key === currentFilter)?.label || 'Nearest';

     useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setIsModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mobile View
    if (!isDesktop) {
        return (
            <>
                <div className="absolute top-0 left-0 right-0 z-10 p-2 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm flex justify-center flex-shrink-0 shadow-md">
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
                            onClick={onSearchClick}
                            className="flex-shrink-0 w-11 h-11 text-lg font-semibold rounded-full transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 shadow-sm"
                            aria-label="Search"
                        >
                            <i className="fas fa-search"></i>
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
                <div ref={filterMenuRef}>
                    <FilterModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSelectFilter={onFilterChange}
                        currentFilter={currentFilter}
                        filterGuinnessZero={filterGuinnessZero}
                        onFilterGuinnessZeroChange={onFilterGuinnessZeroChange}
                    />
                </div>
            </>
        );
    }
    
    // Desktop View
    return (
        <div className="p-2 bg-gray-100 dark:bg-gray-900 flex-shrink-0">
            <div className="flex flex-col gap-2">
                {/* First row: Main sort filters */}
                <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700/50 rounded-full space-x-1">
                    {filters.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            onClick={() => onFilterChange(key)}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 whitespace-nowrap ${
                                currentFilter === key
                                ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            <i className={`fas ${icon} w-4 text-center`}></i>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Second row: Centered Guinness 0.0 filter and right-aligned refresh button */}
                <div className="w-full relative flex justify-center items-center h-10">
                    <button
                        onClick={() => onFilterGuinnessZeroChange(!filterGuinnessZero)}
                        title="Toggle: Show only pubs that sell Guinness 0.0"
                        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-gray-900 ${
                            filterGuinnessZero
                            ? 'bg-blue-500 text-white shadow-sm ring-blue-500' // Active state
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ring-transparent' // Inactive state
                        }`}
                    >
                        <span className="font-bold bg-black text-white px-2 py-0.5 rounded-md text-xs leading-tight">0.0</span>
                        <span>Filter</span>
                    </button>
                    
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait"
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