import { Rating, Settings, UserProfile, UserRating } from './types';
import { DEFAULT_RADIUS_MI, MILES_TO_METERS } from './constants';

const RATINGS_STORAGE_KEY = 'stout-scout-ratings';
const SETTINGS_STORAGE_KEY = 'stout-scout-settings';
const USER_PROFILE_STORAGE_KEY = 'stout-scout-user-profile';
const USER_RATINGS_STORAGE_KEY = 'stout-scout-user-ratings';

/**
 * Loads the user's settings from localStorage.
 * Provides default values if no settings are stored.
 */
export const loadSettings = (): Settings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Basic validation to ensure stored settings are not malformed
      if (parsed.unit && parsed.radius) {
         return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage", e);
  }
  // Default settings
  return {
    unit: 'mi',
    radius: DEFAULT_RADIUS_MI * MILES_TO_METERS,
  };
};

/**
 * Saves the user's settings to localStorage.
 */
export const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
};


/**
 * Loads the ratings map from localStorage.
 * Ratings are stored as a JSON string of an array of [key, value] pairs.
 */
export const loadRatings = (): Map<string, Rating[]> => {
  try {
    const storedRatings = localStorage.getItem(RATINGS_STORAGE_KEY);
    if (storedRatings) {
      const parsed = JSON.parse(storedRatings);
      return new Map(parsed);
    }
  } catch (e) {
    console.error("Failed to load ratings from localStorage", e);
  }
  return new Map();
};

/**
 * Saves the ratings map to localStorage.
 * Converts the Map to an array of [key, value] pairs for JSON serialization.
 */
export const saveRatings = (ratings: Map<string, Rating[]>) => {
  try {
    const array = Array.from(ratings.entries());
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(array));
  } catch (e) {
    console.error("Failed to save ratings to localStorage", e);
  }
};

/**
 * Loads the user's profile from localStorage.
 */
export const loadUserProfile = (): UserProfile => {
  try {
    const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.xp === 'number' && typeof parsed.level === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load user profile from localStorage", e);
  }
  // Default profile
  return {
    xp: 0,
    level: 0,
  };
};

/**
 * Saves the user's profile to localStorage.
 */
export const saveUserProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save user profile to localStorage", e);
  }
};

/**
 * Loads the user's submitted ratings from localStorage.
 */
export const loadUserRatings = (): UserRating[] => {
  try {
    const stored = localStorage.getItem(USER_RATINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load user ratings from localStorage", e);
  }
  return [];
};

/**
 * Saves the user's submitted ratings to localStorage.
 */
export const saveUserRatings = (ratings: UserRating[]) => {
  try {
    localStorage.setItem(USER_RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.error("Failed to save user ratings to localStorage", e);
  }
};