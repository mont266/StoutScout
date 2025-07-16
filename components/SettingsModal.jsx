import React, { useState } from 'react';
import { MILES_TO_METERS, MIN_RADIUS_MI, MAX_RADIUS_MI } from '../constants.js';

// This component is no longer a modal, but a full page for settings
// that appears in its own tab.
const SettingsPage = ({ settings, onSettingsChange, onSetSimulatedLocation, userProfile, onLogout }) => {
  const [locationInput, setLocationInput] = useState(settings.simulatedLocation?.name || '');
  const [isLocating, setIsLocating] = useState(false);
  
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

  const radiusInMiles = (settings.radius / MILES_TO_METERS).toFixed(1);

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