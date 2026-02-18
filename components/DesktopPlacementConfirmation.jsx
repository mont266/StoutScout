import React from 'react';

const DesktopPlacementConfirmation = ({ pubName, onConfirm, onCancel, isLoading }) => {
    return (
        <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Location</h3>
            <p className="text-amber-600 dark:text-amber-400 font-semibold text-lg mt-1">{pubName}</p>
            
            <div className="my-6 p-4 bg-blue-500/10 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 rounded-r-lg">
                <p className="font-bold">Is this the right spot?</p>
                <p className="text-sm mt-1">Drag the pin to place it over the pub's exact entrance. When you're happy with the location, hit confirm.</p>
            </div>

            <div className="mt-auto space-y-3">
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 disabled:cursor-wait flex items-center justify-center"
                >
                     {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        'Confirm & Add Pub'
                    )}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default DesktopPlacementConfirmation;