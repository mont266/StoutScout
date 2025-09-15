import React, { useState } from 'react';
import { trackEvent } from '../analytics.js';
import Icon from './Icon.jsx';

const GuinnessFactCard = ({ report }) => {
    const { factText, imageUrl } = report;
    const [copyStatus, setCopyStatus] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(factText);
        setCopyStatus(true);
        trackEvent('social_hub_copy_text', { report_type: 'guinness_fact', text_type: 'fact_text' });
        setTimeout(() => setCopyStatus(false), 2000);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-purple-500 animate-fade-in-down">
            <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Generated Guinness Fact Post</h3>
                    <button
                        onClick={handleCopy}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold py-1.5 px-3 rounded-md transition-colors flex items-center space-x-2"
                    >
                        <i className="far fa-copy"></i>
                        <span>{copyStatus ? 'Copied!' : 'Copy Fact'}</span>
                    </button>
                </div>
                
                {/* Wrapper to center and constrain the image content */}
                <div className="flex justify-center">
                    {/* Image container with constrained size and aspect ratio */}
                    <div className="relative w-full max-w-sm aspect-[3/4] rounded-lg overflow-hidden shadow-lg bg-gray-200 dark:bg-gray-700">
                        <img 
                            src={imageUrl} 
                            alt="AI generated image for a Guinness fact" 
                            className="w-full h-full object-cover" 
                        />
                        
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 lg:p-6">
                            {/* "Did you know?" Title */}
                            <h4
                                className="text-amber-400 uppercase tracking-widest text-sm font-bold"
                                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
                            >
                                Did you know?
                            </h4>
                            {/* The Fact */}
                            <blockquote 
                                className="text-white text-xl lg:text-2xl font-semibold italic mt-1"
                                style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}
                            >
                                {factText}
                            </blockquote>
                        </div>

                        {/* Watermark */}
                        <div className="absolute top-2 right-2 w-8 h-8 opacity-80 drop-shadow-lg">
                            <Icon />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuinnessFactCard;