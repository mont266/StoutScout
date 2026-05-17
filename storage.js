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
    isShopEnabled: false,
    showSearchRadius: true,
    showSearchOrigin: false,
    showUserRatedPubs: false,
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

const RATING_PROMPT_STORAGE_KEY = 'stoutly-rating-prompt-state';

export const loadRatingPromptState = () => {
  const defaults = {
    appOpenCount: 0,
    userRatingCount: 0,
    ratePromptState: 'not_shown', // 'not_shown', 'remind_later', 'dismissed'
    remindLaterTimestamp: null,
  };

  try {
    const storedState = localStorage.getItem(RATING_PROMPT_STORAGE_KEY);
    if (storedState) {
      return { ...defaults, ...JSON.parse(storedState) };
    }
  } catch (e) {
    console.error("Failed to load rating prompt state", e);
  }
  return defaults;
};

export const saveRatingPromptState = (state) => {
  try {
    localStorage.setItem(RATING_PROMPT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save rating prompt state to localStorage", e);
  }
};