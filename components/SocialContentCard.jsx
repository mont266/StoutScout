import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import StarRating from './StarRating.jsx';
import { getCurrencyInfo } from '../utils.js';

export const ANGLE_CONFIG = {
    'Aesthetic Excellence': { icon: 'fa-camera-retro', color: 'amber', label: 'Aesthetic Excellence' },
    'Pint Crime': { icon: 'fa-gavel', color: 'red', label: 'Pint Crime' },
    'Great Value': { icon: 'fa-tags', color: 'green', label: 'Great Value' },
    'Witty Comment': { icon: 'fa-comment-dots', color: 'blue', label: 'Witty Comment' },
    'Community Story': { icon: 'fa-book-open', color: 'purple', label: 'Community Story' },
};

const AngleTag = ({ angle, summary }) => {
    const config = ANGLE_CONFIG[angle] || { icon: 'fa-question-circle', color: 'gray', label: 'Unknown' };
    const colors = {
        amber: 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300',
        red: 'border-red-500 bg-red-500/10 text-red-800 dark:text-red-300',
        green: 'border-green-500 bg-green-500/10 text-green-800 dark:text-green-300',
        blue: 'border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300',
        purple: 'border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-300',
        gray: 'border-gray-500 bg-gray-500/10 text-gray-800 dark:text-gray-300',
    };

    return (
        <div className={`p-3 rounded-md border-l-4 ${colors[config.color]}`}>
            <div className="flex items-start space-x-3">
                <i className={`fas ${config.icon} text-xl mt-1`}></i>
                <div>
                    <h5 className="text-sm font-bold uppercase tracking-wide">{config.label}</h5>
                    <p className="text-sm italic mt-1">"{summary}"</p>
                </div>
            </div>
        </div>
    );
};

const SocialContentCard = ({ content }) => {
    const { user, pub, image_url, message, aiAnalysis, quality, price, exact_price } = content;
    const [copyStatus, setCopyStatus] = useState({});
    
    const currencyInfo = getCurrencyInfo(pub);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopyStatus({ [id]: true });
        trackEvent('social_hub_copy_caption', { rating_id: content.id });
        setTimeout(() => setCopyStatus({}), 2000);
    };
    
    const cardBorderColor = ANGLE_CONFIG[aiAnalysis.content_angle]?.color || 'gray';
    const borderClasses = {
        amber: 'border-amber-500',
        red: 'border-red-500',
        green: 'border-green-500',
        blue: 'border-blue-500',
        purple: 'border-purple-500',
        gray: 'border-gray-300 dark:border-gray-600',
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 ${borderClasses[cardBorderColor]}`}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* UGC Column */}
                <div className="md:col-span-1 space-y-3">
                    <h4 className="font-bold text-gray-800 dark:text-white">Original Content</h4>
                    <div className="flex items-center space-x-2">
                        <Avatar avatarId={user.avatar_id} className="w-8 h-8 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{user.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">at {pub.name}</p>
                        </div>
                    </div>
                    {image_url && <img src={image_url} alt="User submission" className="rounded-lg w-full aspect-square object-cover" />}
                    {message && <p className="text-sm italic text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">"{message}"</p>}

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Quality Rating</span>
                            <StarRating rating={quality} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Price Rating</span>
                            <StarRating rating={price} color="text-green-400" />
                        </div>
                        {exact_price > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Price Paid</span>
                                <span className="font-bold text-lg text-gray-800 dark:text-white bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded">
                                    {currencyInfo.symbol}{exact_price.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Analysis & Generated Content Column */}
                <div className="md:col-span-2 space-y-4">
                     <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">AI Analysis</h4>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                <p className="font-semibold text-gray-500 dark:text-gray-400">Recommendation</p>
                                <p className="font-bold text-lg text-amber-600 dark:text-amber-400">{aiAnalysis.recommendation || 'N/A'}</p>
                            </div>
                            <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                <p className="font-semibold text-gray-500 dark:text-gray-400">Image Score</p>
                                <p className="font-bold text-lg">{aiAnalysis.image_quality_score || 'N/A'} / 10</p>
                            </div>
                            <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                <p className="font-semibold text-gray-500 dark:text-gray-400">Sentiment</p>
                                <p className="font-bold text-lg">{aiAnalysis.comment_sentiment || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    
                    {aiAnalysis.content_angle && aiAnalysis.content_summary && (
                        <AngleTag angle={aiAnalysis.content_angle} summary={aiAnalysis.content_summary} />
                    )}

                    {/* Pint Quality Analysis section */}
                    {aiAnalysis.pint_visual_score !== undefined && aiAnalysis.pint_visual_analysis && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h5 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Pint Quality Analysis</h5>
                            <div className="flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                                <div className="flex-shrink-0 text-center">
                                    <p className="font-bold text-3xl text-blue-500 dark:text-blue-400">{aiAnalysis.pint_visual_score}</p>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ 10</p>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                    "{aiAnalysis.pint_visual_analysis}"
                                </p>
                            </div>
                        </div>
                    )}


                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {aiAnalysis.instagram_post_options?.length > 0 && (
                            <div>
                                <h5 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Instagram Post Captions</h5>
                                <div className="space-y-3">
                                    {aiAnalysis.instagram_post_options.map((option, index) => (
                                        <div key={index} className="relative bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-300">{option.style}</p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-1">{option.caption_text}</p>
                                            <button
                                                onClick={() => handleCopy(option.caption_text, `caption-${index}`)}
                                                className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold py-1 px-2 rounded-md transition-colors"
                                            >
                                                {copyStatus[`caption-${index}`] ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                         {aiAnalysis.story_ideas?.length > 0 && (
                            <div>
                                <h5 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Instagram Story Ideas</h5>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-800 dark:text-gray-200">
                                        {aiAnalysis.story_ideas.map((idea, index) => (
                                            <li key={`story-${index}`}>{idea}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                         {aiAnalysis.alternative_post_ideas?.length > 0 && (
                             <div>
                                <h5 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Alternative Post Ideas</h5>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
                                     <ul className="list-disc list-inside space-y-2 text-sm text-gray-800 dark:text-gray-200">
                                        {aiAnalysis.alternative_post_ideas.map((idea, index) => (
                                            <li key={`alt-${index}`}>{idea}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialContentCard;