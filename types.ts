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

export interface UserProfile {
  username: string;
  isBetaTester: boolean;
}

export interface UserRating {
  pubId: string;
  pubName: string;
  pubAddress?: string;
  rating: Rating;
  timestamp: number; // Unix timestamp
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