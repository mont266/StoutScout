
import React, { useState } from 'react';
import { trackEvent } from '../analytics.js';
import { normalizeNominatimResult } from '../utils.js';

const MapSearchBar = ({ onPlaceSelected }) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setIsLoading(true);
        setError(null);
        trackEvent('search', { search_term: inputValue });

        const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputValue)}&format=jsonv2&limit=1`;
        
        try {
            const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
            if (!response.ok) {
                 throw new Error(`Search failed. Please try again.`);
            }
            const data = await response.json();
            if (data && data.length > 0) {
                // We're searching for a general location, so we just pan there
                // But we can also handle if it's a specific pub
                const place = data[0];
                onPlaceSelected(place);
                // Set input to the canonical name returned by the API
                setInputValue(place.display_name.split(',')[0]); 
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
        <form onSubmit={handleSearch} className="relative">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10"></i>
            <input
                type="text"
                placeholder="Search for a city or pub..."
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg shadow-md transition-shadow focus:shadow-xl"
                aria-label="Search for a location"
                disabled={isLoading}
            />
            {isLoading && (
                 <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-amber-500"></div>
                </div>
            )}
            {error && <p className="text-red-500 text-xs absolute -bottom-5 left-2">{error}</p>}
        </form>
    );
};

export default MapSearchBar;
