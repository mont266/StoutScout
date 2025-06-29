
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Pub, Rating, FilterType, Coordinates, Settings, UserProfile, UserRating } from './types';
import { DEFAULT_LOCATION, REVIEWS_PER_LEVEL } from './constants';
import { loadRatings, saveRatings, loadSettings, saveSettings, loadUserProfile, saveUserProfile, loadUserRatings, saveUserRatings } from './storage';
import MapComponent from './components/Map';
import FilterControls from './components/FilterControls';
import PubDetails from './components/PubDetails';
import PubList from './components/PubList';
import Logo from './components/Logo';
import SettingsModal from './components/SettingsModal';
import ProfilePage from './components/ProfilePage';
import XPPopup from './components/XPPopup';
import LevelUpPopup from './components/LevelUpPopup';

const App: React.FC = () => {
  const [googlePlaces, setGooglePlaces] = useState<google.maps.places.Place[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [allRatings, setAllRatings] = useState<Map<string, Rating[]>>(() => loadRatings());
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>(FilterType.Distance);
  const [isListExpanded, setIsListExpanded] = useState(true);

  const [userLocation, setUserLocation] = useState<Coordinates>(DEFAULT_LOCATION);
  const [searchCenter, setSearchCenter] = useState<Coordinates>(DEFAULT_LOCATION);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const [currentView, setCurrentView] = useState<'map' | 'profile'>('map');
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [userRatings, setUserRatings] = useState<UserRating[]>(loadUserRatings);

  const [reviewPopupInfo, setReviewPopupInfo] = useState<{key: number} | null>(null);
  const [leveledUpInfo, setLeveledUpInfo] = useState<{key: number, newLevel: number} | null>(null);


  // Effect to apply the theme to the root <html> element
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Effect to hide the Review popup after its animation finishes
  useEffect(() => {
    if (reviewPopupInfo) {
      const timer = setTimeout(() => {
        setReviewPopupInfo(null);
      }, 2000); // Must match the animation duration in index.html

      return () => clearTimeout(timer);
    }
  }, [reviewPopupInfo]);
  
  // Effect to hide the Level Up popup after its animation finishes
  useEffect(() => {
    if (leveledUpInfo) {
      const timer = setTimeout(() => {
        setLeveledUpInfo(null);
      }, 3000); // Must match the animation duration in index.html

      return () => clearTimeout(timer);
    }
  }, [leveledUpInfo]);

  // This effect runs when places are found by the map OR when ratings are updated.
  // It combines the Google Place data with our stored ratings to create the definitive list of pubs.
  useEffect(() => {
    if (googlePlaces.length === 0 && pubs.length === 0) return;

    const newPubs = googlePlaces.map((place): Pub | null => {
      // Use properties from the new Place object
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

  // Effect to watch user's live position
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
        let message = "An unknown error occurred.";
        if (error.code === error.PERMISSION_DENIED) {
            message = "Location access denied. Showing pubs for default location.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Location information unavailable. Using last known or default location.";
        }
        setLocationError(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Effect to trigger a new search when user moves a significant distance
  useEffect(() => {
    if (getDistance(userLocation, searchCenter) > 500) { // 500 meter threshold
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

  const handleRatePub = useCallback((pubId: string, pubName: string, pubAddress: string, newRating: Rating) => {
    const existingUserRatingIndex = userRatings.findIndex(r => r.pubId === pubId);

    if (existingUserRatingIndex !== -1) {
      // --- UPDATE an existing rating ---
      const oldUserRating = userRatings[existingUserRatingIndex];

      // 1. Update allRatings Map by replacing the old rating with the new one
      setAllRatings(prevAllRatings => {
        const newAllRatings = new Map(prevAllRatings);
        const pubRatings = [...(newAllRatings.get(pubId) || [])]; // Make a mutable copy
        const oldRating = oldUserRating.rating;

        // Find and remove the old rating value. This is robust enough for a single-user app.
        const indexToRemove = pubRatings.findIndex(r => r.price === oldRating.price && r.quality === oldRating.quality);
        if (indexToRemove !== -1) {
            pubRatings.splice(indexToRemove, 1);
        }
        
        pubRatings.push(newRating); // Add the new one
        newAllRatings.set(pubId, pubRatings);
        saveRatings(newAllRatings);
        return newAllRatings;
      });

      // 2. Update the specific user rating in their history
      setUserRatings(prevUserRatings => {
        const newUserRatings = [...prevUserRatings];
        newUserRatings[existingUserRatingIndex] = {
            ...oldUserRating,
            pubAddress: pubAddress,
            rating: newRating,
            timestamp: Date.now(), // Update timestamp on edit
        };
        saveUserRatings(newUserRatings);
        return newUserRatings;
      });
      // 3. No level progression for updating a rating.

    } else {
      // --- ADD a new rating ---
      // 1. Update pub-specific ratings
      setAllRatings(prevRatings => {
        const newRatingsMap = new Map(prevRatings);
        const currentRatings = newRatingsMap.get(pubId) || [];
        newRatingsMap.set(pubId, [...currentRatings, newRating]);
        saveRatings(newRatingsMap);
        return newRatingsMap;
      });

      // 2. Create and add to user's personal rating history
      const newUserRating: UserRating = {
          pubId,
          pubName,
          pubAddress,
          rating: newRating,
          timestamp: Date.now(),
      };

      // 3. Update user ratings list and check for level-up
      setUserRatings(prevUserRatings => {
          const oldLevel = Math.floor(prevUserRatings.length / REVIEWS_PER_LEVEL);
          const newLevel = Math.floor((prevUserRatings.length + 1) / REVIEWS_PER_LEVEL);

          if (newLevel > oldLevel) {
            setLeveledUpInfo({ key: Date.now(), newLevel });
          }

          const updatedRatings = [newUserRating, ...prevUserRatings];
          saveUserRatings(updatedRatings);
          return updatedRatings;
      });

      // 4. Trigger Review Popup
      setReviewPopupInfo({ key: Date.now() });
    }
  }, [userRatings]);

  const handleForceReview = () => {
    // This function mimics a user submitting a new review for developer testing.
    
    // 1. Create a fake user rating to add to the history.
    const fakeUserRating: UserRating = {
        pubId: `dev-forced-review-${Date.now()}`,
        pubName: 'Developer Test Pint',
        pubAddress: '123 Debug Lane, Cyberspace',
        rating: { price: 3, quality: 4 }, // Arbitrary valid rating
        timestamp: Date.now(),
    };

    // 2. Update the list of user ratings, which will also trigger
    //    a check for leveling up. This uses the functional update form of setState.
    setUserRatings(prevUserRatings => {
        const oldLevel = Math.floor(prevUserRatings.length / REVIEWS_PER_LEVEL);
        const newLevel = Math.floor((prevUserRatings.length + 1) / REVIEWS_PER_LEVEL);

        // If the new review causes a level-up, trigger the celebration popup.
        if (newLevel > oldLevel) {
          setLeveledUpInfo({ key: Date.now(), newLevel });
        }
        
        // Add the new fake rating to the list and save it to storage.
        const updatedRatings = [fakeUserRating, ...prevUserRatings];
        saveUserRatings(updatedRatings);
        return updatedRatings;
    });

    // 3. Trigger the "+1 Review" confirmation popup.
    setReviewPopupInfo({ key: Date.now() });
  };

  const handleSelectPub = useCallback((pubId: string | null) => {
    setSelectedPubId(pubId);
    if (pubId && !isListExpanded) {
        setIsListExpanded(true);
    }
  }, [isListExpanded]);
  
  const handleCloseDetails = () => {
    setSelectedPubId(null);
  };

  const handleToggleList = () => {
    setIsListExpanded(prev => !prev);
  };

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <div className="w-full max-w-md mx-auto h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-800 dark:text-white font-sans antialiased">
      {currentView === 'map' ? (
        <>
          <header className="p-2 bg-gray-50 dark:bg-gray-800 shadow-lg z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {/* Left cell for the settings button */}
              <div className="flex justify-start">
                  <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Open settings"
                  >
                      <i className="fas fa-cog fa-lg"></i>
                  </button>
              </div>

              {/* Center cell contains the logo, which will be centered by the grid layout. */}
              <Logo /> 

              {/* Right cell for the profile button */}
              <div className="flex justify-end">
                  <button
                      onClick={() => setCurrentView('profile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Open profile"
                  >
                      <i className="fas fa-user-circle fa-lg"></i>
                  </button>
              </div>
          </header>

          {locationError && (
            <div className="p-2 bg-red-500 dark:bg-red-800 text-white text-center text-sm" role="alert">
              {locationError}
            </div>
          )}
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
                    onPlacesFound={setGooglePlaces}
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
      ) : (
        <ProfilePage 
          userProfile={userProfile}
          userRatings={userRatings}
          onClose={() => setCurrentView('map')}
          developerMode={settings.developerMode}
          onForceReview={handleForceReview}
        />
      )}
      {reviewPopupInfo && <XPPopup key={reviewPopupInfo.key} />}
      {leveledUpInfo && <LevelUpPopup key={leveledUpInfo.key} newLevel={leveledUpInfo.newLevel} />}
    </div>
  );
};

export default App;
