import React from 'react';
import { MILES_TO_METERS, MIN_RADIUS_MI, MAX_RADIUS_MI } from '../constants.js';

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange, userProfile }) => {
  if (!isOpen) return null;

  const handleUnitChange = (unit) => {
    onSettingsChange({ ...settings, unit });
  };

  const handleThemeChange = (theme) => {
    onSettingsChange({ ...settings, theme });
  };

  const handleDeveloperModeChange = (enabled) => {
    onSettingsChange({ ...settings, developerMode: enabled });
  };

  const handleRadiusChange = (e) => {
    const radiusInMiles = parseFloat(e.target.value);
    onSettingsChange({ ...settings, radius: radiusInMiles * MILES_TO_METERS });
  };

  const radiusInMiles = (settings.radius / MILES_TO_METERS).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-40 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border-t-4 border-amber-400 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h2 id="settings-title" className="text-2xl font-bold text-amber-500 dark:text-amber-400">Settings</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors" aria-label="Close settings">
            <i className="fas fa-times fa-2x"></i>
          </button>
        </div>
        
        <div className="space-y-8">
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

          {/* Developer Mode */}
          {userProfile?.username === 'mont26' && (
            <div>
              <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-2" id="dev-mode-label">Developer Mode</label>
              <div className="flex rounded-lg bg-gray-200 dark:bg-gray-900 p-1" role="group" aria-labelledby="dev-mode-label">
                <button
                  onClick={() => handleDeveloperModeChange(true)}
                  className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${settings.developerMode ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                  aria-pressed={settings.developerMode}
                >
                  <i className="fas fa-bug"></i><span>On</span>
                </button>
                <button
                  onClick={() => handleDeveloperModeChange(false)}
                  className={`w-1/2 py-2 rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${!settings.developerMode ? 'bg-amber-500 text-black' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                  aria-pressed={!settings.developerMode}
                >
                  <i className="fas fa-toggle-off"></i><span>Off</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
             <button 
                onClick={onClose} 
                className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
             >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;