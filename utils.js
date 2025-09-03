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
 * Extracts a UK-style postcode from an address string.
 * This is a simplified regex. It normalizes the postcode by removing spaces and uppercasing.
 * @param {string} address The address string.
 * @returns {string|null} The extracted, normalized postcode or null.
 */
export const extractPostcode = (address) => {
    if (!address) return null;
    // This regex looks for patterns like SG1 1NA, SG11NA, W1A 0AX etc.
    const postcodeMatch = address.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
    return postcodeMatch ? postcodeMatch[0].toUpperCase().replace(/\s+/g, '') : null;
};

/**
 * Normalizes a pub name for easier comparison.
 * This is an aggressive normalization function.
 * It removes possessives, all punctuation, common pub-related words, and all whitespace.
 * @param {string} name The original pub name.
 * @returns {string} The normalized name.
 */
export const normalizePubNameForComparison = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/'s\b/g, '') // e.g., "kavanagh's" -> "kavanagh"
    .replace(/[^a-z0-9\s]/g, '') // Remove all non-alphanumeric characters except spaces
    // Remove a comprehensive list of common pub suffixes and articles
    .replace(/\b(the|inn|tavern|pub|bar|arms|house|hotel|lounge)\b/g, '') 
    .replace(/\s+/g, '');      // Remove all remaining whitespace
};


/**
 * Creates a clean, formatted address string from a Nominatim address object.
 * Example: "123 Dame Street, Dublin, Ireland"
 * @param {object} addressObj The 'address' object from a Nominatim API response.
 * @returns {string} A formatted address string.
 */
export const formatNominatimAddress = (addressObj) => {
    if (!addressObj) return 'Address unknown';

    // Combine house number and road for a more complete street address.
    const streetAddress = [addressObj.house_number, addressObj.road].filter(Boolean).join(' ');

    // Prioritize specific keys, then build up from most local to most broad
    const parts = [
        streetAddress,
        addressObj.neighbourhood,
        addressObj.suburb,
        addressObj.village,
        addressObj.town || addressObj.city_district || addressObj.city,
        addressObj.county,
        addressObj.state,
        addressObj.country
    ];
    // Filter out undefined/null/empty parts, remove duplicates, and join them.
    const uniqueParts = [...new Set(parts.filter(p => p && p.trim() !== ''))];
    if (uniqueParts.length === 0) return 'Address unknown';
    return uniqueParts.join(', ');
};

/**
 * Normalizes a result from the Nominatim API into the app's internal Pub object format.
 * @param {object} nominatimResult A single result object from the Nominatim API.
 * @returns {object} A pub object `{id, name, address, location, country_code, country_name}`.
 */
export const normalizeNominatimResult = (nominatimResult) => {
    const { osm_id, display_name, lat, lon, address } = nominatimResult;
    
    const name = display_name.split(',')[0];
    
    // First, try to build an address from the structured 'address' object.
    let formattedAddress = formatNominatimAddress(address);
    
    // If the structured address is missing or too short (e.g., just "United Kingdom"),
    // use the rest of the display_name as a more descriptive fallback.
    if (formattedAddress === 'Address unknown' || formattedAddress.split(',').length < 2) {
        const addressPartsFromDisplay = display_name.split(',').slice(1);
        if (addressPartsFromDisplay.length > 0) {
            formattedAddress = addressPartsFromDisplay.join(',').trim();
        }
    }

    return {
        id: `osm-${osm_id}`,
        name: name,
        // If all else fails, ensure we don't have an empty string.
        address: formattedAddress || 'Address unknown',
        // Add postcode, trying the structured object first, then falling back to parsing the name.
        postcode: address?.postcode ? address.postcode.toUpperCase().replace(/\s+/g, '') : extractPostcode(display_name),
        // Add country code and name for better data quality and stats
        country_code: address?.country_code,
        country_name: address?.country,
        location: {
            lat: parseFloat(lat),
            lng: parseFloat(lon),
        },
    };
};

/**
 * Creates a clean, formatted address string from Overpass API address tags.
 * @param {object} tags The 'tags' object from an Overpass API response element.
 * @returns {string} A formatted address string.
 */
export const formatOverpassAddress = (tags) => {
    if (!tags) return 'Address unknown';
    const streetAddress = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const parts = [
        streetAddress || tags['addr:road'],
        tags['addr:suburb'],
        tags['addr:city'],
        tags['addr:county'],
        tags['addr:postcode'],
        tags['addr:country']
    ];
    const uniqueParts = [...new Set(parts.filter(p => p && p.trim() !== ''))];
    if (uniqueParts.length === 0) return 'Address unknown';
    return uniqueParts.join(', ');
};

/**
 * Normalizes a result from the Overpass API into the app's internal Pub object format.
 * @param {object} element A single result object from the Overpass API `elements` array.
 * @returns {object | null} A pub object, or null if it's invalid (e.g., no name).
 */
export const normalizeOverpassResult = (element) => {
    if (!element.tags || !element.tags.name) {
        return null;
    }

    const { id, type, tags } = element;
    const location = type === 'node' 
        ? { lat: element.lat, lng: element.lon }
        : { lat: element.center?.lat, lng: element.center?.lon };

    // If a way or relation has no center point, we can't use it.
    if (!location || location.lat === undefined || location.lng === undefined) {
        return null;
    }

    const address = formatOverpassAddress(tags);

    // Use the buggy `osm-${id}` format to maintain compatibility with existing pub IDs in the database.
    const uniqueId = `osm-${id}`;

    return {
        id: uniqueId,
        name: tags.name,
        address: address,
        postcode: tags['addr:postcode'] ? tags['addr:postcode'].toUpperCase().replace(/\s+/g, '') : null,
        // Overpass `addr:country` is typically the 2-letter code
        country_code: tags['addr:country'],
        // We don't get the full country name reliably from Overpass
        country_name: null, 
        location: location,
    };
};


/**
 * Normalizes a result from the Nominatim /reverse endpoint into a clean address string.
 * @param {object} reverseGeocodeResult A single result object from the reverse geocode API.
 * @returns {string} A formatted address string.
 */
export const normalizeReverseGeocodeResult = (reverseGeocodeResult) => {
    if (!reverseGeocodeResult) return 'Address unknown';
    // The /reverse endpoint often returns the full address in display_name
    if (reverseGeocodeResult.display_name) {
        return reverseGeocodeResult.display_name;
    }
    // Fallback to building it from parts if display_name is not present
    if (reverseGeocodeResult.address) {
        return formatNominatimAddress(reverseGeocodeResult.address);
    }
    return 'Could not determine address';
};

/**
 * Determines if a pub is in London based on its address.
 * @param {object} pub The pub object.
 * @returns {boolean} True if the pub is likely in London.
 */
export const isLondonPub = (pub) => {
    if (!pub || !pub.address) return false;
    // Simple check for "London" in the address, but not "Londonderry".
    const lowerAddress = pub.address.toLowerCase();
    return lowerAddress.includes('london') && !lowerAddress.includes('londonderry');
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

/**
 * Infers currency information based *only* on a pub's country code.
 * Defaults to GBP (£) for UK or any unidentified/missing country codes.
 * @param {{country_code?: string}} pubLocationData The pub's location data, only using country_code.
 * @returns {{symbol: string, code: string}} The currency symbol and code.
 */
export const getCurrencyInfo = (pubLocationData = {}) => {
    const { country_code } = pubLocationData;

    // 1. Check if country_code exists.
    if (country_code) {
        const code = country_code.toLowerCase().trim();

        // 2. Match against a strict list of known codes.
        if (EUROZONE_COUNTRY_CODES.has(code)) {
            return { symbol: '€', code: 'EUR' };
        }
        if (code === 'us') {
            return { symbol: '$', code: 'USD' };
        }
        if (code === 'gb' || code === 'uk') {
            return { symbol: '£', code: 'GBP' };
        }
        if (code === 'au') {
            return { symbol: '$', code: 'AUD' };
        }
        if (code === 'ca') {
            return { symbol: '$', code: 'CAD' };
        }
        if (code === 'tr') {
            return { symbol: '₺', code: 'TRY' };
        }
        if (code === 'pl') {
            return { symbol: 'zł', code: 'PLN' };
        }
        if (code === 'il') {
            return { symbol: '₪', code: 'ILS' };
        }
    }

    // 3. If country_code is null, empty, or not in the list above, default to GBP.
    return { symbol: '£', code: 'GBP' };
};

/**
 * Converts a price star rating into a human-readable price range string.
 * @param {number} avgStarRating The average star rating for price (1-5).
 * @param {string} currencySymbol The currency symbol to use (e.g., '£', '€', '$').
 * @param {boolean} isLondon Whether to use the London-specific price scale.
 * @returns {string} A formatted price range string, e.g., "£5.50 - £5.99".
 */
export const getPriceRangeFromStars = (avgStarRating, currencySymbol, isLondon = false) => {
    if (isLondon) {
        if (avgStarRating > 4.5) return `< ${currencySymbol}6.00`;
        if (avgStarRating > 3.5) return `${currencySymbol}6.00 - ${currencySymbol}6.74`;
        if (avgStarRating > 2.5) return `${currencySymbol}6.75 - ${currencySymbol}7.49`;
        if (avgStarRating > 1.5) return `${currencySymbol}7.50 - ${currencySymbol}8.49`;
        if (avgStarRating > 0) return `> ${currencySymbol}8.49`;
        return '';
    }

    // Original logic
    if (avgStarRating > 4.5) return `< ${currencySymbol}4.50`;
    if (avgStarRating > 3.5) return `${currencySymbol}4.50 - ${currencySymbol}5.49`;
    if (avgStarRating > 2.5) return `${currencySymbol}5.50 - ${currencySymbol}5.99`;
    if (avgStarRating > 1.5) return `${currencySymbol}6.00 - ${currencySymbol}6.99`;
    if (avgStarRating > 0) return `> ${currencySymbol}7.00`;
    return ''; // Return empty string if no rating
};

/**
 * Converts an exact price into a star rating (1-5).
 * @param {number | string | null} price The exact price.
 * @param {boolean} isLondon Whether to use the London-specific price scale.
 * @returns {number} The star rating (0-5).
 */
export const getStarRatingFromPrice = (price, isLondon = false) => {
    if (price === '' || price === null || isNaN(price)) return 0;
    const numericPrice = parseFloat(price);

    if (isLondon) {
        if (numericPrice < 6.00) return 5;
        if (numericPrice <= 6.74) return 4;
        if (numericPrice <= 7.49) return 3;
        if (numericPrice <= 8.49) return 2;
        return 1;
    }

    // Original logic
    if (numericPrice < 4.50) return 5;
    if (numericPrice <= 5.49) return 4;
    if (numericPrice <= 5.99) return 3;
    if (numericPrice <= 6.99) return 2;
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