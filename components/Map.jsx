import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { FilterType } from '../types.js';
import { DEFAULT_LOCATION } from '../constants.js';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const mapStylesDark = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ "visibility": "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const mapStylesLight = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];


const libraries = ['places', 'marker'];

const Map = ({ pubs, userLocation, searchCenter, searchRadius, onSelectPub, selectedPubId, onPlacesFound, theme, filter, onCenterChange, refreshTrigger }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Effect to pan the map to a selected pub, or to the user's live location
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedPubId) {
        const pub = pubs.find(p => p.id === selectedPubId);
        if (pub) {
            mapRef.current.panTo(pub.location);
        }
    } else {
        mapRef.current.panTo(searchCenter);
    }
  }, [selectedPubId, pubs, searchCenter]);

  // Refactored search logic to be callable
  const searchForPubs = useCallback(async () => {
    if (!isLoaded || !mapRef.current || !window.google || !searchCenter) {
      return;
    }
    
    const request = {
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      textQuery: 'pub OR bar',
      locationBias: {
        center: new window.google.maps.LatLng(searchCenter.lat, searchCenter.lng),
        radius: searchRadius,
      },
      maxResultCount: 20,
    };

    try {
      const { places } = await window.google.maps.places.Place.searchByText(request);
      const wasCapped = places?.length === 20;
      onPlacesFound(places || [], wasCapped);
    } catch (error) {
      console.error('Places search failed:', error);
      onPlacesFound([], false);
    }
  }, [isLoaded, searchCenter, searchRadius, onPlacesFound]);

  // Use a ref to hold the latest search function to avoid stale closures in effects
  const searchForPubsRef = useRef(searchForPubs);
  useEffect(() => {
    searchForPubsRef.current = searchForPubs;
  });

  // Effect to perform a debounced search when the map is dragged
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(() => {
      searchForPubsRef.current();
    }, 500); // 500ms debounce

    return () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    };
  }, [searchCenter, searchRadius]);

  // Effect to perform an immediate search when the refresh button is clicked
  useEffect(() => {
    if (refreshTrigger > 0) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchForPubsRef.current();
    }
  }, [refreshTrigger]);

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback() {
    mapRef.current = null;
  }, []);
  
  const handleIdle = useCallback(() => {
      if (mapRef.current && onCenterChange) {
          const newCenter = mapRef.current.getCenter();
          if (newCenter) {
              onCenterChange({ lat: newCenter.lat(), lng: newCenter.lng() });
          }
      }
  }, [onCenterChange]);
  
  const mapOptions = useMemo(() => ({
    styles: theme === 'dark' ? mapStylesDark : mapStylesLight,
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
  }), [theme]);

  const top3RatedPubsInDistanceOrder = useMemo(() => {
    if (filter !== FilterType.Distance) return [];
    return pubs
        .filter(p => p.ratings.length > 0)
        .slice(0, 3)
        .map(p => p.id);
  }, [pubs, filter]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-red-900/50 text-white p-4 text-center">
        Error loading maps. Please check your internet connection and ensure your API key is correct and has the Maps JavaScript and Places APIs enabled.
      </div>
    );
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={searchCenter}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
      onIdle={handleIdle}
    >
      {userLocation && userLocation.lat !== DEFAULT_LOCATION.lat && (
        <OverlayView
          position={userLocation}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div style={{ transform: 'translate(-50%, -50%)', zIndex: 100 }} title="Your Location">
             <div className="w-4 h-4 rounded-full bg-[#4285F4] border-2 border-white dark:border-gray-800 shadow-md animate-pulse-blue-dot"></div>
          </div>
        </OverlayView>
      )}

      {pubs.map((pub, index) => {
        const isSelected = pub.id === selectedPubId;
        const strokeColor = theme === 'dark' ? '#FFFFFF' : '#1F2937'; // White for dark, Gray-800 for light
        let fillColor = theme === 'dark' ? '#4B5563' : '#9CA3AF'; // Default gray

        let highlightRank = -1;
        if (filter === FilterType.Distance) {
            highlightRank = top3RatedPubsInDistanceOrder.indexOf(pub.id);
        } else {
            // For price and quality, the top 3 are the first in the sorted list.
            if (index < 3) highlightRank = index;
        }
        
        if (highlightRank === 0) {
            fillColor = '#FFD700'; // Gold
        } else if (highlightRank === 1) {
            fillColor = '#C0C0C0'; // Silver
        } else if (highlightRank === 2) {
            fillColor = '#CD7F32'; // Bronze
        }

        if (isSelected) {
            fillColor = '#FBBF24'; // Selected Amber-400 overrides highlight
        }
        
        let zIndex = 1;
        if (isSelected) {
            zIndex = 50;
        } else if (highlightRank !== -1) {
            zIndex = 10 - highlightRank; // Gold=10, Silver=9, Bronze=8
        }
        
        return (
            <OverlayView
              key={pub.id}
              position={pub.location}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
                <div 
                    style={{ zIndex, cursor: 'pointer' }}
                    title={pub.name}
                    onClick={() => onSelectPub(pub.id)}
                >
                    <div 
                        className="w-10 h-10 relative flex items-center justify-center"
                        style={{ transform: 'translate(-50%, -100%)' }}
                    >
                        <svg viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="1" className="w-full h-full drop-shadow-lg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        </svg>
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-3">
                           <i className="fas fa-beer text-base" style={{ color: strokeColor }}></i>
                        </div>
                    </div>
                </div>
            </OverlayView>
        );
      })}
    </GoogleMap>
  ) : null;
};

export default Map;