import React, { useState, useRef, useEffect } from 'react';
import { trackEvent } from '../analytics.js';
import { supabase } from '../supabase.js';

const MapSearchBar = ({ onPlaceSelected, onClose, isExpanded, userProfile, onPubSelected }) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const debounceTimeout = useRef(null);
    const searchContainerRef = useRef(null);
    const resultsListRef = useRef(null);


    useEffect(() => {
        // Auto-focus the input when the search bar expands for better UX
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Debounced search effect
    useEffect(() => {
        setHighlightedIndex(-1); // Reset highlight on new search

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        const trimmedSearch = inputValue.trim();

        // Developer feature check
        const isDeveloper = userProfile?.is_developer;
        const isPubIdSearch = /^(osm-|stoutly-|mapbox-)/i.test(trimmedSearch);
        if (isDeveloper && isPubIdSearch) {
            setResults([]); // Don't show dropdown for ID search
            return;
        }

        if (trimmedSearch.length < 3) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        debounceTimeout.current = setTimeout(async () => {
            trackEvent('search_live', { search_term: trimmedSearch });
            const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            
            try {
                const placePromise = fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedSearch)}.json?access_token=${accessToken}&limit=3&types=place,locality,postcode,neighborhood,address,poi`);
                const pubPromise = supabase
                    .from('pubs')
                    .select('id, name, address, lat, lng, country_code, country_name')
                    .ilike('name', `%${trimmedSearch}%`)
                    .limit(5);
                
                const [placeRes, pubRes] = await Promise.all([placePromise, pubPromise]);

                let combinedResults = [];

                if (placeRes.ok) {
                    const placeData = await placeRes.json();
                    const placeResults = (placeData.features || []).map(p => ({
                        id: `place-${p.id}`,
                        type: 'place',
                        name: p.text,
                        description: p.place_name.replace(`${p.text}, `, ''),
                        data: {
                            lat: p.center[1],
                            lng: p.center[0]
                        }
                    }));
                    combinedResults.push(...placeResults);
                }

                if (!pubRes.error) {
                    const pubResults = (pubRes.data || []).map(p => ({
                        id: p.id,
                        type: 'pub',
                        name: p.name,
                        description: p.address,
                        data: p
                    }));
                    combinedResults.push(...pubResults);
                }
                
                // Prioritize pubs if the search term matches a pub name more directly
                combinedResults.sort((a, b) => {
                    if (a.type === 'pub' && b.type !== 'pub') return -1;
                    if (a.type !== 'pub' && b.type === 'pub') return 1;
                    return 0;
                });

                setResults(combinedResults);

            } catch (err) {
                console.error("Live search failed:", err);
                setError('Search failed to load results.');
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimeout.current);
    }, [inputValue, userProfile]);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setResults([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex < 0 || !resultsListRef.current) return;

        const highlightedElement = resultsListRef.current.querySelector(`#search-result-${highlightedIndex}`);
        if (highlightedElement) {
            highlightedElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [highlightedIndex]);


    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setIsSubmitting(true);
        setIsLoading(true);
        setError(null);

        // Developer feature: Search by Pub ID
        const isDeveloper = userProfile?.is_developer;
        const pubIdSearchTerm = inputValue.trim();
        const isPubIdSearch = /^(osm-|stoutly-|mapbox-)/i.test(pubIdSearchTerm);

        if (isDeveloper && isPubIdSearch) {
            trackEvent('search', { search_term: pubIdSearchTerm, search_type: 'pub_id' });
            try {
                const { data: pub, error: dbError } = await supabase
                    .from('pubs')
                    .select('*')
                    .eq('id', pubIdSearchTerm)
                    .single();
                
                if (dbError || !pub) {
                    throw new Error('Pub ID not found in database.');
                }

                const pubForSelection = { ...pub, location: { lat: pub.lat, lng: pub.lng } };
                onPubSelected(pubForSelection);
                setInputValue('');
                setResults([]);
                setHighlightedIndex(-1);
            } catch (err) {
                setError(err.message);
                trackEvent('search_failed', { reason: 'pub_id_not_found', search_term: pubIdSearchTerm });
            } finally {
                setIsLoading(false);
                setIsSubmitting(false);
            }
            return;
        }


        // Default Mapbox search for places on form submit
        trackEvent('search', { search_term: inputValue });
        
        const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(inputValue)}.json?access_token=${accessToken}&limit=1`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                 throw new Error(`Search failed. Please try again.`);
            }
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const place = data.features[0];
                const [lng, lat] = place.center;
                onPlaceSelected({ lat, lng });
                setInputValue('');
                setResults([]);
                setHighlightedIndex(-1);
            } else {
                setError('No results found for that location.');
                trackEvent('search_failed', { reason: 'no_results', search_term: inputValue });
            }
        } catch (err) {
            setError(err.message);
            trackEvent('search_failed', { reason: 'api_error', search_term: inputValue, error_message: err.message });
        } finally {
            setIsLoading(false);
            setIsSubmitting(false);
        }
    };

    const handleResultClick = (result) => {
        if (result.type === 'place') {
            onPlaceSelected(result.data);
        } else {
            const pubForSelection = {
                ...result.data,
                location: { lat: result.data.lat, lng: result.data.lng },
            };
            onPubSelected(pubForSelection);
        }
        setInputValue('');
        setResults([]);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault(); // Prevent cursor from moving in the input
            setHighlightedIndex(prevIndex => (prevIndex + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault(); // Prevent cursor from moving
            setHighlightedIndex(prevIndex => (prevIndex - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            if (highlightedIndex >= 0 && results[highlightedIndex]) {
                e.preventDefault(); // Prevent form submission if an item is selected
                handleResultClick(results[highlightedIndex]);
            }
            // If highlightedIndex is -1, the default form onSubmit will trigger
        }
    };

    return (
        <div ref={searchContainerRef} className="relative w-full">
            <form onSubmit={handleFormSubmit} className="relative">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10"></i>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for pubs, cities, or areas..."
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); if (error) setError(null); }}
                    onKeyDown={handleKeyDown}
                    className={`w-full pl-10 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-md transition-shadow focus:shadow-xl disabled:opacity-70 ${results.length > 0 ? 'rounded-t-lg' : 'rounded-lg'} ${onClose ? 'pr-12' : 'pr-4'}`}
                    aria-label="Search for a location"
                    disabled={isSubmitting}
                    autoComplete="off"
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
            
            {results.length > 0 && (
                <ul ref={resultsListRef} className="absolute top-full w-full bg-white dark:bg-gray-800 rounded-b-lg shadow-md overflow-hidden z-20 max-h-64 overflow-y-auto">
                    {results.map((result, index) => (
                        <li key={result.id} id={`search-result-${index}`}>
                            <button
                                onClick={() => handleResultClick(result)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`w-full text-left p-3 flex items-center space-x-3 transition-colors ${index === highlightedIndex ? 'bg-amber-100 dark:bg-amber-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <i className={`fas ${result.type === 'pub' ? 'fa-beer' : 'fa-map-marker-alt'} text-gray-400 w-5 text-center`}></i>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{result.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.description}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MapSearchBar;
