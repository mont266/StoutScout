import React, { useState, useEffect } from 'react';
import { MILES_TO_METERS, MIN_RADIUS_MI, MAX_RADIUS_MI } from '../constants.js';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import ModerationPage from './ModerationPage.jsx';
import StatsPage from './StatsPage.jsx';
import { trackEvent } from '../analytics.js';

// This component is no longer a modal, but a full page for settings
// that appears in its own tab.
const SettingsPage = ({ settings, onSettingsChange, onSetSimulatedLocation, userProfile, onLogout, onViewProfile }) => {
  const [locationInput, setLocationInput] = useState(settings.simulatedLocation?.name || '');
  const [isLocating, setIsLocating] = useState(false);
  const [adminView, setAdminView] = useState('settings'); // 'settings', 'moderation', 'stats'
  
  // State for the new dev profile browser
  const [allProfiles, setAllProfiles] = useState([]);
  const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');

  const handleUnitChange = (unit) => onSettingsChange({ ...settings, unit });
  const handleThemeChange = (theme) => onSettingsChange({ ...settings, theme });
  const handleDeveloperModeChange = (enabled) => onSettingsChange({ ...settings, developerMode: enabled });

  const handleRadiusChange = (e) => {
    const radiusInMiles = parseFloat(e.target.value);
    onSettingsChange({ ...settings, radius: radiusInMiles * MILES_TO_METERS });
  };

  const handleSetLocation = async () => {
    if (!locationInput) return;
    setIsLocating(true);
    try {
      await onSetSimulatedLocation(locationInput);
    } catch (error) {
      alert(error.message || 'Could not find location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleClearLocation = () => {
    setLocationInput('');
    onSetSimulatedLocation(null);
  };
  
  useEffect(() => {
    const fetchProfiles = async () => {
      // Only fetch if dev mode is on and user is a dev.
      if (userProfile?.is_developer && settings.developerMode) {
        setIsFetchingProfiles(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_id, level')
          .order('username', { ascending: true });

        if (error) {
          console.error("Error fetching all profiles:", error);
          setAllProfiles([]);
        } else {
          setAllProfiles(data || []);
        }
        setIsFetchingProfiles(false);
      } else {
        setAllProfiles([]); // Clear profiles if dev mode is off or user is not a dev
      }
    };

    fetchProfiles();
  }, [userProfile?.is_developer, settings.developerMode]);
  
  const filteredProfiles = allProfiles.filter(p => 
    p.username.toLowerCase().includes(profileSearch.toLowerCase())
  );

  const radiusInMiles = (settings.radius / MILES_TO_METERS).toFixed(1);
  
  if (userProfile?.is_developer) {
    if (adminView === 'moderation') {
      return <ModerationPage onViewProfile={onViewProfile} onBack={() => setAdminView('settings')} />;
    }
    if (adminView === 'stats') {
      return <StatsPage onBack={() => setAdminView('settings')} />;
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
        {/* Theme Setting */}
        <div>
          <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="theme-label">Theme</label>
          <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="theme-label">
            <button
              onClick={() => handleThemeChange('light')}
              className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.theme === 'light' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
              aria-pressed={settings.theme === 'light'}
            >
              <i className="fas fa-sun"></i><span>Light</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.theme === 'dark' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
              aria-pressed={settings.theme === 'dark'}
            >
              <i className="fas fa-moon"></i><span>Dark</span>
            </button>
          </div>
        </div>
        
        {/* Distance Unit Setting */}
        <div>
          <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="distance-unit-label">Distance Unit</label>
          <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="distance-unit-label">
            <button
              onClick={() => handleUnitChange('mi')}
              className={`w-1/2 py-2 rounded-md font-bold transition-colors ${settings.unit === 'mi' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
              aria-pressed={settings.unit === 'mi'}
            >
              Miles
            </button>
            <button
              onClick={() => handleUnitChange('km')}
              className={`w-1/2 py-2 rounded-md font-bold transition-colors ${settings.unit === 'km' ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
              aria-pressed={settings.unit === 'km'}
            >
              Kilometers
            </button>
          </div>
        </div>

        {/* Search Radius Setting */}
        <div>
          <label htmlFor="radius-slider" className="block text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Search Radius
          </label>
          <div className="space-y-2">
            <input
              id="radius-slider"
              type="range"
              min={MIN_RADIUS_MI}
              max={MAX_RADIUS_MI}
              step="0.1"
              value={settings.radius / MILES_TO_METERS}
              onChange={handleRadiusChange}
              className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              aria-valuemin={MIN_RADIUS_MI}
              aria-valuemax={MAX_RADIUS_MI}
              aria-valuenow={parseFloat(radiusInMiles)}
              aria-valuetext={`${radiusInMiles} miles`}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{MIN_RADIUS_MI} mi</span>
                <span className="text-base font-bold text-amber-500 dark:text-amber-400">{radiusInMiles} mi</span>
                <span>{MAX_RADIUS_MI} mi</span>
            </div>
          </div>
        </div>

        {/* Admin Tools Section */}
        {userProfile?.is_developer && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                 <h3 className="text-xl font-bold text-red-500 dark:text-red-400 text-center">Admin Tools</h3>
                 <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => { setAdminView('moderation'); trackEvent('view_moderation_center'); }}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-500/10 text-red-500 dark:text-red-400 font-bold py-3 px-4 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>Moderation</span>
                    </button>
                    <button
                        onClick={() => { setAdminView('stats'); trackEvent('view_stats_page'); }}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold py-3 px-4 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                        <i className="fas fa-chart-bar"></i>
                        <span>Stats</span>
                    </button>
                 </div>
            </div>
        )}

        {/* Developer Section */}
        {userProfile?.is_developer && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
            <h3 className="text-xl font-bold text-red-500 dark:text-red-400 text-center">Developer Tools</h3>
            <div>
              <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="dev-mode-label">Developer Mode</label>
              <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="dev-mode-label">
                <button
                  onClick={() => handleDeveloperModeChange(true)}
                  className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.developerMode ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                  aria-pressed={settings.developerMode}
                ><i className="fas fa-bug"></i><span>On</span></button>
                <button
                  onClick={() => handleDeveloperModeChange(false)}
                  className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${!settings.developerMode ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                  aria-pressed={!settings.developerMode}
                ><i className="fas fa-toggle-off"></i><span>Off</span></button>
              </div>
            </div>
            {settings.developerMode && (
              <>
                <div>
                  <label htmlFor="location-input" className="block text-lg font-semibold text-gray-800 dark:text-white mb-2">Simulate Location</label>
                  {settings.simulatedLocation && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Currently viewing: <span className="font-bold">{settings.simulatedLocation.name}</span>
                      </p>
                  )}
                  <div className="flex space-x-2">
                    <input
                      id="location-input"
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="e.g., Eiffel Tower, Paris"
                      className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleSetLocation}
                      disabled={isLocating || !locationInput}
                      className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-400/50 flex items-center justify-center w-20"
                    >
                      {isLocating ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Set'}
                    </button>
                  </div>
                    {settings.simulatedLocation && (
                      <button onClick={handleClearLocation} className="text-sm text-center w-full mt-2 text-gray-500 dark:text-gray-400 hover:underline">Clear simulated location</button>
                    )}
                </div>
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-6">
                  <label htmlFor="profile-search" className="block text-lg font-semibold text-gray-800 dark:text-white mb-2">Browse Profiles ({allProfiles.length})</label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                    <input
                      id="profile-search"
                      type="text"
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                      placeholder="Search by username..."
                      className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                    {isFetchingProfiles ? (
                       <div className="flex items-center justify-center p-8">
                         <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
                       </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredProfiles.length > 0 ? filteredProfiles.map(profile => (
                          <li key={profile.id}>
                            <button
                              onClick={() => onViewProfile(profile.id, 'settings')}
                              className="w-full flex items-center space-x-3 text-left p-3 hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors"
                            >
                              <Avatar avatarId={profile.avatar_id} className="w-10 h-10 flex-shrink-0" />
                              <div className="flex-grow min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{profile.username}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Level {profile.level}</p>
                              </div>
                            </button>
                          </li>
                        )) : (
                          <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No profiles found.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      {/* Sign Out Button */}
      {userProfile && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-red-500/80 hover:text-white dark:hover:bg-red-600/80 transition-colors"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Sign Out</span>
            </button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;