import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import ConfirmationModal from './ConfirmationModal.jsx';
import MapSearchBar from './MapSearchBar.jsx';
import 'mapbox-gl/dist/mapbox-gl.css';
import useIsDesktop from '../hooks/useIsDesktop.js';
import { getDistance } from 'geolib';

const stopIcon = (index) => (
    <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md">{index}</div>
);

const PubCrawlDetailView = ({ crawl, onBack, onGiveFeedback, onSelectPub, activeCrawl, onStartCrawl, onEndCrawl, onToggleCrawlStop, settings, pubScores, onRenameCrawl, onReorderStops, onAddStop, onDeleteStop, setAlertInfo, userProfile }) => {
    const isDesktop = useIsDesktop();
    const [selectedStopId, setSelectedStopId] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [crawlToReset, setCrawlToReset] = useState(null);
    const [stopToDelete, setStopToDelete] = useState(null);
    const [isAddStopOpen, setIsAddStopOpen] = useState(false);
    const [editedName, setEditedName] = useState(crawl.name);
    
    const [stops, setStops] = useState(crawl.stops);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const [dragging, setDragging] = useState(false);
    
    const [routeGeoJSON, setRouteGeoJSON] = useState(null);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0 });
    const [isRouteLoading, setIsRouteLoading] = useState(true);

    const mapRef = useRef(null);

    useEffect(() => {
        setStops(crawl.stops);
    }, [crawl.stops]);
    
    useEffect(() => {
        const fetchRoute = async () => {
            if (!stops || stops.length < 2) {
                setIsRouteLoading(false);
                setRouteInfo({ distance: 0, duration: 0 });
                return;
            }

            setIsRouteLoading(true);
            const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            const coordinates = stops
                .map(stop => `${stop.pub.location.lng},${stop.pub.location.lat}`)
                .join(';');
            
            const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&access_token=${accessToken}`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    setRouteGeoJSON({ type: 'Feature', geometry: route.geometry });
                    setRouteInfo({ distance: route.distance, duration: route.duration });
                } else {
                     setRouteGeoJSON(null);
                     setRouteInfo({ distance: 0, duration: 0 });
                }
            } catch (error) {
                console.error("Mapbox Directions API failed:", error);
                setRouteGeoJSON(null);
                setRouteInfo({ distance: 0, duration: 0 });
            } finally {
                setIsRouteLoading(false);
            }
        };

        fetchRoute();
    }, [stops]);

    const isActiveCrawl = activeCrawl && activeCrawl.id === crawl.id;

    const hasProgress = useMemo(() => {
        return stops.some(stop => stop.visited_at);
    }, [stops]);

    useEffect(() => {
        setEditedName(crawl.name);
    }, [crawl.name]);
    
    const handleDragStart = (e, position) => {
        dragItem.current = position;
        setDragging(true);
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
        const newStops = [...stops];
        const draggedItemContent = newStops.splice(dragItem.current, 1)[0];
        newStops.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = dragOverItem.current;
        dragOverItem.current = null;
        setStops(newStops);
    };

    const handleDragEnd = async () => {
        setDragging(false);
        dragItem.current = null;
        dragOverItem.current = null;
        const reorderSuccess = await onReorderStops(crawl.id, stops);
        if (!reorderSuccess) {
            setStops(crawl.stops);
        }
    };

    const handleMoveUp = async (index) => {
        if (index === 0) return;
        const newStops = [...stops];
        [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
        setStops(newStops);
        const reorderSuccess = await onReorderStops(crawl.id, newStops);
        if (!reorderSuccess) {
             setStops(crawl.stops);
        }
    };

    const handleMoveDown = async (index) => {
        if (index === stops.length - 1) return;
        const newStops = [...stops];
        [newStops[index + 1], newStops[index]] = [newStops[index], newStops[index + 1]];
        setStops(newStops);
        const reorderSuccess = await onReorderStops(crawl.id, newStops);
        if (!reorderSuccess) {
             setStops(crawl.stops);
        }
    };

    const handleSaveName = () => {
        if (editedName.trim() !== crawl.name) {
            onRenameCrawl(crawl.id, editedName.trim());
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            setEditedName(crawl.name);
            setIsEditingName(false);
        }
    };

    const confirmReset = async () => {
        if (!crawlToReset) return;
        trackEvent('reset_pub_crawl', { crawl_id: crawlToReset.id });
    
        const { error: updateError } = await supabase
            .from('pub_crawl_stops')
            .update({ visited_at: null })
            .eq('crawl_id', crawlToReset.id);
    
        setCrawlToReset(null);
    
        if (updateError) {
            setAlertInfo({ isOpen: true, title: 'Reset Failed', message: `Could not reset crawl progress: ${updateError.message}`, theme: 'error' });
        } else {
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Crawl progress has been reset.', theme: 'success' });
            const updatedStops = stops.map(stop => ({ ...stop, visited_at: null }));
            setStops(updatedStops);
        }
    };

    const handleDeleteStopClick = (stop) => {
        setStopToDelete(stop);
    };

    const confirmDeleteStop = async () => {
        if (!stopToDelete) return;
        const success = await onDeleteStop(stopToDelete.id, stopToDelete.pub.name);
        if (success) {
            setStops(prev => prev.filter(s => s.id !== stopToDelete.id));
        }
        setStopToDelete(null);
    };

    const handleNewStopSelected = async (pub) => {
        // Check distance from start location
        if (crawl.start_location_lat && crawl.start_location_lng) {
            const start = { latitude: crawl.start_location_lat, longitude: crawl.start_location_lng };
            const end = { latitude: pub.location.lat, longitude: pub.location.lng };
            
            // 5km radius (5000 meters)
            const MAX_RADIUS_METERS = 5000; 
            const distance = getDistance(start, end);

            if (distance > MAX_RADIUS_METERS) {
                setAlertInfo({
                    isOpen: true,
                    title: 'Too Far',
                    message: `This pub is ${(distance / 1000).toFixed(1)}km away from the start location. Please choose a pub within 5km.`,
                    theme: 'warning'
                });
                return;
            }
        }

        setIsAddStopOpen(false);
        const newStop = await onAddStop(crawl.id, pub, stops.length);
        if (newStop) {
            setStops(prev => [...prev, newStop]);
        }
    };

    const bounds = useMemo(() => {
        if (!stops || stops.length === 0) {
            return [[-6.2603, 53.3498], [-6.2603, 53.3498]];
        }
        const latLngs = stops.map(stop => [stop.pub.location.lat, stop.pub.location.lng]);
        const north = Math.max(...latLngs.map(p => p[0]));
        const south = Math.min(...latLngs.map(p => p[0]));
        const east = Math.max(...latLngs.map(p => p[1]));
        const west = Math.min(...latLngs.map(p => p[1]));
        return [[west, south], [east, north]];
    }, [stops]);

    const straightLineRoute = useMemo(() => ({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: stops.map(stop => [stop.pub.location.lng, stop.pub.location.lat])
        }
    }), [stops]);

    const handlePubClick = (pub) => {
        setSelectedStopId(pub.id);
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [pub.location.lng, pub.location.lat],
                zoom: 16,
                duration: 1500,
            });
        }
    };
    
    const mapStyle = settings.theme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12';

    const renderListContent = () => (
        <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                <div className="flex-grow min-w-0">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleSaveName}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button onClick={handleSaveName} className="p-2 text-green-500 hover:text-green-600">
                                <i className="fas fa-check"></i>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate">{crawl.name}</h2>
                            <button 
                                onClick={() => setIsEditingName(true)}
                                className="text-gray-400 hover:text-amber-500 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                aria-label="Edit name"
                            >
                                <i className="fas fa-pencil-alt"></i>
                            </button>
                        </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stops.length} stops
                        {routeInfo.distance > 0 && (
                            <span className="ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
                                <i className="fas fa-walking mr-1"></i>
                                {settings.unit === 'mi'
                                    ? `${(routeInfo.distance * 0.000621371).toFixed(1)} mi`
                                    : `${(routeInfo.distance / 1000).toFixed(1)} km`}
                                <span className="ml-2">· approx. {Math.round(routeInfo.duration / 60)} min walk</span>
                            </span>
                        )}
                    </p>
                </div>
                {isActiveCrawl ? (
                     <button onClick={onEndCrawl} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 flex-shrink-0">
                        <i className="fas fa-stop"></i>
                        <span>End Crawl</span>
                    </button>
                ) : hasProgress ? (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => setCrawlToReset(crawl)} className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2">
                            <i className="fas fa-undo"></i>
                            <span>Reset</span>
                        </button>
                        <button onClick={() => onStartCrawl(crawl)} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2">
                            <i className="fas fa-play"></i>
                            <span>Resume Crawl</span>
                        </button>
                    </div>
                ) : (
                    <button onClick={() => onStartCrawl(crawl)} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 flex-shrink-0">
                        <i className="fas fa-play"></i>
                        <span>Start Crawl</span>
                    </button>
                )}
            </div>
            {!isActiveCrawl && (
                <div className="text-center text-xs p-2 mb-2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    <i className="fas fa-info-circle mr-1"></i>
                    You can drag and drop to re-order the stops before starting your crawl.
                </div>
            )}
            {!isActiveCrawl && (
                <div className="mb-4">
                    {isAddStopOpen ? (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-gray-800 dark:text-white">Add a Stop</h3>
                                <button onClick={() => setIsAddStopOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <MapSearchBar 
                                onPubSelected={handleNewStopSelected}
                                onPlaceSelected={() => {}} // Only allow adding pubs
                                userProfile={userProfile}
                                isExpanded={true}
                            />
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddStopOpen(true)}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-amber-500 hover:text-amber-500 dark:hover:border-amber-400 dark:hover:text-amber-400 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-plus"></i>
                            <span>Add Stop</span>
                        </button>
                    )}
                </div>
            )}
            <ul className="space-y-2">
                {stops.map((stop, index) => {
                    const isVisited = !!stop.visited_at;
                    const pubScore = pubScores.get(stop.pub_id);
                    return (
                        <li
                            key={stop.id}
                            draggable={!isActiveCrawl && isDesktop}
                            onDragStart={(e) => isDesktop && handleDragStart(e, index)}
                            onDragEnter={(e) => isDesktop && handleDragEnter(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={isDesktop ? handleDragEnd : undefined}
                            onClick={() => handlePubClick(stop.pub)}
                            className={`p-3 rounded-lg flex items-center space-x-4 transition-all ${!isActiveCrawl && isDesktop ? 'cursor-grab' : 'cursor-pointer'} ${selectedStopId === stop.pub.id ? 'ring-2 ring-amber-500' : ''} ${dragging && dragItem.current === index ? 'bg-gray-200 dark:bg-gray-600 shadow-lg scale-105' : 'bg-white dark:bg-gray-800'}`}
                        >
                            {!isActiveCrawl && (
                                isDesktop ? (
                                    <div className="text-gray-400 dark:text-gray-500 handle" aria-label="Drag to reorder">
                                        <i className="fas fa-grip-vertical fa-lg"></i>
                                    </div>
                                ) : (
                                    <div className="flex flex-col space-y-1 mr-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                                            disabled={index === 0}
                                            className={`text-gray-400 hover:text-amber-500 p-1 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            aria-label="Move up"
                                        >
                                            <i className="fas fa-chevron-up"></i>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                                            disabled={index === stops.length - 1}
                                            className={`text-gray-400 hover:text-amber-500 p-1 ${index === stops.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            aria-label="Move down"
                                        >
                                            <i className="fas fa-chevron-down"></i>
                                        </button>
                                    </div>
                                )
                            )}
                            <div className="flex-grow min-w-0 text-left flex justify-between items-center">
                                <div className="flex items-center space-x-4 min-w-0">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-semibold text-gray-800 dark:text-white truncate ${isVisited ? 'line-through' : ''}`}>{stop.pub.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{stop.pub.address}</p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right flex items-center space-x-3 ml-4">
                                    {pubScore !== undefined && (
                                        <p className="font-bold text-gray-700 dark:text-gray-200">{pubScore} <span className="text-xs">Score</span></p>
                                    )}
                                    {!isActiveCrawl && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStopClick(stop); }}
                                            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            aria-label="Remove stop"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    )}
                                    {isActiveCrawl && (
                                        <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500"></i>
                                    )}
                                </div>
                            </div>
                        </li>
                    )})}
            </ul>

        </>
    );

    return (
        <>
            {crawlToReset && (
                <ConfirmationModal
                    isOpen={!!crawlToReset}
                    onClose={() => setCrawlToReset(null)}
                    onConfirm={confirmReset}
                    title="Reset Crawl Progress?"
                    message={`Are you sure you want to reset your progress for "${crawlToReset.name}"? All visited stops will be unmarked.`}
                    confirmText="Reset"
                    theme="red"
                />
            )}
            {stopToDelete && (
                <ConfirmationModal
                    isOpen={!!stopToDelete}
                    onClose={() => setStopToDelete(null)}
                    onConfirm={confirmDeleteStop}
                    title="Remove Stop?"
                    message={`Are you sure you want to remove "${stopToDelete.pub.name}" from this crawl?`}
                    confirmText="Remove"
                    theme="red"
                />
            )}
            <div className="h-full flex flex-col">
                <header className="p-2 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold">Back to Crawls</span>
                    </button>
                    {onGiveFeedback && (
                        <button 
                            onClick={onGiveFeedback}
                            className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1"
                        >
                            <i className="fas fa-comment-alt"></i>
                            <span className="hidden sm:inline">Feedback</span>
                        </button>
                    )}
                </header>
                
                <div className={`flex-grow min-h-0 ${isDesktop ? 'flex' : 'flex-col'}`}>
                    {isDesktop && (
                        <div className="w-96 flex-shrink-0 overflow-y-auto bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
                            {renderListContent()}
                        </div>
                    )}
                    
                    <div className={`relative flex-grow ${!isDesktop ? 'h-1/3 md:h-1/2 flex-shrink-0' : ''}`}>
                        <Map
                            ref={mapRef}
                            mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                            initialViewState={{ bounds: bounds, fitBoundsOptions: { padding: 40 } }}
                            style={{ height: '100%', width: '100%' }}
                            mapStyle={mapStyle}
                            projection="globe"
                        >
                            {stops.map((stop, index) => (
                                <Marker key={stop.id} longitude={stop.pub.location.lng} latitude={stop.pub.location.lat}>
                                    {stopIcon(index + 1)}
                                </Marker>
                            ))}
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
                        </Map>
                    </div>

                    {!isDesktop && (
                        <div className="flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4">
                            {renderListContent()}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PubCrawlDetailView;