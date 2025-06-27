import React from 'react';
import { Settings, DistanceUnit } from '../types';
import { MILES_TO_METERS, MIN_RADIUS_MI, MAX_RADIUS_MI } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  const handleUnitChange = (unit: DistanceUnit) => {
    onSettingsChange({ ...settings, unit });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const radiusInMiles = parseFloat(e.target.value);
    onSettingsChange({ ...settings, radius: radiusInMiles * MILES_TO_METERS });
  };

  const radiusInMiles = (settings.radius / MILES_TO_METERS).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 border-t-4 border-amber-400 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-700">
          <h2 id="settings-title" className="text-2xl font-bold text-amber-400">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close settings">
            <i className="fas fa-times fa-2x"></i>
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Distance Unit Setting */}
          <div>
            <label className="block text-lg font-semibold text-white mb-2" id="distance-unit-label">Distance Unit</label>
            <div className="flex rounded-lg bg-gray-900 p-1" role="group" aria-labelledby="distance-unit-label">
              <button
                onClick={() => handleUnitChange('mi')}
                className={`w-1/2 py-2 rounded-md font-bold transition-colors ${settings.unit === 'mi' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-gray-700'}`}
                aria-pressed={settings.unit === 'mi'}
              >
                Miles
              </button>
              <button
                onClick={() => handleUnitChange('km')}
                className={`w-1/2 py-2 rounded-md font-bold transition-colors ${settings.unit === 'km' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-gray-700'}`}
                aria-pressed={settings.unit === 'km'}
              >
                Kilometers
              </button>
            </div>
          </div>

          {/* Search Radius Setting */}
          <div>
            <label htmlFor="radius-slider" className="block text-lg font-semibold text-white mb-2">
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
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                aria-valuemin={MIN_RADIUS_MI}
                aria-valuemax={MAX_RADIUS_MI}
                aria-valuenow={parseFloat(radiusInMiles)}
                aria-valuetext={`${radiusInMiles} miles`}
              />
              <div className="flex justify-between text-xs text-gray-400">
                  <span>{MIN_RADIUS_MI} mi</span>
                  <span className="text-base font-bold text-amber-400">{radiusInMiles} mi</span>
                  <span>{MAX_RADIUS_MI} mi</span>
              </div>
            </div>
          </div>
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
