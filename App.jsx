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
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

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
  const [deleteConfirmationInfo, setDeleteConfirmationInfo] = useState(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState(null);
  const [rankUpInfo, setRankUpInfo] = useState(null);
  const [addPubSuccessInfo, setAddPubSuccessInfo] = useState(null);
  
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
  const [viewingFriendsOf, setViewingFriendsOf] = useState(null); // The user whose friends list is being viewed
  const [friendsList, setFriendsList] = useState([]); // The actual list of friends
  const [isFetchingFriendsList, setIsFetchingFriendsList] = useState(false);


  // --- HOOKS ---
  const isDesktop = useIsDesktop();
  const locationPermissionTracked = useRef(false);
  
  // --- ANALYTICS ---
  
  // More specific screen view tracking
  useEffect(() => {
    let screenName = activeTab;
    const screenClass = 'StoutlyApp';

    if (viewingFriendsOf) {
      screenName = 'friends_list';
    } else if (legalPageView) {
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
  }, [activeTab, legalPageView, viewedProfile, userProfile, isAuthOpen, isPasswordRecovery, pubPlacementState, viewingFriendsOf]);


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
    const { data, error } = await supabase.from('pubs').select('id, name, address, lat, lng, country_code, country_name');
    if (error) {
      console.error("Error fetching rated pubs from DB:", error);
    } else {
      const formatted = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        country_code: p.country_code,
        country_name: p.country_name,
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

  const handleDataRefresh = useCallback(async () => {
      await Promise.all([
          fetchAllRatings(),
          fetchDbPubs(),
          session?.user?.id ? fetchSocialData(session.user.id) : Promise.resolve(),
      ]);
  }, [fetchAllRatings, fetchDbPubs, fetchSocialData, session]);

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

    // Fetch user profile and friend count in parallel
    const [profileResult, friendCountResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.rpc('get_friends_count', { user_id_param: userId }).single()
    ]);

    const { data: profile, error: profileError } = profileResult;
    if (profileError) {
        console.error("Error fetching profile:", profileError);
        if (profileError.code === 'PGRST116') {
            console.error("CRITICAL: Profile not found for logged-in user. The 'handle_new_user' DB trigger may be missing or failing.");
        }
        setUserProfile(null);
        setUserRatings([]);
        return { profile: null, ratings: [] };
    }

    // Add friend count to the profile object
    profile.friends_count = friendCountResult.data || 0;
    if (friendCountResult.error) console.error("Error fetching friend count:", friendCountResult.error);

    setUserProfile(profile);

    // If profile exists, fetch ratings.
    const { data: userRatingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('id, pub_id, price, quality, created_at, exact_price, image_url, is_private, pubs(id, name, address, lat, lng)')
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
          is_private: r.is_private || false,
        }));
    }
    
    setUserRatings(mappedUserRatings);
    return { profile, ratings: mappedUserRatings };
  };

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

  const handleFindPlace = useCallback((location) => {
    if (location?.lat && location?.lng) {
        // Set both the search origin and map center to the new location.
        // This ensures distance calculations are correct for the new area.
        setSearchOrigin(location); 
        setMapCenter(location);
        
        // This is the key part: reuse existing logic to trigger a search
        // after the map's "flyTo" animation finishes.
        setSearchOnNextMoveEnd(true); 
    }
  }, []);

  const handleFindCurrentPub = useCallback(() => {
    if (realUserLocation && (realUserLocation.lat !== DEFAULT_LOCATION.lat || realUserLocation.lng !== DEFAULT_LOCATION.lng)) {
        trackEvent('recenter_map');
        // Set both the search origin and map center to the user's location.
        setSearchOrigin(realUserLocation);
        setMapCenter(realUserLocation);
        
        // Signal to perform a search after the map finishes its "flyTo" animation.
        setSearchOnNextMoveEnd(true);
    } else if (locationError) {
        // If there's a location error (e.g., permission denied), we can inform the user.
        alert(`Could not get your location. Please check your browser's location settings. Error: ${locationError}`);
        trackEvent('recenter_map_failed', { reason: 'location_error', message: locationError });
    } else {
        // If location is not yet available but there is no error.
        alert("Still trying to find your location. Please wait a moment.");
        trackEvent('recenter_map_failed', { reason: 'location_not_ready' });
    }
  }, [realUserLocation, locationError]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Popup visibility timers
  useEffect(() => { if (reviewPopupInfo) { const timer = setTimeout(() => setReviewPopupInfo(null), 3000); return () => clearTimeout(timer); } }, [reviewPopupInfo]);
  useEffect(() => { if (updateConfirmationInfo) { const timer = setTimeout(() => setUpdateConfirmationInfo(null), 3000); return () => clearTimeout(timer); } }, [updateConfirmationInfo]);
  useEffect(() => { if (deleteConfirmationInfo) { const timer = setTimeout(() => setDeleteConfirmationInfo(null), 3000); return () => clearTimeout(timer); } }, [deleteConfirmationInfo]);
  useEffect(() => { if (leveledUpInfo) { const timer = setTimeout(() => setLeveledUpInfo(null), 4000); return () => clearTimeout(timer); } }, [leveledUpInfo]);
  useEffect(() => { if (rankUpInfo) { const timer = setTimeout(() => setRankUpInfo(null), 5000); return () => clearTimeout(timer); } }, [rankUpInfo]);
  useEffect(() => { if (addPubSuccessInfo) { const timer = setTimeout(() => setAddPubSuccessInfo(null), 3000); return () => clearTimeout(timer); } }, [addPubSuccessInfo]);

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
        country_code: place.country_code,
        country_name: place.country_name,
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
    setIsSubmittingRating(true);

    try {
        const { imageFile, imageWasRemoved, ...newRating } = ratingData;
        
        // Upsert the pub data first, including new country info if available
        await supabase.from('pubs').upsert({
          id: pubId,
          name: pubName,
          address: pubAddress,
          lat: selectedPub.location.lat,
          lng: selectedPub.location.lng,
          country_code: selectedPub.country_code,
          country_name: selectedPub.country_name,
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
            is_private: newRating.is_private,
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
            is_private: newRating.is_private,
            image_url: imageUrl,
        };

        isUpdating
          ? await supabase.from('ratings').update(ratingPayload).eq('pub_id', pubId).eq('user_id', session.user.id)
          : await supabase.from('ratings').insert(ratingPayload);
        
        if (!isUpdating) {
            const oldProfile = userProfile;
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
    } finally {
        setIsSubmittingRating(false);
    }
  }, [session, userRatings, selectedPub, userProfile, fetchAllRatings, fetchDbPubs, fetchUserData]);
  
  const handleDeleteRating = useCallback(async (ratingToDelete) => {
    if (!session || !userProfile || !ratingToDelete) return;

    // Check if the rating belongs to the logged-in user
    const ratingInUserRatings = userRatings.find(r => r.id === ratingToDelete.id);
    if (!ratingInUserRatings) {
        console.error("Attempted to delete a rating that does not belong to the current user.");
        return;
    }

    trackEvent('delete_rating', { rating_id: ratingToDelete.id, pub_id: ratingToDelete.pubId });

    try {
        // 1. If there's an image, delete it from storage first.
        if (ratingToDelete.image_url) {
            try {
                const imagePath = new URL(ratingToDelete.image_url).pathname.split('/pint-images/')[1];
                if (imagePath) {
                    await supabase.storage.from('pint-images').remove([imagePath]);
                }
            } catch (error) {
                console.error("Failed to delete image from storage. It might be orphaned.", error);
                // Non-critical, so we don't block the rating deletion.
            }
        }
        
        // 2. Delete the rating record from the database.
        // The `on_rating_deleted` trigger will handle decrementing the user's review count.
        const { error: deleteError } = await supabase.from('ratings').delete().eq('id', ratingToDelete.id);
        if (deleteError) throw deleteError;

        // 3. Show success popup
        setDeleteConfirmationInfo({ key: Date.now() });

        // 4. Re-fetch all data to update the UI
        await Promise.all([
            fetchAllRatings(),
            fetchUserData()
        ]);

    } catch (error) {
        console.error("Error deleting rating:", error);
        alert(`Could not delete rating: ${error.message}`);
    }
}, [session, userProfile, userRatings, fetchAllRatings, fetchUserData]);
  
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

  const handleToggleLike = useCallback(async (ratingId) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }

    const userId = session.user.id;
    const isLiked = userLikes.has(ratingId);
    
    trackEvent('toggle_like', { rating_id: ratingId, action: isLiked ? 'unlike' : 'like' });

    const newLikes = new Set(userLikes);
    if (isLiked) {
      newLikes.delete(ratingId);
    } else {
      newLikes.add(ratingId);
    }
    setUserLikes(newLikes);

    try {
      if (isLiked) {
        const { error } = await supabase.from('rating_likes').delete().match({ rating_id: ratingId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rating_likes').insert({ rating_id: ratingId, user_id: userId });
        if (error) throw error;
      }
      await fetchAllRatings();
    } catch (error) {
        console.error("Error toggling like:", error);
        const revertedLikes = new Set(userLikes);
        if (isLiked) {
          revertedLikes.add(ratingId);
        } else {
          revertedLikes.delete(ratingId);
        }
        setUserLikes(revertedLikes);
    }
  }, [session, userLikes, fetchAllRatings]);
  
  const handleTabChange = (tab) => {
    // On mobile, close the details panel when switching main tabs.
    if (!isDesktop) {
        setSelectedPubId(null);
    }

    // Cancel pub placement if user navigates away
    if (pubPlacementState) {
        handleCancelPubPlacement();
    }

    // When user explicitly changes tabs, reset all sub-view states
    setLegalPageView(null);
    setViewingFriendsOf(null);
    setFriendsList([]);
    setViewedProfile(null);
    setViewedRatings([]);
    setProfileViewOrigin(null);

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
  };

  const handleViewLegal = (page) => {
    trackEvent('view_legal_page', { page_name: page });
    setLegalPageView(page);
    // Ensure other full-screen views are closed
    setSelectedPubId(null);
  };

  const handlePlacementPinMove = useCallback((newLocation) => {
    setFinalPlacementLocation(newLocation);
  }, []);

  const handleViewProfile = async (userId, origin) => {
    if (!userId) return;
    // Special case: If user clicks their own profile, use handleTabChange to ensure a clean reset to their own view.
    if (userProfile && userId === userProfile.id) {
        handleTabChange('profile');
        return;
    }
    
    trackEvent('view_profile', { viewed_user_id: userId, origin: origin || 'unknown' });
    
    // We must hide the Friends List page before we can show the Profile page.
    setViewingFriendsOf(null);
    setFriendsList([]);
    
    setIsFetchingViewedProfile(true);
    // Clear the old viewed profile to show a loading state
    setViewedProfile(null); 
    setViewedRatings([]);
    setProfileViewOrigin(origin); // store where the view was initiated from

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;
        
        // Correctly fetch the friend count
        const { data: friendCount, error: friendCountError } = await supabase.rpc('get_friends_count', { user_id_param: userId }).single();
        if (friendCountError) console.error("Error fetching friend count for viewed profile:", friendCountError);
        // Correctly assign the direct result of the RPC call.
        profile.friends_count = friendCount || 0;

        setViewedProfile(profile);

        // Fetch ratings for the viewed user
        // We only fetch non-private ratings for other users.
        const { data: ratings, error: ratingsError } = await supabase
            .from('ratings')
            .select('id, pub_id, price, quality, created_at, exact_price, image_url, is_private, pubs(id, name, address, lat, lng)')
            .eq('user_id', userId)
            .eq('is_private', false) // Important: respect privacy
            .order('created_at', { ascending: false });

        if (ratingsError) throw ratingsError;

        const mappedRatings = (ratings || []).map(r => ({
            id: r.id, pubId: r.pub_id,
            rating: { price: r.price, quality: r.quality, exact_price: r.exact_price },
            timestamp: new Date(r.created_at).getTime(),
            pubName: r.pubs?.name || 'Unknown',
            pubAddress: r.pubs?.address || 'Unknown',
            pubLocation: r.pubs && r.pubs.lat && r.pubs.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
            image_url: r.image_url,
            is_private: r.is_private,
        }));
        setViewedRatings(mappedRatings);
        
        // This is the key. The profile page is shown when the 'profile' tab is active.
        // We set this directly to avoid `handleTabChange` which would clear `viewedProfile`.
        setActiveTab('profile');

    } catch (error) {
        console.error("Error fetching viewed profile:", error);
        alert(`Could not load profile: ${error.message}`);
        setViewedProfile(null); // Clear on error
    } finally {
        setIsFetchingViewedProfile(false);
    }
  };

  const handleBackFromProfileView = () => {
    setViewedProfile(null);
    // Go back to the origin tab if specified
    if (profileViewOrigin && profileViewOrigin.startsWith('community')) {
      setActiveTab('community');
    } else if (profileViewOrigin && profileViewOrigin.startsWith('leaderboard')) {
      setActiveTab('leaderboard');
    }
    setProfileViewOrigin(null);
  };
  
  const handleFriendRequest = async (targetUserId) => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('send_friend_request', { target_user_id: targetUserId });
    const { error } = await supabase.from('friendships').insert({
        user_id_1: session.user.id,
        user_id_2: targetUserId,
        action_user_id: session.user.id,
        status: 'pending',
    });

    if (error) {
        if (error.code === '23505') { // unique_violation
            alert('A friend request between you and this user already exists.');
        } else {
            alert(`Error sending friend request: ${error.message}`);
        }
    } else {
        // Re-fetch social data to update friendship status
        await fetchSocialData(session.user.id);
    }
  };
  
  const handleFriendAction = async (friendshipId, newStatus) => {
      trackEvent('friend_request_action', { friendship_id: friendshipId, action: newStatus });
      const { error } = await supabase
          .from('friendships')
          .update({ 
              status: newStatus, 
              action_user_id: session.user.id,
              updated_at: new Date().toISOString()
          })
          .eq('id', friendshipId);
      
      if (error) {
          alert(`Error updating friendship: ${error.message}`);
      } else {
          await Promise.all([
              fetchSocialData(session.user.id),
              fetchUserData(), // To update friend count
          ]);
      }
  };
  
  const handleProfileUpdate = (profileId) => {
      // Re-fetch the profile data if it's the currently viewed one
      if (viewedProfile && viewedProfile.id === profileId) {
          handleViewProfile(profileId, 'moderation_update');
      }
      // Also re-fetch own profile data if we updated it
      if(userProfile && userProfile.id === profileId) {
          fetchUserData();
      }
  };

  const handleViewFriends = async (targetUser) => {
    if (!targetUser) return;
    trackEvent('view_friends_list', { target_user_id: targetUser.id });
    
    // Set state to show the friends list UI
    setViewingFriendsOf(targetUser);
    setIsFetchingFriendsList(true);
    setFriendsList([]); // Clear previous list

    try {
        const { data, error } = await supabase.rpc('get_friends_list', {
            user_id_param: targetUser.id,
        });

        if (error) {
            throw error;
        }
        
        setFriendsList(data || []);
    } catch (error) {
        console.error("Error fetching friends list:", error);
        alert(`Could not load friends list: ${error.message}`);
        // Go back if the fetch fails to avoid a broken state
        setViewingFriendsOf(null); 
    } finally {
        setIsFetchingFriendsList(false);
    }
  };

  const renderProfile = (onBackHandler) => (
      <ProfilePage
          userProfile={viewedProfile || userProfile}
          userRatings={viewedProfile ? viewedRatings : userRatings}
          onBack={onBackHandler}
          onViewPub={handleSelectPub}
          loggedInUserProfile={userProfile}
          levelRequirements={levelRequirements}
          onAvatarChangeClick={() => setIsAvatarModalOpen(true)}
          onProfileUpdate={handleProfileUpdate}
          friendships={friendships}
          onFriendRequest={handleFriendRequest}
          onFriendAction={handleFriendAction}
          onViewFriends={handleViewFriends}
          onDeleteRating={handleDeleteRating}
      />
  );
  
  const handleAddPubClick = () => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    trackEvent('add_pub_start');
    setIsAddPubModalOpen(true);
  };
  
  const handleCancelPubPlacement = () => {
    trackEvent('add_pub_cancel', { step: pubPlacementState ? 'placement' : 'modal' });
    setIsAddPubModalOpen(false);
    setPubPlacementState(null);
    setFinalPlacementLocation(null);
    setIsConfirmingLocation(false);
  };
  
  const handleStartPubPlacement = async ({ name, address }) => {
    trackEvent('add_pub_geocode_start', { address });
    const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=jsonv2&limit=1&addressdetails=1`;
  
    try {
      const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
      const data = await response.json();
  
      if (data && data.length > 0) {
        const place = data[0];
        const location = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
        
        setIsAddPubModalOpen(false);
        setPubPlacementState({ name, address });
        setFinalPlacementLocation(location);
        setMapCenter(location);
        trackEvent('add_pub_geocode_success');
      } else {
        trackEvent('add_pub_geocode_failed', { reason: 'not_found' });
        alert('Could not find that address. Please try being more specific or check for typos.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      trackEvent('add_pub_geocode_failed', { reason: 'api_error' });
      alert('An error occurred while searching for the address. Please check your connection and try again.');
    }
  };
  
  const handleConfirmNewPub = async () => {
    if (!pubPlacementState || !finalPlacementLocation || !session) return;
  
    setIsConfirmingLocation(true);
    trackEvent('add_pub_confirm_start');
  
    try {
      // Reverse geocode to get country info
      const userAgent = 'Stoutly/1.0 (https://stoutly-app.com)';
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${finalPlacementLocation.lat}&lon=${finalPlacementLocation.lng}&addressdetails=1`;
      const reverseResponse = await fetch(reverseUrl, { headers: { 'User-Agent': userAgent } });
      const reverseData = await reverseResponse.json();
      const country_code = reverseData?.address?.country_code || null;
      const country_name = reverseData?.address?.country || null;
      
      // Generate a unique ID for the new pub to satisfy the not-null constraint.
      const newPubId = `stoutly-${session.user.id}-${Date.now()}`;

      const newPubPayload = {
        id: newPubId,
        name: pubPlacementState.name,
        address: pubPlacementState.address,
        lat: finalPlacementLocation.lat,
        lng: finalPlacementLocation.lng,
        created_by: session.user.id,
        country_code,
        country_name,
      };
  
      const { data: insertedPub, error } = await supabase
        .from('pubs')
        .insert(newPubPayload)
        .select()
        .single();
  
      if (error) throw error;
      
      trackEvent('add_pub_success', { pub_id: insertedPub.id });
      
      // Clean up the placement state first
      handleCancelPubPlacement(); 
  
      // Show success popup
      setAddPubSuccessInfo({ key: Date.now() });

      // Refresh data to include the new pub
      await handleDataRefresh();
      
      // Format the pub object for selection, ensuring it has the nested location object.
      const pubForSelection = {
        ...insertedPub,
        location: { lat: insertedPub.lat, lng: insertedPub.lng }
      };
      // Select the pub, which will also handle centering the map on it.
      handleSelectPub(pubForSelection);
  
    } catch (error) {
      console.error("Error confirming new pub:", error);
      trackEvent('add_pub_failed', { error_message: error.message });
      alert(`There was an error saving the pub: ${error.message}`);
    } finally {
      setIsConfirmingLocation(false);
    }
  };

  const layoutProps = {
      isAuthOpen, setIsAuthOpen, isPasswordRecovery, setIsPasswordRecovery,
      activeTab, handleTabChange, locationError, settings, filter, handleFilterChange,
      handleRefresh, isRefreshing, sortedPubs, userLocation, mapCenter, searchOrigin,
      handleSelectPub, selectedPubId, handleNominatimResults, handleMapMove,
      refreshTrigger, getDistance, isListExpanded, setIsListExpanded,
      getAverageRating, resultsAreCapped, isDbPubsLoaded, initialSearchComplete,
      renderProfile, session, userProfile, handleLogout: () => supabase.auth.signOut(),
      selectedPub, existingUserRatingForSelectedPub, handleRatePub,
      reviewPopupInfo, updateConfirmationInfo, leveledUpInfo, rankUpInfo, addPubSuccessInfo,
      isAvatarModalOpen, setIsAvatarModalOpen,
      viewedProfile, legalPageView, handleViewLegal, handleDataRefresh,
      installPromptEvent, setInstallPromptEvent, isIosInstallModalOpen, setIsIosInstallModalOpen,
      showSearchAreaButton, handleSearchThisArea,
      searchOnNextMoveEnd, handleSearchAfterMove,
      pubPlacementState,
      isConfirmingLocation, finalPlacementLocation, handlePlacementPinMove, isSubmittingRating,
      CommunityPage, friendships, userLikes, onToggleLike: handleToggleLike, allRatings,
      viewingFriendsOf, friendsList, isFetchingFriendsList,
      deleteConfirmationInfo,
      
      // Implemented handlers
      handleViewProfile,
      handleFriendRequest,
      handleFriendAction,
      handleViewFriends,
      onProfileUpdate: handleProfileUpdate,
      handleBackFromProfileView,
      handleBackFromFriendsList: () => setViewingFriendsOf(null),
      handleFindPlace,
      handleFindCurrentPub,
      
      // Implemented "Add Pub" flow handlers
      handleAddPubClick: handleAddPubClick,
      handleConfirmNewPub: handleConfirmNewPub,
      handleCancelPubPlacement: handleCancelPubPlacement,
      
      // Stubs
      handleSettingsChange: setSettings,
      handleSetSimulatedLocation: () => {},
      handleUpdateAvatar: () => {},
  };

  if (isDesktop) {
      return (
        <>
            {isAddPubModalOpen && (
                <AddPubModal 
                    onClose={handleCancelPubPlacement}
                    onSubmit={handleStartPubPlacement}
                />
            )}
            <DesktopLayout {...layoutProps} />
        </>
      );
  }

  return (
    <>
        {isAddPubModalOpen && (
            <AddPubModal 
                onClose={handleCancelPubPlacement}
                onSubmit={handleStartPubPlacement}
            />
        )}
        <MobileLayout {...layoutProps} />
    </>
  );
};

export default App;
