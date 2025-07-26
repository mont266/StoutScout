// This file is now 'utils.js'
import { RANK_DETAILS } from './constants.js';

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
 * Converts to lowercase, trims whitespace, and removes a leading "the " if present.
 * @param {string} name The original pub name.
 * @returns {string} The normalized name.
 */
export const normalizePubNameForComparison = (name) => {
  if (!name) return '';
  // Convert to lowercase, trim whitespace, and remove a leading "the " if present.
  return name.toLowerCase().trim().replace(/^the\s+/, '');
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
 * @returns {object} A pub object `{id, name, address, location}`.
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
        location: {
            lat: parseFloat(lat),
            lng: parseFloat(lon),
        },
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

const EUROZONE_COUNTRIES = [
    'Austria', 'Belgium', 'Croatia', 'Cyprus', 'Estonia', 'Finland', 
    'France', 'Germany', 'Greece', 'Ireland', 'Italy', 'Latvia', 
    'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Portugal', 
    'Slovakia', 'Slovenia', 'Spain'
];

/**
 * Infers currency information based on keywords in the address.
 * Defaults to GBP (£) for UK/unidentified locations.
 * @param {string} address The pub's address string.
 * @returns {{symbol: string, code: string}} The currency symbol and code.
 */
export const getCurrencyInfo = (address = '') => {
    const lowerCaseAddress = address.toLowerCase();

    if (lowerCaseAddress.includes('australia')) {
        return { symbol: '$', code: 'AUD' };
    }

    if (lowerCaseAddress.includes('usa') || lowerCaseAddress.includes('united states')) {
        return { symbol: '$', code: 'USD' };
    }

    if (EUROZONE_COUNTRIES.some(country => lowerCaseAddress.includes(country.toLowerCase()))) {
        // Specifically exclude Northern Ireland from the Eurozone check as it uses GBP
        if (!lowerCaseAddress.includes('northern ireland')) {
            return { symbol: '€', code: 'EUR' };
        }
    }

    return { symbol: '£', code: 'GBP' };
};

/**
 * Converts a price star rating into a human-readable price range string.
 * This logic should mirror the star calculation in RatingForm.jsx and sorting in App.jsx.
 * @param {number} avgStarRating The average star rating for price (1-5).
 * @param {string} currencySymbol The currency symbol to use (e.g., '£', '€', '$').
 * @returns {string} A formatted price range string, e.g., "£5.50 - £5.99".
 */
export const getPriceRangeFromStars = (avgStarRating, currencySymbol) => {
    if (avgStarRating > 4.5) return `< ${currencySymbol}4.50`;
    if (avgStarRating > 3.5) return `${currencySymbol}4.50 - ${currencySymbol}5.49`;
    if (avgStarRating > 2.5) return `${currencySymbol}5.50 - ${currencySymbol}5.99`;
    if (avgStarRating > 1.5) return `${currencySymbol}6.00 - ${currencySymbol}6.99`;
    if (avgStarRating > 0) return `> ${currencySymbol}7.00`;
    return ''; // Return empty string if no rating
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