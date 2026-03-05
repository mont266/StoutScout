import React from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar.jsx';

const CrawlSummaryModal = ({ crawl, userProfile, onClose }) => {
    const completionDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const visitedCount = crawl.visitedStops.length;
    const skippedCount = crawl.skippedStops.length;
    const totalCount = crawl.stops.length;

    let summaryMessage = "Well done!";
    if (visitedCount === totalCount) {
        summaryMessage = "A perfect crawl! You visited every pub!";
    } else if (visitedCount === 0 && totalCount > 0) {
        summaryMessage = "Next time, maybe try visiting a pub?";
    } else if (visitedCount < totalCount / 2) {
        summaryMessage = "A valiant effort!";
    }

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 animate-modal-fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border-t-4 border-amber-500 text-white overflow-hidden"
            >
                <div className="p-6 text-center">
                    <div className="flex flex-col items-center mb-4">
                        {userProfile && <Avatar avatarId={userProfile.avatar_id} size={16} />}
                        <p className="font-bold mt-2">{userProfile ? userProfile.username : 'A Stoutly User'}</p>
                        <p className="text-xs text-gray-400">Completed: {completionDate}</p>
                    </div>

                    <div className="mb-4">
                        <h2 className="text-2xl font-bold">Crawl Complete!</h2>
                        <p className="text-gray-400 text-sm truncate">"{crawl.name}"</p>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 space-y-3 my-6">
                        <div className="flex justify-between items-center">
                            <p className="text-gray-300">Pubs Visited:</p>
                            <p className="font-bold text-2xl text-green-400">{visitedCount}</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-gray-300">Pubs Skipped:</p>
                            <p className="font-bold text-2xl text-red-400">{skippedCount}</p>
                        </div>
                         <div className="flex justify-between items-center">
                            <p className="text-gray-300">Total Stops:</p>
                            <p className="font-bold text-2xl">{totalCount}</p>
                        </div>
                    </div>

                    <p className="text-amber-300 font-semibold italic mb-6">"{summaryMessage}"</p>
                    
                    <button
                        onClick={onClose}
                        className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                        Done
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">#StoutlyPubCrawl</p>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default CrawlSummaryModal;
