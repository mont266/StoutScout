


import React, { useMemo, useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// --- Custom Marker Components ---

const UserLocationMarker = () => (
    <div className="w-4 h-4 rounded-full bg-[#4285F4] border-2 border-white dark:border-gray-800 shadow-md animate-pulse-blue-dot" />
);

const SearchOriginMarker = () => (
    <div className="w-6 h-6 flex items-center justify-center">
        <div className="absolute w-1 h-6 bg-red-500/80 rounded-full"></div>
        <div className="absolute w-6 h-1 bg-red-500/80 rounded-full"></div>
    </div>
);

const PubIcon = ({ color }) => (
    <div className="w-10 h-10 cursor-pointer drop-shadow-lg relative">
        <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#000" strokeWidth="1"/>
        </svg>
    </div>
);


const ClosedPubIcon = () => (
    <div className="w-10 h-10 cursor-pointer drop-shadow-lg relative opacity-60">
        <svg viewBox="0 0 24 24" fill="#6B7280" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#000" strokeWidth="1"/>
        </svg>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-2 pointer-events-none">
            <i className="fas fa-times text-sm text-white"></i>
        </div>
    </div>
);

const PlacementIcon = () => (
    <div className="w-12 h-12 relative flex items-center justify-center animate-pulse cursor-move">
      <svg viewBox="0 0 24 24" fill="#F59E0B" stroke="#1A202C" strokeWidth="1.5" className="w-full h-full drop-shadow-2xl">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pb-3 pointer-events-none">
        <i className="fas fa-plus text-lg text-black"></i>
      </div>
    </div>
);

/**
 * Creates a GeoJSON FeatureCollection of a circle polygon.
 * @param {[number, number]} center - The center of the circle [lng, lat].
 * @param {number} radiusInMeters - The radius of the circle in meters.
 * @param {number} [points=64] - The number of points to form the circle.
 * @returns {object} A GeoJSON FeatureCollection.
 */
const createGeoJSONCircle = (center, radiusInMeters, points = 64) => {
    const coords = {
        latitude: center.lat,
        longitude: center.lng,
    };
    const km = radiusInMeters / 1000;
    const ret = [];
    const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [ret] },
        }],
    };
};


const MapComponent = (props) => {
  const {
    pubs, userLocation, center, mapCenter, onMapLoad, onSelectPub, selectedPubId, theme,
    showSearchAreaButton, onSearchThisArea, searchOnNextMoveEnd,
    pubPlacementState, finalPlacementLocation, onPlacementPinMove, isStPaddysModeActive,
    isDesktop,
    isSidebarCollapsed,
    isListExpanded,
    searchOrigin, searchRadius, showSearchRadius, showSearchOrigin,
    isRefreshing,
  } = props;
  
  // Handle inconsistent prop naming from different layouts
  const onMapMove = props.onMapMove || props.handleMapMove;
  const onSearchAfterMove = props.onSearchAfterMove || props.handleSearchAfterMove;

  const mapRef = useRef(null);
  const effectiveCenter = center || mapCenter; // Gracefully handle inconsistent prop names
  
  const viewState = {
    longitude: effectiveCenter.lng,
    latitude: effectiveCenter.lat,
    zoom: 14,
  };
  
  useEffect(() => {
    if (mapRef.current) {
      // The timeout is set to be slightly longer than the CSS transition duration (300ms)
      // of the sidebar and mobile list panel. This ensures the map resizes *after*
      // the container has finished its animation, preventing visual glitches.
      const timer = setTimeout(() => {
        mapRef.current.resize();
      }, 350); // Increased from 310ms to provide a larger buffer
      return () => clearTimeout(timer);
    }
  }, [isSidebarCollapsed, isDesktop, isListExpanded]);

  const mapStyle = theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/streets-v12';

  const icons = useMemo(() => {
    const stoutlyAmber = '#F59E0B';
    const unratedColor = '#6B7280';

    return {
      unrated: () => <PubIcon color={unratedColor} />,
      rated: () => <PubIcon color={stoutlyAmber} />,
      selected: () => <PubIcon color={stoutlyAmber} />,
      closed: <ClosedPubIcon />,
    };
  }, []);
  
  const markers = useMemo(() => pubs.map(pub => {
      if (!pub.location) return null;
      let icon;

      if (pub.is_closed) {
        icon = icons.closed;
      } else if (pub.id === selectedPubId) {
        icon = icons.selected();
      } else if (pub.ratings?.length > 0) {
        icon = icons.rated();
      } else {
        icon = icons.unrated();
      }
      
      return (
        <Marker
          key={`marker-${pub.id}`}
          longitude={pub.location.lng}
          latitude={pub.location.lat}
          anchor="bottom"
        >
          <div onClick={e => {
            e.stopPropagation();
            const handler = onSelectPub || props.onPubSelected;
            if (handler) {
                handler(pub);
            }
          }}>
            {icon}
          </div>
        </Marker>
      );
  }), [pubs, selectedPubId, onSelectPub, props.onPubSelected, icons]);

  const searchRadiusCircle = useMemo(() => {
    if (!searchOrigin || !searchRadius) return null;
    return createGeoJSONCircle(searchOrigin, searchRadius);
  }, [searchOrigin, searchRadius]);

  const radiusLayerStyle = {
    id: 'search-radius',
    type: 'line',
    paint: {
      'line-color': theme === 'dark' ? '#F59E0B' : '#4285F4', // Stoutly amber or a blue
      'line-opacity': 0.4,
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  };

  return (
    <div className="w-full h-full relative">
      {isRefreshing && (
        <div className="map-loading-overlay">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-amber-500"></div>
        </div>
      )}
      <Map
        ref={mapRef}
        initialViewState={viewState}
        onMove={evt => onMapMove && onMapMove(evt.viewState)}
        onLoad={() => onMapLoad && onMapLoad(mapRef.current)}
        onMoveEnd={() => searchOnNextMoveEnd && onSearchAfterMove && onSearchAfterMove()}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        attributionControl={false}
      >
        <NavigationControl position="top-left" />
        
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
          >
            <UserLocationMarker />
          </Marker>
        )}
        
        {showSearchOrigin && searchOrigin && (
            <Marker longitude={searchOrigin.lng} latitude={searchOrigin.lat}>
                <SearchOriginMarker />
            </Marker>
        )}

        {showSearchRadius && searchRadiusCircle && (
            <Source id="search-radius-source" type="geojson" data={searchRadiusCircle}>
                <Layer {...radiusLayerStyle} />
            </Source>
        )}

        {markers}

        {pubPlacementState && finalPlacementLocation && (
            <Marker
                longitude={finalPlacementLocation.lng}
                latitude={finalPlacementLocation.lat}
                draggable
                onDragEnd={(e) => onPlacementPinMove({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
                anchor="bottom"
            >
                <PlacementIcon />
            </Marker>
        )}
      </Map>

       {/* Desktop version of the "Search This Area" button. Mobile version is in MobileLayout.jsx */}
      {isDesktop && showSearchAreaButton && !selectedPubId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={onSearchThisArea}
            className="bg-amber-500 text-black font-bold rounded-full shadow-lg hover:bg-amber-400 transition-colors flex items-center animate-fade-in-down px-4 py-2 space-x-2"
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