

import { DEFAULT_RADIUS_MI, MILES_TO_METERS } from './constants.js';

const SETTINGS_STORAGE_KEY = 'stoutly-settings';

/**
 * Loads the user's settings from localStorage.
 * Provides default values if no settings are stored.
 */
export const loadSettings = () => {
  const defaults = {
    unit: 'mi',
    radius: DEFAULT_RADIUS_MI * MILES_TO_METERS,
    theme: 'dark',
    developerMode: false,
  };

  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Combine stored settings with defaults to ensure all keys are present
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage", e);
  }
  
  // Return defaults if nothing is stored or loading fails
  return defaults;
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