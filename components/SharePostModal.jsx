import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import { Capacitor } from '@capacitor/core';
import { formatTimeAgo } from '../utils.js';

const SharePostModal = ({ post, onClose }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy Link');

    const productionUrl = 'https://app.stoutly.co.uk';
    const origin = Capacitor.isNativePlatform() ? productionUrl : window.location.origin;
    const baseUrl = `${origin}/?post_id=${post.id}`;
    const shareUrl = `${baseUrl}&utm_source=stoutly_app&utm_medium=share&utm_campaign=post_share`;
    
    const qrBaseUrl = `https://app.stoutly.co.uk/?post_id=${post.id}`;
    const qrTextUrl = `${qrBaseUrl}&utm_source=stoutly_app&utm_medium=qr&utm_campaign=post_share`;
    
    const centerImageUrl = 'https://app.stoutly.co.uk/icons/icon-192.png';
    const encodedCenterImageUrl = encodeURIComponent(centerImageUrl);

    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrTextUrl)}&dark=${encodeURIComponent('#1A120F')}&light=${encodeURIComponent('#FFFFFF')}&qrEyeForegroundColor=${encodeURIComponent('#F59E0B')}&ecLevel=H&margin=1&size=150&centerImageUrl=${encodedCenterImageUrl}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopyButtonText('Copied!');
            trackEvent('share', { method: 'Copy Link', content_type: 'post', item_id: post.id });
            setTimeout(() => setCopyButtonText('Copy Link'), 2000);
        });
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Check out this post on Stoutly by ${post.user.username}`,
                    text: post.title || post.content.substring(0, 100) + '...',
                    url: shareUrl,
                });
                trackEvent('share', { method: 'Web Share API', content_type: 'post', item_id: post.id });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
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
                    <h3 id="share-title" className="text-xl font-bold text-center text-gray-900 dark:text-white">Share this Post</h3>
                </div>

                <div className="p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-gray-900 dark:text-white border-2 border-amber-500 shadow-lg">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar avatarId={post.user.avatar_id} className="w-10 h-10 flex-shrink-0" />
                                <div className="truncate">
                                    <p className="font-bold text-base truncate">{post.user.username}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(new Date(post.created_at).getTime())}</p>
                                </div>
                            </div>
                            <div className="w-12 h-12 flex-shrink-0"><Icon /></div>
                        </div>

                        {post.title && <h4 className="font-bold text-lg mb-1">{post.title}</h4>}
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content.substring(0, 150)}{post.content.length > 150 ? '...' : ''}</p>
                        
                        <div className="mt-4 flex justify-center items-center gap-4 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                            <img src={qrCodeUrl} alt="QR Code for post link" className="w-20 h-20 rounded-md" />
                            <div className="text-left">
                                <p className="font-bold text-sm">Scan to view Post</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">See the full post and comments on Stoutly.</p>
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

export default SharePostModal;