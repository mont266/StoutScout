import React, { useState, useEffect, useMemo, useRef } from 'react';
import StarRating from './StarRating.jsx';
import ImageCropper from './ImageCropper.jsx';
import { getStarRatingFromPrice } from '../utils.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import useIsDesktop from '../hooks/useIsDesktop.js';

import PintCounter from './PintCounter.jsx';

const RatingForm = ({ onSubmit, existingRating, currencyInfo = {}, existingImageUrl, isSubmitting, existingIsPrivate, userZeroVote }) => {
  const [price, setPrice] = useState(0);
  const [quality, setQuality] = useState(0);
  const [priceInput, setPriceInput] = useState('');
  const [message, setMessage] = useState('');
  const [amountDrank, setAmountDrank] = useState(1);
  const [isNotFinished, setIsNotFinished] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [guinnessZeroStatus, setGuinnessZeroStatus] = useState('unknown'); // 'confirm', 'deny', 'unknown'
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageWasRemoved, setImageWasRemoved] = useState(false);
  
  const galleryInputRef = useRef(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const [validationError, setValidationError] = useState(null);
  const isDesktop = useIsDesktop();

  const { symbol: currencySymbol = '£', examplePrice = '5.70', tiers, isDynamic } = currencyInfo;

  // Dynamically create price labels based on the currency symbol and tiers
  const priceLabels = useMemo(() => {
    const thresholds = tiers;
    if (!thresholds) return [];

    const format = (val) => val >= 100 ? val.toFixed(0) : val.toFixed(2);
    
    return [
        `Very Expensive\n(e.g., > ${currencySymbol}${format(thresholds[3])})`,
        `Expensive\n(e.g., ${currencySymbol}${format(thresholds[2])} - ${currencySymbol}${format(thresholds[3])})`,
        `Average\n(e.g., ${currencySymbol}${format(thresholds[1])} - ${currencySymbol}${format(thresholds[2]-0.01)})`,
        `Cheap\n(e.g., ${currencySymbol}${format(thresholds[0])} - ${currencySymbol}${format(thresholds[1]-0.01)})`,
        `Very Cheap\n(e.g., < ${currencySymbol}${format(thresholds[0])})`
    ];
  }, [currencySymbol, tiers, isDynamic]);

  // This effect resets the main form fields when the rating being edited changes.
  useEffect(() => {
    setPrice(existingRating?.price || 0);
    setQuality(existingRating?.quality || 0);
    setPriceInput(existingRating?.exact_price?.toString() || '');
    setMessage(existingRating?.message || '');
    setAmountDrank(existingRating?.amount_drank || 1);
    setIsNotFinished(existingRating ? existingRating.amount_drank === null : false);
    setIsPrivate(existingIsPrivate || false);
    setGuinnessZeroStatus('unknown');
    setValidationError(null);
  }, [existingRating, existingIsPrivate]);

  // This effect specifically handles resetting the image state when the source image changes.
  // This prevents the user's new image selection from being overwritten on unrelated re-renders.
  useEffect(() => {
    setImagePreview(existingImageUrl || null);
    setImageFile(null);
    setImageWasRemoved(false);
    setImageToCrop(null);
    setIsCropperOpen(false);
  }, [existingImageUrl]);


  // Clear validation error once the form becomes valid
  useEffect(() => {
    if (price > 0 && quality > 0) {
        setValidationError(null);
    }
  }, [price, quality]);

  const handlePriceInputChange = (e) => {
    const newPrice = e.target.value;
    setPriceInput(newPrice);
    setPrice(getStarRatingFromPrice(newPrice, tiers));
  };
  
  const handlePriceStarChange = (newStarRating) => {
    setPrice(newStarRating);
    setPriceInput(''); // Clear text input when stars are manually set
  };

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
    // Reset the input value to allow re-selecting the same file.
    e.target.value = null;
  };

  const handleCropComplete = (croppedFile) => {
    if (croppedFile) {
        setImageFile(croppedFile);
        setImagePreview(URL.createObjectURL(croppedFile));
        setImageWasRemoved(false);
    }
    setIsCropperOpen(false);
    setImageToCrop(null);
  }

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageWasRemoved(true);
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

  const buttonText = existingRating ? 'Update Rating' : 'Submit Rating';
  const isFormInvalid = price === 0 || quality === 0;

  const calculatedXP = useMemo(() => {
    let xp = 50;
    if (priceInput && parseFloat(priceInput) > 0) xp += 10;
    if (message && message.trim().length > 0) xp += 20;
    if (imagePreview) xp += 20;
    return xp;
  }, [priceInput, message, imagePreview]);

  const isOlderThan6Hours = existingRating?.created_at ? (Date.now() - new Date(existingRating.created_at).getTime()) > 6 * 60 * 60 * 1000 : false;

  const handleSubmit = () => {
    if (price > 0 && quality > 0) {
      setValidationError(null); // Clear error on successful submit
      onSubmit({ price, quality, exact_price: parseFloat(priceInput) || null, message, amount_drank: isOlderThan6Hours ? existingRating.amount_drank : (isNotFinished ? null : amountDrank), imageFile, imageWasRemoved, is_private: isPrivate, guinnessZeroStatus });
      // Don't reset form on update, but do on initial submit

      if (!existingRating) {
        setPrice(0);
        setQuality(0);
        setPriceInput('');
        setMessage('');
        setAmountDrank(1);
        setIsPrivate(false);
        setGuinnessZeroStatus('unknown');
        handleRemoveImage();
      }
    } else {
        let message = '';
        if (price === 0 && quality === 0) {
            message = "Please provide a rating for both Price and Quality.";
        } else if (price === 0) {
            message = "Please provide a Price rating.";
        } else if (quality === 0) {
            message = "Please provide a Quality rating.";
        }
        setValidationError(message);
    }
  };


  return (
    <>
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
    <form className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-xl space-y-5">
      {/* 1. Quality Rating */}
      <fieldset>
        <legend className="block text-gray-700 dark:text-gray-300 mb-2 font-bold">1. Quality Rating</legend>
        <StarRating name="quality-rating" rating={quality} onRatingChange={setQuality} interactive color="text-amber-400" />
      </fieldset>

      {/* 2. Price Section */}
      <div className="pt-5 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <fieldset>
            <legend className="block text-gray-700 dark:text-gray-300 mb-2 font-bold">2. Price Rating (Higher is cheaper)</legend>
            <StarRating
              name="price-rating"
              rating={price}
              onRatingChange={handlePriceStarChange}
              interactive
              color="text-green-400"
              labels={priceLabels}
            />
          </fieldset>
    
          <div className="flex items-center py-1">
            <div className="flex-grow border-t border-dashed border-gray-300 dark:border-gray-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-sm font-bold uppercase tracking-wider">Or</span>
            <div className="flex-grow border-t border-dashed border-gray-300 dark:border-gray-600"></div>
          </div>
    
          <div>
            <label htmlFor="price-input" className="flex items-center text-gray-700 dark:text-gray-300 mb-2 font-medium">
                <span>Enter Exact Pint Price (Optional)</span>
                <span className={`ml-2 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase rounded-full ${priceInput && parseFloat(priceInput) > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>10xp</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">{currencySymbol}</span>
              <input
                id="price-input"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        handlePriceInputChange({ target: { value: val } });
                    }
                }}
                placeholder={`e.g., ${examplePrice}`}
                className="w-full pl-7 pr-3 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow shadow-sm"
              />
            </div>
          </div>
      </div>

      {/* 3. Amount Drank */}
      <div className={`pt-5 border-t border-gray-200 dark:border-gray-700 ${isOlderThan6Hours ? 'opacity-60 pointer-events-none' : ''}`}>
        <label className="block text-gray-700 dark:text-gray-300 mb-4 font-bold text-center">
            How many pints consumed on this visit?
        </label>
        
        <div className="flex justify-center mb-4">
            <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-400 transition-colors">
                <input
                    type="checkbox"
                    checked={isNotFinished}
                    onChange={(e) => setIsNotFinished(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    disabled={isOlderThan6Hours}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">I'm not finished yet</span>
            </label>
        </div>

        {!isNotFinished && (
            <div className="flex flex-col items-center justify-center mb-2 animate-fade-in">
                <PintCounter 
                    amount={amountDrank} 
                    onChange={setAmountDrank} 
                    maxAmount={16} 
                    disabled={isOlderThan6Hours}
                />
                <p className="text-xs text-center text-gray-500 mt-4 max-w-xs">
                    {isOlderThan6Hours ? "You cannot modify the number of drinks after 6 hours." : "If you're not finished, you can add the number of drinks you had up to 6 hours after submitting your rating."}
                </p>
            </div>
        )}
        {isNotFinished && (
            <p className="text-sm text-center text-amber-600 dark:text-amber-500 mt-2 px-4 animate-fade-in">
                {isOlderThan6Hours ? "You cannot modify the number of drinks after 6 hours." : "You can update the number of drinks you had from the home feed or your profile up to 6 hours after submitting."}
            </p>
        )}
      </div>
      
      {/* 4. Guinness Zero Status */}
      <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-gray-700 dark:text-gray-300 mb-3 font-bold">Does this pub sell Guinness 0.0?</label>
          <div className="flex rounded-lg bg-gray-200 dark:bg-gray-700/50 p-1 space-x-1">
              <button type="button" onClick={() => setGuinnessZeroStatus('confirm')} className={`w-1/3 py-2.5 text-sm rounded-md font-bold transition-all flex items-center justify-center space-x-2 ${guinnessZeroStatus === 'confirm' ? 'bg-green-500 text-white shadow-sm scale-[1.02]' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'}`}>
                  <span>Yes</span>
              </button>
              <button type="button" onClick={() => setGuinnessZeroStatus('deny')} className={`w-1/3 py-2.5 text-sm rounded-md font-bold transition-all flex items-center justify-center space-x-2 ${guinnessZeroStatus === 'deny' ? 'bg-red-500 text-white shadow-sm scale-[1.02]' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'}`}>
                   <span>No</span>
              </button>
              <button type="button" onClick={() => setGuinnessZeroStatus('unknown')} className={`w-1/3 py-2.5 text-sm rounded-md font-bold transition-all flex items-center justify-center space-x-2 ${guinnessZeroStatus === 'unknown' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm scale-[1.02] border border-gray-300 dark:border-gray-600' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'}`}>
                   <span>Not Sure</span>
              </button>
          </div>
      </div>

      {/* 5. Message */}
       <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
        <label htmlFor="message-input" className="flex items-center text-gray-700 dark:text-gray-300 mb-2 font-bold">
            <span>Add a message (Optional)</span>
            <span className={`ml-2 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase rounded-full ${message && message.trim().length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>20xp</span>
        </label>
        <textarea
            id="message-input"
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How was the pint? e.g., 'Great atmosphere, but a bit warm...'"
            maxLength="280"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow shadow-sm resize-none"
        />
        <p className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">{message.length} / 280</p>
      </div>

      {/* 6. Photo */}
      <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center text-gray-700 dark:text-gray-300 mb-3 font-bold">
            <span>Add a Photo (Optional)</span>
            <span className={`ml-2 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase rounded-full ${imagePreview ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>20xp</span>
          </label>
          {imagePreview ? (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                  <img src={imagePreview} alt="Pint preview" className="w-full h-full object-cover" />
                  <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/90 transition-colors backdrop-blur-sm"
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
                    className="w-full aspect-[3/1] cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all bg-gray-50 dark:bg-gray-800/50"
                >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                        <i className="fas fa-camera text-xl text-amber-500"></i>
                    </div>
                    <span className="font-semibold text-center text-sm px-2 text-gray-600 dark:text-gray-300">Take or Choose Photo</span>
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

      {/* 7. Private Toggle */}
      <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
        <label htmlFor="is-private-toggle" className="flex items-center justify-between cursor-pointer p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <span className="flex flex-col">
              <span className="font-bold text-gray-800 dark:text-gray-200">Keep this rating private</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Private ratings won't appear on community feeds.</span>
          </span>
          <div className="relative ml-4">
            <input
              id="is-private-toggle"
              type="checkbox"
              className="sr-only peer"
              checked={isPrivate}
              onChange={() => setIsPrivate(p => !p)}
            />
            <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 peer-checked:bg-amber-500 dark:bg-gray-600"></div>
            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6 shadow-sm"></div>
          </div>
        </label>
      </div>

      {/* 8. Submit Button */}
      <div className="pt-4">
        {!existingRating && (
          <p className="text-sm text-center text-amber-700 dark:text-amber-400 font-bold mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 shadow-sm flex items-center justify-center space-x-2">
             <i className="fas fa-star text-amber-500" />
             <span>This rating will get you {calculatedXP}xp</span>
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className={`w-full font-extrabold py-4 px-4 rounded-xl transition-all flex items-center justify-center text-lg shadow-sm ${
            (isFormInvalid || isSubmitting) 
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed shadow-none' 
              : 'bg-amber-500 text-gray-900 hover:bg-amber-400 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm'
          }`}
        >
          {isSubmitting ? (
              <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-900 mr-3"></div>
                  <span>{existingRating ? 'Updating...' : 'Submitting...'}</span>
              </>
          ) : (
              buttonText
          )}
        </button>
        {validationError && (
            <p className="text-red-500 text-sm text-center mt-3 font-medium animate-fade-in-down" role="alert">
                <i className="fas fa-exclamation-circle mr-1"></i> {validationError}
            </p>
        )}
      </div>
    </form>
    </>
  );
};

export default RatingForm;