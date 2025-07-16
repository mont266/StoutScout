import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FilterType } from './types.js';
import { DEFAULT_LOCATION } from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { supabase } from './supabase.js';
import { getRankData } from './utils.js';

import MapComponent from './components/Map.jsx';
import FilterControls from './components/FilterControls.jsx';
import PubDetails from './components/PubDetails.jsx';
import PubList from './components/PubList.jsx';
import Header from './components/Logo.jsx';
import SettingsPage from './components/SettingsModal.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import LeaderboardPage from './components/LeaderboardPage.jsx';
import XPPopup from './components/XPPopup.jsx';
import LevelUpPopup from './components/LevelUpPopup.jsx';
import RankUpPopup from './components/RankUpPopup.jsx';
import AuthPage from './components/AuthPage.jsx';
import ConfirmCurrentPubModal from './components/ConfirmCurrentPubModal.jsx';

// A new TabBar component to handle the main navigation.
const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'map', icon: 'fa-map-marked-alt', label: 'Explore' },
    { id: 'leaderboard', icon: 'fa-trophy', label: 'Leaders' },
    { id: 'profile', icon: 'fa-user', label: 'Profile' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <nav className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-inner z-40">
      <div className="max-w-md mx-auto flex justify-around py-2 px-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center w-24 h-14 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              activeTab === tab.id
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <i className={`fas ${tab.icon} fa-lg`}></i>
            <span className="text-xs mt-1.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="pb-safe"></div>
    </nav>
  );
};


const App = () => {
  // Auth state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // App state
  const [googlePlaces, setGooglePlaces] = useState([]);
  const [pubs, setPubs] = useState([]);
  const [allRatings, setAllRatings] = useState(new Map());
  const [selectedPubId, setSelectedPubId] = useState(null);
  const [filter, setFilter] = useState(FilterType.Distance);
  const [isListExpanded, setIsListExpanded] = useState(true);

  // Location State
  const [realUserLocation, setRealUserLocation] = useState(DEFAULT_LOCATION);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [searchCenter, setSearchCenter] = useState(DEFAULT_LOCATION);
  const [locationError, setLocationError] = useState(null);
  const [resultsAreCapped, setResultsAreCapped] = useState(false);

  const [settings, setSettings] = useState(loadSettings);

  const [activeTab, setActiveTab] = useState('map');
  const [userProfile, setUserProfile] = useState(null);
  const [userRatings, setUserRatings] = useState([]);

  // State for viewing other user profiles
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedRatings, setViewedRatings] = useState([]);
  const [isFetchingViewedProfile, setIsFetchingViewedProfile] = useState(false);

  // Popup states
  const [reviewPopupInfo, setReviewPopupInfo] = useState(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState(null);
  const [rankUpInfo, setRankUpInfo] = useState(null);
  
  // "I'm Here" feature states
  const [isFindingPub, setIsFindingPub] = useState(false);
  const [pubCandidates, setPubCandidates] = useState([]);
  const [findPubError, setFindPubError] = useState(null);
  
  // New state for the scaled leveling system
  const [levelRequirements, setLevelRequirements] = useState([]);
  
  // New state for persistent pubs from our database
  const [dbPubs, setDbPubs] = useState([]);
  
  // New state for initial data loading to prevent content flash
  const [isDbPubsLoaded, setIsDbPubsLoaded] = useState(false);
  const [initialSearchComplete, setInitialSearchComplete] = useState(false);

  // --- AUTH & DATA FETCHING ---

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
        setSession(session);
        if (session) {
            setIsAuthOpen(false);
        } else {
            // If user logs out, send them back to the map tab
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
          .select('pub_id, price, quality, exact_price, created_at');

      if (error) return;

      const ratingsMap = new Map();
      for (const rating of data || []) {
          const existing = ratingsMap.get(rating.pub_id) || [];
          ratingsMap.set(rating.pub_id, [...existing, { 
              price: rating.price, 
              quality: rating.quality,
              exact_price: rating.exact_price,
              created_at: rating.created_at,
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


  // --- CORE APP LOGIC ---

  const handlePlacesFound = useCallback((places, capped) => {
    if (!initialSearchComplete) {
      setInitialSearchComplete(true);
    }
    setGooglePlaces(prevGooglePlaces => {
      // Deduplicate places before setting state
      const placeIds = new Set(prevGooglePlaces.map(p => p.id));
      const newPlaces = places.filter(p => !placeIds.has(p.id));
      // Only update state if there are actually new places to prevent unnecessary re-renders
      if (newPlaces.length > 0) {
        return [...prevGooglePlaces, ...newPlaces];
      }
      return prevGooglePlaces;
    });
    setResultsAreCapped(capped);
  }, [initialSearchComplete]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    if (reviewPopupInfo) {
      const timer = setTimeout(() => setReviewPopupInfo(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [reviewPopupInfo]);
  
  useEffect(() => {
    if (leveledUpInfo) {
      const timer = setTimeout(() => setLeveledUpInfo(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [leveledUpInfo]);

  useEffect(() => {
    if (rankUpInfo) {
      const timer = setTimeout(() => setRankUpInfo(null), 5000); // Rank up is special, lasts longer
      return () => clearTimeout(timer);
    }
  }, [rankUpInfo]);
  
  useEffect(() => {
    if (findPubError) {
      const timer = setTimeout(() => setFindPubError(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [findPubError]);


  useEffect(() => {
    const combinedPubsMap = new Map();

    // 1. Add all pubs from our database. These are our persistent records.
    dbPubs.forEach(pub => {
      if (pub.id && pub.name && pub.location) {
        combinedPubsMap.set(pub.id, {
          id: pub.id,
          name: pub.name,
          address: pub.address,
          location: pub.location,
        });
      }
    });

    // 2. Add or update with fresh data from Google's API search.
    // This ensures names and addresses are current if they change on Google Maps.
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

    // 3. Convert the map back to an array and attach the ratings for each pub.
    const finalPubsList = Array.from(combinedPubsMap.values()).map(pub => ({
      ...pub,
      ratings: allRatings.get(pub.id) || [],
    }));

    setPubs(finalPubsList);
  }, [googlePlaces, dbPubs, allRatings]);

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

  const getDistance = useCallback((location1, location2) => {
    const R = 6371e3;
    const φ1 = location1.lat * Math.PI/180;
    const φ2 = location2.lat * Math.PI/180;
    const Δφ = (location2.lat-location1.lat) * Math.PI/180;
    const Δλ = (location2.lng-location1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported.");
      return;
    }
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setRealUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationError(null);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED ? "Location access denied." : "Could not get location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  useEffect(() => {
    const effectiveLocation = (settings.developerMode && settings.simulatedLocation)
      ? settings.simulatedLocation.coords
      : realUserLocation;
    setUserLocation(effectiveLocation);
    // Only set searchCenter on initial load or when not simulating
    if (!settings.developerMode || !settings.simulatedLocation) {
        setSearchCenter(effectiveLocation);
    }
  }, [settings.developerMode, settings.simulatedLocation, realUserLocation]);

  const getComparablePrice = useCallback((pub) => {
      if (!pub || !pub.ratings || pub.ratings.length === 0) return 999;

      // Prioritize exact price if available
      const ratingsWithExactPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
      if (ratingsWithExactPrice.length > 0) {
          const total = ratingsWithExactPrice.reduce((acc, r) => acc + r.exact_price, 0);
          return total / ratingsWithExactPrice.length;
      }

      // Fallback to star rating, converting it to a representative price
      const avgStarRating = getAverageRating(pub.ratings, 'price');
      if (avgStarRating === 0) return 999; // No price data, send to bottom

      // This mapping converts a star rating to an estimated price for sorting.
      // It's based on the ranges defined in RatingForm.jsx.
      if (avgStarRating > 4.5) return 4.25; // Represents 5 stars (< £4.50)
      if (avgStarRating > 3.5) return 5.00; // Represents 4 stars (£4.50 - £5.49)
      if (avgStarRating > 2.5) return 5.75; // Represents 3 stars (£5.50 - £5.99)
      if (avgStarRating > 1.5) return 6.50; // Represents 2 stars (£6.00 - £6.99)
      return 7.50; // Represents 1 star (£7.00+)
  }, [getAverageRating]);


  const sortedPubs = useMemo(() => {
    return [...pubs].sort((a, b) => {
      switch (filter) {
        case FilterType.Price:
          // Sort by ascending price (cheapest first)
          return getComparablePrice(a) - getComparablePrice(b);
        case FilterType.Quality:
          return getAverageRating(b.ratings, 'quality') - getAverageRating(a.ratings, 'quality');
        default:
          return getDistance(a.location, userLocation) - getDistance(b.location, userLocation);
      }
    });
  }, [pubs, filter, userLocation, getDistance, getComparablePrice]);

  const handleRatePub = useCallback(async (pubId, pubName, pubAddress, newRating) => {
    if (!session || !userProfile || !selectedPub) return;
    
    await supabase.from('pubs').upsert({
      id: pubId, name: pubName, address: pubAddress,
      lat: selectedPub.location.lat, lng: selectedPub.location.lng,
    });

    const isUpdating = userRatings.some(r => r.pubId === pubId);
    const ratingPayload = {
      pub_id: pubId, user_id: session.user.id,
      price: newRating.price, quality: newRating.quality,
      exact_price: newRating.exact_price,
    };
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
            } else {
                setLeveledUpInfo({ key: Date.now(), newLevel: newProfile.level });
            }
        }
        setReviewPopupInfo({ key: Date.now() });
    }
    
    fetchAllRatings();
    fetchUserData();
    fetchDbPubs(); // Refresh the list of persistent pubs

  }, [session, userRatings, selectedPub, userProfile]);
  
  const handleSelectPub = useCallback((pubId) => {
    setSelectedPubId(pubId);
    if (pubId && !isListExpanded) setIsListExpanded(true);
  }, [isListExpanded]);
  
  const handleTabChange = (tab) => {
    if ((tab === 'profile' || tab === 'leaderboard') && !session) {
      setIsAuthOpen(true);
    } else {
      setActiveTab(tab);
    }
    // Clear any viewed profile when changing tabs
    setViewedProfile(null);
    setViewedRatings([]);
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };
  
  const handleSetSimulatedLocation = (locationString) => {
    return new Promise((resolve, reject) => {
      if (!locationString) {
        handleSettingsChange({ ...settings, simulatedLocation: null });
        resolve(); return;
      }
      if (!window.google?.maps?.Geocoder) {
        const errorMsg = "Maps API not loaded. Please try again.";
        reject(new Error(errorMsg)); return;
      }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ 'address': locationString }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location;
          const newSimulatedLocation = { name: locationString, coords: { lat: location.lat(), lng: location.lng() } };
          handleSettingsChange({
              ...settings,
              simulatedLocation: newSimulatedLocation
          });
          // Also update search center when a new location is set
          setSearchCenter(newSimulatedLocation.coords);
          resolve();
        } else {
          reject(new Error('Geocode failed: ' + status));
        }
      });
    });
  };

  const handleViewPub = (pub) => {
    if (!pub || !pub.id || !pub.location) return;
    setSearchCenter(pub.location);
    setActiveTab('map');
    setSelectedPubId(pub.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
  const handleViewProfile = async (userId) => {
      setIsFetchingViewedProfile(true);
      setActiveTab('profile');

      const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

      if (profileError) {
          console.error("Error fetching viewed profile:", profileError);
          setIsFetchingViewedProfile(false);
          // Optionally, show an error message
          return;
      }

      const { data: ratingsData } = await supabase
          .from('ratings')
          .select('id, pub_id, price, quality, created_at, exact_price, pubs(id, name, address, lat, lng)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

      const mappedRatings = (ratingsData || []).map(r => ({
          id: r.id, pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality, exact_price: r.exact_price },
          timestamp: new Date(r.created_at).getTime(),
          pubName: r.pubs?.name || 'Unknown',
          pubAddress: r.pubs?.address || 'Unknown',
          pubLocation: r.pubs && r.pubs.lat && r.pubs.lng ? { lat: r.pubs.lat, lng: r.pubs.lng } : null,
      }));
      
      setViewedProfile(profileData);
      setViewedRatings(mappedRatings);
      setIsFetchingViewedProfile(false);
  };

    const handleFindCurrentPub = async () => {
        if (isFindingPub) return;
        setIsFindingPub(true);
        setFindPubError(null);

        if (!window.google?.maps?.places || !realUserLocation || (realUserLocation.lat === DEFAULT_LOCATION.lat && realUserLocation.lng === DEFAULT_LOCATION.lng)) {
            setFindPubError(locationError || "Could not get your precise location.");
            setIsFindingPub(false);
            return;
        }

        const request = {
            fields: ['id', 'displayName', 'location', 'formattedAddress'],
            textQuery: 'pub OR bar',
            locationBias: {
                center: new window.google.maps.LatLng(realUserLocation.lat, realUserLocation.lng),
                radius: 50, // 50-meter radius for a pinpoint search
            },
            maxResultCount: 5,
        };

        try {
            const { places } = await window.google.maps.places.Place.searchByText(request);
            if (!places || places.length === 0) {
                setFindPubError("Couldn't find a pub at your current location.");
            } else if (places.length === 1) {
                const place = places[0];
                const pubExists = googlePlaces.some(p => p.id === place.id);
                if (!pubExists) {
                    handlePlacesFound([place], false);
                }
                handleSelectPub(place.id);
            } else {
                setPubCandidates(places);
            }
        } catch (error) {
            console.error("Find current pub failed:", error);
            setFindPubError("An error occurred while searching for your location.");
        } finally {
            setIsFindingPub(false);
        }
    };

    const handleCandidateSelect = (place) => {
        if (place) {
            const pubExists = googlePlaces.some(p => p.id === place.id);
            if (!pubExists) {
                handlePlacesFound([place], false);
            }
            handleSelectPub(place.id);
        }
        setPubCandidates([]);
    };


  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }
  
  const renderProfile = () => {
      if (isFetchingViewedProfile) {
          return (
              <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
              </div>
          );
      }
      
      const profileToDisplay = viewedProfile || userProfile;
      const ratingsToDisplay = viewedProfile ? viewedRatings : userRatings;
      
      if (!profileToDisplay) return null;

      return (
          <ProfilePage 
              userProfile={profileToDisplay} 
              userRatings={ratingsToDisplay} 
              onViewPub={handleViewPub}
              loggedInUserProfile={userProfile}
              levelRequirements={levelRequirements}
          />
      );
  }
  
  const isInitialDataLoading = !isDbPubsLoaded || !initialSearchComplete;

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans antialiased relative">
      {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
      
      <Header activeTab={activeTab} />

      <main className="flex-grow flex flex-col overflow-y-auto">
        {activeTab === 'map' && (
          <div className="flex-grow flex flex-col overflow-hidden">
            {locationError && !(settings.developerMode && settings.simulatedLocation) && <div className="p-2 bg-red-500 dark:bg-red-800 text-white text-center text-sm" role="alert">{locationError}</div>}
            <FilterControls
              currentFilter={filter} onFilterChange={setFilter}
              onFindCurrentPub={handleFindCurrentPub} isFindingPub={isFindingPub}
            />

            <div className="flex-grow min-h-0">
                <MapComponent 
                  pubs={sortedPubs} userLocation={userLocation}
                  searchCenter={searchCenter} searchRadius={settings.radius}
                  onSelectPub={handleSelectPub} selectedPubId={selectedPubId}
                  onPlacesFound={handlePlacesFound} theme={settings.theme} filter={filter}
                />
            </div>
            <div className={`flex-shrink-0 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isListExpanded ? 'max-h-[45%]' : 'max-h-12'}`}>
                  <PubList
                    pubs={sortedPubs} selectedPubId={selectedPubId} onSelectPub={handleSelectPub}
                    filter={filter} getAverageRating={getAverageRating}
                    getDistance={(loc) => getDistance(loc, userLocation)}
                    distanceUnit={settings.unit} isExpanded={isListExpanded}
                    onToggle={() => setIsListExpanded(p => !p)}
                    resultsAreCapped={resultsAreCapped}
                    searchRadius={settings.radius}
                    isLoading={isInitialDataLoading}
                />
            </div>
          </div>
        )}
        {activeTab === 'profile' && renderProfile()}
         {activeTab === 'leaderboard' && session && (
            <LeaderboardPage onViewProfile={handleViewProfile} />
        )}
        {activeTab === 'settings' && (
            <SettingsPage
              settings={settings} onSettingsChange={handleSettingsChange}
              onSetSimulatedLocation={handleSetSimulatedLocation}
              userProfile={userProfile} onLogout={handleLogout}
            />
        )}
      </main>

      {activeTab === 'map' && (
        <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-in-out ${selectedPub ? 'translate-y-0' : 'translate-y-full'}`} style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)'}}>
          {selectedPub && (
              <PubDetails 
                  pub={selectedPub} onClose={() => setSelectedPubId(null)} onRate={handleRatePub}
                  getAverageRating={getAverageRating} existingUserRating={existingUserRatingForSelectedPub}
                  session={session} onLoginRequest={() => setIsAuthOpen(true)}
              />
          )}
        </div>
      )}
      
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Popups and Modals */}
      {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
      {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
      {rankUpInfo && <RankUpPopup key={rankUpInfo.key} newRank={rankUpInfo.newRank} />}
      {pubCandidates.length > 0 && (
          <ConfirmCurrentPubModal candidates={pubCandidates} onSelect={handleCandidateSelect} onClose={() => setPubCandidates([])} />
      )}
      {findPubError && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-auto pointer-events-none z-50 pb-safe" role="alert">
              <div className="animate-toast-in-out flex items-center space-x-3 bg-red-600 text-white font-bold text-base py-3 px-6 rounded-full shadow-2xl border border-red-400/50">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>{findPubError}</span>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;