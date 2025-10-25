import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getCurrencyInfo } from '../utils.js';
import StarRating from './StarRating.jsx';
import { RANK_DETAILS } from '../constants.js';

// A reusable card component for consistent styling
const StatCard = ({ icon, title, children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md ${className}`}>
        <div className="flex items-center space-x-3 mb-2">
            <i className={`fas ${icon} text-amber-500 dark:text-amber-400 w-5 text-center`}></i>
            <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
        </div>
        <div className="pl-8">{children}</div>
    </div>
);

// Fallback conversion rates (how many GBP is 1 unit of the foreign currency).
const FALLBACK_RATES_TO_GBP = {
    EUR: 0.85, USD: 0.79, AUD: 0.52, GBP: 1,
    TRY: 0.024, PLN: 0.20, ILS: 0.21, CAD: 0.58,
};

// Fallback display rates (how many units of foreign currency is 1 GBP).
const FALLBACK_DISPLAY_CURRENCIES = {
    GBP: { symbol: '£', rate: 1 },
    EUR: { symbol: '€', rate: 1.18 },
    USD: { symbol: '$', rate: 1.27 },
    AUD: { symbol: 'A$', rate: 1.91 },
};


const ProfileStatsView = ({ userRatings, onViewPub, rankData, userProfile, levelRequirements, pubScores }) => {
    const [isSpentVisible, setIsSpentVisible] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState('GBP');
    const [exchangeRates, setExchangeRates] = useState(null);

    const qualityCarouselRef = useRef(null);
    const valueCarouselRef = useRef(null);
    const [canScrollQuality, setCanScrollQuality] = useState({ left: false, right: false });
    const [canScrollValue, setCanScrollValue] = useState({ left: false, right: false });

    const checkScrollability = (ref, setter) => {
        const el = ref.current;
        if (el) {
            const hasOverflow = el.scrollWidth > el.clientWidth;
            const canScrollLeft = el.scrollLeft > 0;
            const canScrollRight = el.scrollLeft < (el.scrollWidth - el.clientWidth - 1);
            setter({ left: canScrollLeft, right: hasOverflow && canScrollRight });
        }
    };

    const handleScroll = (ref, setter) => () => checkScrollability(ref, setter);
    
    const scroll = (ref, direction) => {
        const el = ref.current;
        if (el) {
            const scrollAmount = el.clientWidth * 0.8; // Scroll by 80% of the visible width
            el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const fetchRates = async () => {
            // 1. Check local storage for cached rates
            try {
                const cachedData = localStorage.getItem('stoutly-exchange-rates');
                if (cachedData) {
                    const { timestamp, rates } = JSON.parse(cachedData);
                    // Use cache if it's less than 24 hours old
                    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                        setExchangeRates(rates);
                        return;
                    }
                }
            } catch (e) {
                console.error("Failed to read cached exchange rates", e);
            }

            // 2. Fetch from API if no valid cache
            try {
                const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
                if (!apiKey) {
                    console.warn("ExchangeRate-API key not found. Using fallback rates.");
                    setExchangeRates(null); // Explicitly trigger fallback
                    return;
                }
                const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/GBP`);
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                const data = await response.json();
                if (data.result === 'success' && data.conversion_rates) {
                    const rates = data.conversion_rates;
                    setExchangeRates(rates);
                    localStorage.setItem('stoutly-exchange-rates', JSON.stringify({ timestamp: Date.now(), rates }));
                } else {
                    throw new Error(data['error-type'] || 'Invalid API response');
                }
            } catch (error) {
                console.error("Failed to fetch live exchange rates, using fallbacks:", error);
                setExchangeRates(null); // On error, ensure we use the fallback
            }
        };

        fetchRates();
    }, []);

    const topPints = useMemo(() => {
        if (!userRatings || userRatings.length === 0 || !pubScores) return [];
        
        const maxQuality = Math.max(...userRatings.map(r => r.rating.quality));
        
        const topQualityPints = userRatings.filter(r => r.rating.quality === maxQuality);

        topQualityPints.sort((a, b) => {
            // 1. Price score (desc)
            if (b.rating.price !== a.rating.price) {
                return b.rating.price - a.rating.price;
            }
            // 2. Pub Score (desc)
            const scoreA = pubScores.get(a.pubId) || 0;
            const scoreB = pubScores.get(b.pubId) || 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            // 3. Recency (desc)
            return b.timestamp - a.timestamp;
        });
        
        return topQualityPints.slice(0, 5); // Take top 5
    }, [userRatings, pubScores]);

    const bestValuePints = useMemo(() => {
        if (!userRatings || userRatings.length === 0) return [];
        
        const pricedPints = userRatings.filter(r => r.rating.exact_price > 0);

        pricedPints.sort((a, b) => {
            // 1. Price (asc)
            if (a.rating.exact_price !== b.rating.exact_price) {
                return a.rating.exact_price - b.rating.exact_price;
            }
            // 2. Quality (desc) - better quality for same price is better value
            if (b.rating.quality !== a.rating.quality) {
                return b.rating.quality - a.rating.quality;
            }
            // 3. Recency (desc)
            return b.timestamp - a.timestamp;
        });
        
        return pricedPints.slice(0, 5); // Take top 5
    }, [userRatings]);

    // Check scrollability after content loads
    useEffect(() => {
        checkScrollability(qualityCarouselRef, setCanScrollQuality);
    }, [topPints]);
    
    useEffect(() => {
        checkScrollability(valueCarouselRef, setCanScrollValue);
    }, [bestValuePints]);


    const stats = useMemo(() => {
        if (!userRatings || userRatings.length === 0) {
            return {
                totalPints: 0,
                averageQuality: 0,
                averagePrice: 0,
                totalSpentInGbp: 0,
                averagePricePaidInGbp: 0,
            };
        }

        const totalPints = userRatings.length;
        
        const averageQualityRaw = userRatings.reduce((sum, r) => sum + r.rating.quality, 0) / totalPints;
        const averageQuality = Math.round(averageQualityRaw * 10) / 10;
        
        const averagePriceRaw = userRatings.reduce((sum, r) => sum + r.rating.price, 0) / totalPints;
        const averagePrice = Math.round(averagePriceRaw * 10) / 10;

        let pricedRatingsCount = 0;
        const totalSpentInGbp = userRatings.reduce((sum, r) => {
            if (r.rating.exact_price > 0) {
                pricedRatingsCount++;
                const currency = getCurrencyInfo({ country_code: r.pubCountryCode, country_name: r.pubCountryName });
                if (exchangeRates) {
                    const rateFromGbp = exchangeRates[currency.code];
                    if (rateFromGbp) {
                        sum += r.rating.exact_price / rateFromGbp;
                    } else {
                        sum += r.rating.exact_price;
                    }
                } else {
                    const rateToGbp = FALLBACK_RATES_TO_GBP[currency.code] || 1;
                    sum += r.rating.exact_price * rateToGbp;
                }
            }
            return sum;
        }, 0);

        const averagePricePaidInGbp = pricedRatingsCount > 0 ? totalSpentInGbp / pricedRatingsCount : 0;

        return { totalPints, averageQuality, averagePrice, totalSpentInGbp, averagePricePaidInGbp };

    }, [userRatings, exchangeRates]);

    const displayCurrencies = useMemo(() => {
        if (exchangeRates) {
            return {
                GBP: { symbol: '£', rate: exchangeRates['GBP'] || 1 },
                EUR: { symbol: '€', rate: exchangeRates['EUR'] || FALLBACK_DISPLAY_CURRENCIES.EUR.rate },
                USD: { symbol: '$', rate: exchangeRates['USD'] || FALLBACK_DISPLAY_CURRENCIES.USD.rate },
                AUD: { symbol: 'A$', rate: exchangeRates['AUD'] || FALLBACK_DISPLAY_CURRENCIES.AUD.rate },
            };
        }
        return FALLBACK_DISPLAY_CURRENCIES;
    }, [exchangeRates]);

    const nextRankInfo = useMemo(() => {
        if (!rankData || !userProfile || !levelRequirements || levelRequirements.length === 0) {
            return null;
        }

        const currentRankIndex = RANK_DETAILS.findIndex(r => r.name === rankData.name);
        
        if (currentRankIndex === -1) return null;
        if (currentRankIndex === RANK_DETAILS.length - 1) {
            return { isMaxRank: true, needed: 0 };
        }

        const nextRank = RANK_DETAILS[currentRankIndex + 1];
        const nextRankLevelInfo = levelRequirements.find(lr => lr.level === nextRank.minLevel);

        if (!nextRankLevelInfo) {
            return null;
        }

        const ratingsForNextRank = nextRankLevelInfo.total_ratings_required;
        const currentRatings = userProfile.reviews || 0;
        const ratingsNeeded = Math.max(0, ratingsForNextRank - currentRatings);

        return {
            isMaxRank: false,
            needed: ratingsNeeded,
        };
    }, [rankData, userProfile, levelRequirements]);
    
    if (stats.totalPints === 0) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <p>No stats to show yet. Start rating some pints!</p>
            </div>
        );
    }

    const displayedAmount = stats.totalSpentInGbp * displayCurrencies[displayCurrency].rate;
    const displayedSymbol = displayCurrencies[displayCurrency].symbol;

    return (
        <div className="bg-gray-100 dark:bg-gray-900/50 p-4 space-y-4 rounded-b-xl lg:rounded-none lg:bg-transparent lg:dark:bg-transparent">
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div className="flex justify-around items-stretch divide-x divide-gray-200 dark:divide-gray-700">
                    {/* Total Pints Section */}
                    <div className="w-1/2 flex flex-col items-center justify-center px-2">
                        <div className="flex items-center space-x-2 mb-1">
                            <i className="fas fa-beer text-amber-500 dark:text-amber-400 text-sm"></i>
                            <h3 className="font-bold text-sm text-gray-800 dark:text-white">Total Pints</h3>
                        </div>
                        <p className="text-4xl font-bold">{stats.totalPints}</p>
                    </div>
                    
                    {/* Your Rank Section */}
                    {rankData && (
                        <div className="w-1/2 flex flex-col items-center justify-center px-2 text-center">
                            <div className="flex items-center space-x-2 mb-1">
                                <i className="fas fa-medal text-amber-500 dark:text-amber-400 text-sm"></i>
                                <h3 className="font-bold text-sm text-gray-800 dark:text-white">Your Rank</h3>
                            </div>
                            <i className={`fas ${rankData.icon} text-2xl text-amber-500 dark:text-amber-400 mb-1`}></i>
                            <p className="text-base font-semibold truncate" title={rankData.name}>{rankData.name}</p>
                            {nextRankInfo ? (
                                nextRankInfo.isMaxRank ? (
                                    <p className="text-xs font-bold text-green-500 dark:text-green-400 mt-1">Max Rank Reached!</p>
                                ) : nextRankInfo.needed > 0 ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        <span className="font-bold">{nextRankInfo.needed}</span> rating{nextRankInfo.needed !== 1 ? 's' : ''} to next rank
                                    </p>
                                ) : (
                                    <p className="text-xs font-bold text-green-500 dark:text-green-400 mt-1">Next rating is a rank up!</p>
                                )
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            <StatCard icon="fa-coins" title="Total Spent">
                <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1 mb-3" role="group">
                    {Object.keys(displayCurrencies).map(code => (
                        <button
                            key={code}
                            onClick={() => setDisplayCurrency(code)}
                            className={`w-1/4 py-1 text-xs rounded-md font-bold transition-colors ${displayCurrency === code ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300'}`}
                            aria-pressed={displayCurrency === code}
                        >
                            {code}
                        </button>
                    ))}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`text-center sm:text-left transition-all duration-300 ${!isSpentVisible ? 'blur-md' : ''}`}>
                            {stats.totalSpentInGbp > 0 ? (
                                <>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                        {displayedSymbol}{displayedAmount.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Total Spent</p>
                                </>
                            ) : <p className="text-sm text-gray-500">No prices recorded yet.</p>}
                        </div>
                        
                        {stats.totalSpentInGbp > 0 && stats.averagePricePaidInGbp > 0 && (
                            <div className="border-l border-gray-200 dark:border-gray-700 h-10"></div>
                        )}
                        
                        {stats.averagePricePaidInGbp > 0 && (
                             <div className={`text-center sm:text-left transition-all duration-300 ${!isSpentVisible ? 'blur-md' : ''}`}>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                    {displayedSymbol}{(stats.averagePricePaidInGbp * displayCurrencies[displayCurrency].rate).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Avg. Price Paid</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsSpentVisible(v => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-full text-xl flex-shrink-0" aria-label={isSpentVisible ? 'Hide amount' : 'Show amount'}>
                        <i className={`fas ${isSpentVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
                {!isSpentVisible && stats.totalSpentInGbp > 0 && <p className="text-xs text-center text-gray-500 mt-1 italic">Ignorance is bliss...</p>}
            </StatCard>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col items-center justify-center text-center">
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-2">Avg. Quality</h3>
                    <p className="font-bold text-2xl mb-1">{stats.averageQuality.toFixed(1)}</p>
                    <StarRating rating={stats.averageQuality} />
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col items-center justify-center text-center">
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-2">Avg. Price</h3>
                    <p className="font-bold text-2xl mb-1">{stats.averagePrice.toFixed(1)}</p>
                    <StarRating rating={stats.averagePrice} color="text-green-400" />
                </div>
            </div>

            <StatCard icon="fa-trophy" title="Highest Quality Pints">
                {topPints.length > 0 ? (
                    <div className="group relative">
                        {canScrollQuality.left && (
                            <button
                                onClick={() => scroll(qualityCarouselRef, -1)}
                                className="absolute top-1/2 -translate-y-1/2 -left-2 z-10 w-8 h-8 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm text-gray-700 dark:text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Scroll left"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                        )}
                        <div
                            ref={qualityCarouselRef}
                            onScroll={handleScroll(qualityCarouselRef, setCanScrollQuality)}
                            className="flex overflow-x-auto space-x-3 pb-2 -ml-8 -mr-4 pr-4 pl-8 scrollbar-hide"
                        >
                            {topPints.map(pint => (
                                <button
                                    key={pint.id}
                                    onClick={() => onViewPub({
                                        id: pint.pubId,
                                        name: pint.pubName,
                                        address: pint.pubAddress,
                                        location: pint.pubLocation,
                                        country_code: pint.pubCountryCode,
                                        country_name: pint.pubCountryName
                                    })}
                                    className="flex-shrink-0 w-56 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg"
                                >
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-amber-400/50 dark:border-amber-500/50 h-full flex flex-col transition-transform hover:scale-105">
                                        <p className="font-bold text-base pr-8 truncate">{pint.pubName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{new Date(pint.timestamp).toLocaleDateString()}</p>
                                        
                                        <div className="mt-auto space-y-1 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">Quality</span>
                                                <StarRating rating={pint.rating.quality} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">Price</span>
                                                <StarRating rating={pint.rating.price} color="text-green-400" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">Pub Score</span>
                                                <span className="font-bold text-base text-gray-800 dark:text-white">{pubScores.get(pint.pubId) || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                         {canScrollQuality.right && (
                            <button
                                onClick={() => scroll(qualityCarouselRef, 1)}
                                className="absolute top-1/2 -translate-y-1/2 -right-2 z-10 w-8 h-8 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm text-gray-700 dark:text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Scroll right"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No quality ratings yet.</p>
                )}
            </StatCard>
            
            <StatCard icon="fa-piggy-bank" title="Best Priced Pints">
                {bestValuePints.length > 0 ? (
                    <div className="group relative">
                        {canScrollValue.left && (
                            <button
                                onClick={() => scroll(valueCarouselRef, -1)}
                                className="absolute top-1/2 -translate-y-1/2 -left-2 z-10 w-8 h-8 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm text-gray-700 dark:text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Scroll left"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                        )}
                         <div
                            ref={valueCarouselRef}
                            onScroll={handleScroll(valueCarouselRef, setCanScrollValue)}
                            className="flex overflow-x-auto space-x-3 pb-2 -ml-8 -mr-4 pr-4 pl-8 scrollbar-hide"
                        >
                            {bestValuePints.map(pint => {
                                const currency = getCurrencyInfo({ country_code: pint.pubCountryCode, country_name: pint.pubCountryName });
                                return (
                                    <button
                                        key={pint.id}
                                        onClick={() => onViewPub({
                                            id: pint.pubId,
                                            name: pint.pubName,
                                            address: pint.pubAddress,
                                            location: pint.pubLocation,
                                            country_code: pint.pubCountryCode,
                                            country_name: pint.pubCountryName
                                        })}
                                        className="flex-shrink-0 w-56 text-left focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg"
                                    >
                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-green-400/50 dark:border-green-500/50 h-full flex flex-col transition-transform hover:scale-105">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-base pr-8 truncate">{pint.pubName}</p>
                                                <p className="font-bold text-xl text-green-500 dark:text-green-400">
                                                    {currency.symbol}{pint.rating.exact_price.toFixed(2)}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{new Date(pint.timestamp).toLocaleDateString()}</p>
                                            <div className="mt-auto flex justify-between items-center text-sm">
                                                <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">Quality</span>
                                                <StarRating rating={pint.rating.quality} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {canScrollValue.right && (
                            <button
                                onClick={() => scroll(valueCarouselRef, 1)}
                                className="absolute top-1/2 -translate-y-1/2 -right-2 z-10 w-8 h-8 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm text-gray-700 dark:text-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Scroll right"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No prices recorded yet.</p>
                )}
            </StatCard>

        </div>
    );
};

export default ProfileStatsView;