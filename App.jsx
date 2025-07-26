import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FilterType } from './types.js';
import { DEFAULT_LOCATION } from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { supabase } from './supabase.js';
import { getRankData, getCurrencyInfo, normalizeNominatimResult, normalizeReverseGeocodeResult, extractPostcode, normalizePubNameForComparison } from './utils.js';
import { trackEvent } from './analytics.js';

import MobileLayout from './components/MobileLayout.jsx';
import DesktopLayout from './components/DesktopLayout.jsx';
import useIsDesktop from './hooks/useIsDesktop.js';

import ProfilePage from './components/ProfilePage.jsx';
import BannedPage from './components/BannedPage.jsx';
import AddPubModal from './components/AddPubModal.jsx';
import CommunityPage from './components/CommunityPage.jsx';

const App = () => {
  // --- STATE MANAGEMENT ---

  // Auth state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // App state
  const [nominatimResults, setNominatimResults] = useState([]);
  const [pubs, setPubs] = useState([]);
  const [allRatings, setAllRatings] = useState(new Map());
  const [selectedPubId, setSelectedPubId] = useState(null);
  const [filter, setFilter] = useState(FilterType.Distance);
  const [isListExpanded, setIsListExpanded] = useState(true);

  // Location State
  const [realUserLocation, setRealUserLocation] = useState(DEFAULT_LOCATION);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION); // This is for the blue dot on the map
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION); // The visual center of the map
  const [searchOrigin, setSearchOrigin] = useState(DEFAULT_LOCATION); // The center of the last search, used for sorting
  const [locationError, setLocationError] = useState(null);
  const [resultsAreCapped, setResultsAreCapped] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);

  // Refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchOnNextMoveEnd, setSearchOnNextMoveEnd] = useState(false);

  const [settings, setSettings] = useState(loadSettings);

  const [activeTab, setActiveTab] = useState('map');
  const [userProfile, setUserProfile] = useState(null);
  const [userRatings, setUserRatings] = useState([]);

  // State for viewing other user profiles
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedRatings, setViewedRatings] = useState([]);
  const [isFetchingViewedProfile, setIsFetchingViewedProfile] = useState(false);
  const [profileViewOrigin, setProfileViewOrigin] = useState(null);

  // Popup states
  const [reviewPopupInfo, setReviewPopupInfo] = useState(null);
  const [updateConfirmationInfo, setUpdateConfirmationInfo] = useState(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState(null);
  const [rankUpInfo, setRankUpInfo] = useState(null);
  
  const [levelRequirements, setLevelRequirements] = useState([]);
  
  const [dbPubs, setDbPubs] = useState([]);
  
  const [isDbPubsLoaded, setIsDbPubsLoaded] = useState(false);
  const [initialSearchComplete, setInitialSearchComplete] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  
  // State for legal pages
  const [legalPageView, setLegalPageView] = useState(null); // 'terms' or 'privacy'

  // PWA Install prompt state
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isIosInstallModalOpen, setIsIosInstallModalOpen] = useState(false);

  // Add Pub feature state
  const [isAddPubModalOpen, setIsAddPubModalOpen] = useState(false);
  const [pubPlacementState, setPubPlacementState] = useState(null);
  const [finalPlacementLocation, setFinalPlacementLocation] = useState(null);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);

  // Social Features State
  const [friendships, setFriendships] = useState([]);
  const [userLikes, setUserLikes] = useState(new Set());


  // --- HOOKS ---
  const isDesktop = useIsDesktop();
  const locationPermissionTracked = useRef(false);
  
  // --- ANALYTICS ---
  
  // More specific screen view tracking
  useEffect(() => {
    let screenName = activeTab;
    const screenClass = 'StoutlyApp';

    if (legalPageView) {
      screenName = `legal_${legalPageView}`; // e.g., legal_terms
    } else if (viewedProfile && (!userProfile || viewedProfile.id !== userProfile.id)) {
      screenName = 'profile_other_user';
    } else if (activeTab === 'profile' && userProfile) {
      screenName = 'profile_own';
    } else if (isAuthOpen) {
      screenName = 'auth';
    } else if (isPasswordRecovery) {
      screenName = 'password_recovery';
    } else if (pubPlacementState) {
      screenName = 'add_pub_placement';
    }

    trackEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass, // GA4 standard parameter
    });
  }, [activeTab, legalPageView, viewedProfile, userProfile, isAuthOpen, isPasswordRecovery, pubPlacementState]);


  useEffect(() => {
    const pub = pubs.find(p => p.id === selectedPubId);
    if (pub) {
      trackEvent('select_content', { content_type: 'pub', item_id: pub.id });
    }
  }, [selectedPubId, pubs]);


  // --- DATA FETCHING & AUTH ---

  useEffect(() => {
    // Listen for the custom event fired from index.tsx
    const handleInstallPrompt = (e) => {
      setInstallPromptEvent(e.detail);
    };
    window.addEventListener('pwa-install-prompt-ready', handleInstallPrompt);

    return () => {
      window.removeEventListener('pwa-install-prompt-ready', handleInstallPrompt);
    };
  }, []);

  const fetchDbPubs = useCallback(async () => {
    const { data, error } = await supabase.from('pubs').select('id, name, address, lat, lng');
    if (error) {
      console.error("Error fetching rated pubs from DB:", error);
    } else {
      const formatted = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        location: { lat: p.lat, lng: p.lng },
      }));
      setDbPubs(formatted);
    }
    setIsDbPubsLoaded(true);
  }, []);

  const fetchAllRatings = useCallback(async () => {
      // This now uses the 'all_ratings_view' for consistency with the feeds and to ensure RLS is handled correctly by the view's WHERE clause.
      // Using the view is more performant and reliable for broad queries than a direct table query with a complex RLS policy.
      const { data, error } = await supabase
          .from('all_ratings_view')
          .select('*')
          .order('created_at', { ascending: false });

      if (error) {
          console.error("Critical error fetching ratings from view. Pub details may be missing data.", error);
          return;
      }

      const ratingsMap = new Map();
      for (const rating of data || []) {
          const existing = ratingsMap.get(rating.pub_id) || [];
          ratingsMap.set(rating.pub_id, [...existing, {
              id: rating.rating_id,
              price: rating.price,
              quality: rating.quality,
              exact_price: rating.exact_price,
              created_at: rating.created_at,
              image_url: rating.image_url,
              like_count: rating.like_count || 0,
              user: {
                  id: rating.uploader_id,
                  username: rating.uploader_username,
                  avatar_id: rating.uploader_avatar_id
              },
          }]);
      }
      setAllRatings(ratingsMap);
  }, []);

  const handleDataRefresh = useCallback(async () => {
      await Promise.all([
          fetchAllRatings(),
          fetchDbPubs(),
      ]);
  }, [fetchAllRatings, fetchDbPubs]);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
    });
    
    fetchAllRatings();
    fetchLevelRequirements();
    fetchDbPubs();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'SIGNED_IN') {
          trackEvent('login', { method: 'email' });
          setIsPasswordRecovery(false);
        }
        if (_event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        setSession(session);
        if (session) {
            setIsAuthOpen(false);
        } else {
            setActiveTab('map');
            setViewedProfile(null);
            setFriendships([]);
            setUserLikes(new Set());
        }
    });

    return () => subscription.unsubscribe();
  }, [fetchAllRatings, fetchDbPubs]);
  
  const fetchLevelRequirements = async () => {
    const { data, error } = await supabase
        .from('level_requirements')
        .select('level, total_ratings_required')
        .order('level', { ascending: true });
    
    if (error) {
        console.error("Failed to fetch level requirements:", error);
    } else {
        setLevelRequirements(data);
    }
  };
  
  const fetchUserData = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
        setUserProfile(null);
        setUserRatings([]);
        return { profile: null, ratings: [] };
    }

    const userId = currentSession.user.id;

    // Fetch user profile. The profile should be created automatically by a DB trigger on sign-up.
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError);
        // If the profile doesn't exist (PGRST116), it's a critical backend error
        // because the trigger should have created it.
        if (profileError.code === 'PGRST116') {
            console.error("CRITICAL: Profile not found for logged-in user. The 'handle_new_user' DB trigger may be missing or failing.");
        }
        setUserProfile(null);
        setUserRatings([]);
        return { profile: null, ratings: [] };
    }

    setUserProfile(profile);

    // If profile exists, fetch ratings.
    const { data: userRatingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('id, pub_id, price, quality, created_at, exact_price, image_url, pubs(id, name, address, lat, lng)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    let mappedUserRatings = [];
    if (ratingsError) {
        console.error("Error fetching user ratings:", ratingsError);
    } else {
        mappedUserRatings = (userRatingsData || []).map(r => ({
          id: r.id, pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality, exact_price: r.exact_price },
          timestamp: new Date(r.created_at).getTime(),
          pubName: r.pubs?.name || 'Unknown',
          pubAddress: r.pubs?.address || 'Unknown',
          pubLocation: r.pubs && r.pubs.lat && r.pubs.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
          image_url: r.image_url,
        }));
    }
    
    setUserRatings(mappedUserRatings);
    return { profile, ratings: mappedUserRatings };
  };

  const fetchSocialData = useCallback(async (userId) => {
    if (!userId) return;
    
    // Fetch user's likes
    const { data: likesData, error: likesError } = await supabase
      .from('rating_likes')
      .select('rating_id')
      .eq('user_id', userId);
    if (likesError) console.error("Error fetching user likes:", likesError);
    else setUserLikes(new Set((likesData || []).map(l => l.rating_id)));

    // Fetch user's friendships
    const { data: friendsData, error: friendsError } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
    if (friendsError) console.error("Error fetching friendships:", friendsError);
    else setFriendships(friendsData || []);

  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
      fetchSocialData(session.user.id);
    } else {
      setUserProfile(null);
      setUserRatings([]);
      setFriendships([]);
      setUserLikes(new Set());
    }
  }, [session, fetchSocialData]);

  useEffect(() => {
    const lockOrientation = async () => {
      // Check if the Screen Orientation API is supported
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        try {
          // Attempt to lock the orientation to portrait-primary
          await screen.orientation.lock('portrait-primary');
        } catch (error) {
          // Log a warning if it fails (e.g., on desktop or unsupported browsers)
          console.warn('Failed to lock screen orientation:', error);
        }
      }
    };

    lockOrientation();
  }, []);


  // --- CORE APP LOGIC & HANDLERS ---

  const handleNominatimResults = useCallback((places, capped) => {
    if (!initialSearchComplete) {
      setInitialSearchComplete(true);
    }
    setNominatimResults(places || []);
    setResultsAreCapped(capped);
    setIsRefreshing(false);
  }, [initialSearchComplete]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setShowSearchAreaButton(false); // Hide the button when a search starts
    setRefreshTrigger(c => c + 1);
    trackEvent('refresh_pubs');
  }, [isRefreshing]);

  const handleSearchAfterMove = useCallback(() => {
    // This function is called by the Map component after a 'flyTo' animation ends.
    if (searchOnNextMoveEnd) {
        handleRefresh();
        setSearchOnNextMoveEnd(false);
    }
  }, [searchOnNextMoveEnd, handleRefresh]);

  const handleSearchThisArea = useCallback(() => {
      trackEvent('click_search_this_area');
      setSearchOrigin(mapCenter); // Update the origin before searching
      handleRefresh();
  }, [handleRefresh, mapCenter]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Popup visibility timers
  useEffect(() => { if (reviewPopupInfo) { const timer = setTimeout(() => setReviewPopupInfo(null), 3000); return () => clearTimeout(timer); } }, [reviewPopupInfo]);
  useEffect(() => { if (updateConfirmationInfo) { const timer = setTimeout(() => setUpdateConfirmationInfo(null), 3000); return () => clearTimeout(timer); } }, [updateConfirmationInfo]);
  useEffect(() => { if (leveledUpInfo) { const timer = setTimeout(() => setLeveledUpInfo(null), 4000); return () => clearTimeout(timer); } }, [leveledUpInfo]);
  useEffect(() => { if (rankUpInfo) { const timer = setTimeout(() => setRankUpInfo(null), 5000); return () => clearTimeout(timer); } }, [rankUpInfo]);

  const getDistance = useCallback((location1, location2) => {
    if (!location1 || !location2) return Infinity;
    const R = 6371e3;
    const φ1 = location1.lat * Math.PI/180;
    const φ2 = location2.lat * Math.PI/180;
    const Δφ = (location2.lat-location1.lat) * Math.PI/180;
    const Δλ = (location2.lng-location1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in meters
  }, []);

  useEffect(() => {
    // 1. Create an index of DB pubs by their signature (normalized name + postcode)
    // This helps us quickly check for duplicates.
    const dbPubIndex = new Map();
    dbPubs.forEach(pub => {
      const name = normalizePubNameForComparison(pub.name);
      const postcode = extractPostcode(pub.address);
      if (name && postcode) {
        dbPubIndex.set(`${name}|${postcode}`, pub.id);
      }
    });

    const combinedPubsMap = new Map();

    // 2. Process Nominatim results.
    // Filter out any results that are duplicates of existing rated pubs.
    const uniqueNominatimPubs = nominatimResults.filter(place => {
      const placeName = normalizePubNameForComparison(place.name);
      const placePostcode = place.postcode; // Already normalized
      if (placeName && placePostcode) {
        const signature = `${placeName}|${placePostcode}`;
        return !dbPubIndex.has(signature); // Keep if NOT in the db index
      }
      return true; // Keep if we can't create a signature
    });

    // Add unique Nominatim pubs to the display map.
    uniqueNominatimPubs.forEach(place => {
      combinedPubsMap.set(place.id, {
        id: place.id,
        name: place.name,
        address: place.address,
        location: place.location,
      });
    });
    
    // 3. Add all DB pubs that are within the search radius.
    // Since we filtered duplicates from Nominatim, this is safe to do.
    dbPubs.forEach(pub => {
        if (pub.location) { // Ensure location exists
            const distance = getDistance(pub.location, searchOrigin);
            if (distance <= settings.radius) {
                combinedPubsMap.set(pub.id, { ...pub });
            }
        }
    });

    // 5. Finalize the list and add ratings.
    const finalPubsList = Array.from(combinedPubsMap.values()).map(pub => ({
      ...pub,
      ratings: allRatings.get(pub.id) || [],
    }));
    setPubs(finalPubsList);
  }, [nominatimResults, dbPubs, allRatings, searchOrigin, settings.radius, getDistance]);

  const selectedPub = useMemo(() => pubs.find(p => p.id === selectedPubId) || null, [pubs, selectedPubId]);
  
  const existingUserRatingForSelectedPub = useMemo(() => {
    if (!selectedPub) return undefined;
    return userRatings.find(r => r.pubId === selectedPub.id);
  }, [selectedPub, userRatings]);

  const getAverageRating = (ratings, key) => {
    if (!ratings || ratings.length === 0) return 0;
    const total = ratings.reduce((acc, r) => acc + r[key], 0);
    return total / ratings.length;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported.");
        if (!locationPermissionTracked.current) {
            trackEvent('location_permission_result', { status: 'unsupported' });
            locationPermissionTracked.current = true;
        }
        return;
    }
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        if (!locationPermissionTracked.current) {
            trackEvent('location_permission_result', { status: 'granted' });
            locationPermissionTracked.current = true;
        }
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setRealUserLocation(newLocation);
        setLocationError(null);
      },
      (error) => { 
        if (!locationPermissionTracked.current) {
            const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'error';
            trackEvent('location_permission_result', { status, error_code: error.code, error_message: error.message });
            locationPermissionTracked.current = true;
        }
        const message = error.code === error.PERMISSION_DENIED ? "Location access denied." : "Could not get location.";
        if (!settings.developerMode || !settings.simulatedLocation) {
            setLocationError(message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [settings.developerMode, settings.simulatedLocation]);

  useEffect(() => {
    // This effect now handles setting the initial location and triggering the first search.
    const effectiveLocation = (settings.developerMode && settings.simulatedLocation)
      ? settings.simulatedLocation.coords : realUserLocation;
    
    setUserLocation(effectiveLocation); // This keeps the blue dot location live

    // On first load, center the map on the user and trigger a search AFTER the map moves.
    if (effectiveLocation !== DEFAULT_LOCATION && !initialLocationSet) {
      setSearchOrigin(effectiveLocation);
      setMapCenter(effectiveLocation);
      setInitialLocationSet(true);
      setSearchOnNextMoveEnd(true); // Signal to search after map settles
    }
  }, [settings.developerMode, settings.simulatedLocation, realUserLocation, initialLocationSet]);
  
  const handleMapMove = useCallback((newCenter) => {
    setMapCenter(newCenter);
    
    // If in placement mode, allow map movement without cancelling the flow or showing other buttons.
    if (pubPlacementState) {
        return;
    }
    
    const distance = getDistance(newCenter, searchOrigin);
    if (distance > 100) {
      setShowSearchAreaButton(true);
      trackEvent('map_dragged_show_search_button');
    }
  }, [searchOrigin, getDistance, pubPlacementState]);

  const getComparablePrice = useCallback((pub) => {
      if (!pub?.ratings?.length) return 999;
      const ratingsWithExactPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
      if (ratingsWithExactPrice.length > 0) {
          return ratingsWithExactPrice.reduce((acc, r) => acc + r.exact_price, 0) / ratingsWithExactPrice.length;
      }
      const avgStarRating = getAverageRating(pub.ratings, 'price');
      if (avgStarRating === 0) return 999;
      if (avgStarRating > 4.5) return 4.25; if (avgStarRating > 3.5) return 5.00;
      if (avgStarRating > 2.5) return 5.75; if (avgStarRating > 1.5) return 6.50;
      return 7.50;
  }, [getAverageRating]);

  const sortedPubs = useMemo(() => {
    return [...pubs].sort((a, b) => {
      switch (filter) {
        case FilterType.Price: return getComparablePrice(a) - getComparablePrice(b);
        case FilterType.Quality: return getAverageRating(b.ratings, 'quality') - getAverageRating(a.ratings, 'quality');
        default: return getDistance(a.location, searchOrigin) - getDistance(b.location, searchOrigin);
      }
    });
  }, [pubs, filter, searchOrigin, getDistance, getComparablePrice]);

  const handleRatePub = useCallback(async (pubId, pubName, pubAddress, ratingData) => {
    if (!session || !userProfile || !selectedPub) return;

    const { imageFile, imageWasRemoved, ...newRating } = ratingData;
    
    // Upsert the pub data first
    await supabase.from('pubs').upsert({
      id: pubId, name: pubName, address: pubAddress,
      lat: selectedPub.location.lat, lng: selectedPub.location.lng,
    });

    const existingRating = userRatings.find(r => r.pubId === pubId);
    const isUpdating = !!existingRating;
    const currencyInfo = getCurrencyInfo(selectedPub.address);

    trackEvent('rate_pub', {
        pub_id: pubId,
        is_update: isUpdating,
        quality: newRating.quality,
        price_rating: newRating.price,
        has_exact_price: !!newRating.exact_price,
        has_image: !!imageFile,
        value: newRating.exact_price || 0, // GA4 standard parameter for value
        currency: currencyInfo.code, // GA4 standard parameter for currency
    });
    
    // --- START: Image management logic ---
    const oldImageUrl = existingRating?.image_url;

    // If we are updating a rating that has an image, and we're either removing it or replacing it, delete the old file.
    if (isUpdating && oldImageUrl && (imageWasRemoved || imageFile)) {
        try {
            const imagePath = new URL(oldImageUrl).pathname.split('/pint-images/')[1];
            if (imagePath) {
                await supabase.storage.from('pint-images').remove([imagePath]);
            }
        } catch (error) {
            console.error("Failed to delete old image from storage. It may become orphaned. Error:", error);
            // Do not block the user flow for this.
        }
    }
    
    let imageUrl = oldImageUrl || null;
    if (imageWasRemoved) {
        imageUrl = null;
    }
    
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from('pint-images').upload(filePath, imageFile, { upsert: true });
        if (uploadError) {
            console.error("Image upload failed:", uploadError);
            alert(`Image upload failed: ${uploadError.message}. Please ensure the 'pint-images' storage bucket is created as per the instructions in security.md.`);
            return;
        }
        const { data: urlData } = supabase.storage.from('pint-images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
    }
    // --- END: Image management logic ---

    const ratingPayload = { 
        pub_id: pubId, 
        user_id: session.user.id, 
        price: newRating.price, 
        quality: newRating.quality, 
        exact_price: newRating.exact_price,
        image_url: imageUrl,
    };

    isUpdating
      ? await supabase.from('ratings').update(ratingPayload).eq('pub_id', pubId).eq('user_id', session.user.id)
      : await supabase.from('ratings').insert(ratingPayload);
    
    if (!isUpdating) {
        const oldProfile = userProfile;
        const { error: incrementError } = await supabase.functions.invoke('increment-review-count');
        if (incrementError) {
            // This is not a critical failure for the user, but should be logged for debugging.
            console.error("Failed to increment review count:", incrementError.context?.error || incrementError.message);
        }

        const { profile: newProfile } = await fetchUserData();
        
        if (newProfile && oldProfile && newProfile.level > oldProfile.level) {
            const oldRank = getRankData(oldProfile.level);
            const newRank = getRankData(newProfile.level);
            if (newRank.name !== oldRank.name) {
                setRankUpInfo({ key: Date.now(), newRank });
                trackEvent('rank_up', { new_rank: newRank.name, level: newProfile.level });
            } else {
                setLeveledUpInfo({ key: Date.now(), newLevel: newProfile.level });
                trackEvent('level_up', { level: newProfile.level });
            }
        }
        setReviewPopupInfo({ key: Date.now() });
    } else {
        await fetchUserData();
        setUpdateConfirmationInfo({ key: Date.now() });
    }
    await fetchAllRatings();
    await fetchDbPubs();
  }, [session, userRatings, selectedPub, userProfile, fetchAllRatings, fetchDbPubs]);
  
  const handleSelectPub = useCallback((pub) => {
    const pubId = pub ? pub.id : null;
    setSelectedPubId(pubId);

    // If a pub is selected, declaratively center the map on it.
    if (pub?.location) {
        setMapCenter(pub.location);
    }
    
    // On desktop, if a pub is selected, switch to the map tab to show details.
    if (pubId) {
      setActiveTab('map');
    }
    
    // On mobile, if a pub is selected and the list is collapsed, expand it.
    if (pubId && !isListExpanded) {
        setIsListExpanded(true);
    }
  }, [isListExpanded, setActiveTab]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    trackEvent('change_filter', { filter_type: newFilter });
  };
  
  const handleTabChange = (tab) => {
    // On mobile, close the details panel when switching main tabs.
    if (!isDesktop) {
      setSelectedPubId(null);
    }
    
    // Cancel pub placement if user navigates away
    if (pubPlacementState) {
        handleCancelPubPlacement();
    }

    // Reset legal page view when user explicitly navigates
    setLegalPageView(null);

    // Tabs requiring auth
    if ((tab === 'profile' || tab === 'community' || tab === 'moderation' || tab === 'stats') && !session) {
      setIsAuthOpen(true);
      return;
    }
    // Tabs requiring developer role
    if ((tab === 'moderation' || tab === 'stats') && !userProfile?.is_developer) {
        setActiveTab('map'); // Fail silently to map
        return;
    }
    
    setActiveTab(tab);
    setViewedProfile(null);
    setViewedRatings([]);
  };

  const handleViewLegal = (page) => {
    if (page) {
        setActiveTab('settings'); // Switch to settings tab to show the legal page
    }
    setLegalPageView(page);
  };

  const handleSettingsChange = (newSettings) => {
    if (settings.theme !== newSettings.theme) trackEvent('change_setting', { setting_name: 'theme', setting_value: newSettings.theme });
    if (settings.unit !== newSettings.unit) trackEvent('change_setting', { setting_name: 'unit', setting_value: newSettings.unit });
    if (settings.radius !== newSettings.radius) trackEvent('change_setting', { setting_name: 'radius_meters', setting_value: newSettings.radius });
    if (settings.developerMode !== newSettings.developerMode) trackEvent('change_setting', { setting_name: 'developer_mode', setting_value: newSettings.developerMode });
    const oldSim = settings.simulatedLocation?.name || null, newSim = newSettings.simulatedLocation?.name || null;
    if (oldSim !== newSim) trackEvent('change_setting', { setting_name: 'simulated_location', setting_value: newSim || 'cleared' });
    setSettings(newSettings);
    saveSettings(newSettings);
  };
  
  const handleSetSimulatedLocation = async (locationString) => {
    if (!locationString) {
      handleSettingsChange({ ...settings, simulatedLocation: null });
      return;
    }

    trackEvent('search', { search_term: locationString });

    try {
      // Nominatim API call
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationString)}&format=jsonv2&limit=1`, {
        headers: { 'User-Agent': 'Stoutly/1.0 (https://stoutly-app.com)' }
      });
      if (!response.ok) {
        throw new Error(`Nominatim API failed with status: ${response.status}`);
      }
      const results = await response.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        handleSettingsChange({
          ...settings,
          simulatedLocation: {
            name: results[0].display_name,
            coords: { lat: parseFloat(lat), lng: parseFloat(lon) }
          }
        });
      } else {
        throw new Error('No results found for that location.');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw error; // Re-throw to be caught in the component
    }
  };

  const handleViewPub = (pub) => {
    if (!pub?.id || !pub.location) return;
    trackEvent('view_pub_from_history', { pub_id: pub.id });

    // Check if the pub is already in our list of displayed pubs
    const pubExists = pubs.some(p => p.id === pub.id);

    // If the pub isn't in the list (e.g., it's outside the current search radius),
    // we need to add it to the state so it can be selected and displayed.
    if (!pubExists) {
      setPubs(prevPubs => {
        // Create a full pub object, including its ratings from the main `allRatings` map.
        const newPub = {
          ...pub,
          ratings: allRatings.get(pub.id) || [],
        };
        // Return a new array with the existing pubs plus the new one.
        // We also double-check for duplicates here in case of race conditions.
        if (prevPubs.some(p => p.id === newPub.id)) {
            return prevPubs;
        }
        return [...prevPubs, newPub];
      });
    }

    setMapCenter(pub.location);
    setActiveTab('map');
    setSelectedPubId(pub.id);
  };

  const handleLogout = async () => {
    trackEvent('logout');
    await supabase.auth.signOut();
  };
  
  const handleViewProfile = async (userId, origin) => {
      if (userProfile?.id !== userId) trackEvent('view_another_profile', { viewed_user_id: userId, origin });
      setIsFetchingViewedProfile(true);
      setProfileViewOrigin(origin); // Store where the user came from
      setActiveTab('profile');

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const { data: ratingsData } = await supabase.from('ratings').select('id, pub_id, price, quality, created_at, exact_price, image_url, pubs(id, name, address, lat, lng)').eq('user_id', userId).order('created_at', { ascending: false });

      const mappedRatings = (ratingsData || []).map(r => ({
          id: r.id, pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality, exact_price: r.exact_price },
          timestamp: new Date(r.created_at).getTime(),
          pubName: r.pubs?.name || 'Unknown', pubAddress: r.pubs?.address || 'Unknown',
          pubLocation: r.pubs?.lat && r.pubs?.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
          image_url: r.image_url,
      }));
      
      setViewedProfile(profileData);
      setViewedRatings(mappedRatings);
      setIsFetchingViewedProfile(false);
  };
  
  const handleBackFromProfileView = () => {
    const origin = profileViewOrigin;
    setViewedProfile(null);
    setViewedRatings([]);
    setProfileViewOrigin(null);

    switch (origin) {
        case 'leaderboard':
        case 'community':
            setActiveTab('community');
            break;
        case 'pubDetails':
            setActiveTab('map'); // The selected pub context is preserved
            break;
        case 'settings':
            setActiveTab('settings');
            break;
        case 'moderation':
            setActiveTab('moderation');
            break;
        default:
             // Fallback to the user's own profile page, which is the default for the 'profile' tab.
            setActiveTab('profile');
            break;
    }
  };

    const handleFindCurrentPub = () => {
        trackEvent('recenter_on_user_and_search');
        // This button now recenters the map AND sets up a search for when the move completes.
        const effectiveLocation = (settings.developerMode && settings.simulatedLocation)
            ? settings.simulatedLocation.coords : realUserLocation;
            
        if (effectiveLocation && effectiveLocation.lat !== DEFAULT_LOCATION.lat) {
            setSearchOrigin(effectiveLocation);
            setMapCenter(effectiveLocation);
            setSearchOnNextMoveEnd(true); // Signal to search after map settles
        } else {
            setLocationError("Your location is not available yet. Please wait or check permissions.");
            // Set a timer to clear the error
            setTimeout(() => setLocationError(null), 3500);
        }
    };

    const handleUpdateAvatar = async (avatarId) => {
        if (!session?.user || !avatarId) return;
        
        const parsed = JSON.parse(avatarId);
        const eventParams = { avatar_type: 'dicebear', dicebear_style: parsed.style };
        trackEvent('change_avatar', eventParams);

        await supabase.from('profiles').update({ avatar_id: avatarId }).eq('id', session.user.id);
        await fetchUserData();
        setIsAvatarModalOpen(false);
    };

    const handleAddPubClick = () => {
      if (!session) {
        setIsAuthOpen(true);
        return;
      }
      trackEvent('add_pub_start');
      setIsAddPubModalOpen(true);
    };

    const handleSubmitNewPub = async ({ name, address }) => {
        if (!session) return;
        trackEvent('add_pub_submit', { pub_name: name });

        let location = null;
        try {
            const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=jsonv2&limit=1`, {
                headers: { 'User-Agent': 'Stoutly/1.0 (https://stoutly-app.com)' }
            });
            if (!geocodeResponse.ok) throw new Error('Geocoding service failed.');
            const geocodeData = await geocodeResponse.json();
            if (geocodeData && geocodeData.length > 0) {
                location = { lat: parseFloat(geocodeData[0].lat), lng: parseFloat(geocodeData[0].lon) };
            } else {
                alert("Could not find that address. Please try to be more specific (e.g., add a city or postcode).");
                return;
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
            alert("There was a problem finding that address. Please check your connection and try again.");
            return;
        }

        setIsAddPubModalOpen(false);
        setPubPlacementState({ name, address });
        setFinalPlacementLocation(location);
        setMapCenter(location);
        setActiveTab('map');
    };
    
    const handlePlacementPinMove = (newLocation) => {
        setFinalPlacementLocation(newLocation);
    };

    const handleCancelPubPlacement = () => {
        setPubPlacementState(null);
        setFinalPlacementLocation(null);
    };

    const handleConfirmNewPub = async () => {
        if (!session || !pubPlacementState || !finalPlacementLocation) return;
        setIsConfirmingLocation(true);
        trackEvent('add_pub_confirm_location');

        const payload = {
            id: crypto.randomUUID(),
            name: pubPlacementState.name,
            address: pubPlacementState.address,
            lat: finalPlacementLocation.lat,
            lng: finalPlacementLocation.lng,
            created_by: session.user.id,
        };
        const { data, error } = await supabase.from('pubs').insert(payload).select().single();

        setIsConfirmingLocation(false);

        if (error) {
            console.error("Error inserting new pub:", error);
            alert(`Could not add pub: ${error.message}`);
            return;
        }

        setPubPlacementState(null);
        setFinalPlacementLocation(null);
        await fetchDbPubs();
        
        setTimeout(() => {
            const newPub = {
                ...data,
                location: { lat: data.lat, lng: data.lng }
            };
            handleSelectPub(newPub);
        }, 150);
    };

    // --- SOCIAL FEATURE HANDLERS ---
    const handleFriendRequest = async (targetUserId) => {
        if (!session?.user) return;
        trackEvent('send_friend_request', { target_user_id: targetUserId });
        
        const { data, error } = await supabase
            .from('friendships')
            .insert({
                user_id_1: session.user.id,
                user_id_2: targetUserId,
                action_user_id: session.user.id,
                status: 'pending'
            })
            .select()
            .single();
        
        if (error) {
            console.error("Error sending friend request:", error);
            alert("Could not send friend request. They may have already sent you one!");
        } else {
            setFriendships(prev => [...prev, data]);
        }
    };

    const handleFriendAction = async (friendshipId, action) => {
        if (!session?.user) return;
        trackEvent('respond_friend_request', { action });

        const { data, error } = await supabase
            .from('friendships')
            .update({
                status: action,
                action_user_id: session.user.id
            })
            .eq('id', friendshipId)
            .select()
            .single();

        if (error) {
            console.error(`Error ${action}ing friend request:`, error);
        } else {
            // Update local state for immediate feedback
            setFriendships(prev => prev.map(f => f.id === friendshipId ? data : f));
        }
    };
    
    const handleToggleLike = async (ratingId) => {
        if (!session?.user) {
            setIsAuthOpen(true);
            return;
        }
        
        const isLiked = userLikes.has(ratingId);
        trackEvent('toggle_like', { rating_id: ratingId, action: isLiked ? 'unlike' : 'like' });

        // Optimistic UI update
        const newLikes = new Set(userLikes);
        if (isLiked) {
            newLikes.delete(ratingId);
        } else {
            newLikes.add(ratingId);
        }
        setUserLikes(newLikes);

        // API call
        if (isLiked) {
            await supabase.from('rating_likes').delete().match({ rating_id: ratingId, user_id: session.user.id });
        } else {
            await supabase.from('rating_likes').insert({ rating_id: ratingId, user_id: session.user.id });
        }
        // Refresh ratings to get updated like_count from the trigger
        fetchAllRatings();
    };

    const renderProfile = (onBack) => {
      if (isFetchingViewedProfile) {
          return (
              <div className="w-full h-full flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
              </div>
          );
      }
      const profileToDisplay = viewedProfile || userProfile;
      const ratingsToDisplay = viewedProfile ? viewedRatings : userRatings;
      if (!profileToDisplay) return null;
      return (
          <ProfilePage 
              userProfile={profileToDisplay} userRatings={ratingsToDisplay} onViewPub={handleViewPub}
              loggedInUserProfile={userProfile} levelRequirements={levelRequirements}
              onAvatarChangeClick={() => setIsAvatarModalOpen(true)}
              onBack={onBack}
              onProfileUpdate={handleViewProfile}
              // Social props
              friendships={friendships}
              onFriendRequest={handleFriendRequest}
              onFriendAction={handleFriendAction}
          />
      );
    }
  
    if (loading) {
      return (
        <div className="w-full h-dvh flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
        </div>
      );
    }

    // Lockout banned users
    if (userProfile?.is_banned) {
        return <BannedPage userProfile={userProfile} onLogout={handleLogout} />;
    }
    
    const layoutProps = {
      session, loading, isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
      pubs, allRatings, selectedPubId, setSelectedPubId, filter, setFilter, isListExpanded, setIsListExpanded,
      realUserLocation, userLocation, mapCenter, searchOrigin, locationError, resultsAreCapped,
      isRefreshing, refreshTrigger, settings, setSettings, activeTab, setActiveTab, userProfile, userRatings,
      viewedProfile, viewedRatings, isFetchingViewedProfile, legalPageView,
      reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo,
      levelRequirements, isDbPubsLoaded, initialSearchComplete, isAvatarModalOpen, setIsAvatarModalOpen,
      installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
      sortedPubs, selectedPub, existingUserRatingForSelectedPub, getAverageRating, getDistance, getComparablePrice,
      handleNominatimResults, handleRefresh, handleMapMove, handleRatePub, handleSelectPub, handleFilterChange,
      handleTabChange, handleSettingsChange, handleSetSimulatedLocation, handleViewPub, handleLogout,
      handleViewProfile, handleFindCurrentPub, handleUpdateAvatar, renderProfile,
      handleBackFromProfileView, handleViewLegal, handleDataRefresh,
      handleSearchThisArea, showSearchAreaButton,
      initialLocationSet,
      // New props for delayed search
      searchOnNextMoveEnd, handleSearchAfterMove,
      handleAddPubClick,
      // New props for pub placement flow
      pubPlacementState, finalPlacementLocation, isConfirmingLocation,
      handleSubmitNewPub, handlePlacementPinMove, handleConfirmNewPub, handleCancelPubPlacement,
      // New props for Community Features
      CommunityPage, friendships, userLikes,
      handleFriendRequest, handleFriendAction, handleToggleLike,
    };

    return (
      <>
        {isDesktop 
          ? <DesktopLayout {...layoutProps} /> 
          : <MobileLayout {...layoutProps} />
        }
        {isAddPubModalOpen && (
          <AddPubModal
            onClose={() => setIsAddPubModalOpen(false)}
            onSubmit={handleSubmitNewPub}
          />
        )}
      </>
    );
};

export default App;