import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FilterType } from './types.js';
import { DEFAULT_LOCATION } from './constants.js';
import { loadSettings, saveSettings } from './storage.js';
import { supabase } from './supabase.js';

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
import AuthPage from './components/AuthPage.jsx';

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

  const [reviewPopupInfo, setReviewPopupInfo] = useState(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState(null);

  // --- AUTH & DATA FETCHING ---

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
    });
    
    fetchAllRatings();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
            setIsAuthOpen(false);
        } else {
            // If user logs out, send them back to the map tab
            setActiveTab('map');
        }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    setGooglePlaces(places);
    setResultsAreCapped(capped);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    if (reviewPopupInfo) {
      const timer = setTimeout(() => setReviewPopupInfo(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [reviewPopupInfo]);
  
  useEffect(() => {
    if (leveledUpInfo) {
      const timer = setTimeout(() => setLeveledUpInfo(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [leveledUpInfo]);

  useEffect(() => {
    const newPubs = googlePlaces.map((place) => {
      if (!place.id || !place.displayName || !place.location || !place.formattedAddress) return null;
      return {
        id: place.id, name: place.displayName,
        address: place.formattedAddress,
        location: { lat: place.location.lat(), lng: place.location.lng() },
        ratings: allRatings.get(place.id) || [],
      };
    }).filter(Boolean);
    setPubs(newPubs);
  }, [googlePlaces, allRatings]);

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


  const sortedPubs = useMemo(() => {
    return [...pubs].sort((a, b) => {
      switch (filter) {
        case FilterType.Price:
          return getAverageRating(b.ratings, 'price') - getAverageRating(a.ratings, 'price');
        case FilterType.Quality:
          return getAverageRating(b.ratings, 'quality') - getAverageRating(a.ratings, 'quality');
        default:
          return getDistance(a.location, userLocation) - getDistance(b.location, userLocation);
      }
    });
  }, [pubs, filter, userLocation, getDistance]);

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
            setLeveledUpInfo({ key: Date.now(), newLevel: newProfile.level });
        }
        setReviewPopupInfo({ key: Date.now() });
    }
    
    fetchAllRatings();
    fetchUserData();

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

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans antialiased relative">
      {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
      
      <Header activeTab={activeTab} />

      <main className="flex-grow flex flex-col overflow-y-auto">
        {activeTab === 'map' && (
          <div className="flex-grow flex flex-col overflow-hidden">
            {locationError && !(settings.developerMode && settings.simulatedLocation) && <div className="p-2 bg-red-500 dark:bg-red-800 text-white text-center text-sm" role="alert">{locationError}</div>}
            <FilterControls currentFilter={filter} onFilterChange={setFilter} />

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
                />
            </div>
          </div>
        )}
        {activeTab === 'profile' && userProfile && (
            <ProfilePage 
                userProfile={userProfile} 
                userRatings={userRatings} 
                onViewPub={handleViewPub}
            />
        )}
         {activeTab === 'leaderboard' && session && (
            <LeaderboardPage />
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

      {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
      {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
    </div>
  );
};

export default App;