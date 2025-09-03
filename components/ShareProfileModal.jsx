import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { getRankData } from '../utils.js';
import { trackEvent } from '../analytics.js';

const StatCard = ({ label, value }) => (
    <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md flex flex-col items-center justify-center">
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">{label}</p>
    </div>
);


const ShareProfileModal = ({ user, onClose }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy Link');

    // Base URL without UTM params
    const baseUrl = `${window.location.origin}/?user_id=${user.id}`;
    // URL for the Share button and Copy Link button
    const shareUrl = `${baseUrl}&utm_source=stoutly_app&utm_medium=profile_share&utm_campaign=user_profile_share`;
    // URL specifically for the QR code
    const qrTextUrl = `${baseUrl}&utm_source=stoutly_app&utm_medium=profile_qr&utm_campaign=user_profile_share`;

    // Use a publicly accessible URL for the icon so quickchart.io can access it.
    const centerImageUrl = 'https://stoutly.co.uk/icons/icon-192x192.png';
    const encodedCenterImageUrl = encodeURIComponent(centerImageUrl);
    
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrTextUrl)}&dark=${encodeURIComponent('#1A120F')}&light=${encodeURIComponent('#FFFFFF')}&qrEyeForegroundColor=${encodeURIComponent('#F59E0B')}&ecLevel=H&margin=1&size=150&centerImageUrl=${encodedCenterImageUrl}`;

    const rankData = getRankData(user.level);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopyButtonText('Copied!');
            trackEvent('share', { method: 'Copy Link', content_type: 'profile', item_id: user.id });
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
                    title: `Check out ${user.username}'s profile on Stoutly`,
                    text: `View ${user.username}'s Guinness rating stats on Stoutly!`,
                    url: shareUrl,
                });
                trackEvent('share', { method: 'Web Share API', content_type: 'profile', item_id: user.id });
            } catch (error) {
                console.error('Error sharing:', error);
                trackEvent('share_failed', { method: 'Web Share API', error_message: error.message });
            }
        } else {
            handleCopy();
        }
    };
    
    const formattedJoinDate = useMemo(() => {
        if (!user.created_at) return 'Recently';
        return new Date(user.created_at).toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
        });
    }, [user.created_at]);

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
                    <h3 id="share-title" className="text-xl font-bold text-center text-gray-900 dark:text-white">Share Profile</h3>
                </div>

                <div className="p-4 overflow-y-auto">
                    {/* Screenshot-friendly Share Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-gray-900 dark:text-white border-2 border-amber-500 shadow-lg">
                        <div className="flex justify-between items-center">
                            <div className="w-16 h-16"><Icon /></div>
                            <div className="flex items-center gap-2">
                                <p className="text-right font-bold text-lg">{user.username}</p>
                                <Avatar avatarId={user.avatar_id} className="w-12 h-12" />
                            </div>
                        </div>
                        
                        <div className="text-center my-4">
                            <i className={`fas ${rankData.icon} text-4xl text-amber-500 dark:text-amber-400`}></i>
                            <p className="text-2xl font-bold mt-1">{rankData.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Level {user.level}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <StatCard label="Ratings" value={user.reviews || 0} />
                            <StatCard label="Friends" value={user.friends_count || 0} />
                            <StatCard label="Joined" value={formattedJoinDate} />
                        </div>
                        
                        <div className="mt-4 flex justify-center items-center gap-4 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                            <img src={qrCodeUrl} alt="QR Code for profile link" className="w-20 h-20 rounded-md" />
                            <div className="text-left">
                                <p className="font-bold text-sm">Scan to view Profile</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">See their stats and ratings on Stoutly.</p>
                            </div>
                        </div>

                        <div className="text-center text-xl font-extrabold text-amber-500 dark:text-amber-400 mt-4 tracking-wider">
                            Stoutly.co.uk
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

export default ShareProfileModal;
