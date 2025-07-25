import React from 'react';

const PlacementConfirmationBar = ({ onConfirm, onCancel, isLoading }) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 z-[1100] bg-gray-900/90 backdrop-blur-sm text-white p-4 shadow-lg-top animate-fade-in-up">
            <div className="max-w-md mx-auto">
                <p className="text-center font-semibold mb-3">Is this the right spot?</p>
                <p className="text-center text-sm text-gray-300 mb-4">Drag the pin to the pub's exact entrance, then confirm.</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-lg bg-gray-600 font-semibold hover:bg-gray-500 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
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
                            'Confirm Location'
                        )}
                    </button>
                </div>
            </div>
             <div className="pb-safe"></div>
        </div>
    );
};

export default PlacementConfirmationBar;
