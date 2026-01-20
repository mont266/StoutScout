import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { normalizeReverseGeocodeResult } from '../utils.js';

const COOLDOWN_MINUTES = 15;

const PubCrawlSetupModal = ({ onClose, onSubmit, userLocation, locationPermissionStatus, onRequestPermission }) => {
    const [startLocationText, setStartLocationText] = useState('');
    const [crawlName, setCrawlName] = useState('');
    const [numPubs, setNumPubs] = useState(5);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [priority, setPriority] = useState('score'); // 'score' or 'route'
    const [cooldownTime, setCooldownTime] = useState(0);
    
    // New state for autocomplete
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeout = useRef(null);
    const suggestionsContainerRef = useRef(null);

    useEffect(() => {
        const lastGenTimestamp = localStorage.getItem('stoutly-crawl-generation-timestamp');
        if (lastGenTimestamp) {
            const cooldownEndTime = parseInt(lastGenTimestamp, 10) + COOLDOWN_MINUTES * 60 * 1000;
            const remainingTime = Math.max(0, cooldownEndTime - Date.now());

            if (remainingTime > 0) {
                setCooldownTime(Math.ceil(remainingTime / 1000));
            }
        }

        const interval = setInterval(() => {
            setCooldownTime(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        if (startLocationText.trim().length < 3) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        debounceTimeout.current = setTimeout(async () => {
            const userAgent = 'Stoutly/1.0 (https://stoutly.co.uk)';
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(startLocationText)}&format=jsonv2&limit=5&addressdetails=1`;
            
            try {
                const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
                const data = await response.json();
                if (data && data.length > 0) {
                    setSuggestions(data);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error('Autocomplete search error:', error);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [startLocationText]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [suggestionsContainerRef]);

    const handleSuggestionClick = (suggestion) => {
        setStartLocationText(suggestion.display_name);
        setSuggestions([]); // Hide suggestions
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!startLocationText.trim()) {
            alert('Please enter a starting location.');
            return;
        }
        onSubmit({ startLocationText, numPubs, crawlName: crawlName.trim(), priority });
    };

    const handleUseMyLocation = async () => {
        if (locationPermissionStatus !== 'granted') {
            if (onRequestPermission) {
                onRequestPermission();
            }
            return;
        }

        if (!userLocation) {
            alert("Still trying to find your location. Please wait a moment.");
            return;
        }

        setIsGeocoding(true);
        setSuggestions([]); // Hide suggestions when using current location
        let locationSet = false;

        try {
            const userAgent = 'Stoutly/1.0 (https://stoutly.co.uk)';
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.lat}&lon=${userLocation.lng}&addressdetails=1`;
            const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.address) {
                    const newAddress = normalizeReverseGeocodeResult(data);
                    if (newAddress && newAddress !== 'Address unknown') {
                        // Try to construct a meaningful but not overly long address
                        const { road, suburb, city, town, village, county } = data.address;
                        const mainPart = road || '';
                        const locality = city || town || suburb || village || county || '';
                        const displayAddress = [mainPart, locality].filter(Boolean).join(', ');

                        setStartLocationText(displayAddress || newAddress.split(',').slice(0, 2).join(', '));
                        locationSet = true;
                    }
                }
            }
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            // Fail silently and fall back to coordinates
        } finally {
            if (!locationSet) {
                setStartLocationText(`${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`);
            }
            setIsGeocoding(false);
        }
    };

    const minutes = Math.floor(cooldownTime / 60);
    const seconds = (cooldownTime % 60).toString().padStart(2, '0');

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-crawl-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="plan-crawl-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Plan Your Pub Crawl
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="crawl-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Crawl Name (Optional)
                        </label>
                        <input
                            id="crawl-name"
                            type="text"
                            value={crawlName}
                            onChange={(e) => setCrawlName(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="e.g., Birthday Bash"
                        />
                    </div>

                    <div ref={suggestionsContainerRef} className="relative">
                        <label htmlFor="start-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Starting Location
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                {isSearching ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500"></div>
                                ) : (
                                    <i className="fas fa-search text-gray-400"></i>
                                )}
                            </div>
                            <input
                                id="start-location"
                                type="text"
                                value={startLocationText}
                                onChange={(e) => setStartLocationText(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                                placeholder="e.g., Temple Bar, Dublin"
                                autoComplete="off"
                            />
                             <button
                                type="button"
                                onClick={handleUseMyLocation}
                                disabled={isGeocoding}
                                className="absolute top-1/2 right-0 -translate-y-1/2 h-full w-10 flex items-center justify-center text-gray-500 hover:text-blue-500 disabled:opacity-50"
                                aria-label="Use my current location"
                            >
                                {isGeocoding ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                                ) : (
                                    <i className="fas fa-location-arrow"></i>
                                )}
                            </button>
                        </div>
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {suggestions.map((s) => (
                                    <li key={s.osm_id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSuggestionClick(s)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {s.display_name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label htmlFor="num-pubs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Number of Pubs
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                id="num-pubs"
                                type="range"
                                min="1"
                                max="12"
                                value={numPubs}
                                onChange={(e) => setNumPubs(Number(e.target.value))}
                                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <span className="font-bold text-lg text-amber-500 dark:text-amber-400 w-8 text-center">{numPubs}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Prioritize
                        </label>
                        <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group">
                            <button
                                type="button"
                                onClick={() => setPriority('score')}
                                className={`w-1/2 py-2 rounded-md font-bold text-sm transition-colors flex flex-col items-center justify-center space-y-1 ${priority === 'score' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                                aria-pressed={priority === 'score'}
                            >
                                <span>Best Pubs</span>
                                <span className="text-xs font-normal opacity-80">(Higher Scores)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority('route')}
                                className={`w-1/2 py-2 rounded-md font-bold text-sm transition-colors flex flex-col items-center justify-center space-y-1 ${priority === 'route' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                                aria-pressed={priority === 'route'}
                            >
                                <span>Best Route</span>
                                <span className="text-xs font-normal opacity-80">(Convenience)</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col-reverse sm:flex-row sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-1/2 mt-2 sm:mt-0 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={cooldownTime > 0}
                            className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {cooldownTime > 0 ? (
                                <span>Ready in {minutes}:{seconds}</span>
                            ) : (
                                <>
                                    <i className="fas fa-magic"></i>
                                    <span>Generate Crawl</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default PubCrawlSetupModal;
