
import { DEFAULT_RADIUS_MI, MILES_TO_METERS } from './constants.js';

const SETTINGS_STORAGE_KEY = 'stout-scout-settings';

/**
 * Loads the user's settings from localStorage.
 * Provides default values if no settings are stored.
 */
export const loadSettings = () => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Basic validation to ensure stored settings are not malformed
      if (parsed.unit && parsed.radius) {
         return {
           ...parsed,
           theme: parsed.theme || 'dark',
           developerMode: parsed.developerMode || false,
         };
      }
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage", e);
  }
  // Default settings
  return {
    unit: 'mi',
    radius: DEFAULT_RADIUS_MI * MILES_TO_METERS,
    theme: 'dark',
    developerMode: false,
  };
};

/**
 * Saves the user's settings to localStorage.
 */
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
};
