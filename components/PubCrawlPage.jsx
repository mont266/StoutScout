import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import { Capacitor } from '@capacitor/core';
import PubCrawlSetupModal from './PubCrawlSetupModal.jsx';
import PubCrawlGenerationView from './PubCrawlGenerationView.jsx';
import PubCrawlDetailView from './PubCrawlDetailView.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import PubCrawlFeedbackModal from './PubCrawlFeedbackModal.jsx';
import Avatar from './Avatar.jsx';
import { getCurrencyInfo } from '../utils.js';

// Initialize Gemini via Supabase API Proxy

const PubCrawlPage = ({ userProfile, setAlertInfo, handleSelectPub, activeCrawl, onStartCrawl, onEndCrawl, onToggleCrawlStop, onReorderStops, onAddStop, onDeleteStop, settings, pubScores, userLocation, locationPermissionStatus, onRequestPermission, userTrophies, allTrophies, fetchUserTrophies, setUnlockedTrophiesToShow, setConfettiState, handleAddXP }) => {
    const [savedCrawls, setSavedCrawls] = useState([]);
    const [communityCrawls, setCommunityCrawls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [error, setError] = useState(null);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavingCrawlId, setIsSavingCrawlId] = useState(null);
    const isCancelledRef = useRef(false);

    const [viewingCrawl, setViewingCrawl] = useState(null);
    const [communitySearchQuery, setCommunitySearchQuery] = useState('');
    const [communityFilter, setCommunityFilter] = useState('all');
    const [myCrawlsFilter, setMyCrawlsFilter] = useState('all');
    const [isLoadingCrawlDetail, setIsLoadingCrawlDetail] = useState(false);
    const [crawlToDelete, setCrawlToDelete] = useState(null);
    const [crawlToReset, setCrawlToReset] = useState(null);
    const [crawlToTogglePublish, setCrawlToTogglePublish] = useState(null);
    const [activeTab, setActiveTab] = useState('my_crawls');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [crawlCredits, setCrawlCredits] = useState(5);
    const [timeUntilReset, setTimeUntilReset] = useState('');

    useEffect(() => {
        if (userProfile) {
            // Initial fetch of credits
            const fetchCredits = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('crawl_credits')
                    .eq('id', userProfile.id)
                    .single();
                
                if (data) {
                    setCrawlCredits(data.crawl_credits ?? 5);
                }
            };
            fetchCredits();

            // Subscribe to realtime changes
            const subscription = supabase
                .channel(`public:profiles:id=eq.${userProfile.id}`)
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'profiles', 
                    filter: `id=eq.${userProfile.id}` 
                }, (payload) => {
                    if (payload.new && payload.new.crawl_credits !== undefined) {
                        setCrawlCredits(payload.new.crawl_credits);
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [userProfile]);

    useEffect(() => {
        // Countdown timer logic
        if (crawlCredits < 5) {
            const updateTimer = () => {
                const now = new Date();
                const nextReset = new Date(now);
                nextReset.setUTCHours(24, 0, 0, 0); // Next midnight UTC
                
                const diff = nextReset - now;
                if (diff <= 0) {
                    setTimeUntilReset('00:00:00');
                    return;
                }

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setTimeUntilReset(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            };

            updateTimer(); // Run immediately
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeUntilReset('');
        }
    }, [crawlCredits]);

    const fetchSavedCrawls = useCallback(async () => {
        if (!userProfile) return;
        // Use the new isRefreshing state for the refresh button, keep 'loading' for the initial load
        setIsRefreshing(true);
        setError(null);
        trackEvent('view_pub_crawl_page');

        try {
            const { data, error: dbError } = await supabase
                .from('pub_crawls')
                .select('id, name, created_at, start_location_text, start_location_lat, start_location_lng, original_crawl_id, is_public, saves_count, user_id, stops:pub_crawl_stops(stop_order, pub:pubs(local_avg_price, country_code, country_name))')
                .eq('user_id', userProfile.id)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            
            const formattedCrawls = data.map(crawl => {
                const sortedStops = (crawl.stops || []).sort((a, b) => a.stop_order - b.stop_order);
                const stopCount = sortedStops.length;
                let estimatedCost = 0;
                let currencySymbol = '£';
                
                if (stopCount > 0 && sortedStops[0].pub) {
                    const firstPub = sortedStops[0].pub;
                    const currencyInfo = getCurrencyInfo(firstPub);
                    currencySymbol = currencyInfo.symbol;
                    
                    sortedStops.forEach(stop => {
                        if (stop.pub) {
                            if (stop.pub.local_avg_price) {
                                estimatedCost += parseFloat(stop.pub.local_avg_price);
                            } else {
                                estimatedCost += parseFloat(currencyInfo.examplePrice || 5);
                            }
                        }
                    });
                }
                
                return {
                    ...crawl,
                    // If this is a saved community crawl, remove the ' (Copy)' suffix that the RPC adds
                    name: crawl.original_crawl_id ? crawl.name.replace(/ \(Copy\)$/i, '') : crawl.name,
                    stop_count: stopCount,
                    estimated_cost: estimatedCost,
                    currency_symbol: currencySymbol
                };
            });
            setSavedCrawls(formattedCrawls);

        } catch (err) {
            console.error("Error fetching saved crawls:", err);
            setError("Could not load your saved pub crawls.");
        } finally {
            setLoading(false); // This handles the initial page load spinner
            setIsRefreshing(false); // This handles the refresh button spinner
        }
    }, [userProfile]);

    const fetchCommunityCrawls = useCallback(async () => {
        if (!userProfile) return;
        setLoadingCommunity(true);
        try {
            const { data, error: dbError } = await supabase
                .from('pub_crawls')
                .select('id, name, created_at, start_location_text, start_location_lat, start_location_lng, is_public, saves_count, user_id, profiles!pub_crawls_user_id_fkey(username, avatar_id), stops:pub_crawl_stops(stop_order, pub:pubs(lat, lng, local_avg_price, country_code, country_name))')
                .eq('is_public', true)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            
            // Haversine distance in km
            const getDistanceKm = (lat1, lon1, lat2, lon2) => {
                const R = 6371; // km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            };

            const formattedCrawls = data.map(crawl => {
                const sortedStops = (crawl.stops || []).sort((a, b) => a.stop_order - b.stop_order);
                const stopCount = sortedStops.length;
                
                let totalDistanceKm = 0;
                let mapboxMarkers = [];
                let mapboxPathCoords = [];
                let estimatedCost = 0;
                let currencySymbol = '£';

                if (stopCount > 0 && sortedStops[0].pub) {
                    const firstPub = sortedStops[0].pub;
                    const currencyInfo = getCurrencyInfo(firstPub);
                    currencySymbol = currencyInfo.symbol;
                }

                sortedStops.forEach((stop, index) => {
                    const pub = stop.pub;
                    if (pub) {
                        if (pub.lat && pub.lng) {
                            mapboxMarkers.push(`pin-s-${index + 1}+f59e0b(${pub.lng},${pub.lat})`);
                            mapboxPathCoords.push(`${pub.lng},${pub.lat}`);
                            
                            if (index > 0) {
                                const prevPub = sortedStops[index - 1].pub;
                                if (prevPub && prevPub.lat && prevPub.lng) {
                                    totalDistanceKm += getDistanceKm(prevPub.lat, prevPub.lng, pub.lat, pub.lng);
                                }
                            }
                        }
                        
                        if (pub.local_avg_price) {
                            estimatedCost += parseFloat(pub.local_avg_price);
                        } else if (stopCount > 0 && sortedStops[0].pub) {
                            const currencyInfo = getCurrencyInfo(sortedStops[0].pub);
                            estimatedCost += parseFloat(currencyInfo.examplePrice || 5);
                        } else {
                            estimatedCost += 5; // Fallback
                        }
                    }
                });

                // Convert pure line distance to rough walking time (5km/h * 1.3 detour factor)
                const totalWalkTimeMinutes = Math.max(1, Math.round((totalDistanceKm * 1.3 / 5) * 60));
                
                let staticMapUrl = null;
                if (mapboxMarkers.length > 0 && mapboxToken) {
                    const markersString = mapboxMarkers.join(',');
                    staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${markersString}/auto/400x200?padding=40&access_token=${mapboxToken}`;
                }

                return {
                    ...crawl,
                    // If this is a saved community crawl, remove the ' (Copy)' suffix that the RPC adds
                    name: crawl.original_crawl_id ? crawl.name.replace(/ \(Copy\)$/i, '') : crawl.name,
                    stop_count: stopCount,
                    walk_time_mins: totalWalkTimeMinutes,
                    static_map_url: staticMapUrl || `https://picsum.photos/seed/${crawl.id}/400/200`,
                    estimated_cost: estimatedCost,
                    currency_symbol: currencySymbol
                };
            });
            setCommunityCrawls(formattedCrawls);
        } catch (err) {
            console.error("Error fetching community crawls:", err);
        } finally {
            setLoadingCommunity(false);
        }
    }, [userProfile]);

    useEffect(() => {
        fetchSavedCrawls();
    }, [fetchSavedCrawls]);

    useEffect(() => {
        if (activeTab === 'community_crawls') {
            fetchCommunityCrawls();
        }
    }, [activeTab, fetchCommunityCrawls]);

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
        const targetCrawl = crawlToDelete;
        trackEvent('delete_pub_crawl', { crawl_id: targetCrawl.id });

        // Optimistic update: Remove from list immediately
        setSavedCrawls(prev => prev.filter(c => c.id !== targetCrawl.id));
        if (viewingCrawl && viewingCrawl.id === targetCrawl.id) {
            setViewingCrawl(null);
        }

        const { error: deleteError } = await supabase
            .from('pub_crawls')
            .delete()
            .eq('id', targetCrawl.id);
        
        setCrawlToDelete(null); // Close modal

        if (deleteError) {
            setAlertInfo({ isOpen: true, title: 'Delete Failed', message: `Could not delete crawl: ${deleteError.message}`, theme: 'error' });
            fetchSavedCrawls(); // Revert on error
        } else {
            if (targetCrawl.is_public && handleRemoveXP) {
                handleRemoveXP(40);
            } else if (handleRemoveXP) {
                handleRemoveXP(15);
            }
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Pub crawl has been deleted.', theme: 'success' });
            // List already updated optimistically
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
        const targetCrawl = crawlToReset; // Capture the crawl before clearing state
        trackEvent('reset_pub_crawl', { crawl_id: targetCrawl.id });
    
        const { error: updateError } = await supabase
            .from('pub_crawl_stops')
            .update({ visited_at: null })
            .eq('crawl_id', targetCrawl.id);
    
        setCrawlToReset(null); // Close modal
    
        if (updateError) {
            setAlertInfo({ isOpen: true, title: 'Reset Failed', message: `Could not reset crawl progress: ${updateError.message}`, theme: 'error' });
        } else {
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Crawl progress has been reset.', theme: 'success' });
            
            // Optimistically update the detail view state immediately
            if (viewingCrawl && viewingCrawl.id === targetCrawl.id) {
                setViewingCrawl(prev => ({
                    ...prev,
                    stops: prev.stops.map(stop => ({ ...stop, visited_at: null })),
                    lastUpdated: Date.now() // Force re-render via key change
                }));
            }
        }
    };

    const handleTogglePublishRequest = (crawlId, makePublic) => {
        const crawl = savedCrawls.find(c => c.id === crawlId);
        setCrawlToTogglePublish({ id: crawlId, makePublic, name: crawl?.name || 'this crawl' });
    };

    const confirmTogglePublish = () => {
        if (!crawlToTogglePublish) return;
        const { id, makePublic } = crawlToTogglePublish;
        setCrawlToTogglePublish(null);
        handleTogglePublish(id, makePublic);
    };

    const handleTogglePublish = async (crawlId, makePublic) => {
        trackEvent(makePublic ? 'publish_crawl' : 'unpublish_crawl', { crawl_id: crawlId });
        
        // Optimistic update
        setSavedCrawls(prev => prev.map(c => c.id === crawlId ? { ...c, is_public: makePublic } : c));
        if (viewingCrawl && viewingCrawl.id === crawlId) {
            setViewingCrawl(prev => ({ ...prev, is_public: makePublic }));
        }

        const { error } = await supabase
            .from('pub_crawls')
            .update({ is_public: makePublic })
            .eq('id', crawlId);

        if (error) {
            console.error("Error toggling publish state:", error);
            setAlertInfo({ isOpen: true, title: 'Action Failed', message: `Could not update publish state: ${error.message}`, theme: 'error' });
            fetchSavedCrawls();
        } else {
            setAlertInfo({ 
                isOpen: true, 
                title: 'Success', 
                message: makePublic ? 'Crawl is now public and visible in the community!' : 'Crawl is now private.', 
                theme: 'success' 
            });
            if (makePublic && handleAddXP) {
                // Check if they already shared this crawl maybe? Or just give 25 XP. We can just give the 25 XP, or maybe query XP logs? 
                // Wait, if they unpublish and publish, they could spam XP. Oh, you're right. Let's just grant it, the prompt says "when they are shared"
                handleAddXP(25, 'Sharing a Pub Crawl');
            } else if (!makePublic && handleRemoveXP) {
                // Remove 25 XP if they unshare
                handleRemoveXP(25);
            }
            if (activeTab === 'community_crawls') fetchCommunityCrawls();
        }
    };

    const handleSaveCommunityCrawl = async (crawlId) => {
        if (!userProfile || isSavingCrawlId === crawlId) return;
        trackEvent('save_community_crawl', { crawl_id: crawlId });
        setIsSavingCrawlId(crawlId);

        try {
            const { data: newCrawlId, error } = await supabase.rpc('clone_community_crawl', { p_crawl_id: crawlId });
            
            if (error) throw error;
            
            // The RPC appends ' (Copy)' to the name. Since we own the new clone, we can rename it correctly.
            const { data: newCrawl } = await supabase.from('pub_crawls').select('name').eq('id', newCrawlId).single();
            if (newCrawl && newCrawl.name.endsWith(' (Copy)')) {
                const fixedName = newCrawl.name.slice(0, -7);
                await supabase.from('pub_crawls').update({ name: fixedName }).eq('id', newCrawlId);
            }
            
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Crawl copied to your list!', theme: 'success' });
            
            // Re-fetch to update lists
            await fetchSavedCrawls();
            await fetchCommunityCrawls(); // Updates the total saves count
        } catch (err) {
            console.error("Error saving community crawl:", err);
            setAlertInfo({ isOpen: true, title: 'Save Failed', message: `Could not save crawl: ${err.message}`, theme: 'error' });
        } finally {
            setIsSavingCrawlId(null);
        }
    };

    const handleUnsaveCommunityCrawl = async (originalCrawlId) => {
        if (!userProfile || isSavingCrawlId === originalCrawlId) return;
        trackEvent('unsave_community_crawl', { original_crawl_id: originalCrawlId });
        setIsSavingCrawlId(originalCrawlId);

        try {
            // Find the saved crawls for this original crawl in our state
            const savedVersions = savedCrawls.filter(c => c.original_crawl_id === originalCrawlId);
            if (savedVersions.length === 0) return;
            
            const idsToDelete = savedVersions.map(c => c.id);

            // Use the unclone RPC to delete clones and decrement the count in one transaction
            const { error: uncloneError } = await supabase.rpc('unclone_community_crawl', { p_original_crawl_id: originalCrawlId });
            
            if (uncloneError) throw uncloneError;

            // Optimistic update
            setSavedCrawls(prev => prev.filter(c => !idsToDelete.includes(c.id)));
            if (viewingCrawl && idsToDelete.includes(viewingCrawl.id)) {
                setViewingCrawl(null);
            }

            setAlertInfo({ isOpen: true, title: 'Success', message: 'Crawl removed from your list.', theme: 'success' });
            
            // Re-fetch to update lists
            await fetchCommunityCrawls(); // Updates the total saves count
        } catch (err) {
            console.error("Error unsaving community crawl:", err);
            setAlertInfo({ isOpen: true, title: 'Unsave Failed', message: `Could not unsave crawl: ${err.message}`, theme: 'error' });
            fetchSavedCrawls();
        } finally {
            setIsSavingCrawlId(null);
        }
    };
    
    const handleCloneToEdit = async (crawlToClone) => {
        if (!userProfile) return;
        trackEvent('clone_to_edit', { original_crawl_id: crawlToClone.id });
        setIsSavingCrawlId(crawlToClone.id);

        try {
            // Create a completely new disconnected copy
            const { data: newCrawl, error: insertError } = await supabase
                .from('pub_crawls')
                .insert({
                    user_id: userProfile.id,
                    name: crawlToClone.name + ' (Editable Copy)',
                    start_location_text: crawlToClone.start_location_text,
                    start_location_lat: crawlToClone.start_location_lat,
                    start_location_lng: crawlToClone.start_location_lng,
                    original_crawl_id: null // Explicitly detached so it's editable
                })
                .select()
                .single();

            if (insertError) throw insertError;
            
            // Replicate stops
            if (crawlToClone.stops && crawlToClone.stops.length > 0) {
                const stopsToInsert = crawlToClone.stops.map(stop => ({
                    crawl_id: newCrawl.id,
                    pub_id: stop.pub.id || stop.pub_id,
                    stop_order: stop.stop_order
                }));
                
                const { error: stopsError } = await supabase
                    .from('pub_crawl_stops')
                    .insert(stopsToInsert);
                    
                if (stopsError) throw stopsError;
            }
            
            setAlertInfo({ isOpen: true, title: 'Success', message: 'Editable copy created in your crawls.', theme: 'success' });
            
            // Re-fetch list
            await fetchSavedCrawls();
        } catch (err) {
            console.error("Error cloning to edit:", err);
            setAlertInfo({ isOpen: true, title: 'Clone Failed', message: `Could not create editable copy: ${err.message}`, theme: 'error' });
        } finally {
            setIsSavingCrawlId(null);
            // Don't switch viewingCrawl automatically to keep it simple, but we could do it here
        }
    };

    const handleCancelGeneration = () => {
        isCancelledRef.current = true;
        setIsGenerating(false);
        trackEvent('plan_pub_crawl_cancel');
    };

    const handlePlanCrawl = async ({ startLocationText, numPubs, crawlName, priority }) => {
        if (crawlCredits <= 0) {
            setAlertInfo({ isOpen: true, title: 'No Credits', message: 'You have used all your daily crawl credits. Please wait until they reset.', theme: 'error' });
            return;
        }

        setIsSetupModalOpen(false);
        setIsGenerating(true);
        isCancelledRef.current = false;
        setError(null);
        trackEvent('plan_pub_crawl_start', { location: startLocationText, num_pubs: numPubs, priority });

        try {
            // 0. Deduct credit
            const { data: creditDeducted, error: creditError } = await supabase.rpc('deduct_crawl_credit', { user_id_param: userProfile.id });
            
            if (creditError || !creditDeducted) {
                throw new Error('Could not deduct crawl credit. Please try again later.');
            }

            // Optimistically update local state immediately
            setCrawlCredits(prev => Math.max(0, prev - 1));

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
            if (candidates.length < 2) throw new Error('Not enough rated pubs found in that area to plan a crawl.');

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
            
            const { data: responseData, error: proxyError } = await supabase.functions.invoke('generate-crawl', {
                body: { prompt }
            });

            if (proxyError) {
                throw new Error(proxyError.message || "Failed to generate crawl route.");
            }

            if (isCancelledRef.current) return;

            const result = JSON.parse(responseData.text);
            const rawPubIds = result.crawl_route;

            if (!rawPubIds || rawPubIds.length === 0) {
                throw new Error("The AI couldn't generate a crawl for that area. Try a different location or more stops.");
            }

            // Validate that the IDs returned by Gemini actually exist in our candidates list
            // to prevent foreign key violations if the AI "invents" a pub ID.
            const validPubIds = rawPubIds.filter(id => 
                candidates.some(c => String(c.id) === String(id))
            );

            if (validPubIds.length === 0) {
                throw new Error("The AI generated an invalid route. Please try again.");
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

            const stopsToInsert = validPubIds.map((pubId, index) => {
                // Find the original pub ID from candidates to ensure we use the correct type (number vs string)
                const originalPub = candidates.find(c => String(c.id) === String(pubId));
                return {
                    crawl_id: crawl.id,
                    pub_id: originalPub.id,
                    stop_order: index + 1,
                };
            });
            const { error: stopsError } = await supabase.from('pub_crawl_stops').insert(stopsToInsert);
            if (stopsError) throw stopsError;

            if (handleAddXP) handleAddXP(15, 'Creating a Pub Crawl');

            trackEvent('plan_pub_crawl_success', { generated_stops: validPubIds.length });
            
            let successMessage = `Your ${validPubIds.length}-stop pub crawl in ${startLocationText} has been saved.`;
            let successTitle = 'Crawl Generated!';
            let successTheme = 'success';

            if (validPubIds.length < numPubs) {
                successMessage = `We could only find ${validPubIds.length} suitable pubs in this area, so your crawl is shorter than the ${numPubs} stops you requested.`;
                successTitle = 'Crawl Generated (Short)';
                successTheme = 'warning';
            }

            setAlertInfo({ isOpen: true, title: successTitle, message: successMessage, theme: successTheme });

            // Manually add the new crawl to the state for an instant, reliable update.
            // This avoids a race condition where we try to fetch the list before the new crawl is available.
            const newCrawlForList = {
                ...crawl,
                stops: [{ count: validPubIds.length }], // Mimic the exact data structure from a real fetch
                stop_count: validPubIds.length,
            };
            setSavedCrawls(prevCrawls => [newCrawlForList, ...prevCrawls]);
            
            // Check for newly unlocked trophies
            if (fetchUserTrophies && setUnlockedTrophiesToShow && setConfettiState && userTrophies && allTrophies) {
                console.log('Checking for new trophies...');
                const trophiesBefore = new Set(userTrophies.map(t => t.trophy_id));
                const newTrophies = await fetchUserTrophies(userProfile.id);
                console.log('New trophies fetched:', newTrophies);
                const justUnlocked = newTrophies.filter(t => !trophiesBefore.has(t.trophy_id));
                console.log('Just unlocked trophies:', justUnlocked);

                if (justUnlocked.length > 0) {
                    const unlockedDetails = justUnlocked
                        .map(ut => allTrophies.find(at => at.id === ut.trophy_id))
                        .filter(Boolean);
                    
                    if (unlockedDetails.length > 0) {
                        console.log('Showing unlocked trophies:', unlockedDetails);
                        setUnlockedTrophiesToShow(unlockedDetails);
                        // Trigger confetti
                        setConfettiState({
                            active: true,
                            recycle: true,
                            opacity: 1,
                            key: crypto.randomUUID(),
                            numberOfPieces: 350,
                            confettiSource: { x: 0, y: 0, w: window.innerWidth, h: 0 },
                        });
                    }
                }
            } else {
                console.warn('Missing props for trophy check:', { fetchUserTrophies: !!fetchUserTrophies, setUnlockedTrophiesToShow: !!setUnlockedTrophiesToShow, setConfettiState: !!setConfettiState, userTrophies: !!userTrophies, allTrophies: !!allTrophies });
            }
            
            // Removed fetchSavedCrawls() to prevent race condition overwriting the optimistic update

        } catch (err) {
            console.error("Error planning crawl:", err);
            if (!isCancelledRef.current) {
                // Refund the credit if the crawl failed and wasn't cancelled by the user
                try {
                    await supabase.rpc('refund_crawl_credit', { user_id_param: userProfile.id });
                    setCrawlCredits(prev => Math.min(5, prev + 1)); // Optimistic update
                } catch (refundErr) {
                    console.error("Failed to refund credit:", refundErr);
                }

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

        const filteredMyCrawls = savedCrawls.filter(crawl => {
            if (myCrawlsFilter === 'mine' && crawl.original_crawl_id) return false;
            if (myCrawlsFilter === 'community' && !crawl.original_crawl_id) return false;
            return true;
        });

        return (
            <div className="space-y-4">
                {savedCrawls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setMyCrawlsFilter('all')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${myCrawlsFilter === 'all' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setMyCrawlsFilter('mine')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${myCrawlsFilter === 'mine' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                        >
                            My Crawls
                        </button>
                        <button
                            onClick={() => setMyCrawlsFilter('community')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${myCrawlsFilter === 'community' ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-400' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                        >
                            Community
                        </button>
                    </div>
                )}
                
                {filteredMyCrawls.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <i className={`fas ${savedCrawls.length === 0 ? 'fa-route' : 'fa-search'} fa-3x mb-4 text-gray-300 dark:text-gray-600`}></i>
                        <h2 className="text-xl font-bold">{savedCrawls.length === 0 ? 'No Saved Crawls' : 'No Crawls Found'}</h2>
                        <p className="mt-2 text-sm max-w-sm mx-auto">
                            {savedCrawls.length === 0 
                                ? "You haven't planned any pub crawls yet. Let's create one!" 
                                : `No crawls match the "${myCrawlsFilter === 'mine' ? 'My Crawls' : 'Community'}" filter.`}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {filteredMyCrawls.map(crawl => (
                    <li key={crawl.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-start sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 w-full flex flex-col pr-0 sm:pr-4 min-w-0">
                            <div className="flex items-center justify-between sm:justify-start gap-2 mb-1 w-full">
                                <p className="font-bold text-gray-800 dark:text-white truncate flex-1 min-w-0">{crawl.name || `Crawl from ${new Date(crawl.created_at).toLocaleDateString()}`}</p>
                                <div className="flex-shrink-0 flex items-center">
                                    {crawl.original_crawl_id ? (
                                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center whitespace-nowrap" title="Saved from the Community">
                                            <i className="fas fa-bookmark mr-1"></i> Community
                                        </span>
                                    ) : crawl.is_public ? (
                                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center whitespace-nowrap" title="Published to the Community">
                                            <i className="fas fa-globe mr-1"></i> Public
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full">
                                {crawl.stop_count} stops in {crawl.start_location_text}
                                <span className="mx-2">•</span>
                                {crawl.currency_symbol}{crawl.estimated_cost?.toFixed(2)} est.
                                <span className="mx-2">•</span>
                                {new Date(crawl.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="w-full sm:w-auto flex flex-shrink-0 items-center justify-end space-x-2 mt-4 sm:mt-0">
                            {!crawl.original_crawl_id && (
                                <button
                                    onClick={() => handleTogglePublishRequest(crawl.id, !crawl.is_public)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${crawl.is_public ? 'text-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40' : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    title={crawl.is_public ? "Unpublish from Community" : "Publish to Community"}
                                >
                                    <i className="fas fa-globe"></i>
                                </button>
                            )}
                            <button
                                onClick={() => handleDeleteCrawl(crawl)}
                                className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                aria-label="Delete crawl"
                                title="Delete crawl"
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
                )}
            </div>
        );
    };

    const renderCommunityCrawls = () => {
        if (loadingCommunity) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
                </div>
            );
        }

        if (communityCrawls.length === 0) {
            return (
                <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                    <i className="fas fa-users-slash fa-3x mb-4"></i>
                    <h2 className="text-xl font-bold">No Community Crawls Yet</h2>
                    <p className="mt-2">Be the first to create and publish a pub crawl!</p>
                </div>
            );
        }

        const filteredCommunityCrawls = communityCrawls.filter(crawl => {
            if (communityFilter === 'mine' && crawl.user_id !== userProfile?.id) return false;
            if (communityFilter === 'others' && crawl.user_id === userProfile?.id) return false;

            if (!communitySearchQuery.trim()) return true;
            const query = communitySearchQuery.toLowerCase();
            return (
                (crawl.name && crawl.name.toLowerCase().includes(query)) ||
                (crawl.start_location_text && crawl.start_location_text.toLowerCase().includes(query)) ||
                (crawl.profiles?.username && crawl.profiles.username.toLowerCase().includes(query))
            );
        });

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Discover Crawls</h2>
                    <button
                        onClick={fetchCommunityCrawls}
                        disabled={loadingCommunity}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Refresh community crawls"
                    >
                        <i className={`fas fa-sync-alt ${loadingCommunity ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
                
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fas fa-search text-gray-400"></i>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors"
                        placeholder="Search by city, crawl name, or username..."
                        value={communitySearchQuery}
                        onChange={(e) => setCommunitySearchQuery(e.target.value)}
                    />
                    {communitySearchQuery && (
                        <button 
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            onClick={() => setCommunitySearchQuery('')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setCommunityFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${communityFilter === 'all' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                    >
                        All
                    </button>
                    {userProfile && (
                        <>
                            <button
                                onClick={() => setCommunityFilter('mine')}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${communityFilter === 'mine' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                            >
                                My Shared Crawls
                            </button>
                            <button
                                onClick={() => setCommunityFilter('others')}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${communityFilter === 'others' ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                            >
                                Others
                            </button>
                        </>
                    )}
                </div>

                {filteredCommunityCrawls.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <i className="fas fa-search fa-3x mb-4 text-gray-300 dark:text-gray-600"></i>
                        <h2 className="text-xl font-bold">No crawls found</h2>
                        <p className="mt-2">Try adjusting your search terms.</p>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCommunityCrawls.map(crawl => (
                        <div key={crawl.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col transition-all hover:shadow-md group">
                            <div 
                                className="h-32 bg-gray-200 dark:bg-gray-700 relative bg-cover bg-center overflow-hidden"
                            >
                                <img src={crawl.static_map_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
                                <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end gap-2">
                                    <h3 className="text-xl font-bold text-white shadow-sm truncate pr-2 flex-1 min-w-0">{crawl.name}</h3>
                                    <div className="flex-shrink-0 flex items-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white border border-white/10 whitespace-nowrap">
                                        <i className="fas fa-beer text-amber-400 mr-1.5 flex-shrink-0"></i>
                                        {crawl.stop_count} {crawl.stop_count === 1 ? 'stop' : 'stops'}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 flex-grow">
                                <div className="flex justify-between items-start mb-4 gap-2">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-1 items-center min-w-0 pr-2">
                                        <i className="fas fa-map-marker-alt mr-1.5 text-gray-400 flex-shrink-0"></i>
                                        <span className="truncate">{crawl.start_location_text}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="text-sm font-medium text-green-600 dark:text-green-400 flex flex-shrink-0 items-center bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded whitespace-nowrap" title="Estimated cost of 1 pint per pub">
                                            {crawl.currency_symbol}{crawl.estimated_cost?.toFixed(2)} est.
                                        </div>
                                        <div className="text-sm font-medium text-amber-600 dark:text-amber-400 flex flex-shrink-0 items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded whitespace-nowrap">
                                            <i className="fas fa-walking mr-1.5 flex-shrink-0"></i>
                                            ~{crawl.walk_time_mins} min
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center mr-4">
                                        {crawl.profiles?.avatar_id ? (
                                            <Avatar avatarId={crawl.profiles.avatar_id} className="w-5 h-5 rounded-full mr-1.5 flex-shrink-0" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex flex-shrink-0 items-center justify-center text-white font-bold text-[10px] mr-1.5">
                                                {crawl.profiles?.username ? crawl.profiles.username.substring(0, 1).toUpperCase() : '?'}
                                            </div>
                                        )}
                                        <span className="truncate max-w-[100px]">
                                            {crawl.profiles?.username ? `@${crawl.profiles.username}` : 'Anonymous'}
                                        </span>
                                    </div>
                                    <div className="flex items-center ml-auto">
                                        <i className="fas fa-heart text-red-400 mr-1"></i>
                                        <span>{crawl.saves_count || 0} saves</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/80 p-3 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-2">
                                <button 
                                    onClick={() => handleViewCrawl(crawl)} 
                                    className="flex-1 min-w-0 bg-white dark:bg-gray-700 text-gray-700 dark:text-white font-medium py-2 px-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors truncate"
                                >
                                    View Details
                                </button>
                                {crawl.user_id === userProfile?.id ? (
                                    <div className="flex-1 min-w-0 flex items-center justify-center text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg truncate px-2 py-2">
                                        <i className="fas fa-crown mr-1.5 flex-shrink-0"></i>
                                        <span className="truncate">Your Crawl</span>
                                    </div>
                                ) : savedCrawls.some(sc => sc.original_crawl_id === crawl.id) ? (
                                    <button 
                                        onClick={() => handleUnsaveCommunityCrawl(crawl.id)}
                                        disabled={isSavingCrawlId === crawl.id}
                                        className="flex-1 min-w-0 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2 px-2 rounded-lg text-sm hover:border-red-500 hover:text-red-500 dark:hover:text-red-400 group border border-transparent disabled:opacity-50 transition-colors flex items-center justify-center truncate"
                                    >
                                        <i className={`fas ${isSavingCrawlId === crawl.id ? 'fa-spinner fa-spin' : 'fa-times'} mr-1.5 flex-shrink-0 text-gray-500 group-hover:text-red-500`}></i>
                                        <span className="truncate">Remove Crawl</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleSaveCommunityCrawl(crawl.id)}
                                        disabled={isSavingCrawlId === crawl.id}
                                        className="flex-1 min-w-0 bg-amber-500 text-black font-bold py-2 px-2 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center truncate"
                                    >
                                        <i className={`fas ${isSavingCrawlId === crawl.id ? 'fa-spinner fa-spin' : 'fa-bookmark'} mr-1.5 flex-shrink-0`}></i>
                                        <span className="truncate">Save Route</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
        );
    };
    
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

    const renderContent = () => {
        if (viewingCrawl) {
            return (
                <PubCrawlDetailView
                    key={viewingCrawl.id + (viewingCrawl.lastUpdated || '')}
                    crawl={viewingCrawl}
                    forceReadOnly={activeTab === 'community_crawls'}
                    onBack={() => setViewingCrawl(null)}
                    onSelectPub={handleSelectPub}
                    activeCrawl={activeCrawl}
                    onStartCrawl={onStartCrawl}
                    onEndCrawl={onEndCrawl}
                    onToggleCrawlStop={onToggleCrawlStop}
                    onReorderStops={onReorderStops}
                    onAddStop={onAddStop}
                    onDeleteStop={onDeleteStop}
                    settings={settings}
                    pubScores={pubScores}
                    onRenameCrawl={handleRenameCrawl}
                    onResetCrawl={handleResetCrawl}
                    onTogglePublish={handleTogglePublishRequest}
                    onSaveCommunityCrawl={handleSaveCommunityCrawl}
                    onUnsaveCommunityCrawl={handleUnsaveCommunityCrawl}
                    isSaved={savedCrawls.some(sc => sc.original_crawl_id === viewingCrawl.id)}
                    isSaving={isSavingCrawlId === viewingCrawl.id}
                    onCloneToEdit={handleCloneToEdit}
                    setAlertInfo={setAlertInfo}
                    userProfile={userProfile}
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
            <div className="flex flex-col relative h-full overflow-y-auto">
                <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                    {!Capacitor.isNativePlatform() && (
                        <div className="bg-amber-100 dark:bg-amber-900 border-b border-amber-300 dark:border-amber-700 px-4 py-1.5 sm:py-3 w-full relative z-50">
                            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
                                <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100 font-medium flex items-center">
                                    <i className="fas fa-flask mr-2 text-amber-600 dark:text-amber-400"></i>
                                    <span>This feature is in <strong>Beta</strong>. We're actively improving it!</span>
                                </p>
                                <button
                                    onClick={() => setIsFeedbackModalOpen(true)}
                                    className="text-xs font-bold bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-gray-700 px-4 py-2 rounded-full transition-colors whitespace-nowrap shadow-sm"
                                >
                                    Give Feedback
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="p-4 w-full">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                <div className="flex items-center space-x-3">
                                    <i className="fas fa-route text-2xl text-amber-500"></i>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pub Crawl Planner</h1>
                                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">BETA</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-center sm:text-left text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
                                Plan, save, and track your ultimate Guinness adventures.
                            </p>
                        </div>
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
                <main className="flex-grow bg-gray-100 dark:bg-gray-900 pb-20">
                   <div className="max-w-4xl mx-auto p-4">
                        <div className="space-y-4">
                            {activeTab === 'my_crawls' && (
                                <>
                                    <div className="flex flex-col space-y-2">
                                        <button
                                            onClick={() => setIsSetupModalOpen(true)}
                                            disabled={crawlCredits <= 0}
                                            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-lg ${crawlCredits > 0 ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}
                                        >
                                            <i className="fas fa-magic"></i>
                                            <span>Plan a New Crawl</span>
                                            <span className="ml-2 text-sm font-normal bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                                {crawlCredits}/5
                                            </span>
                                        </button>
                                        {crawlCredits < 5 && (
                                            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                                {crawlCredits === 0 ? 'Credits reset in:' : 'Next reset in:'} <span className="font-mono font-bold">{timeUntilReset}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Saved Crawls ({savedCrawls.length})</h2>
                                        <button
                                            onClick={fetchSavedCrawls}
                                            disabled={isRefreshing}
                                            className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            aria-label="Refresh saved crawls"
                                        >
                                            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                                        </button>
                                    </div>
                                    {renderMyCrawls()}
                                </>
                            )}
                            {activeTab === 'community_crawls' && renderCommunityCrawls()}
                        </div>
                   </div>
                </main>
            </div>
        );
    };

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
            {crawlToTogglePublish && (
                <ConfirmationModal
                    isOpen={!!crawlToTogglePublish}
                    onClose={() => setCrawlToTogglePublish(null)}
                    onConfirm={confirmTogglePublish}
                    title={crawlToTogglePublish.makePublic ? "Publish Crawl?" : "Unpublish Crawl?"}
                    message={crawlToTogglePublish.makePublic
                        ? `Are you sure you want to publish "${crawlToTogglePublish.name}" to the community? Other users will be able to view and save it.`
                        : `Are you sure you want to unpublish "${crawlToTogglePublish.name}"? It will be removed from the community tab, but users who have already saved it will keep their copy.`}
                    confirmText={crawlToTogglePublish.makePublic ? "Publish" : "Unpublish"}
                    theme={crawlToTogglePublish.makePublic ? "amber" : "gray"}
                />
            )}
            {isFeedbackModalOpen && (
                <PubCrawlFeedbackModal
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    userProfile={userProfile}
                />
            )}
            {renderContent()}
        </>
    );
};

export default PubCrawlPage;
