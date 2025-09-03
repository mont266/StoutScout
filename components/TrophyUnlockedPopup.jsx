import React, { useEffect } from 'react';

const DURATION_MS = 7000;

const TrophyUnlockedPopup = ({ trophies, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!trophies || trophies.length === 0) return null;

  const isMultiple = trophies.length > 1;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1500] animate-modal-fade-in"
      aria-live="polite"
      role="alertdialog"
      aria-labelledby="trophy-modal-title"
    >
      <div className="relative bg-gradient-to-br from-gray-900 to-black border-4 border-amber-500 rounded-2xl shadow-2xl p-6 max-w-sm w-full overflow-hidden">
        <h2 id="trophy-modal-title" className="text-3xl font-extrabold tracking-tight text-white uppercase drop-shadow-lg mb-4 text-center">
          {isMultiple ? 'Trophies Unlocked!' : 'Trophy Unlocked!'}
        </h2>
        
        <div className="my-6">
            {isMultiple ? (
              <ul className="space-y-3 max-h-64 overflow-y-auto pr-2 -mr-2">
                {trophies.map(trophy => (
                  <li key={trophy.id} className="flex items-center space-x-3 bg-white/10 p-2 rounded-lg animate-fade-in-down">
                    <i className={`fas ${trophy.icon_name} text-3xl text-amber-400 w-10 text-center`}></i>
                    <span className="font-bold text-white">{trophy.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center text-center animate-fade-in-down">
                <i className={`fas ${trophies[0].icon_name} text-9xl text-amber-400 animate-rank-up-glow`}></i>
                <p className="text-3xl font-bold text-white mt-4">{trophies[0].name}</p>
                <p className="text-lg font-medium text-gray-300 mt-2">{trophies[0].description}</p>
              </div>
            )}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div 
                className="h-full bg-amber-400 progress-bar-animate"
                style={{ animationDuration: `${DURATION_MS}ms` }}
            ></div>
        </div>
      </div>
    </div>
  );
};

export default TrophyUnlockedPopup;
