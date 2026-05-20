import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import StarRating from './StarRating';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import ImageCropper from './ImageCropper.jsx';
import PintCounter from './PintCounter.jsx';
import { getCurrencyInfo } from '../utils.js';

const CheckInModal = ({ pub, userProfile, onClose, onSuccess, existingUserRating }) => {
    // If we have an exact price and it's a number, default to that, else if we have a tiered price string we don't have an exact amount to prefill easily (unless we just leave it blank)
    const initialPrice = existingUserRating?.rating?.exact_price ?? existingUserRating?.rating?.price ?? '';
    const initialQuality = existingUserRating?.rating?.quality ?? 0;
    
    const currencyInfo = getCurrencyInfo(pub || {});

    const [price, setPrice] = useState(initialPrice);
    const [qualityRating, setQualityRating] = useState(initialQuality);
    const [hasGuinnessZero, setHasGuinnessZero] = useState(null);
    const [comment, setComment] = useState('');
    const [amountDrank, setAmountDrank] = useState(1);
    const [isNotFinished, setIsNotFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isQualitySame, setIsQualitySame] = useState(null);
    const [isPriceSame, setIsPriceSame] = useState(null);

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    const galleryInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            setImageToCrop(reader.result?.toString() || '');
            setIsCropperOpen(true);
          });
          reader.readAsDataURL(file);
        }
        e.target.value = null;
    };

    const handleCropComplete = (croppedFile) => {
        if (croppedFile) {
            setImageFile(croppedFile);
            setImagePreview(URL.createObjectURL(croppedFile));
        }
        setIsCropperOpen(false);
        setImageToCrop(null);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageToCrop(null);
        setIsCropperOpen(false);
    };

    const chooseFromGallery = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const image = await Camera.getPhoto({
                    quality: 80,
                    width: 1200,
                    allowEditing: false,
                    resultType: CameraResultType.Uri,
                    source: CameraSource.Prompt,
                });
                if (image.webPath) {
                    setImageToCrop(image.webPath);
                    setIsCropperOpen(true);
                }
            } catch (error) {
                console.log('Capacitor Gallery action cancelled or failed:', error);
            }
        } else {
            galleryInputRef.current?.click();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (qualityRating === 0) {
            setError('Please provide a pint quality rating.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Check for previous checkins within 12 hours
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
            const { data: recentCheckins, error: fetchError } = await supabase
                .from('pub_checkins')
                .select('id')
                .eq('pub_id', pub.id)
                .eq('user_id', userProfile.id)
                .gte('created_at', twelveHoursAgo)
                .limit(1);
                
            if (fetchError) throw fetchError;
            
            if (recentCheckins && recentCheckins.length > 0) {
                setError('You can only check into the same pub once every 12 hours.');
                return;
            }

            let imageUrl = null;
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('pint-images').upload(fileName, imageFile, { upsert: true });
                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}.`);
                imageUrl = supabase.storage.from('pint-images').getPublicUrl(fileName).data.publicUrl;
            }

            const checkinData = {
                pub_id: pub.id,
                user_id: userProfile.id,
                quality_rating: qualityRating,
                price: price ? parseFloat(price) : null,
                has_guinness_zero: hasGuinnessZero,
                comment: comment.trim() || null,
                amount_drank: isNotFinished ? null : amountDrank,
                image_url: imageUrl,
            };

            const { data, error: insertError } = await supabase
                .from('pub_checkins')
                .insert([checkinData])
                .select()
                .single();

            if (insertError) throw insertError;

            // Attach user relation manually since .select() might not fetch it
            const populatedData = {
                ...data,
                user: {
                    id: userProfile.id,
                    username: userProfile.username,
                    avatar_id: userProfile.avatar_id,
                    level: userProfile.level,
                    is_banned: userProfile.is_banned,
                    is_developer: userProfile.is_developer,
                    is_stoutly_legend: userProfile.is_stoutly_legend
                },
                pub: {
                    id: pub.id,
                    name: pub.name,
                    address: pub.address,
                    lat: pub.lat,
                    lng: pub.lng,
                    country_code: pub.country_code,
                    country_name: pub.country_name
                }
            };

            onSuccess(populatedData);
        } catch (err) {
            console.error("Check-in error:", err);
            setError("Failed to check in. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const qualityLabels = [
        "1 - Poor",
        "2 - Below Average",
        "3 - Average",
        "4 - Very Good",
        "5 - Exceptional"
    ];

    return (
        <>
            <div 
                className="fixed inset-0 bg-white sm:bg-black/60 dark:bg-gray-900 sm:dark:bg-black/60 z-[1200] flex sm:items-center justify-center p-0 sm:p-4 animate-modal-fade-in"
                onClick={onClose}
            >
                <div 
                    className="bg-white dark:bg-gray-900 sm:dark:bg-gray-800 w-full sm:max-w-md shadow-xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        animation: 'slideUp 0.3s ease-out forwards'
                    }}
                >
                    <style>{`
                        @keyframes slideUp {
                            from { transform: translateY(100%); }
                            to { transform: translateY(0); }
                        }
                    `}</style>
                <div className="flex-shrink-0 flex items-center p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-6">
                    <button 
                        onClick={onClose}
                        className="sm:hidden mr-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 cursor-pointer"
                        aria-label="Back"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="flex-grow flex flex-col items-center sm:items-start text-center sm:text-left">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                            <i className="fas fa-location-dot text-amber-500"></i>
                            <span>Check In</span>
                        </h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">{pub.name}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="overflow-y-auto p-4 sm:p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-4 rounded text-red-700 dark:text-red-400">
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <form id="checkin-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Pint Quality */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            {initialQuality && isQualitySame === null ? (
                                <div>
                                    <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                        <i className="fas fa-star text-amber-500 mr-2"></i>
                                        Is the quality still a {initialQuality}?
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsQualitySame(true)}
                                            className="py-2.5 rounded-lg font-medium transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 shadow-sm flex justify-center items-center gap-2"
                                        >
                                            <i className="fas fa-check text-green-500"></i> Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsQualitySame(false)}
                                            className="py-2.5 rounded-lg font-medium transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 shadow-sm flex justify-center items-center gap-2"
                                        >
                                            <i className="fas fa-times text-red-500"></i> No
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                        <i className="fas fa-star text-amber-500 mr-2"></i>
                                        Pint Quality
                                    </label>
                                    <div className="w-full flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <StarRating
                                            rating={qualityRating}
                                            onRatingChange={setQualityRating}
                                            interactive={true}
                                            name="quality"
                                            labels={qualityLabels}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Price */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            {initialPrice && isPriceSame === null ? (
                                <div>
                                    <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                        <span className="text-emerald-500 font-bold mr-2">{currencyInfo.symbol}</span>
                                        Is the price still {currencyInfo.symbol}{Number(initialPrice).toFixed(2)}? <span className="text-gray-400 font-normal ml-1"> (Optional)</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsPriceSame(true)}
                                            className="py-2.5 rounded-lg font-medium transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 shadow-sm flex justify-center items-center gap-2"
                                        >
                                            <i className="fas fa-check text-green-500"></i> Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPriceSame(false);
                                                setPrice(''); // Clear it so they can type a new one easily
                                            }}
                                            className="py-2.5 rounded-lg font-medium transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 shadow-sm flex justify-center items-center gap-2"
                                        >
                                            <i className="fas fa-times text-red-500"></i> No
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                        <span className="text-emerald-500 font-bold mr-2">{currencyInfo.symbol}</span>
                                        Price of a Pint <span className="text-gray-400 font-normal ml-1"> (Optional)</span>
                                    </label>
                                    <div className="relative shadow-sm rounded-lg">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">
                                            {currencyInfo.symbol}
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            value={price}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setPrice(val);
                                                }
                                            }}
                                            placeholder="5.50"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Guinness Zero */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                <i className="fas fa-beer text-amber-600 mr-2"></i>
                                Do they serve Guinness 0.0?
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setHasGuinnessZero(true)}
                                    className={`py-2 rounded-lg font-medium transition-all shadow-sm flex justify-center items-center gap-2 ${hasGuinnessZero === true ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                >
                                    <i className="fas fa-check"></i> Yes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHasGuinnessZero(false)}
                                    className={`py-2 rounded-lg font-medium transition-all shadow-sm flex justify-center items-center gap-2 ${hasGuinnessZero === false ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                >
                                    <i className="fas fa-times"></i> No
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHasGuinnessZero(null)}
                                    className={`py-2 rounded-lg font-medium transition-all shadow-sm flex justify-center items-center gap-2 ${hasGuinnessZero === null ? 'bg-amber-100 dark:bg-gray-600 text-amber-800 dark:text-white border-2 border-amber-500' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                >
                                    <i className="fas fa-question"></i> Not sure
                                </button>
                            </div>
                        </div>

                        {/* Photo Pickers */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                <i className="fas fa-camera text-blue-500 mr-2"></i>
                                Add a Photo <span className="text-gray-400 font-normal ml-1"> (Optional)</span>
                            </label>
                            {imagePreview ? (
                                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <img src={imagePreview} alt="Pint checkin preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors"
                                        aria-label="Remove image"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={chooseFromGallery}
                                        className="w-full aspect-[4/1] cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <i className="fas fa-camera text-2xl mb-2 text-amber-500"></i>
                                        <span className="font-semibold text-center text-sm px-2 mt-1">Take or Choose Photo</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={galleryInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Comment */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <label className="flex text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 items-center">
                                <i className="fas fa-comment text-purple-500 mr-2"></i>
                                Add a note <span className="text-gray-400 font-normal ml-1"> (Optional)</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="How is the atmosphere?"
                                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-sm rounded-lg py-3 px-4 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none h-24"
                            />
                        </div>

                        {/* Pints Consumed */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">
                                How many pints consumed on this visit?
                            </label>
                            
                            <div className="flex justify-center mb-4">
                                <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-400 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isNotFinished}
                                        onChange={(e) => setIsNotFinished(e.target.checked)}
                                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">I'm not finished yet</span>
                                </label>
                            </div>

                            {!isNotFinished && (
                                <div className="flex flex-col items-center justify-center py-2 animate-fade-in">
                                    <PintCounter 
                                        amount={amountDrank} 
                                        onChange={setAmountDrank} 
                                        maxAmount={16} 
                                    />
                                    <p className="text-xs text-center text-gray-500 mt-4 max-w-xs">
                                        If you're not finished, you can add the number of pints you drank up to 6 hours after checking in.
                                    </p>
                                </div>
                            )}
                            {isNotFinished && (
                                <p className="text-sm text-center text-amber-600 dark:text-amber-500 mt-2 px-4 animate-fade-in">
                                    You can update the number of pints you drank from the home feed or your profile up to 6 hours after checking in.
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex-shrink-0 p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                    <button
                        form="checkin-form"
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
                    >
                        {isLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>Checking in...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check-circle"></i>
                                <span>Complete Check-in</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
        {isCropperOpen && imageToCrop && (
            <ImageCropper 
                    imageSrc={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onClose={() => {
                        setIsCropperOpen(false);
                        setImageToCrop(null);
                    }}
                />
            )}
        </>
    );
};

export default CheckInModal;