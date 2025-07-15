
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Rating {
  price: number; // 1-5
  quality: number; // 1-5
}

export interface Pub {
  id: string; // Changed from number to string to store Google's place_id
  name: string;
  address: string;
  location: Coordinates;
  ratings: Rating[];
}

export enum FilterType {
  Distance = 'distance',
  Price = 'price',
  Quality = 'quality'
}

export type DistanceUnit = 'km' | 'mi';

export interface Settings {
  unit: DistanceUnit;
  radius: number; // Stored in meters
  theme: 'light' | 'dark';
  developerMode: boolean;
}

// Updated to better match Supabase 'profiles' table
export interface UserProfile {
  id: string;
  username: string;
  is_beta_tester: boolean;
  level: number;
  xp: number;
}

// Kept signature the same, but will be populated by Supabase data.
// This minimizes changes needed in consuming components.
export interface UserRating {
  id: number;
  pubId: string;
  pubName: string;
  pubAddress?: string;
  rating: Rating;
  timestamp: number; // Unix timestamp (will be derived from created_at)
}


export interface Rank {
  name: string;
  icon: string;
  minLevel: number;
}


declare global {
  namespace google.maps {
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class Point {
      constructor(x: number, y: number);
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Map {
      panTo(location: Coordinates | LatLng): void;
    }

    enum SymbolPath {
      CIRCLE,
    }

    namespace places {
      class Place {
        static searchNearby(request: SearchNearbyRequest): Promise<{ places: Place[] }>;
        id?: string;
        displayName?: string;
        formattedAddress?: string;
        location?: LatLng;
      }

      interface SearchNearbyRequest {
        locationRestriction: {
          center: Coordinates | LatLng;
          radius: number;
        };
        includedTypes: string[];
        maxResultCount?: number;
        fields?: string[];
      }
    }

    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: any);
      }
    }
  }
}