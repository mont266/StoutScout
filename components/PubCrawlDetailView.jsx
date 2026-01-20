import React, { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import useIsDesktop from '../hooks/useIsDesktop.js';

const stopIcon = (index) => (
    <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-md">{index}</div>
);

const PubCrawlDetailView = ({ crawl, onBack, onSelectPub, activeCrawl, onStartCrawl, onEndCrawl, onToggleCrawlStop, settings, pubScores, onRenameCrawl, onResetCrawl, onReorderStops }) => {
    const isDesktop = useIsDesktop();
    const [selectedStopId, setSelectedStopId] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(crawl.name);
    
    // State for drag-and-drop
    const [stops, setStops] = useState(crawl.stops);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        setStops(crawl.stops);
    }, [crawl.stops]);

    const isActiveCrawl = activeCrawl && activeCrawl.id === crawl.id;

    const hasProgress = useMemo(() => {
        return crawl.stops && crawl.stops.some(stop => stop.visited_at);
    }, [crawl.stops]);

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
            // Revert on failure
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

    const polylineGeoJSON = useMemo(() => ({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: stops.map(stop => [stop.pub.location.lng, stop.pub.location.lat])
        }
    }), [stops]);

    const handlePubClick = (pub) => {
        if (isDesktop) {
            setSelectedStopId(pub.id);
        }
        onSelectPub(pub);
    };
    
    const mapStyle = settings.theme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12';

    return (
        <div className="h-full flex flex-col">
            <header className="p-2 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center">
                <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                    <i className="fas fa-arrow-left"></i>
                    <span className="font-semibold">Back to Crawls</span>
                </button>
            </header>

            <div className="h-1/3 md:h-1/2 flex-shrink-0">
                 <Map
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                    initialViewState={{ bounds: bounds, fitBoundsOptions: { padding: 40 } }}
                    style={{ height: '100%', width: '100%' }}
                    mapStyle={mapStyle}
                >
                    {stops.map((stop, index) => (
                        <Marker key={stop.id} longitude={stop.pub.location.lng} latitude={stop.pub.location.lat}>
                            {stopIcon(index + 1)}
                        </Marker>
                    ))}
                    <Source id="crawl-route" type="geojson" data={polylineGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#F59E0B',
                                'line-width': 4
                            }}
                        />
                    </Source>
                </Map>
            </div>

            <div className="flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4">
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stops.length} stops</p>
                    </div>
                    {isActiveCrawl ? (
                         <button onClick={onEndCrawl} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2 flex-shrink-0">
                            <i className="fas fa-stop"></i>
                            <span>End Crawl</span>
                        </button>
                    ) : hasProgress ? (
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            <button onClick={() => onResetCrawl(crawl)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2">
                                <i className="fas fa-undo"></i>
                                <span>Reset</span>
                            </button>
                            <button onClick={() => onStartCrawl(crawl)} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2">
                                <i className="fas fa-play"></i>
                                <span>Resume Crawl</span>
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => onStartCrawl(crawl)} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2 flex-shrink-0">
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
                <ul className="space-y-2">
                    {stops.map((stop, index) => {
                        const isVisited = !!stop.visited_at;
                        const pubScore = pubScores.get(stop.pub_id);
                        return (
                            <li
                                key={stop.id}
                                draggable={!isActiveCrawl}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnd={handleDragEnd}
                                className={`p-3 rounded-lg flex items-center space-x-4 transition-all ${!isActiveCrawl ? 'cursor-grab' : ''} ${selectedStopId === stop.pub.id ? 'ring-2 ring-amber-500' : ''} ${dragging && dragItem.current === index ? 'bg-gray-200 dark:bg-gray-600 shadow-lg scale-105' : 'bg-white dark:bg-gray-800'}`}
                            >
                                {!isActiveCrawl && (
                                    <div className="text-gray-400 dark:text-gray-500 handle" aria-label="Drag to reorder">
                                        <i className="fas fa-grip-vertical fa-lg"></i>
                                    </div>
                                )}
                                <button
                                    onClick={() => handlePubClick(stop.pub)}
                                    className="flex-grow min-w-0 text-left flex justify-between items-center"
                                >
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
                                        <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500"></i>
                                    </div>
                                </button>
                            </li>
                        )})}
                </ul>
            </div>
        </div>
    );
};

export default PubCrawlDetailView;
