import React from 'react';

export default function LocationPermissionPrompt({ status, onRequestPermission }) {
  const isDenied = status === 'denied';

  return (
    <div className="absolute inset-0 z-[1001] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 text-center max-w-sm">
        <i className={`fas ${isDenied ? 'fa-map-marker-slash' : 'fa-map-marked-alt'} text-4xl mb-4 text-amber-500`}></i>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {isDenied ? 'Location Access Denied' : 'Find Pints Near You'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {isDenied 
            ? "To find nearby pubs, you'll need to enable location permissions in your browser or system settings, then tap the button below."
            : "Stoutly needs your permission to access your location to show you the best pints nearby."
          }
        </p>
        <button
          onClick={onRequestPermission}
          className="w-full mt-6 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center space-x-2"
        >
          <i className="fas fa-location-arrow"></i>
          <span>{isDenied ? 'Retry / Grant Permission' : 'Enable Location'}</span>
        </button>
      </div>
    </div>
  );
};
