import React, { useState, useRef, useEffect } from 'react';
import { trackEvent } from '../analytics.js';

const MapSearchBar = ({ onPlaceSelected, onClose, isExpanded }) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        // Auto-focus the input when the search bar expands for better UX
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setIsLoading(true);
        setError(null);
        trackEvent('search', { search_term: inputValue });

        const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
        // Search for a general place, not specifically a pub. Limit to 1 for simplicity.
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputValue)}&format=jsonv2&limit=1`;
        
        try {
            const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
            if (!response.ok) {
                 throw new Error(`Search failed. Please try again.`);
            }
            const data = await response.json();
            if (data && data.length > 0) {
                const place = data[0]; // Take the top result
                onPlaceSelected({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
                setInputValue(''); // Clear input on successful search
            } else {
                setError('No results found for that location.');
                trackEvent('search_failed', { reason: 'no_results', search_term: inputValue });
            }
        } catch (err) {
            setError(err.message);
            trackEvent('search_failed', { reason: 'api_error', search_term: inputValue, error_message: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full">
            <form onSubmit={handleSearch} className="relative">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10"></i>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for a city or area..."
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); if (error) setError(null); }}
                    className={`w-full pl-10 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg shadow-md transition-shadow focus:shadow-xl disabled:opacity-70 ${onClose ? 'pr-12' : 'pr-4'}`}
                    aria-label="Search for a location"
                    disabled={isLoading}
                />
                {isLoading && (
                     <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                )}
                {onClose && !isLoading && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        aria-label="Close search"
                    >
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                )}
            </form>
            {error && <p className="text-red-500 text-xs absolute mt-1 left-2">{error}</p>}
        </div>
    );
};

export default MapSearchBar;
