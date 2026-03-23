// St Stephen's Green, a fallback central point in Dublin for when live location is not available.
export const DEFAULT_LOCATION = { lat: 53.3498, lng: -6.2603 };

// New constants for settings
export const MILES_TO_METERS = 1609.34;
export const MIN_RADIUS_MI = 0.5;
export const MAX_RADIUS_MI = 5;
export const DEFAULT_RADIUS_MI = 2;

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=uk.co.stoutly.twa';
export const APP_STORE_URL = 'https://apps.apple.com/in/app/stoutly/id6758011319';

// The single source of truth for rank progression.
export const NETLIFY_URL = 'https://app.stoutly.co.uk';
// Each rank has a name, a Font Awesome icon, and the minimum level required.
export const RANK_DETAILS = [
  { name: "Stout Sprout",       icon: "fa-seedling",       minLevel: 1 },
  { name: "Pint Pilgrim",       icon: "fa-map-signs",      minLevel: 3 },
  { name: "Draught Discoverer", icon: "fa-binoculars",     minLevel: 6 },
  { name: "Dome Detective",     icon: "fa-search",         minLevel: 9 },
  { name: "Cask Captain",       icon: "fa-anchor",         minLevel: 12 },
  { name: "Black Stuff Baron",  icon: "fa-crown",          minLevel: 15 },
  { name: "Creamflow Commander",icon: "fa-shield-alt",     minLevel: 18 },
  { name: "Nitrogen Knight",    icon: "fa-flask",          minLevel: 21 },
  { name: "Stout Sensei",       icon: "fa-graduation-cap", minLevel: 24 },
  { name: "Guinness Guru",      icon: "fa-book-open",      minLevel: 27 },
  { name: "Pint Paragon",       icon: "fa-gem",            minLevel: 30 },
];