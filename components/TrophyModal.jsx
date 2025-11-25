import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProgressBar from './ProgressBar.jsx';

const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';

const TrophyItem = ({ trophy, progress, actionButton }) => {
    const { name, description, icon_name, isUnlocked } = trophy;

    return (
        <li className={`flex items-start space-x-4 p-3 rounded-lg ${isUnlocked ? 'bg-amber-500/10' : 'bg-gray-100 dark:bg-gray-700/50'}`}>
            <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-2xl ${isUnlocked ? 'bg-amber-500 text-black' : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'}`}>
                <i className={`fas ${icon_name} transition-colors ${isUnlocked ? '' : 'filter grayscale'}`}></i>
            </div>
            <div className="flex-grow min-w-0">
                <h4 className={`font-bold ${isUnlocked ? 'text-amber-700 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>{name}</h4>
                <p className={`text-sm ${isUnlocked ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>{description}</p>
                {!isUnlocked && progress && (
                    <div className="mt-2">
                        <ProgressBar current={progress.current} max={progress.max} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{progress.current} / {progress.max}</p>
                    </div>
                )}
                {!isUnlocked && actionButton && <div className="mt-2">{actionButton}</div>}
            </div>
        </li>
    );
};

const getProgressForTrophy = (trophy, stats) => {
    if (!trophy.trigger_conditions || trophy.isUnlocked) return null;

    const conditions = trophy.trigger_conditions;

    if ('min_ratings' in conditions) return { current: stats.ratingsCount, max: conditions.min_ratings };
    if ('min_unique_pubs' in conditions) return { current: stats.uniquePubsCount, max: conditions.min_unique_pubs };
    if ('min_countries' in conditions) return { current: stats.uniqueCountriesCount, max: conditions.min_countries };
    if ('min_pubs_added' in conditions) return { current: stats.pubsAddedCount, max: conditions.min_pubs_added };
    if ('min_ratings_with_photo' in conditions) return { current: stats.ratingsWithPhotoCount, max: conditions.min_ratings_with_photo };

    return null;
};

const getActionButtonForTrophy = (trophy, onNavigateToSettings) => {
    if (trophy.isUnlocked) return null;

    if (trophy.id === PATRON_TROPHY_ID && onNavigateToSettings) {
        return (
            <button
                onClick={() => onNavigateToSettings('settings', 'support')}
                className="w-full bg-amber-500 text-black text-xs font-bold py-1.5 px-3 rounded-md hover:bg-amber-400 transition-colors flex items-center justify-center space-x-1.5"
            >
                <i className="fas fa-heart"></i>
                <span>Support Us to Unlock</span>
            </button>
        );
    }

    return null;
};

const TrophyModal = ({ isOpen, onClose, trophiesWithStatus, userStats, onNavigateToSettings, userProfile }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const unlockedCount = trophiesWithStatus.filter(t => t.isUnlocked).length;
    const totalCount = trophiesWithStatus.length;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1300] flex items-end sm:items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trophy-modal-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-amber-500 animate-slide-up flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-shrink-0 px-6 pt-6">
                     <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full z-10"
                        aria-label="Close"
                    >
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                    <h2 id="trophy-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                        Trophy Cabinet
                    </h2>
                    <p className="text-center text-amber-600 dark:text-amber-400 font-semibold">{unlockedCount} / {totalCount} Unlocked</p>
                </div>
                
                <div className="flex-grow overflow-y-auto px-6 py-4">
                    <ul className="space-y-3">
                        {trophiesWithStatus.map(trophy => {
                            const progress = getProgressForTrophy(trophy, userStats);
                            const actionButton = getActionButtonForTrophy(trophy, onNavigateToSettings);
                            // The trophy object from props already has the correct `isUnlocked` status.
                            return <TrophyItem key={trophy.id} trophy={trophy} progress={progress} actionButton={actionButton} />;
                        })}
                    </ul>
                </div>
                
                <div className="flex-shrink-0 px-6 pt-4 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};

export default TrophyModal;