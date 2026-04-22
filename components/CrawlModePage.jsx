import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getDistance } from 'geolib';
import { Capacitor } from '@capacitor/core';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl';
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
        onDeleteComment, onReportContent, userZeroVotes, onGuinnessZeroVote,
        onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal,
        setAlertInfo, settings, pubScores, userLocation, allRatings,
    } = props;
    
    const [selectedPub, setSelectedPub] = useState(null);
    const [ratingPrompt, setRatingPrompt] = useState({ isOpen: false, stop: null });
    const [stopToSkip, setStopToSkip] = useState(null);
    const mapRef = useRef(null);
    const carouselRef = useRef(null);
    const geolocateControlRef = useRef(null);
    const stopCardRefs = useRef({});
    const isProgrammaticScroll = useRef(false);
    const scrollTimeoutRef = useRef(null);
    const isInitialMapLoad = useRef(true);
    const [routeGeoJSON, setRouteGeoJSON] = useState(null);
    const [isRouteLoading, setIsRouteLoading] = useState(true);
    const [distanceToNextStop, setDistanceToNextStop] = useState(null);
    const [showNavigationPrompt, setShowNavigationPrompt] = useState(false);
    const [isNavigationModeActive, setIsNavigationModeActive] = useState(false);
    const [simulateProximity, setSimulateProximity] = useState(false); // Dev toggle
    const [guidanceLine, setGuidanceLine] = useState(null);
    const guidanceDebounceTimeout = useRef(null);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const hasShownCompletionModal = useRef(false);

    const initialStopIndex = useMemo(() => {
        const firstUnvisited = activeCrawl.stops.findIndex(s => !activeCrawl.visitedStops.includes(s.id) && !activeCrawl.skippedStops.includes(s.id));
        return firstUnvisited >= 0 ? firstUnvisited : Math.max(0, activeCrawl.stops.length - 1);
    }, [activeCrawl]);
    
    const [currentStopIndex, setCurrentStopIndex] = useState(initialStopIndex);
    
    // Check for crawl completion
    useEffect(() => {
        const totalStops = activeCrawl.stops.length;
        const completedStopsCount = activeCrawl.visitedStops.length + activeCrawl.skippedStops.length;
        
        if (totalStops > 0 && completedStopsCount === totalStops) {
            if (!hasShownCompletionModal.current) {
                setIsCompletionModalOpen(true);
                hasShownCompletionModal.current = true;
            }
        } else {
            // Reset the flag if they undo a stop, so it can show again if they complete it again
            hasShownCompletionModal.current = false;
        }
    }, [activeCrawl.stops.length, activeCrawl.visitedStops.length, activeCrawl.skippedStops.length]);

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

        if (!isDesktop && carouselRef.current && stopCardRefs.current[currentStopIndex]) {
            isProgrammaticScroll.current = true;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

            const carousel = carouselRef.current;
            const stopCard = stopCardRefs.current[currentStopIndex];
            const scrollLeft = stopCard.offsetLeft - (carousel.offsetWidth / 2) + (stopCard.offsetWidth / 2);

            carousel.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });

            scrollTimeoutRef.current = setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 1500); // Debounce to avoid conflict with user scroll
        }
        }, [currentStopIndex, activeCrawl.stops, isDesktop]);

    // Proximity detection for navigation mode
    useEffect(() => {
        const PROXIMITY_THRESHOLD = 50; // in meters

        if (simulateProximity) {
            setShowNavigationPrompt(true);
            return;
        }

        if (userLocation && activeCrawl.stops[currentStopIndex]) {
            const nextStop = activeCrawl.stops[currentStopIndex];
            const distance = getDistance(
                { latitude: userLocation.lat, longitude: userLocation.lng },
                { latitude: nextStop.pub.location.lat, longitude: nextStop.pub.location.lng }
            );
            setDistanceToNextStop(distance);

            if (distance < PROXIMITY_THRESHOLD) {
                setShowNavigationPrompt(true);
            }
        } else {
            setDistanceToNextStop(null);
        }
    }, [userLocation, currentStopIndex, activeCrawl.stops, simulateProximity]);

    // Reset navigation mode when the stop changes
    useEffect(() => {
        setIsNavigationModeActive(false);
        setShowNavigationPrompt(false);
        setSimulateProximity(false); // Also reset dev toggle
    }, [currentStopIndex]);

    // Create guidance line for navigation mode
    useEffect(() => {
        if (guidanceDebounceTimeout.current) clearTimeout(guidanceDebounceTimeout.current);

        if (isNavigationModeActive && userLocation && activeCrawl.stops[currentStopIndex]) {
            guidanceDebounceTimeout.current = setTimeout(async () => {
                const nextStop = activeCrawl.stops[currentStopIndex];
                const startCoords = `${userLocation.lng},${userLocation.lat}`;
                const endCoords = `${nextStop.pub.location.lng},${nextStop.pub.location.lat}`;
                const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords};${endCoords}?geometries=geojson&access_token=${accessToken}`;

                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.routes && data.routes.length > 0) {
                        setGuidanceLine({ type: 'Feature', geometry: data.routes[0].geometry });
                    } else {
                        throw new Error('No route found for guidance line.');
                    }
                } catch (error) {
                    console.error("Guidance route fetch failed:", error);
                    // Fallback to a straight line if the API fails
                    setGuidanceLine({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: [[userLocation.lng, userLocation.lat], [nextStop.pub.location.lng, nextStop.pub.location.lat]]
                        }
                    });
                }
            }, 500); // Debounce API calls by 500ms
        } else {
            setGuidanceLine(null); // Clear the line when not in navigation mode
        }

        return () => {
            if (guidanceDebounceTimeout.current) clearTimeout(guidanceDebounceTimeout.current);
        };
    }, [isNavigationModeActive, userLocation, currentStopIndex, activeCrawl.stops]);

     const onCarouselScroll = useCallback(() => {
        if (isProgrammaticScroll.current) return;

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
            onDeleteComment, onReportContent, userZeroVotes, onGuinnessZeroVote,
            onClearGuinnessZeroVote, onOpenShareModal, onOpenShareRatingModal,
            setAlertInfo, pubScores,
            userPostLikes: props.userPostLikes,
            onTogglePostLike: props.onTogglePostLike,
            commentsByPost: props.commentsByPost,
            isPostCommentsLoading: props.isPostCommentsLoading,
            onFetchCommentsForPost: props.onFetchCommentsForPost,
            onAddPostComment: props.onAddPostComment,
            onDeletePostComment: props.onDeletePostComment,
            onEditPost: props.onEditPost,
            onDeletePost: props.onDeletePost,
            onOpenSharePostModal: props.onOpenSharePostModal
        };
        return <PubDetails {...pubDetailsProps} />;
    }
    
    const completedStops = activeCrawl.visitedStops.length + activeCrawl.skippedStops.length;
    const totalStops = activeCrawl.stops.length;
    const progressPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
    
    const mapPadding = isDesktop ? { left: 384 } : { bottom: 250 };

    const handleEnterNavigationMode = () => {
        setIsNavigationModeActive(true);
        setShowNavigationPrompt(false);
        if (geolocateControlRef.current) {
            geolocateControlRef.current.trigger(); // Start tracking user location and heading
        }
        if (mapRef.current) {
            mapRef.current.flyTo({ pitch: 65, duration: 1000 }); // Tilt the map
        }
    };

    const handleExitNavigationMode = () => {
        setIsNavigationModeActive(false);
        if (mapRef.current && activeCrawl.stops[currentStopIndex]) {
            const nextStop = activeCrawl.stops[currentStopIndex];
            mapRef.current.flyTo({
                center: [nextStop.pub.location.lng, nextStop.pub.location.lat],
                zoom: 16,
                pitch: 0,
                bearing: 0,
                duration: 1000
            });
        }
    };

    const handlePrevStop = (e) => {
        e.stopPropagation();
        if (currentStopIndex > 0) {
            setCurrentStopIndex(currentStopIndex - 1);
        }
    };

    const handleNextStop = (e) => {
        e.stopPropagation();
        if (currentStopIndex < activeCrawl.stops.length - 1) {
            setCurrentStopIndex(currentStopIndex + 1);
        }
    };

    const renderStopCard = (stop, index) => {
        const isVisited = activeCrawl.visitedStops.includes(stop.id);
        const isSkipped = activeCrawl.skippedStops.includes(stop.id);
        const isCurrent = index === currentStopIndex;
        const hasRated = userRatings.some(r => r.pubId === stop.pub_id);
        const pubScore = pubScores.get(stop.pub_id);

        const cardClasses = isDesktop 
            ? `w-full p-4 rounded-lg shadow-lg transition-all duration-300 cursor-pointer ${isCurrent ? 'bg-gray-700 border-2 border-amber-400 scale-105' : 'bg-gray-900 scale-100'}`
            : `snap-center flex-shrink-0 w-[85%] sm:w-80 p-4 rounded-xl shadow-xl transition-all duration-300 ${isCurrent ? 'bg-gray-800 border-2 border-amber-400 scale-100 opacity-100' : 'bg-gray-900/90 scale-95 opacity-70 backdrop-blur-sm'}`;

        return (
            <div
                key={stop.id}
                ref={el => stopCardRefs.current[index] = el}
                onClick={isDesktop ? () => setCurrentStopIndex(index) : undefined}
                className={cardClasses}
            >
                <div className="flex items-center space-x-3 mb-2">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shadow-sm ${isVisited ? 'bg-green-500 text-white' : isSkipped ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>{index + 1}</div>
                    <div className="min-w-0 flex-1">
                        <p className={`font-bold text-lg leading-tight mb-0.5 ${isVisited ? 'line-through text-gray-400' : isSkipped ? 'line-through text-red-400' : 'text-white'}`}>{stop.pub.name}</p>
                        <p className="text-xs text-gray-400 leading-snug line-clamp-2">{stop.pub.address}</p>
                    </div>
                    {pubScore && (
                        <div className="flex flex-col items-center bg-gray-700/50 px-2 py-1 rounded-md">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Score</span>
                            <span className="font-bold text-amber-400">{pubScore}</span>
                        </div>
                    )}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                    {isVisited ? (
                        <button onClick={() => onToggleCrawlStop(stop.id)} className="w-full text-sm bg-gray-600 text-white font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-500 transition-colors"><i className="fas fa-undo"></i>Undo</button>
                    ) : isSkipped ? (
                        <button onClick={() => onSkipCrawlStop(stop.id)} className="w-full text-sm bg-gray-600 text-white font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-500 transition-colors"><i className="fas fa-undo"></i>Unskip</button>
                    ) : (
                        <>
                            <button onClick={() => setStopToSkip(stop)} className="w-full sm:w-1/3 text-sm bg-red-900/60 text-red-200 font-bold py-3 px-3 rounded-lg hover:bg-red-800/80 transition-colors border border-red-800/50">Skip</button>
                            <button onClick={() => handleToggleAndPrompt(stop)} className="w-full sm:w-2/3 text-sm bg-green-600 text-white font-bold py-3 px-3 rounded-lg hover:bg-green-500 flex items-center justify-center gap-2 shadow-md transition-colors"><i className="fas fa-check"></i>Check In</button>
                        </>
                    )}
                    {!hasRated && <button onClick={() => setSelectedPub(stop.pub)} className="w-full sm:w-auto text-sm bg-blue-600 text-white font-bold py-3 px-3 rounded-lg hover:bg-blue-500 shadow-md transition-colors"><i className="fas fa-star"></i> Rate</button>}
                </div>
            </div>
        );
    };

    return (
      <>
        <div className="h-full flex flex-col bg-gray-900">
            <header className="relative flex-shrink-0 bg-gray-800 text-white shadow-md z-10">
                <div className="flex items-center justify-between p-3">
                    <button 
                        onClick={onExitCrawlMode} 
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                        aria-label="Exit to Main Map"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>

                    <div className="flex flex-col items-center justify-center mx-2 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <h1 className="font-bold text-base sm:text-lg text-amber-400 whitespace-nowrap">Crawl Mode</h1>
                            <span className="bg-amber-400/10 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">BETA</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate w-full text-center">
                            {completedStops} / {totalStops} Stops • {activeCrawl.name}
                        </p>
                    </div>

                    <button 
                        onClick={onEndCrawl} 
                        className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <i className="fas fa-flag-checkered text-xs"></i>
                        <span className="font-bold text-xs uppercase tracking-wide">End</span>
                    </button>
                </div>
                {/* Integrated Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div 
                        className="bg-amber-500 h-full transition-all duration-500 ease-out" 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </header>

            <div className={`relative flex-1 min-h-0 flex ${isDesktop ? 'flex-row' : 'flex-col'}`}>
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

                                <div className="relative flex-1 min-h-0">
                    {userProfile?.is_developer && (
                        <button
                            onClick={() => setSimulateProximity(prev => !prev)}
                            className={`absolute top-2 left-2 z-10 px-3 py-1.5 text-xs font-bold rounded-full shadow-lg transition-colors ${
                                simulateProximity ? 'bg-green-500 text-white' : 'bg-white text-black'
                            }`}
                        >
                            <i className="fas fa-magic mr-2"></i>
                            Simulate Proximity
                        </button>
                    )}
                    {isNavigationModeActive && (
                        <button 
                            onClick={handleExitNavigationMode}
                            className="absolute top-2 right-2 z-10 bg-red-500 text-white font-bold px-3 py-1.5 rounded-full shadow-lg text-xs"
                        >
                            <i className="fas fa-times mr-2"></i>Exit Walking View
                        </button>
                    )}
                    {showNavigationPrompt && !isNavigationModeActive && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-gray-800/80 backdrop-blur-md text-white p-3 rounded-lg shadow-xl animate-modal-fade-in">
                            <p className="text-sm text-center mb-2">You're close to the next pub. Switch to walking view?</p>
                            <div className="flex justify-center gap-2">
                                <button onClick={handleEnterNavigationMode} className="bg-blue-500 text-white font-bold text-xs px-3 py-1 rounded-md">Yes</button>
                                <button onClick={() => setShowNavigationPrompt(false)} className="bg-gray-600 text-white font-bold text-xs px-3 py-1 rounded-md">No</button>
                            </div>
                        </div>
                    )}
                    <Map
                        ref={mapRef}
                        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                        initialViewState={initialViewState}
                        style={{ height: '100%', width: '100%' }}
                        pitch={isNavigationModeActive ? 65 : 0}
                        bearing={isNavigationModeActive ? mapRef.current?.getBearing() : 0}
                        mapStyle={mapStyle}
                        padding={mapPadding}
                        projection="globe"
                    >
                                                <GeolocateControl
                            ref={geolocateControlRef}
                            position="bottom-right"
                            trackUserLocation={true}
                            showUserHeading={true}
                        />
                        <NavigationControl position="bottom-right" />
                        {userLocation && <Marker longitude={userLocation.lng} latitude={userLocation.lat}><userLocationIcon /></Marker>}
                                                {activeCrawl.start_location_lat && activeCrawl.start_location_lng && <Marker longitude={activeCrawl.start_location_lng} latitude={activeCrawl.start_location_lat} anchor="bottom"><startLocationIcon /></Marker>}
                        
                        {isNavigationModeActive && guidanceLine && (
                            <Source id="guidance-line" type="geojson" data={guidanceLine}>
                                <Layer
                                    id="guidance-line-layer"
                                    type="line"
                                    paint={{
                                        'line-color': '#4285F4', // Google Maps blue
                                        'line-width': 4,
                                        'line-dasharray': [0, 2] // Dotted line effect
                                    }}
                                    layout={{
                                        'line-join': 'round',
                                        'line-cap': 'round'
                                    }}
                                />
                            </Source>
                        )}
                        
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
                        <div className="absolute bottom-0 left-0 right-0 z-[1000] pb-safe pointer-events-none">
                            <div className="relative w-full pb-6 pointer-events-auto">
                                {/* Navigation Controls */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-2 z-20">
                                    <button 
                                        onClick={handlePrevStop}
                                        disabled={currentStopIndex === 0}
                                        className="w-10 h-10 rounded-full bg-gray-800/90 text-white shadow-lg flex items-center justify-center disabled:opacity-0 transition-opacity backdrop-blur-sm border border-gray-700 hover:bg-gray-700"
                                        aria-label="Previous Stop"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                </div>
                                
                                <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20">
                                    <button 
                                        onClick={handleNextStop}
                                        disabled={currentStopIndex === activeCrawl.stops.length - 1}
                                        className="w-10 h-10 rounded-full bg-gray-800/90 text-white shadow-lg flex items-center justify-center disabled:opacity-0 transition-opacity backdrop-blur-sm border border-gray-700 hover:bg-gray-700"
                                        aria-label="Next Stop"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>

                                <div ref={carouselRef} onScroll={onCarouselScroll} className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-14 pb-2 scrollbar-hide items-center">
                                    {activeCrawl.stops.map((stop, index) => renderStopCard(stop, index))}
                                </div>
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
                cancelText="Not Now"
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
        {isCompletionModalOpen && (
            <ConfirmationModal
                isOpen={isCompletionModalOpen}
                onClose={() => setIsCompletionModalOpen(false)}
                onConfirm={() => {
                    setIsCompletionModalOpen(false);
                    onEndCrawl();
                }}
                title="Crawl Complete!"
                message="Congratulations! You've visited all the stops on this crawl. Would you like to end the crawl now?"
                confirmText="End Crawl"
                cancelText="Keep Going"
                theme="green"
            />
        )}
      </>
    );
};

export default CrawlModePage;