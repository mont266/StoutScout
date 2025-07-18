import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FilterType } from './types.js';
import { DEFAULT_LOCATION } from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { supabase } from './supabase.js';
import { getRankData } from './utils.js';
import { trackEvent } from './analytics.js';

import MobileLayout from './components/MobileLayout.jsx';
import DesktopLayout from './components/DesktopLayout.jsx';
import useIsDesktop from './hooks/useIsDesktop.js';

import ProfilePage from './components/ProfilePage.jsx';

const App = () => {
  // --- STATE MANAGEMENT ---

  // Auth state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // App state
  const [googlePlaces, setGooglePlaces] = useState([]);
  const [pubs, setPubs] = useState([]);
  const [allRatings, setAllRatings] = useState(new Map());
  const [selectedPubId, setSelectedPubId] = useState(null);
  const [filter, setFilter] = useState(FilterType.Distance);
  const [isListExpanded, setIsListExpanded] = useState(true);

  // Location State
  const [realUserLocation, setRealUserLocation] = useState(DEFAULT_LOCATION);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION); // This is for the blue dot
  const [searchCenter, setSearchCenter] = useState(DEFAULT_LOCATION); // This is for the map search area
  const [locationError, setLocationError] = useState(null);
  const [resultsAreCapped, setResultsAreCapped] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);

  // Refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  const [leveledUpInfo, setLeveledUpInfo] = useState(null);
  const [rankUpInfo, setRankUpInfo] = useState(null);
  
  const [levelRequirements, setLevelRequirements] = useState([]);
  
  const [dbPubs, setDbPubs] = useState([]);
  
  const [isDbPubsLoaded, setIsDbPubsLoaded] = useState(false);
  const [initialSearchComplete, setInitialSearchComplete] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // --- HOOKS ---
  const isDesktop = useIsDesktop();
  
  // --- ANALYTICS ---
  
  useEffect(() => {
    trackEvent('screen_view', { screen_name: activeTab });
  }, [activeTab]);

  useEffect(() => {
    const pub = pubs.find(p => p.id === selectedPubId);
    if (pub) {
      trackEvent('select_content', { content_type: 'pub', item_id: pub.id });
    }
  }, [selectedPubId, pubs]);


  // --- DATA FETCHING & AUTH ---

  const fetchDbPubs = async () => {
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
  };

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
        }
    });

    return () => subscription.unsubscribe();
  }, []);
  
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

  const fetchAllRatings = async () => {
      const { data, error } = await supabase
          .from('ratings')
          .select('pub_id, price, quality, exact_price, created_at, user_id, profiles(id, username, avatar_id)');

      if (error) return;

      const ratingsMap = new Map();
      for (const rating of data || []) {
          const existing = ratingsMap.get(rating.pub_id) || [];
          ratingsMap.set(rating.pub_id, [...existing, { 
              price: rating.price, 
              quality: rating.quality,
              exact_price: rating.exact_price,
              created_at: rating.created_at,
              user: rating.profiles || { id: rating.user_id, username: 'Anonymous', avatar_id: null },
            }]);
      }
      setAllRatings(ratingsMap);
  };
  
  const fetchUserData = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) return { profile: null, ratings: [] };

    const userId = currentSession.user.id;

    let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (profileError && profileError.code === 'PGRST116') {
      if (isCreatingProfile) return { profile: null, ratings: [] };
      const newUsername = currentSession.user.user_metadata?.username;
      if (!newUsername) return { profile: null, ratings: [] };
      
      setIsCreatingProfile(true);
      try {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: userId, username: newUsername, reviews: 0, level: 1 })
          .select()
          .single();
        if (createError) return { profile: null, ratings: [] };
        profileData = newProfile;
      } finally { setIsCreatingProfile(false); }
    } else if (profileError) { return { profile: null, ratings: [] }; }
    
    setUserProfile(profileData);
    
    const { data: userRatingsData } = await supabase
        .from('ratings')
        .select('id, pub_id, price, quality, created_at, exact_price, pubs(id, name, address, lat, lng)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    const mappedUserRatings = (userRatingsData || []).map(r => ({
      id: r.id, pubId: r.pub_id,
      rating: { price: r.price, quality: r.quality, exact_price: r.exact_price },
      timestamp: new Date(r.created_at).getTime(),
      pubName: r.pubs?.name || 'Unknown',
      pubAddress: r.pubs?.address || 'Unknown',
      pubLocation: r.pubs && r.pubs.lat && r.pubs.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
    }));
    setUserRatings(mappedUserRatings);
    return { profile: profileData, ratings: mappedUserRatings };
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    } else {
      setUserProfile(null);
      setUserRatings([]);
    }
  }, [session]);


  // --- CORE APP LOGIC & HANDLERS ---

  const handlePlacesFound = useCallback((places, capped) => {
    if (!initialSearchComplete) {
      setInitialSearchComplete(true);
    }
    setGooglePlaces(places || []);
    setResultsAreCapped(capped);
    setIsRefreshing(false);
  }, [initialSearchComplete]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshTrigger(c => c + 1);
    trackEvent('refresh_pubs');
  }, [isRefreshing]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Popup visibility timers
  useEffect(() => { if (reviewPopupInfo) { const timer = setTimeout(() => setReviewPopupInfo(null), 3000); return () => clearTimeout(timer); } }, [reviewPopupInfo]);
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
    const combinedPubsMap = new Map();
    dbPubs.forEach(pub => {
        if (pub.id && pub.name && pub.location) {
            const distance = getDistance(pub.location, searchCenter);
            if (distance <= settings.radius) {
                combinedPubsMap.set(pub.id, { ...pub });
            }
        }
    });
    googlePlaces.forEach(place => {
      if (place.id && place.displayName && place.location && place.formattedAddress) {
        combinedPubsMap.set(place.id, {
          id: place.id,
          name: place.displayName,
          address: place.formattedAddress,
          location: { lat: place.location.lat(), lng: place.location.lng() },
        });
      }
    });
    const finalPubsList = Array.from(combinedPubsMap.values()).map(pub => ({
      ...pub,
      ratings: allRatings.get(pub.id) || [],
    }));
    setPubs(finalPubsList);
  }, [googlePlaces, dbPubs, allRatings, searchCenter, settings.radius, getDistance]);

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
    if (!navigator.geolocation) { setLocationError("Geolocation is not supported."); return; }
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setRealUserLocation(newLocation);
        setLocationError(null);
      },
      (error) => { 
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
    // On first load, center the map on the user. After that, only update the blue dot.
    const effectiveLocation = (settings.developerMode && settings.simulatedLocation)
      ? settings.simulatedLocation.coords : realUserLocation;
    
    setUserLocation(effectiveLocation); // This keeps the blue dot location live

    if (effectiveLocation !== DEFAULT_LOCATION && !initialLocationSet) {
      setSearchCenter(effectiveLocation);
      setInitialLocationSet(true);
    }
  }, [settings.developerMode, settings.simulatedLocation, realUserLocation, initialLocationSet]);
  
  const handleCenterChange = useCallback((newCenter) => {
      const distance = getDistance(newCenter, searchCenter);
      if (distance > 50) {
          setSearchCenter(newCenter);
          trackEvent('search_on_drag', { new_lat: newCenter.lat, new_lng: newCenter.lng });
      }
  }, [searchCenter, getDistance]);

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
        default: return getDistance(a.location, searchCenter) - getDistance(b.location, searchCenter);
      }
    });
  }, [pubs, filter, searchCenter, getDistance, getComparablePrice]);

  const handleRatePub = useCallback(async (pubId, pubName, pubAddress, newRating) => {
    if (!session || !userProfile || !selectedPub) return;
    
    await supabase.from('pubs').upsert({
      id: pubId, name: pubName, address: pubAddress,
      lat: selectedPub.location.lat, lng: selectedPub.location.lng,
    });

    const isUpdating = userRatings.some(r => r.pubId === pubId);
    trackEvent('rate_pub', { pub_id: pubId, is_update: isUpdating, quality: newRating.quality, price_rating: newRating.price, has_exact_price: !!newRating.exact_price });
    
    const ratingPayload = { pub_id: pubId, user_id: session.user.id, price: newRating.price, quality: newRating.quality, exact_price: newRating.exact_price };
    isUpdating
      ? await supabase.from('ratings').update(ratingPayload).eq('pub_id', pubId).eq('user_id', session.user.id)
      : await supabase.from('ratings').insert(ratingPayload);
    
    if (!isUpdating) {
        const oldProfile = userProfile;
        await supabase.functions.invoke('increment-review-count');
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
    }
    await fetchAllRatings();
    await fetchDbPubs();
  }, [session, userRatings, selectedPub, userProfile]);
  
  const handleSelectPub = useCallback((pubId) => {
    setSelectedPubId(pubId);
    if (pubId && !isListExpanded) setIsListExpanded(true);
  }, [isListExpanded]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    trackEvent('change_filter', { filter_type: newFilter });
  };
  
  const handleTabChange = (tab) => {
    // Tabs requiring auth
    if ((tab === 'profile' || tab === 'leaderboard' || tab === 'moderation' || tab === 'stats') && !session) {
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
  
  const handleSetSimulatedLocation = (locationString) => {
    return new Promise((resolve, reject) => {
      if (!locationString) { handleSettingsChange({ ...settings, simulatedLocation: null }); resolve(); return; }
      if (!window.google?.maps?.Geocoder) { reject(new Error("Maps API not loaded. Please try again.")); return; }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ 'address': locationString }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location;
          handleSettingsChange({ ...settings, simulatedLocation: { name: locationString, coords: { lat: location.lat(), lng: location.lng() } } });
          resolve();
        } else {
          reject(new Error('Geocode failed: ' + status));
        }
      });
    });
  };

  const handleViewPub = (pub) => {
    if (!pub?.id || !pub.location) return;
    trackEvent('view_pub_from_history', { pub_id: pub.id });
    setSearchCenter(pub.location);
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
      const { data: ratingsData } = await supabase.from('ratings').select('id, pub_id, price, quality, created_at, exact_price, pubs(id, name, address, lat, lng)').eq('user_id', userId).order('created_at', { ascending: false });

      const mappedRatings = (ratingsData || []).map(r => ({
          id: r.id, pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality, exact_price: r.exact_price },
          timestamp: new Date(r.created_at).getTime(),
          pubName: r.pubs?.name || 'Unknown', pubAddress: r.pubs?.address || 'Unknown',
          pubLocation: r.pubs?.lat && r.pubs?.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
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
            setActiveTab('leaderboard');
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
        trackEvent('recenter_on_user');
        // This button now simply recenters the map on the user's live location.
        const effectiveLocation = (settings.developerMode && settings.simulatedLocation)
            ? settings.simulatedLocation.coords : realUserLocation;
            
        if (effectiveLocation && effectiveLocation.lat !== DEFAULT_LOCATION.lat) {
            setSearchCenter(effectiveLocation);
        } else {
            setLocationError("Your location is not available yet. Please wait or check permissions.");
            // Set a timer to clear the error
            setTimeout(() => setLocationError(null), 3500);
        }
    };

    const handleUpdateAvatar = async (avatarId) => {
        if (!session?.user) return;
        trackEvent('change_avatar', { avatar_id: avatarId });
        await supabase.from('profiles').update({ avatar_id: avatarId }).eq('id', session.user.id);
        await fetchUserData();
        setIsAvatarModalOpen(false);
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
          />
      );
    }
  
    if (loading) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
        </div>
      );
    }
    
    const layoutProps = {
      session, loading, isAuthOpen, setIsAuthOpen, isCreatingProfile, isPasswordRecovery, setIsPasswordRecovery,
      googlePlaces, pubs, allRatings, selectedPubId, setSelectedPubId, filter, setFilter, isListExpanded, setIsListExpanded,
      realUserLocation, userLocation, searchCenter, setSearchCenter, locationError, resultsAreCapped,
      isRefreshing, refreshTrigger, settings, setSettings, activeTab, setActiveTab, userProfile, userRatings,
      viewedProfile, viewedRatings, isFetchingViewedProfile,
      reviewPopupInfo, leveledUpInfo, rankUpInfo,
      levelRequirements, isDbPubsLoaded, initialSearchComplete, isAvatarModalOpen, setIsAvatarModalOpen,
      sortedPubs, selectedPub, existingUserRatingForSelectedPub, getAverageRating, getDistance, getComparablePrice,
      handlePlacesFound, handleRefresh, handleCenterChange, handleRatePub, handleSelectPub, handleFilterChange,
      handleTabChange, handleSettingsChange, handleSetSimulatedLocation, handleViewPub, handleLogout,
      handleViewProfile, handleFindCurrentPub, handleUpdateAvatar, renderProfile,
      handleBackFromProfileView
    };

    return isDesktop 
      ? <DesktopLayout {...layoutProps} /> 
      : <MobileLayout {...layoutProps} />;
};

export default App;