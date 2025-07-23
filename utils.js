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
 * Parses a Google Maps formatted address string and returns a concise "Town, Country" string.
 * It handles different formats, such as those in the US vs. the UK.
 * @param {string | undefined} address The full formatted address string.
 * @returns A formatted "Town, Country" string.
 */
export const formatLocationDisplay = (address) => {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());

  if (parts.length < 2) {
    return address;
  }

  let country = parts[parts.length - 1];
  if (country === 'United Kingdom') {
    country = 'UK';
  } else if (country === 'United States') {
    country = 'USA';
  }
  
  let town = '';
  // Special case for USA format like "..., Town, ST 12345, USA"
  if ((country === 'USA') && parts.length >= 3) {
      town = parts[parts.length - 3];
  } else if (parts.length >= 2) {
      // General case for formats like "..., Town Postcode, Country"
      const townPart = parts[parts.length - 2];
      const match = townPart.match(/^[a-zA-Z\s-'.()]+/);
      town = match ? match[0].trim() : townPart;
  }

  if (town && country) {
      // Avoid returning redundant info like "UK, UK" if parsing is weird
      if (town === country || (country === 'UK' && town === 'United Kingdom')) {
          return country;
      }
      return `${town}, ${country}`;
  }

  return address; // Fallback
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