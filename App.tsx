// This file is now 'App.js'
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Pub, Rating, FilterType, Coordinates, Settings, UserProfile, UserRating } from './types';
import { DEFAULT_LOCATION, REVIEWS_PER_LEVEL } from './constants';
import { loadSettings, saveSettings } from './storage';
import { supabase } from './supabase';

import MapComponent from './components/Map';
import FilterControls from './components/FilterControls';
import PubDetails from './components/PubDetails';
import PubList from './components/PubList';
import Logo from './components/Logo';
import SettingsModal from './components/SettingsModal';
import ProfilePage from './components/ProfilePage';
import XPPopup from './components/XPPopup';
import LevelUpPopup from './components/LevelUpPopup';
import AuthPage from './components/AuthPage';

const App: React.FC = () => {
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // App state
  const [googlePlaces, setGooglePlaces] = useState<any[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [allRatings, setAllRatings] = useState<Map<string, Rating[]>>(new Map());
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>(FilterType.Distance);
  const [isListExpanded, setIsListExpanded] = useState(true);

  const [userLocation, setUserLocation] = useState<Coordinates>(DEFAULT_LOCATION);
  const [searchCenter, setSearchCenter] = useState<Coordinates>(DEFAULT_LOCATION);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resultsAreCapped, setResultsAreCapped] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const [currentView, setCurrentView] = useState<'map' | 'profile'>('map');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);

  const [reviewPopupInfo, setReviewPopupInfo] = useState<{key: number} | null>(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState<{key: number, newLevel: number} | null>(null);

  // --- AUTH & DATA FETCHING ---

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });
    
    // Fetch all public ratings for everyone
    fetchAllRatings();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
            setIsAuthOpen(false); // Close auth modal on successful login
        }
        setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllRatings = async () => {
      const { data, error } = await supabase
          .from('ratings')
          .select('pub_id, price, quality');

      if (error) {
          console.error("Error fetching all ratings:", error);
          return;
      }

      const ratingsMap = new Map<string, Rating[]>();
      for (const rating of data || []) {
          const existing = ratingsMap.get(rating.pub_id) || [];
          ratingsMap.set(rating.pub_id, [...existing, { price: rating.price, quality: rating.quality }]);
      }
      setAllRatings(ratingsMap);
  };
  
  const fetchUserData = async (userId: string) => {
    // Fetch Profile
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (profileError) {
      console.error("Error fetching profile:", profileError);
    } else {
      setUserProfile(profileData);
    }
    
    // Fetch user's ratings WITH a join to pubs for efficiency
    const { data: userRatingsData, error: userRatingsError } = await supabase
        .from('ratings')
        .select('id, pub_id, price, quality, created_at, pubs(name, address)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (userRatingsError) {
        console.error("Error fetching user ratings:", userRatingsError);
        return;
    }

    if (!userRatingsData) {
        setUserRatings([]);
        return;
    }

    const mappedUserRatings: UserRating[] = userRatingsData.map(r => {
      // The 'pubs' table is now nested. The generated type for it will be based on the selection.
      // It can be null if the relationship doesn't resolve (e.g., a rating for a deleted pub).
      const pubDetails = r.pubs as ({ name: string, address: string } | null);
      return {
          id: r.id,
          pubId: r.pub_id,
          rating: { price: r.price, quality: r.quality },
          timestamp: new Date(r.created_at).getTime(),
          pubName: pubDetails?.name || 'Unknown Pub',
          pubAddress: pubDetails?.address || 'Unknown Address',
      };
    });

    setUserRatings(mappedUserRatings);
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserData(session.user.id);
    } else {
      // Clear user-specific data on logout
      setUserProfile(null);
      setUserRatings([]);
    }
  }, [session]);


  // --- CORE APP LOGIC ---

  const handlePlacesFound = (places: any[], capped: boolean) => {
    setGooglePlaces(places);
    setResultsAreCapped(capped);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
    if (googlePlaces.length === 0 && pubs.length === 0 && allRatings.size === 0) return;

    const newPubs = googlePlaces.map((place): Pub | null => {
      if (!place.id || !place.displayName || !place.location || !place.formattedAddress) {
        return null;
      }
      return {
        id: place.id,
        name: place.displayName,
        address: place.formattedAddress,
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
        ratings: allRatings.get(place.id) || [],
      };
    }).filter((pub): pub is Pub => pub !== null);

    setPubs(newPubs);
    
  }, [googlePlaces, allRatings]);

  const selectedPub = useMemo(() => pubs.find(p => p.id === selectedPubId) || null, [pubs, selectedPubId]);
  const existingUserRatingForSelectedPub = useMemo(() => {
    if (!selectedPub) return undefined;
    return userRatings.find(r => r.pubId === selectedPub.id);
  }, [selectedPub, userRatings]);

  const getAverageRating = (ratings: Rating[], key: keyof Rating): number => {
    if (ratings.length === 0) return 0;
    const total = ratings.reduce((acc, r) => acc + r[key], 0);
    return total / ratings.length;
  };

  const getDistance = useCallback((location1: Coordinates, location2: Coordinates): number => {
    const R = 6371e3; // metres
    const φ1 = location1.lat * Math.PI/180;
    const φ2 = location2.lat * Math.PI/180;
    const Δφ = (location2.lat-location1.lat) * Math.PI/180;
    const Δλ = (location2.lng-location1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported. Using default location.");
      return;
    }
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
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
    if (getDistance(userLocation, searchCenter) > 500) {
      setSearchCenter(userLocation);
    }
  }, [userLocation, searchCenter, getDistance]);
  
  const sortedPubs = useMemo(() => {
    return [...pubs].sort((a, b) => {
      switch (filter) {
        case FilterType.Price:
          return getAverageRating(b.ratings, 'price') - getAverageRating(a.ratings, 'price');
        case FilterType.Quality:
          return getAverageRating(b.ratings, 'quality') - getAverageRating(a.ratings, 'quality');
        case FilterType.Distance:
        default:
          return getDistance(a.location, userLocation) - getDistance(b.location, userLocation);
      }
    });
  }, [pubs, filter, userLocation, getDistance]);

  const handleRatePub = useCallback(async (pubId: string, pubName: string, pubAddress: string, newRating: Rating) => {
    if (!session || !userProfile || !selectedPub) return;

    // 1. Upsert the pub into the 'pubs' table to ensure it exists.
    const { error: pubError } = await supabase.from('pubs').upsert({
      id: pubId,
      name: pubName,
      address: pubAddress,
      lat: selectedPub.location.lat,
      lng: selectedPub.location.lng,
    });
    if (pubError) {
      console.error("Error upserting pub:", pubError);
      return;
    }

    const isUpdating = userRatings.some(r => r.pubId === pubId);
    
    // 2. Insert or update the rating in the 'ratings' table.
    const ratingPayload = {
      pub_id: pubId,
      user_id: session.user.id,
      price: newRating.price,
      quality: newRating.quality,
    };

    const { error: ratingError } = isUpdating
      ? await supabase.from('ratings').update(ratingPayload).eq('pub_id', pubId).eq('user_id', session.user.id)
      : await supabase.from('ratings').insert(ratingPayload);
    
    if (ratingError) {
        console.error('Error saving rating:', ratingError);
        return;
    }
    
    // If updating, just refetch and finish
    if (isUpdating) {
        fetchAllRatings();
        fetchUserData(session.user.id);
        return;
    }
    
    // 3. For new ratings, update user's profile (XP and Level)
    const newXp = userProfile.xp + 1;
    const oldLevel = userProfile.level;
    const newLevel = Math.floor(newXp / REVIEWS_PER_LEVEL);
    
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('id', session.user.id);
    
    if (profileUpdateError) {
        console.error('Failed to update user profile:', profileUpdateError);
        // The rating was saved, but the profile wasn't updated.
        // We'll still refetch to keep the UI consistent with what we can.
    }
    
    // 4. On success, refetch all data to update the UI.
    fetchAllRatings(); // For average ratings
    fetchUserData(session.user.id); // For user's own rating history & level

    // 5. Trigger popups for new review
    if (newLevel > oldLevel) {
        setLeveledUpInfo({ key: Date.now(), newLevel });
    }
    setReviewPopupInfo({ key: Date.now() });

  }, [session, userRatings, selectedPub, userProfile]);

  const handleForceReview = async () => {
    if (!session || !userProfile) return;
    console.log("Developer action: Force review popup and level up");
    // Simulate a new review by directly updating the database
    const newXp = userProfile.xp + 1;
    const oldLevel = userProfile.level;
    const newLevel = Math.floor(newXp / REVIEWS_PER_LEVEL);

    await supabase
        .from('profiles')
        .update({ xp: newXp, level: newLevel })
        .eq('id', session.user.id);

    // Refetch data to reflect change
    await fetchUserData(session.user.id);

    // Trigger popups
    if (newLevel > oldLevel) {
        setLeveledUpInfo({ key: Date.now(), newLevel });
    }
    setReviewPopupInfo({ key: Date.now() });
  };
  
  const handleSelectPub = useCallback((pubId: string | null) => {
    setSelectedPubId(pubId);
    if (pubId && !isListExpanded) setIsListExpanded(true);
  }, [isListExpanded]);

  const handleProfileClick = () => {
    if (session) {
      setCurrentView('profile');
    } else {
      setIsAuthOpen(true);
    }
  };
  
  const handleCloseDetails = () => setSelectedPubId(null);
  const handleToggleList = () => setIsListExpanded(prev => !prev);
  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('map');
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-800 dark:text-white font-sans antialiased">
      {isAuthOpen && <AuthPage onClose={() => setIsAuthOpen(false)} />}
      
      {currentView === 'map' ? (
        <>
          <header className="p-2 bg-gray-50 dark:bg-gray-800 shadow-lg z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex justify-start">
                  <button onClick={() => setIsSettingsOpen(true)} className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Open settings"><i className="fas fa-cog fa-lg"></i></button>
              </div>
              <Logo /> 
              <div className="flex justify-end">
                  <button onClick={handleProfileClick} className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Open profile"><i className="fas fa-user-circle fa-lg"></i></button>
              </div>
          </header>

          {locationError && <div className="p-2 bg-red-500 dark:bg-red-800 text-white text-center text-sm" role="alert">{locationError}</div>}
          <FilterControls currentFilter={filter} onFilterChange={setFilter} />

          <div className="flex-grow flex flex-col overflow-hidden">
              <div className="flex-grow min-h-0">
                  <MapComponent 
                    pubs={sortedPubs} 
                    userLocation={userLocation}
                    searchCenter={searchCenter}
                    searchRadius={settings.radius}
                    onSelectPub={handleSelectPub} 
                    selectedPubId={selectedPubId}
                    onPlacesFound={handlePlacesFound}
                    theme={settings.theme}
                  />
              </div>
              <div className={`flex-shrink-0 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isListExpanded ? 'max-h-[40%]' : 'max-h-14'}`}>
                   <PubList
                      pubs={sortedPubs}
                      selectedPubId={selectedPubId}
                      onSelectPub={handleSelectPub}
                      filter={filter}
                      getAverageRating={getAverageRating}
                      getDistance={(loc) => getDistance(loc, userLocation)}
                      distanceUnit={settings.unit}
                      isExpanded={isListExpanded}
                      onToggle={handleToggleList}
                      resultsAreCapped={resultsAreCapped}
                  />
              </div>
          </div>

          <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-in-out ${selectedPub ? 'translate-y-0' : 'translate-y-full'}`}>
            {selectedPub && (
                <PubDetails 
                    pub={selectedPub} 
                    onClose={handleCloseDetails} 
                    onRate={handleRatePub}
                    getAverageRating={getAverageRating}
                    existingUserRating={existingUserRatingForSelectedPub}
                    session={session}
                    onLoginRequest={() => setIsAuthOpen(true)}
                />
            )}
          </div>
          
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            userProfile={userProfile}
          />
        </>
      ) : userProfile ? (
        <ProfilePage 
          userProfile={userProfile}
          userRatings={userRatings}
          onClose={() => setCurrentView('map')}
          onLogout={handleLogout}
          developerMode={settings.developerMode}
          onForceReview={handleForceReview}
        />
      ) : null}
      {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
      {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
    </div>
  );
};

export default App;