import React from 'react';
import { createPortal } from 'react-dom';
import ProgressBar from './ProgressBar.jsx';

const hasMetConditions = (trophy, stats) => {
    const conditions = trophy.trigger_conditions;

    // A trophy with no conditions, or an empty condition object, is not stat-based.
    if (!conditions || Object.keys(conditions).length === 0) {
        return false;
    }
    
    // Using 'in' for safer property checking
    if ('min_ratings' in conditions && (stats.ratingsCount || 0) < conditions.min_ratings) return false;
    if ('min_unique_pubs' in conditions && (stats.uniquePubsCount || 0) < conditions.min_unique_pubs) return false;
    if ('min_countries' in conditions && (stats.uniqueCountriesCount || 0) < conditions.min_countries) return false;
    if ('min_pubs_added' in conditions && (stats.pubsAddedCount || 0) < conditions.min_pubs_added) return false;
    if ('min_ratings_with_photo' in conditions && (stats.ratingsWithPhotoCount || 0) < conditions.min_ratings_with_photo) return false;
    if ('has_perfect_quality_rating' in conditions && !stats.has_perfect_quality_rating) return false;
    if ('has_perfect_price_rating' in conditions && !stats.has_perfect_price_rating) return false;

    // If all defined conditions are met, the re-validation passes.
    return true;
};

const TrophyItem = ({ trophy, isUnlocked, progress, actionButton }) => {
    const { name, description, icon_name } = trophy;

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
                        <p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">{progress.current} / {progress.max}</p>
                    </div>
                )}
                {actionButton}
            </div>
        </li>
    );
};

const TrophyModal = ({ isOpen, onClose, allTrophies, unlockedTrophyIds, userStats, onNavigateToSettings, userProfile }) => {
    if (!isOpen) return null;

    const PATRON_TROPHY_ID = 'a8a6e3e1-5e5e-4c8f-8f8f-2e2e2e2e2e2e';

    const getProgress = (trophy) => {
        if (!trophy.trigger_conditions) return null;

        if (trophy.trigger_conditions.min_ratings) {
            return { current: userStats.ratingsCount, max: trophy.trigger_conditions.min_ratings };
        }
        if (trophy.trigger_conditions.min_unique_pubs) {
            return { current: userStats.uniquePubsCount, max: trophy.trigger_conditions.min_unique_pubs };
        }
        if (trophy.trigger_conditions.min_countries) {
            return { current: userStats.uniqueCountriesCount, max: trophy.trigger_conditions.min_countries };
        }
        // Add more progress calculations here as needed...

        return null;
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-end sm:items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trophy-modal-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-amber-500 animate-slide-up flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full z-10"
                        aria-label="Close"
                    >
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                    <h2 id="trophy-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                        Trophies
                    </h2>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4">
                    <ul className="space-y-3">
                        {allTrophies.map(trophy => {
                            let isUnlocked;

                            // The "Stoutly Patron" trophy is unlocked ONLY if the user has donated.
                            if (trophy.id === PATRON_TROPHY_ID) {
                                isUnlocked = !!userProfile?.has_donated;
                            } else {
                                // For all other trophies, check the DB record first.
                                isUnlocked = unlockedTrophyIds.has(trophy.id);
                                const isStatBased = trophy.trigger_conditions && Object.keys(trophy.trigger_conditions).length > 0;
                                
                                if (isUnlocked && isStatBased) {
                                    // If it's unlocked in the DB and is stat-based, re-validate against current stats.
                                    isUnlocked = hasMetConditions(trophy, userStats);
                                }
                            }

                            return (
                                <TrophyItem
                                    key={trophy.id}
                                    trophy={trophy}
                                    isUnlocked={isUnlocked}
                                    progress={getProgress(trophy)}
                                    actionButton={
                                        !isUnlocked && trophy.id === PATRON_TROPHY_ID && onNavigateToSettings ? (
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => { onClose(); onNavigateToSettings('settings', 'support'); }}
                                                    className="w-full bg-amber-500 text-black text-xs font-bold py-1.5 px-3 rounded-md hover:bg-amber-400 transition-colors flex items-center justify-center space-x-1.5"
                                                >
                                                    <i className="fas fa-heart"></i>
                                                    <span>Donate to unlock</span>
                                                </button>
                                            </div>
                                        ) : null
                                    }
                                />
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default TrophyModal;
