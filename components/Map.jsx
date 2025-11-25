import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { normalizeOverpassResult, getDistance } from '../utils.js';

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

const createPubIcon = (fillColor, strokeColor, sellsGuinnessZero) => L.divIcon({
  html: `
    <div class="w-10 h-10 relative flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" class="w-full h-full drop-shadow-lg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-3">
        ${sellsGuinnessZero ? '<div class="w-3 h-3 rounded-full bg-black border-2 border-amber-400"></div>' : `<i class="fas fa-beer text-base" style="color: ${strokeColor}"></i>`}
      </div>
    </div>
  `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const createClosedPubIcon = (strokeColor) => L.divIcon({
  html: `
    <div class="w-10 h-10 relative flex items-center justify-center opacity-60">
      <svg viewBox="0 0 24 24" fill="#6B7280" stroke="${strokeColor}" stroke-width="1" class="w-full h-full drop-shadow-lg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-3">
        <i class="fas fa-times text-lg" style="color: ${strokeColor}"></i>
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
  mapTileRefreshKey,
  searchOrigin,
  radius,
  isSidebarCollapsed,
}) => {
  const mapRef = useRef(null);
  const isSearchingRef = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      // The sidebar has a 300ms transition. We wait slightly longer to ensure
      // the transition is complete before invalidating the map size.
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 310);

      // Cleanup the timer if the component unmounts or the state changes again
      return () => clearTimeout(timer);
    }
  }, [isSidebarCollapsed]);

  const searchForPubs = useCallback(async () => {
    if (isSearchingRef.current) {
        console.warn('Search already in progress, skipping.');
        return;
    }
    if (!searchOrigin || !radius) {
      console.warn('Search attempted without searchOrigin or radius.');
      onNominatimResults([], false);
      return;
    }
    
    isSearchingRef.current = true;

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"~"^(pub|bar)$"](around:${radius},${searchOrigin.lat},${searchOrigin.lng});
        way["amenity"~"^(pub|bar)$"](around:${radius},${searchOrigin.lat},${searchOrigin.lng});
        relation["amenity"~"^(pub|bar)$"](around:${radius},${searchOrigin.lat},${searchOrigin.lng});
      );
      out center;
    `;
    
    const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
    const endpoint = 'https://overpass-api.de/api/interpreter';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `data=${encodeURIComponent(overpassQuery)}`
        });

        if (!response.ok) {
            console.error(`Overpass API request failed with status: ${response.status}`);
            onNominatimResults([], false);
            return;
        }

        const data = await response.json();
        
        // Normalize and filter out invalid results (e.g., no name, no location)
        const allFoundPubs = data.elements
            .map(normalizeOverpassResult)
            .filter(pub => pub && pub.name && pub.location);
        
        // Sort the found pubs by distance from the search origin
        const sortedPubs = allFoundPubs.sort((a, b) => 
            getDistance(a.location, searchOrigin) - getDistance(b.location, searchOrigin)
        );

        // Take the closest 50
        const top50Pubs = sortedPubs.slice(0, 50);
        const isCapped = sortedPubs.length > 50;

        onNominatimResults(top50Pubs, isCapped);

    } catch (error) {
        console.error('Overpass API search failed:', error);
        onNominatimResults([], false);
    } finally {
        isSearchingRef.current = false;
    }
  }, [onNominatimResults, searchOrigin, radius]);
  
  // This handles manual refreshes from the refresh button or "Search this Area"
  useEffect(() => {
    if (refreshTrigger > 0) {
      searchForPubs();
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
    const sellsGuinnessZeroIcon = (fill) => createPubIcon(fill, strokeColor, true);
    const regularIcon = (fill) => createPubIcon(fill, strokeColor, false);

    return {
      unrated: regularIcon('#6B7280'),   // gray-500
      rated: regularIcon('#F59E0B'),     // amber-600 (Gold)
      selected: regularIcon('#FBBF24'),  // amber-400 (Brighter Gold)
      unratedZero: sellsGuinnessZeroIcon('#6B7280'),
      ratedZero: sellsGuinnessZeroIcon('#F59E0B'),
      selectedZero: sellsGuinnessZeroIcon('#FBBF24'),
      closed: createClosedPubIcon(strokeColor),
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
        {/* Use a key on TileLayer to force re-render when theme or refresh key changes */}
        <TileLayer
          key={`${theme}-${mapTileRefreshKey}`}
          url={mapTiles}
          attribution={mapAttribution}
          className={theme === 'dark' ? 'map-tiles-dark' : ''}
        />

        <MapEvents onMapMove={onMapMove} />
        <SearchOnFlyEndController enabled={searchOnNextMoveEnd} onFlyEnd={onSearchAfterMove} />

        {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}

        {pubs.map(pub => {
          let icon;
          const sellsGuinnessZero = (pub.guinness_zero_confirmations || 0) > (pub.guinness_zero_denials || 0);

          if (pub.is_closed) {
            icon = icons.closed;
          } else if (pub.id === selectedPubId) {
            icon = sellsGuinnessZero ? icons.selectedZero : icons.selected;
          } else if (pub.ratings?.length > 0) {
            icon = sellsGuinnessZero ? icons.ratedZero : icons.rated;
          } else {
            icon = sellsGuinnessZero ? icons.unratedZero : icons.unrated;
          }

          return (
            <Marker 
                key={pub.id} 
                position={pub.location} 
                icon={icon}
                eventHandlers={{ click: () => onSelectPub(pub) }} 
            >
              {isDesktop && (
                <Tooltip>
                  <div>
                    <p className="font-bold">{pub.name}</p>
                    {pub.ratings?.length > 0 && pub.pub_score != null && (
                      <div className="mt-1 pt-1 border-t border-gray-300">
                        <p className="text-xs">
                          <span className="font-semibold">{pub.pub_score}</span> Pub Score ({pub.ratings.length} {pub.ratings.length === 1 ? 'rating' : 'ratings'})
                        </p>
                      </div>
                    )}
                  </div>
                </Tooltip>
              )}
            </Marker>
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