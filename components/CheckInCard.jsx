import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar.jsx';
import { formatTimeAgo, getCurrencyInfo } from '../utils.js';
import PintCounter from './PintCounter.jsx';

const CheckInCard = ({ checkin, onViewProfile, onViewImage, onViewPub, currentUser, onDeleteCheckin, onUpdateAmount }) => {
    const isOwner = currentUser && currentUser.id === checkin.user.id;
    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [amount, setAmount] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const currencyInfo = getCurrencyInfo(checkin.pub || {});

    const handleSaveAmount = async () => {
        if (!amount || isNaN(amount) || amount <= 0) return;
        setIsEditingAmount(false);
        if (onUpdateAmount) {
            await onUpdateAmount(checkin.id, parseInt(amount));
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        if (onDeleteCheckin) {
            await onDeleteCheckin(checkin.id);
        }
        setShowDeleteModal(false);
    };

    const isOlderThan6Hours = (Date.now() - new Date(checkin.created_at).getTime()) > 6 * 60 * 60 * 1000;

    if (isDeleting && !showDeleteModal) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up">
            {showDeleteModal && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Check-in?</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete this check-in? This action cannot be undone.</p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2.5 rounded-xl font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold transition-colors flex justify-center items-center"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                       <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                       'Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => onViewProfile && onViewProfile(checkin.user.id)}
                        className="flex-shrink-0 focus:outline-none"
                    >
                        <Avatar 
                            avatarId={checkin.user.avatar_id} 
                            className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700 hover:border-amber-500 transition-colors" 
                        />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => onViewProfile && onViewProfile(checkin.user.id)}
                                className="font-bold text-gray-900 dark:text-white hover:text-amber-500 transition-colors truncate"
                            >
                                {checkin.user.username}
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 break-words mt-0.5">
                            Checked in at{' '}
                            {checkin.pub ? (
                                <button
                                    onClick={() => { 
                                        if (!onViewPub) return;
                                        if (checkin.pub.lat && checkin.pub.lng) {
                                            onViewPub({ 
                                                id: checkin.pub.id, 
                                                name: checkin.pub.name, 
                                                address: checkin.pub.address, 
                                                location: { lat: checkin.pub.lat, lng: checkin.pub.lng },
                                                country_code: checkin.pub.country_code,
                                                country_name: checkin.pub.country_name
                                            });
                                        } 
                                    }}
                                    disabled={!onViewPub || !checkin.pub.lat || !checkin.pub.lng}
                                    className={`font-medium ${onViewPub && checkin.pub.lat && checkin.pub.lng ? 'text-amber-600 dark:text-amber-500 hover:underline' : 'text-gray-900 dark:text-white cursor-default'}`}
                                >
                                    {checkin.pub.name}
                                </button>
                            ) : (
                                <span>unknown pub</span>
                            )}
                            <span className="mx-1">•</span>{formatTimeAgo(new Date(checkin.created_at).getTime())}
                        </div>
                    </div>
                </div>
                {isOwner && (
                    <button 
                        onClick={() => setShowDeleteModal(true)}
                        className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center p-0 flex-shrink-0"
                        title="Delete Check-in"
                        aria-label="Delete Check-in"
                    >
                        <i className="fas fa-trash-alt"></i>
                    </button>
                )}
            </div>

            {checkin.image_url && (
                <div 
                    className="mt-3 relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-pointer group"
                    onClick={() => onViewImage && onViewImage({ image_url: checkin.image_url, user: checkin.user })}
                >
                    <img 
                        src={checkin.image_url} 
                        alt="Check-in photo"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>
            )}

            {checkin.comment && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap flex items-center">
                    <span className="italic block mt-1 py-1 rounded bg-gray-100 dark:bg-gray-800 break-words max-w-full">
                        "{checkin.comment}"
                    </span>
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 items-center">
                {checkin.amount_drank > 0 ? (
                    <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2">
                        <i className="fas fa-beer-mug-empty"></i>
                        <span>{checkin.amount_drank} Pint{checkin.amount_drank !== 1 ? 's' : ''}</span>
                    </div>
                ) : (
                    isOwner && (
                        isEditingAmount ? (
                            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full mt-2">
                                <PintCounter amount={amount || 1} onChange={setAmount} maxAmount={16} />
                                <div className="flex space-x-3 mt-4">
                                    <button 
                                        onClick={handleSaveAmount}
                                        className="bg-amber-500 text-black px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-400 transition-colors"
                                    >
                                        Save Pints
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingAmount(false)}
                                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => !isOlderThan6Hours && setIsEditingAmount(true)}
                                disabled={isOlderThan6Hours}
                                title={isOlderThan6Hours ? "Cannot add drinks after 6 hours" : "Add number of drinks"}
                                className={`bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors border border-dashed border-gray-300 dark:border-gray-600 ${isOlderThan6Hours ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'}`}
                            >
                                <i className="fas fa-plus text-amber-500"></i>
                                <span>drinks</span>
                            </button>
                        )
                    )
                )}
                {checkin.quality_rating && (
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2">
                        <i className="fas fa-star text-amber-500"></i>
                        <span>{checkin.quality_rating}</span>
                    </div>
                )}
                {checkin.price && (
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2">
                        <i className="fas fa-tag text-green-500"></i>
                        <span>{checkin.price > 0 ? `${currencyInfo.symbol}${checkin.price.toFixed(2)}` : 'Free'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckInCard;
