import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { GoogleGenAI, Type } from '@google/genai';
import { trackEvent } from '../analytics.js';
import PubCrawlSetupModal from './PubCrawlSetupModal.jsx';
import PubCrawlGenerationView from './PubCrawlGenerationView.jsx';
import PubCrawlDetailView from './PubCrawlDetailView.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const PubCrawlPage = ({ userProfile, setAlertInfo, handleSelectPub, activeCrawl, onStartCrawl, onEndCrawl, onToggleCrawlStop, onReorderStops, settings, pubScores, userLocation, locationPermissionStatus, onRequestPermission }) => {
    const [savedCrawls, setSavedCrawls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const isCancelledRef = useRef(false);

    const [viewingCrawl, setViewingCrawl] = useState(null);
    const [isLoadingCrawlDetail, setIsLoadingCrawlDetail] = useState(false);
    const [crawlToDelete, setCrawlToDelete] = useState(null);
    const [crawlToReset, setCrawlToReset] = useState(null);
    const [activeTab, setActiveTab] = useState('my_crawls');

    const fetchSavedCrawls = useCallback(async () => {
        if (!userProfile) return;
        setLoading(true);
        setError(null);
        trackEvent('view_pub_crawl_page');

        try {
            const { data, error: dbError } = await supabase
                .from('pub_crawls')
                .select('id, name, created_at, start_location_text, start_location_lat, start_location_lng, stops:pub_crawl_stops(count)')
                .eq('user_id', userProfile.id)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            
            const formattedCrawls = data.map(crawl => ({
                ...crawl,
                stop_count: crawl.stops[0]?.count || 0,
            }));
            setSavedCrawls(formattedCrawls);

        } catch (err) {
            console.error("Error fetching saved crawls:", err);
            setError("Could not load your saved pub crawls.");
        } finally {
            setLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        fetchSavedCrawls();
    }, [fetchSavedCrawls]);

    const handleViewCrawl = async (crawl) => {
        setIsLoadingCrawlDetail(true);
        trackEvent('view_pub_crawl_detail', { crawl_id: crawl.id });
        try {
            const { data, error: detailError } = await supabase
                .from('pub_crawl_stops')
                .select('*, pub:pubs(*)')
                .eq('crawl_id', crawl.id)
                .order('stop_order', { ascending: true });

            if (detailError) throw detailError;
            
            const detailedCrawl = {
                ...crawl,
                stops: data.map(stop => ({
                    ...stop,
                    pub: {
                        ...stop.pub,
                        location: { lat: stop.pub.lat, lng: stop.pub.lng }
                    }
                })),
            };
            setViewingCrawl(detailedCrawl);

        } catch (err) {
            console.error("Error fetching crawl details:", err);
            setAlertInfo({ isOpen: true, title: 'Error', message: 'Could not load crawl details.', theme: 'error' });
        } finally {
            setIsLoadingCrawlDetail(false);
        }
    };

    const handleDeleteCrawl = (crawl) => {
        setCrawlToDelete(crawl);
    };

    const confirmDelete = async () => {
        if (!crawlToDelete) return;
        trackEvent('delete_pub_crawl', { crawl_id: crawlToDelete.id });

        const { error: deleteError } = await supabase
            .from('pub_crawls')
            .delete()
            .eq('id', crawlToDelete.id);
        
        setCrawlToDelete(null); // Close modal

        if (deleteError) {
            setAlertInfo({ isOpen: true, title: 'Delete Failed', message: `Could not delete crawl: ${deleteError.message}`, theme: 'error' });
        } else {
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Pub crawl has been deleted.', theme: 'success' });
            fetchSavedCrawls(); // Refresh the list
        }
    };
    
    const handleRenameCrawl = async (crawlId, newName) => {
        if (!newName.trim()) return;
        trackEvent('rename_pub_crawl', { crawl_id: crawlId });

        // Optimistic update
        setSavedCrawls(prev => prev.map(c => c.id === crawlId ? { ...c, name: newName } : c));
        if (viewingCrawl && viewingCrawl.id === crawlId) {
            setViewingCrawl(prev => ({ ...prev, name: newName }));
        }

        const { error } = await supabase
            .from('pub_crawls')
            .update({ name: newName })
            .eq('id', crawlId);

        if (error) {
            console.error("Error renaming crawl:", error);
            setAlertInfo({ isOpen: true, title: 'Rename Failed', message: `Could not save new name: ${error.message}`, theme: 'error' });
            // Revert changes on error would require storing previous state, simplified here by fetching
            fetchSavedCrawls();
        }
    };
    
    const handleResetCrawl = (crawl) => {
        setCrawlToReset(crawl);
    };

    const confirmReset = async () => {
        if (!crawlToReset) return;
        trackEvent('reset_pub_crawl', { crawl_id: crawlToReset.id });
    
        const { error: updateError } = await supabase
            .from('pub_crawl_stops')
            .update({ visited_at: null })
            .eq('crawl_id', crawlToReset.id);
    
        setCrawlToReset(null); // Close modal
    
        if (updateError) {
            setAlertInfo({ isOpen: true, title: 'Reset Failed', message: `Could not reset crawl progress: ${updateError.message}`, theme: 'error' });
        } else {
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Crawl progress has been reset.', theme: 'success' });
            if (viewingCrawl && viewingCrawl.id === crawlToReset.id) {
                setViewingCrawl(prev => ({
                    ...prev,
                    stops: prev.stops.map(stop => ({ ...stop, visited_at: null }))
                }));
            }
        }
    };
    
    const handleCancelGeneration = () => {
        isCancelledRef.current = true;
        setIsGenerating(false);
        trackEvent('plan_pub_crawl_cancel');
    };

    const handlePlanCrawl = async ({ startLocationText, numPubs, crawlName, priority }) => {
        setIsSetupModalOpen(false);
        setIsGenerating(true);
        isCancelledRef.current = false;
        setError(null);
        trackEvent('plan_pub_crawl_start', { location: startLocationText, num_pubs: numPubs, priority });

        try {
            // 1. Geocode location
            const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(startLocationText)}&format=jsonv2&limit=1`;
            const geoResponse = await fetch(geoUrl, { headers: { 'User-Agent': 'Stoutly/1.0 (https://stoutly.co.uk)' } });
            const geoData = await geoResponse.json();
            if (!geoData || geoData.length === 0) throw new Error('Could not find that location. Please be more specific.');
            const location = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };

            // 2. Fetch candidate pubs from DB
            const { data: candidates, error: rpcError } = await supabase.rpc('get_pubs_in_radius', {
                lat_param: location.lat,
                lng_param: location.lng,
                radius_meters: 5000, // 5km search radius
                limit_count: 100
            });
            if (rpcError) throw rpcError;
            if (candidates.length < 2) throw new Error('Not enough pubs found in that area to plan a crawl.');

            // 3. Prompt Gemini
            let priorityInstructions = '';
            if (priority === 'route') {
                priorityInstructions = `
                    4. **PRIORITY**: The route MUST be the most efficient and logical walking path possible, minimizing walking distance and avoiding backtracking.
                    5. 'pub_score' should be used as a secondary factor to choose between similarly convenient options. A pub with a slightly lower 'pub_score' is highly preferable if including it makes the route significantly more convenient.
                `;
            } else { // 'score' is the default
                priorityInstructions = `
                    4. **PRIORITY**: Prioritize including pubs with the highest 'pub_score'.
                    5. The route should still be a sensible walking path that attempts to minimize backtracking, but the selection of high-scoring pubs is more important than perfect route efficiency.
                `;
            }

            const prompt = `
                You are a pub crawl planning expert for the Guinness rating app, Stoutly. Your goal is to create a fun, logical pub crawl.
                Task: Given a starting location and a list of candidate pubs, create a pub crawl with ${numPubs} stops.
                Rules:
                1. The first pub should be reasonably close to the starting location.
                2. The final route should be a complete circuit or a logical one-way path.
                3. If you cannot create a route with ${numPubs} stops from the candidates, create the best possible route with fewer stops. Do not invent pubs.
                ${priorityInstructions}

                Data:
                - Starting Location: { "lat": ${location.lat}, "lng": ${location.lng} }
                - Candidate Pubs: ${JSON.stringify(candidates)}

                Output: Respond with only a JSON object containing a single key, "crawl_route", which is an array of the chosen pub IDs in the correct order.
            `;
            
            const responseSchema = {
              type: Type.OBJECT,
              properties: {
                crawl_route: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'An array of pub IDs in the optimal order for the crawl.'
                }
              }
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema },
            });

            if (isCancelledRef.current) return;

            const result = JSON.parse(response.text);
            const pubIds = result.crawl_route;

            if (!pubIds || pubIds.length === 0) {
                throw new Error("The AI couldn't generate a crawl for that area. Try a different location or more stops.");
            }

            // 4. Auto-save the crawl
            const finalCrawlName = crawlName || `Crawl in ${startLocationText}`;
            const { data: crawl, error: crawlError } = await supabase
                .from('pub_crawls')
                .insert({
                    user_id: userProfile.id,
                    name: finalCrawlName,
                    start_location_text: startLocationText,
                    start_location_lat: location.lat,
                    start_location_lng: location.lng,
                })
                .select()
                .single();
            if (crawlError) throw crawlError;

            const stopsToInsert = pubIds.map((pubId, index) => ({
                crawl_id: crawl.id,
                pub_id: pubId,
                stop_order: index + 1,
            }));
            const { error: stopsError } = await supabase.from('pub_crawl_stops').insert(stopsToInsert);
            if (stopsError) throw stopsError;

            trackEvent('plan_pub_crawl_success', { generated_stops: pubIds.length });
            setAlertInfo({ isOpen: true, title: 'Crawl Generated!', message: `Your ${pubIds.length}-stop pub crawl in ${startLocationText} has been saved.`, theme: 'success' });
            fetchSavedCrawls();

        } catch (err) {
            console.error("Error planning crawl:", err);
            if (!isCancelledRef.current) {
                setAlertInfo({ isOpen: true, title: 'Planning Failed', message: `Failed to plan crawl: ${err.message}`, theme: 'error' });
                trackEvent('plan_pub_crawl_failed', { error: err.message });
            }
        } finally {
            setIsGenerating(false);
        }
    };
    
    const renderMyCrawls = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
                </div>
            );
        }

        if (error) {
            return <div className="text-center text-red-500 p-4">{error}</div>;
        }

        if (savedCrawls.length === 0) {
            return (
                <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                    <i className="fas fa-route fa-3x mb-4"></i>
                    <h2 className="text-xl font-bold">No Saved Crawls</h2>
                    <p className="mt-2">You haven't planned any pub crawls yet. Let's create one!</p>
                </div>
            );
        }

        return (
             <ul className="space-y-3">
                {savedCrawls.map(crawl => (
                    <li key={crawl.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">{crawl.name || `Crawl from ${new Date(crawl.created_at).toLocaleDateString()}`}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{crawl.stop_count} stops in {crawl.start_location_text}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleDeleteCrawl(crawl)}
                                className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                aria-label="Delete crawl"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                            <button onClick={() => handleViewCrawl(crawl)} className="bg-amber-500 text-black font-bold py-2 px-4 rounded-lg text-sm">
                                View
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    const renderCommunityCrawls = () => (
        <div className="text-center text-gray-500 dark:text-gray-400 p-8">
            <i className="fas fa-users-slash fa-3x mb-4"></i>
            <h2 className="text-xl font-bold">Coming Soon!</h2>
            <p className="mt-2">Soon you'll be able to discover and save public pub crawls created by the Stoutly community.</p>
        </div>
    );
    
    const TabButton = ({ tabId, label, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`px-1 py-4 text-sm font-medium border-b-2 ${
                isActive
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            role="tab"
            aria-selected={isActive}
        >
            {label}
        </button>
    );

    if (viewingCrawl) {
        return (
            <PubCrawlDetailView
                crawl={viewingCrawl}
                onBack={() => setViewingCrawl(null)}
                onSelectPub={handleSelectPub}
                activeCrawl={activeCrawl}
                onStartCrawl={onStartCrawl}
                onEndCrawl={onEndCrawl}
                onToggleCrawlStop={onToggleCrawlStop}
                onReorderStops={onReorderStops}
                settings={settings}
                pubScores={pubScores}
                onRenameCrawl={handleRenameCrawl}
                onResetCrawl={handleResetCrawl}
            />
        );
    }
    
    if (isLoadingCrawlDetail) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your crawl...</p>
            </div>
        );
    }

    return (
        <>
            {isSetupModalOpen && (
                <PubCrawlSetupModal
                    onClose={() => setIsSetupModalOpen(false)}
                    onSubmit={handlePlanCrawl}
                    userLocation={userLocation}
                    locationPermissionStatus={locationPermissionStatus}
                    onRequestPermission={onRequestPermission}
                />
            )}
            {isGenerating && <PubCrawlGenerationView onCancel={handleCancelGeneration} />}
            {crawlToDelete && (
                <ConfirmationModal
                    isOpen={!!crawlToDelete}
                    onClose={() => setCrawlToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Pub Crawl?"
                    message={`Are you sure you want to delete "${crawlToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    theme="red"
                />
            )}
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
            <div className="h-full flex flex-col">
                <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-route text-2xl text-amber-500"></i>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pub Crawl Planner</h1>
                                    <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">BETA</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Plan, save, and track your ultimate Guinness adventures.
                        </p>
                    </div>
                </header>
                 <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="max-w-4xl mx-auto px-4">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <TabButton tabId="my_crawls" label="My Crawls" isActive={activeTab === 'my_crawls'} onClick={() => setActiveTab('my_crawls')} />
                            <TabButton tabId="community_crawls" label="Community Crawls" isActive={activeTab === 'community_crawls'} onClick={() => setActiveTab('community_crawls')} />
                        </nav>
                    </div>
                </div>
                <main className="flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900">
                   <div className="max-w-4xl mx-auto p-4">
                        <div className="space-y-4">
                            {activeTab === 'my_crawls' && (
                                <>
                                    <button
                                        onClick={() => setIsSetupModalOpen(true)}
                                        className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center space-x-2 text-lg"
                                    >
                                        <i className="fas fa-magic"></i>
                                        <span>Plan a New Crawl</span>
                                    </button>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white pt-4 border-t border-gray-200 dark:border-gray-700">My Saved Crawls ({savedCrawls.length})</h2>
                                    {renderMyCrawls()}
                                </>
                            )}
                            {activeTab === 'community_crawls' && renderCommunityCrawls()}
                        </div>
                   </div>
                </main>
            </div>
        </>
    );
};

export default PubCrawlPage;
