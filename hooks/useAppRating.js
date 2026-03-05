import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PLAY_STORE_URL, APP_STORE_URL } from '../constants.js';
import { getMobileOS } from '../utils.js';

const APP_LAUNCH_COUNT_KEY = 'appLaunchCount';
const USER_RATING_COUNT_KEY = 'userRatingCount';
const RATING_PROMPT_STATE_KEY = 'ratingPromptState';

export const useAppRating = () => {
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);

  // 1. Increment app launch count on initial load
  useEffect(() => {
    const incrementLaunchCount = async () => {
      const value = localStorage.getItem(APP_LAUNCH_COUNT_KEY);
      const launchCount = parseInt(value || '0', 10) + 1;
      localStorage.setItem(APP_LAUNCH_COUNT_KEY, launchCount.toString());
    };

    incrementLaunchCount();
  }, []);

  // 2. Function to be called after a user rates a pint
  const triggerRatingPromptCheck = async (totalRatingCount) => {
    const platform = Capacitor.getPlatform();
    const mobileOS = getMobileOS();
    
    // Allow on native apps OR mobile web (Android/iOS)
    const isNative = platform === 'android' || platform === 'ios';
    const isMobile = mobileOS === 'Android' || mobileOS === 'iOS';
    
    if (!isNative && !isMobile) {
      return; 
    }

    // Increment local session rating count (optional, but good for tracking session activity)
    const ratingCountVal = localStorage.getItem(USER_RATING_COUNT_KEY);
    const sessionRatingCount = parseInt(ratingCountVal || '0', 10) + 1;
    localStorage.setItem(USER_RATING_COUNT_KEY, sessionRatingCount.toString());

    // Check all conditions
    const ratingPromptState = localStorage.getItem(RATING_PROMPT_STATE_KEY);
    const hasBeenRatedOrDeclined = ratingPromptState === 'rated' || ratingPromptState === 'declined';

    // Use totalRatingCount if provided, otherwise fall back to session count
    const countToCheck = totalRatingCount !== undefined ? totalRatingCount : sessionRatingCount;

    // Trigger if user has rated at least 5 times total (or 2 times in this session if total not provided)
    // The user mentioned 91 ratings, so 5 is a safe lower bound to ensure they are engaged.
    const threshold = totalRatingCount !== undefined ? 5 : 2;

    if (!hasBeenRatedOrDeclined && countToCheck >= threshold) {
        setShowRatingPrompt(true);
    }
  };

  // 3. Actions for the prompt buttons
  const handleRateNow = async () => {
    setShowRatingPrompt(false);
    localStorage.setItem(RATING_PROMPT_STATE_KEY, 'rated');
    
    const platform = Capacitor.getPlatform();
    const mobileOS = getMobileOS();
    
    let url = PLAY_STORE_URL;
    if (platform === 'ios' || mobileOS === 'iOS') {
        url = APP_STORE_URL;
    }
    
    window.open(url, '_blank');
  };

  const handleRemindLater = () => {
    setShowRatingPrompt(false);
    // We don't set a value, so the prompt can appear again later
  };

  const handleDecline = async () => {
    setShowRatingPrompt(false);
    localStorage.setItem(RATING_PROMPT_STATE_KEY, 'declined');
  };

  return {
    showRatingPrompt,
    triggerRatingPromptCheck,
    handleRateNow,
    handleRemindLater,
    handleDecline,
  };
};
