import React from 'react';

const ActiveCrawlTracker = ({ activeCrawl, onEnterCrawlMode, onEndCrawl }) => {
    if (!activeCrawl) return null;

    const { name, totalStops, visitedStops } = activeCrawl;
    const visitedCount = visitedStops.length;
    const progress = totalStops > 0 ? (visitedCount / totalStops) * 100 : 0;

    return (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-gray-900/80 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg animate-fade-in-down">
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-amber-400 font-bold">Active Crawl</p>
                    <p className="font-semibold truncate">{name}</p>
                    <p className="text-sm text-gray-300">{visitedCount} of {totalStops} visited</p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <button
                        onClick={onEnterCrawlMode}
                        className="bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-xs"
                    >
                        View
                    </button>
                    <button
                        onClick={onEndCrawl}
                        className="bg-red-500 text-white font-bold py-2 px-3 rounded-lg text-xs"
                    >
                        End
                    </button>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default ActiveCrawlTracker;