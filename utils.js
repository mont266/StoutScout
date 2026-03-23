

// This file is now 'utils.js'
import { RANK_DETAILS } from './constants.js';

/**
 * Calculates the distance between two lat/lng coordinates in meters using the Haversine formula.
 * @param {{lat: number, lng: number}} location1 The first location.
 * @param {{lat: number, lng: number}} location2 The second location.
 * @returns {number} The distance in meters.
 */
export const getDistance = (location1, location2) => {
  if (!location1 || !location2) return Infinity;
  const R = 6371e3; // Earth's radius in meters
  const φ1 = location1.lat * Math.PI / 180;
  const φ2 = location2.lat * Math.PI / 180;
  const Δφ = (location2.lat - location1.lat) * Math.PI / 180;
  const Δλ = (location2.lng - location1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Returns the full rank data object for a given level.
 * It finds the highest rank achieved for the user's level.
 * @param {number} level The user's current level.
 * @returns The full Rank object.
 */
export const getRankData = (level) => {
  // Iterate backwards to find the first rank the user has achieved
  for (let i = RANK_DETAILS.length - 1; i >= 0; i--) {
    if (level >= RANK_DETAILS[i].minLevel) {
      return RANK_DETAILS[i];
    }
  }
  // Fallback to the first rank if something goes wrong
  return RANK_DETAILS[0];
};

/**
 * Normalizes a pub name for easier comparison.
 * This function removes possessives, punctuation, common pub-related words, and all whitespace.
 * If removing common words results in an empty string, it reverts to the name before their removal.
 * @param {string} name The original pub name.
 * @returns {string} The normalized name.
 */
export const normalizePubNameForComparison = (name) => {
  if (!name) return '';
  // Step 1: Basic normalization (lowercase, remove possessives and special chars)
  const initialNormalization = name
    .toLowerCase()
    .trim()
    .replace(/'s\b/g, '') // e.g., "kavanagh's" -> "kavanagh"
    .replace(/[^a-z0-9\s]/g, ''); // Remove all non-alphanumeric characters except spaces

  // Step 2: Attempt to remove common pub words and major chain names.
  // Longer phrases must come first to be matched correctly.
  const commonWordsRegex = /\b(jd wetherspoon|wetherspoons|greene king|fullers|marstons|stonegate|the|inn|tavern|pub|bar|arms|house|hotel|lounge)\b/g;
  const withoutCommonWords = initialNormalization.replace(commonWordsRegex, '');

  // Step 3: Remove all whitespace from the result
  const final = withoutCommonWords.replace(/\s+/g, '');

  // If removing common words results in a non-empty string, use that.
  // This prevents names like "The Pub" from becoming an empty string and matching everything.
  if (withoutCommonWords.trim().length > 0) {
    return final;
  }
  
  // Fallback for names that consist only of common words.
  return initialNormalization.replace(/\s+/g, '');
};

/**
 * Normalizes a result from the Nominatim (OpenStreetMap) search API into the app's internal Pub object format.
 * @param {object} nominatimResult A single result object from the Nominatim search API.
 * @returns {object|null} A pub object `{id, name, address, location, ...}` or null if invalid.
 */
export const normalizeNominatimResult = (nominatimResult) => {
    if (!nominatimResult || !nominatimResult.osm_id) {
        return null;
    }
    
    // Prioritize specific name tags if they exist in the address object, which we get from `addressdetails=1`
    const name = nominatimResult.address?.pub || 
                 nominatimResult.address?.bar || 
                 nominatimResult.address?.brewery ||
                 // Fallback to parsing the full display_name
                 nominatimResult.display_name.split(',')[0].trim();
    
    return {
        id: `osm-${nominatimResult.osm_id}`,
        name: name,
        address: nominatimResult.display_name,
        location: {
            lat: parseFloat(nominatimResult.lat),
            lng: parseFloat(nominatimResult.lon),
        },
        country_code: nominatimResult.address?.country_code,
        country_name: nominatimResult.address?.country,
    };
};


/**
 * Normalizes a result from the Mapbox /reverse endpoint into a clean address string.
 * @param {object} mapboxReverseGeocodeResult A single result object from the reverse geocode API's `features` array.
 * @returns {string} A formatted address string.
 */
export const normalizeReverseGeocodeResult = (mapboxReverseGeocodeResult) => {
    if (!mapboxReverseGeocodeResult?.place_name) return 'Address unknown';
    return mapboxReverseGeocodeResult.place_name;
};




export const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);
  
    let interval = seconds / 31536000;
    if (interval > 1) {
      const years = Math.floor(interval);
      return years + (years === 1 ? " year ago" : " years ago");
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      const months = Math.floor(interval);
      return months + (months === 1 ? " month ago" : " months ago");
    }
    interval = seconds / 86400;
    if (interval > 1) {
      const days = Math.floor(interval);
      return days + (days === 1 ? " day ago" : " days ago");
    }
    interval = seconds / 3600;
    if (interval > 1) {
        const hours = Math.floor(interval);
      return hours + (hours === 1 ? " hour ago" : " hours ago");
    }
    interval = seconds / 60;
    if (interval > 1) {
      const minutes = Math.floor(interval);
      return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
    }
    return Math.floor(seconds) + " seconds ago";
  };

const EUROZONE_COUNTRY_CODES = new Set([
    'at', 'be', 'hr', 'cy', 'ee', 'fi', 'fr', 'de', 'gr', 'ie', 
    'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pt', 'sk', 'si', 'es'
]);

// A more comprehensive map for direct lookups.
const CURRENCY_MAP = {
    'us': { symbol: '$', code: 'USD' }, 'ca': { symbol: '$', code: 'CAD' },
    'gb': { symbol: '£', code: 'GBP' }, 'uk': { symbol: '£', code: 'GBP' }, 
    'au': { symbol: '$', code: 'AUD' }, 'nz': { symbol: 'NZ$', code: 'NZD' },
    'jp': { symbol: '¥', code: 'JPY' }, 'cn': { symbol: '¥', code: 'CNY' },
    'sg': { symbol: 'S$', code: 'SGD' }, 'hk': { symbol: 'HK$', code: 'HKD' },
    'ae': { symbol: 'د.إ', code: 'AED' },
    'pl': { symbol: 'zł', code: 'PLN' }, 'ch': { symbol: 'CHF', code: 'CHF' },
    'se': { symbol: 'kr', code: 'SEK' }, 'no': { symbol: 'kr', code: 'NOK' },
    'dk': { symbol: 'kr', code: 'DKK' }, 'is': { symbol: 'kr', code: 'ISK' },
    'cz': { symbol: 'Kč', code: 'CZK' }, 'hu': { symbol: 'Ft', code: 'HUF' },
    'tr': { symbol: '₺', code: 'TRY' }, 'il': { symbol: '₪', code: 'ILS' },
    'za': { symbol: 'R', code: 'ZAR' }, 'ma': { symbol: 'د.م.', code: 'MAD' }, 
    'br': { symbol: 'R$', code: 'BRL' }, 'in': { symbol: '₹', code: 'INR' },
    'mx': { symbol: 'Mex$', code: 'MXN' }, 'ru': { symbol: '₽', code: 'RUB' },
    'kr': { symbol: '₩', code: 'KRW' }, 'th': { symbol: '฿', code: 'THB' },
    'pe': { symbol: 'S/', code: 'PEN' },
};

// This map helps resolve full country names to their 2-letter codes.
const COUNTRY_NAME_TO_CODE = {
    'ireland': 'ie', 'portugal': 'pt', 'israel': 'il',
    'poland': 'pl', 'united states': 'us', 'italy': 'it',
    'united kingdom': 'gb', 'spain': 'es', 'germany': 'de',
    'france': 'fr', 'australia': 'au', 'canada': 'ca',
    'netherlands': 'nl', 'belgium': 'be', 'sweden': 'se',
    'norway': 'no', 'denmark': 'dk', 'switzerland': 'ch',
    'japan': 'jp', 'singapore': 'sg', 'united arab emirates': 'ae',
    'south africa': 'za', 'turkey': 'tr', 'austria': 'at',
    'czech republic': 'cz', 'peru': 'pe', 'south korea': 'kr',
    'morocco': 'ma',
};

// Tier thresholds for price ratings. A price < tiers[0] gets 5 stars.
const CURRENCY_DEFAULTS = {
    'DEFAULT':{ examplePrice: '5.70', tiers: [4.50, 5.50, 6.00, 7.00] },
    'GBP':    { examplePrice: '5.70', tiers: [4.50, 5.50, 6.00, 7.00] },
    'EUR':    { examplePrice: '6.50', tiers: [5.50, 6.50, 7.00, 8.00] },
    'USD':    { examplePrice: '7.50', tiers: [6.50, 7.50, 8.00, 9.00] },
    'CAD':    { examplePrice: '8.00', tiers: [7.00, 8.00, 9.00, 10.00] },
    'AUD':    { examplePrice: '10.00', tiers: [9.00, 10.00, 11.00, 12.00] },
    'NZD':    { examplePrice: '11.00', tiers: [10.00, 11.00, 12.00, 13.00] },
    'CZK':    { examplePrice: '55', tiers: [45, 55, 60, 70] },
    'PLN':    { examplePrice: '18', tiers: [15, 18, 22, 25] },
    'JPY':    { examplePrice: '800', tiers: [650, 800, 950, 1100] },
    'KRW':    { examplePrice: '9000', tiers: [7000, 9000, 11000, 13000] },
    'PEN':    { examplePrice: '15', tiers: [12, 15, 18, 22] },
    'MAD':    { examplePrice: '30', tiers: [25, 30, 40, 50] },
};

/**
 * Infers currency information based on a pub's country code or country name.
 * @param {{country_code?: string, country_name?: string}} pubLocationData The pub's location data.
 * @returns {{symbol: string, code: string, examplePrice: string, tiers: number[]}} The currency info.
 */
export const getCurrencyInfo = (pubLocationData = {}) => {
    let { country_code, country_name, local_avg_price } = pubLocationData;
    
    const defaults = {
        symbol: '£',
        code: 'GBP',
        ...CURRENCY_DEFAULTS['DEFAULT']
    };

    if (!country_code && country_name) {
        country_code = COUNTRY_NAME_TO_CODE[country_name.toLowerCase().trim()];
    }

    let result = defaults;

    if (country_code) {
        const code = country_code.toLowerCase().trim();

        if (EUROZONE_COUNTRY_CODES.has(code)) {
            result = { symbol: '€', code: 'EUR', ...CURRENCY_DEFAULTS['EUR'] };
        } else {
            const currency = CURRENCY_MAP[code];
            if (currency) {
                const currencySpecifics = CURRENCY_DEFAULTS[currency.code] || CURRENCY_DEFAULTS['DEFAULT'];
                result = { ...currency, ...currencySpecifics };
            }
        }
    }

    // Apply dynamic tiers if local_avg_price is available
    const parsedLocalAvg = parseFloat(local_avg_price);
    if (parsedLocalAvg && !isNaN(parsedLocalAvg)) {
        result.tiers = [
            parsedLocalAvg * 0.85,
            parsedLocalAvg * 0.95,
            parsedLocalAvg * 1.10,
            parsedLocalAvg * 1.25
        ];
        result.examplePrice = parsedLocalAvg.toFixed(2);
        result.isDynamic = true;
    }

    return result;
};

/**
 * Converts a price star rating into a human-readable price range string.
 * @param {number} avgStarRating The average star rating for price (1-5).
 * @param {string} currencySymbol The currency symbol to use (e.g., '£', '€', '$').
 * @param {number[]} tiers The price thresholds for the currency.
 * @returns {string} A formatted price range string, e.g., "£5.50 - £5.99".
 */
export const getPriceRangeFromStars = (avgStarRating, currencySymbol, tiers) => {
    const thresholds = tiers || CURRENCY_DEFAULTS.DEFAULT.tiers;
    
    const format = (val) => val >= 100 ? val.toFixed(0) : val.toFixed(2);

    if (avgStarRating > 4.5) return `< ${currencySymbol}${format(thresholds[0])}`;
    if (avgStarRating > 3.5) return `${currencySymbol}${format(thresholds[0])} - ${currencySymbol}${format(thresholds[1] - 0.01)}`;
    if (avgStarRating > 2.5) return `${currencySymbol}${format(thresholds[1])} - ${currencySymbol}${format(thresholds[2] - 0.01)}`;
    if (avgStarRating > 1.5) return `${currencySymbol}${format(thresholds[2])} - ${currencySymbol}${format(thresholds[3] - 0.01)}`;
    if (avgStarRating > 0) return `> ${currencySymbol}${format(thresholds[3])}`;
    return ''; // Return empty string if no rating
};

/**
 * Converts an exact price into a star rating (1-5).
 * @param {number | string | null} price The exact price.
 * @param {number[]} tiers The price thresholds for the currency.
 * @returns {number} The star rating (0-5).
 */
export const getStarRatingFromPrice = (price, tiers) => {
    if (price === '' || price === null || isNaN(price)) return 0;
    const numericPrice = parseFloat(price);

    const thresholds = tiers || CURRENCY_DEFAULTS.DEFAULT.tiers;

    if (numericPrice <= thresholds[0]) return 5;
    if (numericPrice <= thresholds[1]) return 4;
    if (numericPrice <= thresholds[2]) return 3;
    if (numericPrice <= thresholds[3]) return 2;
    return 1;
};


/**
 * Detects the user's mobile operating system.
 * @returns {'iOS' | 'Android' | 'unknown'}
 */
export const getMobileOS = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) {
      return 'Android';
    }
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'iOS';
    }
    return 'unknown';
};

/**
 * Formats a numeric price and ISO currency code into a display string.
 * @param {number | null} price The numeric price.
 * @param {string} currencyCode The ISO 4217 currency code (e.g., 'GBP').
 * @returns {string} A formatted currency string, e.g., "£19.99".
 */
export const formatCurrency = (price, currencyCode) => {
    if (price === null || price === undefined) return 'Price not available';
    // Use en-GB as a base for formatting, but the currency code determines the symbol.
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
};

/**
 * Calculates the recent median price from a list of ratings.
 * @param {Array} ratings The list of ratings for a pub.
 * @returns {number|null} The recent median price, or null if no valid prices exist.
 */
export const getDisplayPrice = (ratings) => {
    if (!ratings || ratings.length === 0) return null;

    // 1. Get ratings with exact prices, sorted by newest first
    const validRatings = ratings
        .filter(r => r.exact_price != null && r.exact_price > 0)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (validRatings.length === 0) return null;

    // 2. Take the 3 most recent prices
    const recentRatings = validRatings.slice(0, 3);
    
    // 3. Sort those 3 prices from lowest to highest
    const recentPrices = recentRatings.map(r => r.exact_price).sort((a, b) => a - b);
    
    // 4. Return the Median (the middle value)
    const mid = Math.floor(recentPrices.length / 2);
    if (recentPrices.length % 2 === 0) {
        return (recentPrices[mid - 1] + recentPrices[mid]) / 2;
    } else {
        return recentPrices[mid];
    }
};
