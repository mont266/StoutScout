import React, { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import StarRating from './StarRating.jsx';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import { getCurrencyInfo } from '../utils.js';
import { Capacitor } from '@capacitor/core';
import { ExchangeRatesContext } from '../contexts/ExchangeRatesContext.jsx';

const ShareRatingModal = ({ rating, onClose, loggedInUserProfile }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy Link');
    const { rates: exchangeRates } = useContext(ExchangeRatesContext);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const productionUrl = 'https://app.stoutly.co.uk';
    const origin = Capacitor.isNativePlatform() ? productionUrl : window.location.origin;
    const baseUrl = `${origin}/?pub_id=${rating.pub_id}&rating_id=${rating.id}`;
    const shareUrl = `${baseUrl}&utm_source=stoutly_app&utm_medium=share&utm_campaign=rating_share`;
    
    const currencyInfo = getCurrencyInfo({
        country_code: rating.pub_country_code,
        country_name: rating.pub_country_name,
    });

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopyButtonText('Copied!');
            trackEvent('share', { method: 'Copy Link', content_type: 'rating', item_id: rating.id });
            setTimeout(() => setCopyButtonText('Copy Link'), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy link.');
        });
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${rating.user.username}'s pint at ${rating.pub_name}`,
                    text: `Check out this pint rating on Stoutly!`,
                    url: shareUrl,
                });
                trackEvent('share', { method: 'Web Share API', content_type: 'rating', item_id: rating.id });
            } catch (error) {
                console.error('Error sharing:', error);
                trackEvent('share_failed', { method: 'Web Share API', error_message: error.message });
            }
        } else {
            handleCopy();
        }
    };
    
    const userHomeCurrency = getCurrencyInfo(loggedInUserProfile || { country_code: 'gb' });
    let convertedPriceText = null;
    if (
        rating.exact_price > 0 && 
        exchangeRates &&
        currencyInfo.code !== userHomeCurrency.code &&
        exchangeRates[currencyInfo.code] &&
        exchangeRates[userHomeCurrency.code]
    ) {
        // Convert the pint's price to the base currency (GBP)
        const priceInGbp = rating.exact_price / exchangeRates[currencyInfo.code];
        // Convert from the base currency to the user's home currency
        const convertedPrice = priceInGbp * exchangeRates[userHomeCurrency.code];
        convertedPriceText = `${userHomeCurrency.symbol}${convertedPrice.toFixed(2)}`;
    }

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/70 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="share-title"
        >
            <div
                className="relative bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                    <h3 id="share-title" className="text-xl font-bold text-center text-gray-900 dark:text-white">Share this Rating</h3>
                </div>

                <div className="p-4 overflow-y-auto">
                    {rating.image_url ? (
                        // With Image Layout
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-amber-500 shadow-lg text-white">
                             <img src={rating.image_url} alt={`Pint at ${rating.pub_name}`} className="w-full h-full object-cover" />
                             
                             {/* Top Overlay */}
                            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
                                <div className="flex items-center gap-2">
                                    <Avatar avatarId={rating.user.avatar_id} className="w-10 h-10 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-shadow truncate" style={{ textShadow: '1px 1px 2px #000' }}>{rating.user.username}</p>
                                        <p className="text-xs text-gray-200 text-shadow truncate" style={{ textShadow: '1px 1px 2px #000' }}>rated at {rating.pub_name}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Price Overlay (Top Right) */}
                            {rating.exact_price > 0 && (
                                <div
                                    className="absolute top-3 right-3 text-right"
                                    style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}
                                >
                                    <p className="text-white font-bold text-2xl" title={currencyInfo.code}>{currencyInfo.symbol}{rating.exact_price.toFixed(2)}</p>
                                    {convertedPriceText && <p className="text-white font-semibold text-sm" title={userHomeCurrency.code}>{convertedPriceText}</p>}
                                </div>
                            )}

                            {/* Bottom Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                <div className="flex items-end justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1"><i className="fas fa-beer text-amber-400 text-xs w-3 text-center"></i><StarRating rating={rating.quality} color="text-amber-400" /></div>
                                        <div className="flex items-center gap-1"><i className="fas fa-tag text-green-400 text-xs w-3 text-center"></i><StarRating rating={rating.price} color="text-green-400" /></div>
                                    </div>
                                </div>
                            </div>
                            <p className="absolute bottom-1 right-2 text-[10px] font-bold text-amber-400 opacity-80" style={{ textShadow: '1px 1px 1px #000' }}>app.stoutly.co.uk</p>
                        </div>
                    ) : (
                        // No Image Layout
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-gray-900 dark:text-white border-2 border-amber-500 shadow-lg">
                            <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2 min-w-0">
                                    <Avatar avatarId={rating.user.avatar_id} className="w-10 h-10 flex-shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-base truncate">{rating.user.username}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">rated at <span className="font-semibold">{rating.pub_name}</span></p>
                                    </div>
                                </div>
                                <div className="w-12 h-12 flex-shrink-0"><Icon /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center text-sm mt-3">
                                <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md flex flex-col items-center">
                                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Quality</p>
                                    <div className="flex justify-center"><StarRating rating={rating.quality} color="text-amber-400" /></div>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md flex flex-col items-center">
                                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Price</p>
                                    <div className="flex justify-center"><StarRating rating={rating.price} color="text-green-400" /></div>
                                </div>
                            </div>
                            
                            {rating.exact_price > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">Price Paid:</span>
                                        <div className="text-right">
                                            <span className="font-bold text-lg text-gray-800 dark:text-white bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded" title={currencyInfo.code}>
                                                {currencyInfo.symbol}{rating.exact_price.toFixed(2)}
                                            </span>
                                            {convertedPriceText && <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1" title={userHomeCurrency.code}>{convertedPriceText}</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="text-center text-xl font-extrabold text-amber-500 dark:text-amber-400 mt-4 tracking-wider">
                                app.stoutly.co.uk
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-3">
                    <button
                        onClick={handleShare}
                        className="w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center space-x-2"
                    >
                        <i className="fas fa-share-alt"></i>
                        <span>Share</span>
                    </button>
                     <button
                        onClick={handleCopy}
                        className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        {copyButtonText}
                    </button>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? createPortal(modalContent, modalRoot) : null;
};

export default ShareRatingModal;