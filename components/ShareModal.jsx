import React, { useEffect, useState, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import StarRating from './StarRating.jsx';
import { trackEvent } from '../analytics.js';
import { Capacitor } from '@capacitor/core';
import { getCurrencyInfo } from '../utils.js';
import { ExchangeRatesContext } from '../contexts/ExchangeRatesContext.jsx';

const ScoreGauge = ({ score }) => {
    if (score === null || score === undefined) return null;
    const getScoreColor = (s) => {
        if (s >= 80) return 'text-yellow-400';
        if (s >= 65) return 'text-green-500';
        if (s >= 45) return 'text-yellow-500';
        return 'text-gray-500';
    };
    const color = getScoreColor(score);
    const circumference = 2 * Math.PI * 25; // radius is 25
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative w-16 h-16">
            <svg className="w-full h-full" viewBox="0 0 56 56">
                <circle className="text-gray-200 dark:text-gray-700" strokeWidth="6" stroke="currentColor" fill="transparent" r="25" cx="28" cy="28" />
                <circle
                    className={color}
                    style={{ strokeDashoffset: offset }}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="25"
                    cx="28"
                    cy="28"
                    transform="rotate(-90 28 28)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${color}`}>{score}</span>
            </div>
        </div>
    );
};


const ShareModal = ({ pub, onClose, loggedInUserProfile }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy Link');
    const { rates: exchangeRates } = useContext(ExchangeRatesContext);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Base URL for native share and copy link
    const productionUrl = 'https://app.stoutly.co.uk';
    const origin = Capacitor.isNativePlatform() ? productionUrl : window.location.origin;
    const baseUrl = `${origin}/?pub_id=${pub.id}`;

    // URL for the Share button and Copy Link button
    const shareUrl = `${baseUrl}&utm_source=stoutly_app&utm_medium=share&utm_campaign=pub_share`;
    
    // Specific, public base URL for the QR code to ensure it's always scannable and points to the live app
    const qrBaseUrl = `https://app.stoutly.co.uk/?pub_id=${pub.id}`;
    const qrTextUrl = `${qrBaseUrl}&utm_source=stoutly_app&utm_medium=qr&utm_campaign=pub_share`;
    
    // Use a publicly accessible URL for the icon so quickchart.io can access it.
    const centerImageUrl = 'https://app.stoutly.co.uk/icons/icon-192.png';
    const encodedCenterImageUrl = encodeURIComponent(centerImageUrl);

    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrTextUrl)}&dark=${encodeURIComponent('#1A120F')}&light=${encodeURIComponent('#FFFFFF')}&qrEyeForegroundColor=${encodeURIComponent('#F59E0B')}&ecLevel=H&margin=1&size=150&centerImageUrl=${encodedCenterImageUrl}`;
    
    const topReview = useMemo(() => {
        if (!pub.ratings || pub.ratings.length === 0) return null;
        // Sort by most likes, then most recently for tie-breaking
        const sorted = [...pub.ratings].sort((a, b) => (b.like_count || 0) - (a.like_count || 0) || new Date(b.created_at) - new Date(a.created_at));
        // Find the first one with a message
        return sorted.find(r => r.message) || null;
    }, [pub.ratings]);

    const avgQuality = pub.ratings.reduce((acc, r) => acc + r.quality, 0) / pub.ratings.length;
    
    const currencyInfo = getCurrencyInfo(pub);

    const priceInfo = useMemo(() => {
        const ratingsWithPrice = pub.ratings.filter(r => r.exact_price != null && r.exact_price > 0);
        const avgStarPrice = pub.ratings.length > 0 ? pub.ratings.reduce((acc, r) => acc + r.price, 0) / pub.ratings.length : 0;
        if (ratingsWithPrice.length === 0) return { text: null, stars: avgStarPrice, originalPrice: null, convertedPrice: null, originalCode: null, convertedCode: null };

        const total = ratingsWithPrice.reduce((acc, r) => acc + r.exact_price, 0);
        const average = total / ratingsWithPrice.length;
        
        const userHomeCurrency = getCurrencyInfo(loggedInUserProfile || { country_code: 'gb' });
        let convertedPriceText = null;
        let convertedCode = null;
        if (
            average > 0 && 
            exchangeRates &&
            currencyInfo.code !== userHomeCurrency.code &&
            exchangeRates[currencyInfo.code] &&
            exchangeRates[userHomeCurrency.code]
        ) {
            const priceInGbp = average / exchangeRates[currencyInfo.code];
            const convertedPrice = priceInGbp * exchangeRates[userHomeCurrency.code];
            convertedPriceText = `${userHomeCurrency.symbol}${convertedPrice.toFixed(2)}`;
            convertedCode = userHomeCurrency.code;
        }

        return { 
            text: `${currencyInfo.symbol}${average.toFixed(2)}`, 
            stars: avgStarPrice,
            originalPrice: `${currencyInfo.symbol}${average.toFixed(2)}`,
            convertedPrice: convertedPriceText,
            originalCode: currencyInfo.code,
            convertedCode: convertedCode,
        };
    }, [pub.ratings, currencyInfo, loggedInUserProfile, exchangeRates]);

    const avgPrice = priceInfo.stars;

    const isCertified = pub.certification_status === 'certified' || pub.certification_status === 'at_risk';

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopyButtonText('Copied!');
            trackEvent('share', { method: 'Copy Link', content_type: 'pub', item_id: pub.id });
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
                    title: `Check out ${pub.name} on Stoutly`,
                    text: `Find out the score for a pint of Guinness at ${pub.name}!`,
                    url: shareUrl,
                });
                trackEvent('share', { method: 'Web Share API', content_type: 'pub', item_id: pub.id });
            } catch (error) {
                console.error('Error sharing:', error);
                trackEvent('share_failed', { method: 'Web Share API', error_message: error.message });
            }
        } else {
            // Fallback for browsers that don't support Web Share API
            handleCopy();
        }
    };

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
                    <h3 id="share-title" className="text-xl font-bold text-center text-gray-900 dark:text-white">Share this Pub</h3>
                </div>

                <div className="p-4 overflow-y-auto">
                    {/* Screenshot-friendly Share Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-gray-900 dark:text-white border-2 border-amber-500 shadow-lg">
                        <div className="flex justify-between items-start">
                            <div className="w-16 h-16"><Icon /></div>
                            <div className="text-right">
                                <h4 className="font-bold text-lg leading-tight">{pub.name}</h4>
                                {isCertified && (
                                    <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                                        Stoutly Certified
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pub.address}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center my-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Pub Score</p>
                                <p className="text-4xl font-bold">{pub.pub_score}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">from {pub.ratings.length} {pub.ratings.length === 1 ? 'rating' : 'ratings'}</p>
                            </div>
                            <ScoreGauge score={pub.pub_score} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center text-sm">
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md flex flex-col items-center justify-center">
                                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Avg. Quality</p>
                                <p className="font-bold text-lg">{avgQuality.toFixed(1)} / 5</p>
                                <div className="flex justify-center">
                                    <StarRating rating={avgQuality} color="text-amber-400" />
                                </div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md flex flex-col items-center justify-center">
                                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Avg. Price</p>
                                {priceInfo.originalPrice ? (
                                    <div className="text-center">
                                        <p className="font-bold text-lg" title={priceInfo.originalCode}>{priceInfo.originalPrice}</p>
                                        {priceInfo.convertedPrice && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400" title={priceInfo.convertedCode}>{priceInfo.convertedPrice}</p>}
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-bold text-lg">{avgPrice.toFixed(1)} / 5</p>
                                        <div className="flex justify-center">
                                            <StarRating rating={avgPrice} color="text-green-400" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {topReview && (
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs italic text-gray-600 dark:text-gray-400">"{topReview.message}"</p>
                                <p className="text-right text-xs font-semibold mt-1">- {topReview.user.username}</p>
                            </div>
                        )}
                        
                        <div className="mt-4 flex justify-center items-center gap-4 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                            <img src={qrCodeUrl} alt="QR Code for pub link" className="w-20 h-20 rounded-md" />
                            <div className="text-left">
                                <p className="font-bold text-sm">Scan or Share</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Get a direct link to this pub on Stoutly.</p>
                            </div>
                        </div>

                        <div className="text-center text-xl font-extrabold text-amber-500 dark:text-amber-400 mt-4 tracking-wider">
                            app.stoutly.co.uk
                        </div>
                    </div>
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

export default ShareModal;