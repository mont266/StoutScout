import { Coordinates } from './types';

// St Stephen's Green, a fallback central point in Dublin for when live location is not available.
export const DEFAULT_LOCATION: Coordinates = { lat: 53.3498, lng: -6.2603 };

// New constants for settings
export const MILES_TO_METERS = 1609.34;
export const MIN_RADIUS_MI = 0.5;
export const MAX_RADIUS_MI = 5;
export const DEFAULT_RADIUS_MI = 2;

// XP and Leveling
export const XP_PER_RATING = 10;
export const XP_PER_LEVEL = 100;

export const RANKS = [
  "Stout Scamp",      // Level 0-4
  "Pint Pathfinder",  // Level 5-9
  "Lager Lieutenant", // Level 10-14
  "Ale Admiral",      // Level 15-19
  "Stout Sensei",     // Level 20-24
  "Guinness Guru"     // Level 25+
];
