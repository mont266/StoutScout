import React from 'react';

// Re-using a confetti component for celebration
const Confetti = () => {
  const confetti = Array.from({ length: 70 }).map((_, i) => {
    const style = {
      left: `${Math.random() * 100}vw`,
      animationDelay: `${Math.random() * 4}s`,
    };
    return <div key={i} className="confetti-piece" style={style}></div>;
  });
  return <div className="absolute inset-0 pointer-events-none overflow-hidden">{confetti}</div>;
};

const RankUpPopup = ({ newRank }) => {
  if (!newRank) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1500] animate-modal-fade-in"
      aria-live="polite"
      role="alert"
    >
      <Confetti />
      <div className="relative text-center bg-gradient-to-br from-gray-900 to-black border-4 border-amber-500 rounded-2xl shadow-2xl p-8 max-w-sm w-full">
         <h2 className="text-4xl font-extrabold tracking-tight text-white uppercase drop-shadow-lg mb-4">
            <span className="text-amber-400">Rank</span> Up!
        </h2>
        <div className="my-6 flex flex-col items-center">
            <i className={`fas ${newRank.icon} text-9xl text-amber-400 animate-rank-up-glow`}></i>
        </div>
        <p className="text-3xl font-bold text-white mt-4">{newRank.name}</p>
        <p className="text-lg font-medium text-gray-300 mt-2">A new title has been earned!</p>
      </div>
    </div>
  );
};

export default RankUpPopup;