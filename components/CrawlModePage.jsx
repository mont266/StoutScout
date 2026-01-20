import React, { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PubDetails from './PubDetails.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';

const FitBoundsMap = ({ bounds, children }) => {
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: 40, duration: 1000 });
        }
    }, [bounds]);

    return children(mapRef);
};


const pendingStopIcon = (index) => (
    <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md">{index}</div>
);

const visitedStopIcon = () => (
    <div className="w-8 h-8 rounded-full bg-green-500 text-white font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md"><i className="fas fa-check"></i></div>
);

const skippedStopIcon = () => (
    <div className="w-8 h-8 rounded-full bg-red-500 text-white font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md"><i className="fas fa-times"></i></div>
);

const nextStopIcon = (index) => (
    <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute w-8 h-8 rounded-full bg-amber-500 animate-pulse-halo"></div>
        <div className="relative w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md">{index}</div>
    </div>
);

const userLocationIcon = () => (
  <div className="w-4 h-4 rounded-full bg-[#4285F4] border-2 border-white dark:border-gray-800 shadow-md animate-pulse-blue-dot" />
);

const startLocationIcon = () => (
    <div className="w-8 h-8 flex items-center justify-center" title="Start Location"><i className="fas fa-flag-checkered text-3xl text-green-500" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}></i></div>
);

const CrawlModePage = (props) => {
    const {
        activeCrawl, onEndCrawl, onExitCrawlMode, onToggleCrawlStop, onSkipCrawlStop,
        userRatings, userProfile, session, onRate, isSubmittingRating,
        getAverageRating, onLoginRequest, onViewProfile, onDataRefresh,
        userLikes, onToggleLike, onOpenScoreExplanation, onOpenSuggestEditModal,
        commentsByRating, isCommentsLoading, onFetchComments, onAddComment,
        onDeleteComment, onReportComment, userZeroVotes, onGuinnessZeroVote,
        onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal,
        setAlertInfo, settings, pubScores, userLocation, allRatings,
        isActiveCrawl,
    } = props;
    
    const [selectedPub, setSelectedPub] = useState(null);
    const [isListExpanded, setIsListExpanded] = useState(true);
    const [ratingPrompt, setRatingPrompt] = useState({ isOpen: false, stop: null });
    const [stopToSkip, setStopToSkip] = useState(null);
    const mapRef = useRef(null);

    const handleToggleAndPrompt = (stop) => {
        const isCurrentlyVisited = activeCrawl.visitedStops.includes(stop.id);
        const hasRated = userRatings.some(r => r.pubId === stop.pub_id);

        onToggleCrawlStop(stop.id, stop.pub_id);

        if (!isCurrentlyVisited && !hasRated) {
            setRatingPrompt({ isOpen: true, stop: stop });
        }
    };

    const nextStop = useMemo(() => {
        return activeCrawl.stops.find(s => 
            !activeCrawl.visitedStops.includes(s.id) && 
            !activeCrawl.skippedStops.includes(s.id)
        );
    }, [activeCrawl]);

    useEffect(() => {
      if (nextStop && mapRef.current) {
        mapRef.current.flyTo({
          center: [nextStop.pub.location.lng, nextStop.pub.location.lat],
          zoom: 16,
          duration: 1500,
        });
      }
    }, [nextStop]);

    const bounds = useMemo(() => {
        if (!activeCrawl.stops || activeCrawl.stops.length === 0) {
            return [[-6.2603, 53.3498], [-6.2603, 53.3498]];
        }
        const latLngs = activeCrawl.stops.map(stop => [stop.pub.location.lat, stop.pub.location.lng]);

        if (activeCrawl.start_location_lat && activeCrawl.start_location_lng) {
            latLngs.push([activeCrawl.start_location_lat, activeCrawl.start_location_lng]);
        }
        
        const north = Math.max(...latLngs.map(p => p[0]));
        const south = Math.min(...latLngs.map(p => p[0]));
        const east = Math.max(...latLngs.map(p => p[1]));
        const west = Math.min(...latLngs.map(p => p[1]));
        return [[west, south], [east, north]];
    }, [activeCrawl.stops, activeCrawl.start_location_lat, activeCrawl.start_location_lng]);
    
    const polylineGeoJSON = useMemo(() => {
        const coordinates = activeCrawl.stops.map(stop => [stop.pub.location.lng, stop.pub.location.lat]);
        return {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        };
      }, [activeCrawl.stops]);
      
    const startPolylineGeoJSON = useMemo(() => {
        if (activeCrawl.start_location_lat && activeCrawl.start_location_lng && activeCrawl.stops.length > 0) {
            return {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [activeCrawl.start_location_lng, activeCrawl.start_location_lat],
                  [activeCrawl.stops[0].pub.location.lng, activeCrawl.stops[0].pub.location.lat]
                ],
              },
            };
        }
        return null;
      }, [activeCrawl]);


    const mapStyle = settings.theme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12';

    if (selectedPub) {
        const existingUserRating = userRatings.find(r => r.pubId === selectedPub.id);

        const enrichedPub = {
            ...selectedPub,
            ratings: allRatings.get(selectedPub.id) || [],
            pub_score: pubScores.get(selectedPub.id) ?? null,
        };
        
        const pubDetailsProps = {
            pub: enrichedPub,
            onClose: () => setSelectedPub(null),
            onRate, getAverageRating, existingUserRating, session,
            onLoginRequest, onViewProfile, loggedInUserProfile: userProfile, onDataRefresh,
            userLikes, onToggleLike, isSubmittingRating, onOpenScoreExplanation, onOpenSuggestEditModal,
            commentsByRating, isCommentsLoading, onFetchComments, onAddComment,
            onDeleteComment, onReportComment, userZeroVotes, onGuinnessZeroVote,
            onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal,
            setAlertInfo, pubScores,
        };
        return <PubDetails {...pubDetailsProps} />;
    }

    return (
      <>
        <div className="h-full flex flex-col bg-gray-900">
            <header className="p-2 flex-shrink-0 bg-gray-800 flex items-center justify-between text-white shadow-md z-10">
                <button onClick={onExitCrawlMode} className="flex items-center space-x-2 p-2 rounded-lg transition-colors hover:bg-gray-700">
                    <i className="fas fa-map"></i>
                    <span className="font-semibold text-sm">Exit to Main Map</span>
                </button>
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <h1 className="font-bold text-amber-400">Crawl Mode</h1>
                        <span className="bg-amber-400/10 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">BETA</span>
                    </div>
                    <p className="text-xs truncate max-w-[150px]">{activeCrawl.name}</p>
                </div>
                <button onClick={onEndCrawl} className="flex items-center space-x-2 p-2 rounded-lg transition-colors bg-red-500 hover:bg-red-600">
                    <i className="fas fa-stop"></i>
                    <span className="font-semibold text-sm">End</span>
                </button>
            </header>
            
            <div className="relative flex-grow min-h-0">
                <Map
                    ref={mapRef}
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                    initialViewState={{ bounds: bounds, fitBoundsOptions: { padding: 40 } }}
                    style={{ height: '100%', width: '100%' }}
                    mapStyle={mapStyle}
                >
                    <NavigationControl position="bottom-right" />
                    {userLocation && <Marker longitude={userLocation.lng} latitude={userLocation.lat}><userLocationIcon /></Marker>}
                    {activeCrawl.start_location_lat && activeCrawl.start_location_lng && (
                        <Marker longitude={activeCrawl.start_location_lng} latitude={activeCrawl.start_location_lat} anchor="bottom"><startLocationIcon /></Marker>
                    )}
                    {activeCrawl.stops.map((stop, index) => {
                        const isVisited = activeCrawl.visitedStops.includes(stop.id);
                        const isSkipped = activeCrawl.skippedStops.includes(stop.id);
                        const isNext = nextStop && stop.id === nextStop.id;
                        let icon;
                        if (isNext) icon = nextStopIcon(index + 1);
                        else if (isSkipped) icon = skippedStopIcon();
                        else if (isVisited) icon = visitedStopIcon();
                        else icon = pendingStopIcon(index + 1);
                        return <Marker key={stop.id} longitude={stop.pub.location.lng} latitude={stop.pub.location.lat}>{icon}</Marker>;
                    })}

                    {startPolylineGeoJSON && (
                        <Source id="start-route" type="geojson" data={startPolylineGeoJSON}>
                            <Layer
                                id="start-route-line"
                                type="line"
                                paint={{
                                    'line-color': '#4ade80', // green-400
                                    'line-width': 4,
                                    'line-dasharray': [2, 2]
                                }}
                            />
                        </Source>
                    )}
                    <Source id="crawl-route" type="geojson" data={polylineGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#F59E0B', // amber-500
                                'line-width': 4,
                            }}
                        />
                    </Source>
                </Map>

                <div className={`absolute bottom-0 left-0 right-0 z-[1000] bg-gray-800 rounded-t-2xl shadow-lg-top transition-all duration-300 ease-in-out ${isListExpanded ? 'max-h-[60%]' : 'max-h-20'}`}>
                    <div onClick={() => setIsListExpanded(p => !p)} className="py-3 cursor-pointer flex justify-center items-center" aria-label={isListExpanded ? 'Collapse list' : 'Expand list'}>
                        <div className="w-10 h-1.5 bg-gray-600 rounded-full"></div>
                    </div>
                    <div className={`overflow-y-auto px-4 pb-4 ${isListExpanded ? '' : 'hidden'}`}>
                         <h2 className="text-lg font-bold text-white mb-2">
                            {activeCrawl.visitedStops.length + activeCrawl.skippedStops.length} / {activeCrawl.stops.length} Stops Complete
                        </h2>
                        <ul className="space-y-2">
                            {activeCrawl.stops.map((stop, index) => {
                                const isVisited = (isActiveCrawl && activeCrawl.visitedStops.includes(stop.id)) || (!isActiveCrawl && !!stop.visited_at);
                                const isSkipped = activeCrawl.skippedStops.includes(stop.id);
                                const hasRated = userRatings.some(r => r.pubId === stop.pub_id);
                                return (
                                    <li key={stop.id} className={`p-3 rounded-lg ${isSkipped ? 'bg-red-900/50' : 'bg-gray-700/50'}`}>
                                        <div className="flex items-center space-x-3">
                                            <input type="checkbox" checked={isVisited} onChange={() => handleToggleAndPrompt(stop)} onClick={e => e.stopPropagation()} disabled={!isActiveCrawl} className="w-6 h-6 rounded-md text-amber-500 bg-gray-600 border-gray-500 focus:ring-amber-500 dark:focus:ring-amber-600 disabled:opacity-50" />
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center ${isVisited ? 'bg-green-500 text-white' : isSkipped ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>{index + 1}</div>
                                                    <p className={`font-semibold truncate ${isVisited ? 'line-through text-gray-400' : isSkipped ? 'line-through text-red-400' : 'text-gray-200'}`}>{stop.pub.name}</p>
                                                </div>
                                                {!isVisited && !isSkipped && (
                                                    <div className="mt-2 flex items-center space-x-2">
                                                        {!hasRated && <button onClick={() => setSelectedPub(stop.pub)} className="text-sm bg-blue-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-blue-600"><i className="fas fa-star mr-2"></i>Rate</button>}
                                                        <button onClick={() => setStopToSkip(stop)} className="text-sm bg-red-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-600">Skip</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className="pb-safe"></div>
                </div>
            </div>
        </div>
        {ratingPrompt.isOpen && (
            <ConfirmationModal
                isOpen={ratingPrompt.isOpen}
                onClose={() => setRatingPrompt({ isOpen: false, stop: null })}
                onConfirm={() => {
                    setSelectedPub(ratingPrompt.stop.pub);
                    setRatingPrompt({ isOpen: false, stop: null });
                }}
                title="Rate Your Pint?"
                message="You haven't rated this pub yet. Would you like to rate your pint to help the community?"
                confirmText="Rate Now"
                theme="blue"
            />
        )}
        {stopToSkip && (
            <ConfirmationModal
                isOpen={!!stopToSkip}
                onClose={() => setStopToSkip(null)}
                onConfirm={() => {
                    onSkipCrawlStop(stopToSkip.id);
                    setStopToSkip(null);
                }}
                title="Skip this Stop?"
                message={`Are you sure you want to skip ${stopToSkip.pub.name}?`}
                confirmText="Skip"
                theme="red"
            />
        )}
      </>
    );
};

export default CrawlModePage;