import { Coordinates, Rank } from './types.ts';

// St Stephen's Green, a fallback central point in Dublin for when live location is not available.
export const DEFAULT_LOCATION: Coordinates = { lat: 53.3498, lng: -6.2603 };

// New constants for settings
export const MILES_TO_METERS = 1609.34;
export const MIN_RADIUS_MI = 0.5;
export const MAX_RADIUS_MI = 5;
export const DEFAULT_RADIUS_MI = 2;

// Leveling is now based on number of reviews
export const REVIEWS_PER_LEVEL = 3;

// The single source of truth for rank progression.
// Each rank has a name, a Font Awesome icon, and the minimum level required.
export const RANK_DETAILS: Rank[] = [
  { name: "Stout Sprout",       icon: "fa-seedling",       minLevel: 0 },
  { name: "Pint Pilgrim",       icon: "fa-map-signs",      minLevel: 3 },
  { name: "Draught Discoverer", icon: "fa-binoculars",     minLevel: 6 },
  { name: "Froth Finder",       icon: "fa-search",         minLevel: 9 },
  { name: "Cask Captain",       icon: "fa-anchor",         minLevel: 12 },
  { name: "Black Stuff Baron",  icon: "fa-crown",          minLevel: 15 },
  { name: "Creamflow Commander",icon: "fa-shield-alt",     minLevel: 18 },
  { name: "Nitrogen Knight",    icon: "fa-flask",          minLevel: 21 },
  { name: "Stout Sensei",       icon: "fa-graduation-cap", minLevel: 24 },
  { name: "Guinness Guru",      icon: "fa-book-open",      minLevel: 27 },
  { name: "Pint Paragon",       icon: "fa-gem",            minLevel: 30 },
];