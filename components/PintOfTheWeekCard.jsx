import React, { useState } from 'react';
import { trackEvent } from '../analytics.js';
import Avatar from './Avatar.jsx';
import StarRating from './StarRating.jsx';
import { getCurrencyInfo } from '../utils.js';
import Icon from './Icon.jsx';

const CopyButton = ({ textToCopy, trackingId }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        trackEvent('social_hub_copy_text', { report_type: 'pint_of_the_week', text_type: trackingId });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold py-1 px-2 rounded-md transition-colors"
        >
            {isCopied ? 'Copied!' : 'Copy'}
        </button>
    );
};

const PintOfTheWeekCard = ({ report, winner }) => {
    if (!report || !winner) return null;

    const { post_caption, winning_reason, story_ideas } = report;
    const { quality, price, exact_price, pub_country_code, pub_country_name, image_url, user, pub } = winner;

    const currencyInfo = getCurrencyInfo({
        country_code: pub_country_code,
        country_name: pub_country_name,
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-amber-500 animate-fade-in-down">
            {/* Sizing and centering wrapper for the infographic */}
            <div className="max-w-sm mx-auto p-4">
                {/* Shareable Infographic Section */}
                <div id="pint-of-the-week-infographic" className="bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 dark:from-black dark:via-gray-900 dark:to-amber-900 text-gray-900 dark:text-white p-4 rounded-xl">
                    <div className="text-center mb-4">
                        <h3 className="text-2xl font-extrabold tracking-tight flex items-center justify-center gap-2">
                            <i className="fas fa-trophy text-amber-400"></i>
                            <span>Pint of the Week</span>
                            <i className="fas fa-trophy text-amber-400"></i>
                        </h3>
                    </div>
                    
                    {image_url ? (
                        <img src={image_url} alt={`Winning pint by ${user.username}`} className="rounded-lg w-full aspect-square object-cover shadow-lg border-4 border-white dark:border-gray-700" />
                    ) : (
                        <div className="rounded-lg w-full aspect-square bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-center p-4 border-4 border-white dark:border-gray-700">
                            <div>
                                <i className="fas fa-image-slash text-4xl text-gray-400 dark:text-gray-500"></i>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Image not available for this rating.</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-4 flex items-center space-x-3">
                        <Avatar avatarId={user.avatar_id} className="w-12 h-12 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-lg leading-tight">{user.username}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">at <span className="font-semibold">{pub.name}</span></p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
                        <div className="bg-white/50 dark:bg-black/20 p-2 rounded-md backdrop-blur-sm">
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Quality</p>
                            <div className="flex justify-center mt-1"><StarRating rating={quality} color="text-amber-400" /></div>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 p-2 rounded-md backdrop-blur-sm">
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Price</p>
                            <div className="flex justify-center mt-1"><StarRating rating={price} color="text-green-400" /></div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                        <Icon className="w-10 h-10 opacity-70" />
                        <p className="text-xl font-extrabold text-amber-500 dark:text-amber-400 tracking-wider">Stoutly.co.uk</p>
                    </div>
                </div>
            </div>

            {/* AI Analysis Section */}
            <div className="p-4">
                <details>
                    <summary className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                        View AI Content Strategy
                    </summary>
                    <div className="mt-4 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="p-3 rounded-md bg-amber-500/10 border-l-4 border-amber-500">
                            <h4 className="font-semibold text-amber-800 dark:text-amber-300">Winning Reason:</h4>
                            <p className="text-sm italic text-amber-700 dark:text-amber-400 mt-1">"{winning_reason}"</p>
                        </div>
                        
                        <div>
                            <h5 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Ready-to-Post Caption</h5>
                            <div className="relative bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                                <CopyButton textToCopy={post_caption} trackingId="caption" />
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post_caption}</p>
                            </div>
                        </div>

                        {story_ideas?.length > 0 && (
                            <div>
                                <h5 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Instagram Story Ideas</h5>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-800 dark:text-gray-200">
                                        {story_ideas.map((idea, index) => (
                                            <li key={`story-${index}`}>{idea}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </details>
            </div>
        </div>
    );
};

export default PintOfTheWeekCard;