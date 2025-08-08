import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { normalizeNominatimResult } from '../utils.js';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// --- Custom Markers ---
const userLocationIcon = L.divIcon({
  html: `<div class="w-4 h-4 rounded-full bg-[#4285F4] border-2 border-white dark:border-gray-800 shadow-md animate-pulse-blue-dot"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const createPubIcon = (fillColor, strokeColor) => L.divIcon({
  html: `
    <div class="w-10 h-10 relative flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" class="w-full h-full drop-shadow-lg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-3">
        <i class="fas fa-beer text-base" style="color: ${strokeColor}"></i>
      </div>
    </div>
  `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const placementIcon = L.divIcon({
  html: `
    <div class="w-12 h-12 relative flex items-center justify-center animate-pulse">
      <svg viewBox="0 0 24 24" fill="#FBBF24" stroke="#1A202C" stroke-width="1.5" class="w-full h-full drop-shadow-2xl">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-3">
        <i class="fas fa-plus text-lg text-black"></i>
      </div>
    </div>
  `,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
});


// --- Map Logic Components ---
const MapEvents = ({ onMapMove }) => {
  useMapEvents({
    dragend: (e) => {
      onMapMove(e.target.getCenter());
    },
  });
  return null;
};

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
        map.flyTo(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const SearchOnFlyEndController = ({ enabled, onFlyEnd }) => {
    useMapEvents({
        moveend: () => {
            if (enabled) {
                onFlyEnd();
            }
        },
    });
    return null;
};

const MapComponent = ({
  pubs, userLocation, center, onSelectPub, selectedPubId, onNominatimResults, theme, onMapMove,
  refreshTrigger, showSearchAreaButton, onSearchThisArea,
  searchOnNextMoveEnd, onSearchAfterMove,
  // Props for pub placement flow
  pubPlacementState, finalPlacementLocation, onPlacementPinMove,
  isDesktop,
}) => {
  const mapRef = useRef(null);

  const searchForPubs = useCallback(async (map) => {
    if (!map) return;
    
    const bounds = map.getBounds();
    const viewbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
    // Search for amenities that are pubs OR bars. Tavern is less common and often duplicates.
    const searchTerms = ['pub', 'bar'];
    
    try {
        const searchPromises = searchTerms.map(term => {
            // This is a structured query for a specific amenity type, confined to the map view.
            // It's more precise than a generic text search (`q=...`).
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&viewbox=${viewbox}&bounded=1&limit=50&amenity=${term}`;
            return fetch(url, { headers: { 'User-Agent': userAgent } });
        });

        const responses = await Promise.all(searchPromises);
        
        const results = await Promise.all(responses.map(res => {
            if (!res.ok) {
                 console.warn(`A Nominatim search request for a term failed with status: ${res.status}`);
                 return []; // Return empty array for failed requests
            }
            return res.json();
        }));

        const allPlaces = [].concat(...results);
        
        // De-duplicate results based on osm_id, as a pub can be tagged as both a pub and a bar.
        const uniquePlaces = Array.from(new window.Map(allPlaces.map(place => [place.osm_id, place])).values());

        const normalizedPlaces = uniquePlaces.map(normalizeNominatimResult);
        
        // Nominatim's hard limit is 50 results per query. If the combined unique results
        // are close to this limit for any of the search terms, we can assume the results were capped.
        const isCapped = uniquePlaces.length >= 49;

        onNominatimResults(normalizedPlaces, isCapped);

    } catch (error) {
        console.error('Nominatim search failed:', error);
        onNominatimResults([], false);
    }
  }, [onNominatimResults]);
  
  // This handles manual refreshes from the refresh button or "Search this Area"
  useEffect(() => {
    if (refreshTrigger > 0 && mapRef.current) {
      searchForPubs(mapRef.current);
    }
  }, [refreshTrigger, searchForPubs]);

  const mapTiles = useMemo(() => {
    if (theme === 'dark') {
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }, [theme]);

  const mapAttribution = useMemo(() => {
    if (theme === 'dark') {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  }, [theme]);


  const icons = useMemo(() => {
    const strokeColor = theme === 'dark' ? '#1A202C' : '#FFFFFF';
    return {
      unrated: createPubIcon('#6B7280', strokeColor),   // gray-500
      rated: createPubIcon('#F59E0B', strokeColor),     // amber-600 (Gold)
      selected: createPubIcon('#FBBF24', strokeColor),  // amber-400 (Brighter Gold)
    }
  }, [theme]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={14}
        style={containerStyle}
        zoomControl={false}
      >
        <MapController center={center} />
        {/* Use a key on TileLayer to force re-render when theme changes */}
        <TileLayer
          key={theme}
          url={mapTiles}
          attribution={mapAttribution}
          className={theme === 'dark' ? 'map-tiles-dark' : ''}
        />

        <MapEvents onMapMove={onMapMove} />
        <SearchOnFlyEndController enabled={searchOnNextMoveEnd} onFlyEnd={onSearchAfterMove} />

        {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}

        {pubs.map(pub => {
          let icon;
          if (pub.id === selectedPubId) {
            icon = icons.selected;
          } else if (pub.ratings?.length > 0) {
            icon = icons.rated;
          } else {
            icon = icons.unrated;
          }

          return (
            <Marker 
                key={pub.id} 
                position={pub.location} 
                icon={icon}
                eventHandlers={{ click: () => onSelectPub(pub) }} 
            />
          );
        })}

        {pubPlacementState && finalPlacementLocation && (
          <Marker
            position={finalPlacementLocation}
            icon={placementIcon}
            draggable={true}
            eventHandlers={{
                dragend: (e) => onPlacementPinMove(e.target.getLatLng()),
            }}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>
      
      {showSearchAreaButton && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={onSearchThisArea}
            className={`bg-amber-500 text-black font-bold rounded-full shadow-lg hover:bg-amber-400 transition-colors flex items-center animate-fade-in-down ${isDesktop ? 'px-4 py-2 space-x-2' : 'px-3 py-1.5 text-sm space-x-1.5'}`}
          >
            <i className="fas fa-search-location"></i>
            <span>Search This Area</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MapComponent;