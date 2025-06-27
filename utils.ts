import { RANKS } from './constants';

export const getRank = (level: number): string => {
  const rankIndex = Math.floor(level / 5);
  return RANKS[Math.min(rankIndex, RANKS.length - 1)];
};

/**
 * Parses a Google Maps formatted address string and returns a concise "Town, Country" string.
 * It handles different formats, such as those in the US vs. the UK.
 * @param address The full formatted address string.
 * @returns A formatted "Town, Country" string.
 */
export const formatLocationDisplay = (address?: string): string => {
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

export const formatTimeAgo = (timestamp: number): string => {
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