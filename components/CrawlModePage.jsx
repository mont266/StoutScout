import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PubDetails from './PubDetails.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';

const pendingStopIcon = (index) => (
    <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md transition-transform hover:scale-110">{index}</div>
);

const visitedStopIcon = () => (
    <div className="w-8 h-8 rounded-full bg-green-500 text-white font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md"><i className="fas fa-check"></i></div>
);

const skippedStopIcon = () => (
    <div className="w-8 h-8 rounded-full bg-red-500 text-white font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md"><i className="fas fa-times"></i></div>
);

const nextStopIcon = (index) => (
    <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute w-8 h-8 rounded-full bg-amber-400 animate-pulse-halo"></div>
        <div className="relative w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-lg">{index}</div>
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
        isDesktop, activeCrawl, onEndCrawl, onExitCrawlMode, onToggleCrawlStop, onSkipCrawlStop,
        userRatings, userProfile, session, onRate, isSubmittingRating,
        getAverageRating, onLoginRequest, onViewProfile, onDataRefresh,
        userLikes, onToggleLike, onOpenScoreExplanation, onOpenSuggestEditModal,
        commentsByRating, isCommentsLoading, onFetchComments, onAddComment,
        onDeleteComment, onReportComment, userZeroVotes, onGuinnessZeroVote,
        onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal,
        setAlertInfo, settings, pubScores, userLocation, allRatings,
    } = props;
    
    const [selectedPub, setSelectedPub] = useState(null);
    const [ratingPrompt, setRatingPrompt] = useState({ isOpen: false, stop: null });
    const [stopToSkip, setStopToSkip] = useState(null);
    const mapRef = useRef(null);
    const carouselRef = useRef(null);
    const stopCardRefs = useRef({});
    const isInitialMapLoad = useRef(true);
    const [routeGeoJSON, setRouteGeoJSON] = useState(null);
    const [isRouteLoading, setIsRouteLoading] = useState(true);

    const initialStopIndex = useMemo(() => {
        const firstUnvisited = activeCrawl.stops.findIndex(s => !activeCrawl.visitedStops.includes(s.id) && !activeCrawl.skippedStops.includes(s.id));
        return firstUnvisited >= 0 ? firstUnvisited : Math.max(0, activeCrawl.stops.length - 1);
    }, [activeCrawl]);
    
    const [currentStopIndex, setCurrentStopIndex] = useState(initialStopIndex);
    
    // Effect to fetch the walking route from Mapbox Directions API
    useEffect(() => {
        const fetchRoute = async () => {
            if (!activeCrawl || !activeCrawl.stops || activeCrawl.stops.length < 2) {
                setIsRouteLoading(false);
                return;
            }

            setIsRouteLoading(true);

            const coordinates = activeCrawl.stops
                .map(stop => `${stop.pub.location.lng},${stop.pub.location.lat}`)
                .join(';');
            
            const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&access_token=${accessToken}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0].geometry;
                    setRouteGeoJSON({
                        type: 'Feature',
                        properties: {},
                        geometry: route
                    });
                } else {
                    throw new Error('No route found by Mapbox API.');
                }
            } catch (error) {
                console.error("Mapbox Directions API failed:", error);
                // Fallback to straight line is handled by `straightLineRoute` memo.
                setRouteGeoJSON(null); // Explicitly set to null to trigger fallback
            } finally {
                setIsRouteLoading(false);
            }
        };

        fetchRoute();
    }, [activeCrawl.stops]);

    const handleToggleAndPrompt = (stop) => {
        const isCurrentlyVisited = activeCrawl.visitedStops.includes(stop.id);
        const hasRated = userRatings.some(r => r.pubId === stop.pub_id);

        onToggleCrawlStop(stop.id, stop.pub_id);

        if (!isCurrentlyVisited && !hasRated) {
            setRatingPrompt({ isOpen: true, stop: stop });
        }
    };

    const nextStopIndex = useMemo(() => {
        return activeCrawl.stops.findIndex(s => !activeCrawl.visitedStops.includes(s.id) && !activeCrawl.skippedStops.includes(s.id));
    }, [activeCrawl.stops, activeCrawl.visitedStops, activeCrawl.skippedStops]);

    useEffect(() => {
        if (nextStopIndex !== -1) {
            setCurrentStopIndex(nextStopIndex);
        }
    }, [nextStopIndex]);

    useEffect(() => {
        const stop = activeCrawl.stops[currentStopIndex];
        if (stop && mapRef.current) {
            const duration = isInitialMapLoad.current ? 0 : 1500;
            mapRef.current.flyTo({
                center: [stop.pub.location.lng, stop.pub.location.lat],
                zoom: 16,
                duration: duration,
            });
            if (isInitialMapLoad.current) {
                isInitialMapLoad.current = false;
            }
        }
        if (stopCardRefs.current[currentStopIndex]) {
            stopCardRefs.current[currentStopIndex].scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'center'
            });
        }
    }, [currentStopIndex, activeCrawl.stops]);

     const onCarouselScroll = useCallback(() => {
        if (carouselRef.current) {
            const { scrollLeft, clientWidth, children } = carouselRef.current;
            const scrollCenter = scrollLeft + clientWidth / 2;
            let closestIndex = 0;
            let smallestDistance = Infinity;
            
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const childCenter = child.offsetLeft + child.clientWidth / 2;
                const distance = Math.abs(childCenter - scrollCenter);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }
            if (currentStopIndex !== closestIndex) {
                setCurrentStopIndex(closestIndex);
            }
        }
    }, [currentStopIndex]);
      
    const initialViewState = useMemo(() => {
        const firstStop = activeCrawl.stops[initialStopIndex];
        if (!firstStop) {
            return { longitude: -6.2603, latitude: 53.3498, zoom: 12 };
        }
        return {
            longitude: firstStop.pub.location.lng,
            latitude: firstStop.pub.location.lat,
            zoom: 16
        };
    }, [activeCrawl.stops, initialStopIndex]);

    const straightLineRoute = useMemo(() => {
        const coordinates = activeCrawl.stops.map(stop => [stop.pub.location.lng, stop.pub.location.lat]);
        return { type: 'Feature', geometry: { type: 'LineString', coordinates } };
    }, [activeCrawl.stops]);

    const mapStyle = settings.theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

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
    
    const completedStops = activeCrawl.visitedStops.length + activeCrawl.skippedStops.length;
    const totalStops = activeCrawl.stops.length;
    const progressPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
    
    const mapPadding = isDesktop ? { left: 384 } : { bottom: 250 };

    const renderStopCard = (stop, index) => {
        const isVisited = activeCrawl.visitedStops.includes(stop.id);
        const isSkipped = activeCrawl.skippedStops.includes(stop.id);
        const isCurrent = index === currentStopIndex;
        const hasRated = userRatings.some(r => r.pubId === stop.pub_id);
        const pubScore = pubScores.get(stop.pub_id);

        const cardClasses = isDesktop 
            ? `w-full p-4 rounded-lg shadow-lg transition-all duration-300 cursor-pointer ${isCurrent ? 'bg-gray-700 border-2 border-amber-400 scale-105' : 'bg-gray-900 scale-100'}`
            : `snap-center flex-shrink-0 w-[85%] sm:w-80 p-4 rounded-lg shadow-lg transition-all duration-300 ${isCurrent ? 'bg-gray-800 border-2 border-amber-400 scale-105' : 'bg-gray-900/80 scale-100'}`;

        return (
            <div
                key={stop.id}
                ref={el => stopCardRefs.current[index] = el}
                onClick={isDesktop ? () => setCurrentStopIndex(index) : undefined}
                className={cardClasses}
            >
                <div className="flex items-center space-x-3 mb-2">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center ${isVisited ? 'bg-green-500 text-white' : isSkipped ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>{index + 1}</div>
                    <div className="min-w-0">
                        <p className={`font-bold truncate ${isVisited ? 'line-through text-gray-400' : isSkipped ? 'line-through text-red-400' : 'text-white'}`}>{stop.pub.name}</p>
                        <p className="text-xs text-gray-400 truncate">{stop.pub.address}</p>
                    </div>
                    {pubScore && <p className="font-bold text-white ml-auto">{pubScore}</p>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                    {isVisited ? (
                        <button onClick={() => onToggleCrawlStop(stop.id)} className="w-full text-sm bg-gray-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2"><i className="fas fa-undo"></i>Undo</button>
                    ) : isSkipped ? (
                        <button onClick={() => onSkipCrawlStop(stop.id)} className="w-full text-sm bg-gray-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2"><i className="fas fa-undo"></i>Unskip</button>
                    ) : (
                        <>
                            <button onClick={() => setStopToSkip(stop)} className="w-1/3 text-sm bg-red-800/80 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-700">Skip</button>
                            <button onClick={() => handleToggleAndPrompt(stop)} className="w-2/3 text-sm bg-green-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"><i className="fas fa-check"></i>Check In</button>
                        </>
                    )}
                    {!hasRated && <button onClick={() => setSelectedPub(stop.pub)} className="text-sm bg-blue-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600"><i className="fas fa-star"></i></button>}
                </div>
            </div>
        );
    };

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
            
            <div className={`relative flex-grow min-h-0 ${isDesktop ? 'flex flex-row' : ''}`}>
                {isDesktop && (
                    <div className="w-96 flex-shrink-0 flex flex-col bg-gray-800 border-r border-gray-700">
                        <div className="p-4 flex-shrink-0">
                             <div className="bg-gray-900 p-2 rounded-lg">
                                <p className="text-white text-center text-sm font-bold">{completedStops} / {totalStops} Stops Complete</p>
                                <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1">
                                    <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {activeCrawl.stops.map((stop, index) => renderStopCard(stop, index))}
                        </div>
                    </div>
                )}

                <div className="relative flex-grow min-h-0">
                    <Map
                        ref={mapRef}
                        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                        initialViewState={initialViewState}
                        style={{ height: '100%', width: '100%' }}
                        mapStyle={mapStyle}
                        padding={mapPadding}
                    >
                        <NavigationControl position="bottom-right" />
                        {userLocation && <Marker longitude={userLocation.lng} latitude={userLocation.lat}><userLocationIcon /></Marker>}
                        {activeCrawl.start_location_lat && activeCrawl.start_location_lng && <Marker longitude={activeCrawl.start_location_lng} latitude={activeCrawl.start_location_lat} anchor="bottom"><startLocationIcon /></Marker>}
                        
                        <Source id="crawl-route" type="geojson" data={routeGeoJSON || straightLineRoute}>
                            <Layer 
                                id="route-casing" 
                                type="line" 
                                paint={{ 'line-color': settings.theme === 'dark' ? '#000' : '#FFF', 'line-width': 6, 'line-opacity': 0.5 }} 
                                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            />
                            <Layer
                                id="route-line"
                                type="line"
                                paint={{ 'line-color': '#F59E0B', 'line-width': 3, 'line-dasharray': [2, 2] }}
                                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            />
                        </Source>

                        {activeCrawl.stops.map((stop, index) => {
                            const isVisited = activeCrawl.visitedStops.includes(stop.id);
                            const isSkipped = activeCrawl.skippedStops.includes(stop.id);
                            const isNext = nextStopIndex !== -1 && index === nextStopIndex;
                            let icon;
                            if (isNext) icon = nextStopIcon(index + 1);
                            else if (isSkipped) icon = skippedStopIcon();
                            else if (isVisited) icon = visitedStopIcon();
                            else icon = pendingStopIcon(index + 1);
                            return <Marker key={stop.id} longitude={stop.pub.location.lng} latitude={stop.pub.location.lat} onClick={() => setCurrentStopIndex(index)} style={{cursor: 'pointer'}}>{icon}</Marker>;
                        })}
                    </Map>
                    
                    {!isDesktop && (
                        <div className="absolute bottom-0 left-0 right-0 z-[1000] pb-safe">
                             <div className="px-4 mb-2">
                                <div className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-lg">
                                    <p className="text-white text-center text-sm font-bold">{completedStops} / {totalStops} Stops Complete</p>
                                    <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1">
                                        <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPercentage}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div ref={carouselRef} onScroll={onCarouselScroll} className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 pb-4 scrollbar-hide">
                                {activeCrawl.stops.map((stop, index) => renderStopCard(stop, index))}
                            </div>
                        </div>
                    )}
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