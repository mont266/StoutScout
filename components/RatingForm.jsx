import React, { useState, useEffect, useMemo, useRef } from 'react';
import StarRating from './StarRating.jsx';
import ImageCropper from './ImageCropper.jsx';
import { getStarRatingFromPrice } from '../utils.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import useIsDesktop from '../hooks/useIsDesktop.js';

const ImageSourceChooser = ({ isOpen, onClose, onSelectCamera, onSelectGallery }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-[1300] flex items-end" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 animate-fade-in-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Add a Photo</h3>
                <ul className="space-y-2">
                    <li>
                        <button onClick={onSelectCamera} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3">
                            <i className="fas fa-camera w-6 text-center text-gray-500"></i>
                            <span>Take Photo</span>
                        </button>
                    </li>
                    <li>
                        <button onClick={onSelectGallery} className="w-full text-left p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3">
                            <i className="fas fa-images w-6 text-center text-gray-500"></i>
                            <span>Choose from Gallery</span>
                        </button>
                    </li>
                </ul>
                <button onClick={onClose} className="w-full mt-4 bg-gray-200 dark:bg-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                <div className="pb-safe"></div>
            </div>
        </div>
    );
};

const RatingForm = ({ onSubmit, existingRating, currencyInfo = {}, existingImageUrl, isSubmitting, existingIsPrivate, userZeroVote, isLondon = false }) => {
  const [price, setPrice] = useState(0);
  const [quality, setQuality] = useState(0);
  const [priceInput, setPriceInput] = useState('');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [guinnessZeroStatus, setGuinnessZeroStatus] = useState('unknown'); // 'confirm', 'deny', 'unknown'
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageWasRemoved, setImageWasRemoved] = useState(false);
  
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const [validationError, setValidationError] = useState(null);
  const [showImageSourceChooser, setShowImageSourceChooser] = useState(false);
  const isDesktop = useIsDesktop();

  const { symbol: currencySymbol = '£', examplePrice = '5.70', tiers } = currencyInfo;

  // Dynamically create price labels based on the currency symbol and tiers
  const priceLabels = useMemo(() => {
    const thresholds = isLondon ? [6.00, 6.75, 7.50, 8.50] : tiers;
    if (!thresholds) return [];

    const format = (val) => val >= 100 ? val.toFixed(0) : val.toFixed(2);
    
    return [
        `Very Expensive\n(e.g., > ${currencySymbol}${format(thresholds[3])})`,
        `Expensive\n(e.g., ${currencySymbol}${format(thresholds[2])} - ${currencySymbol}${format(thresholds[3])})`,
        `Average\n(e.g., ${currencySymbol}${format(thresholds[1])} - ${currencySymbol}${format(thresholds[2]-0.01)})`,
        `Cheap\n(e.g., ${currencySymbol}${format(thresholds[0])} - ${currencySymbol}${format(thresholds[1]-0.01)})`,
        `Very Cheap\n(e.g., < ${currencySymbol}${format(thresholds[0])})`
    ];
  }, [currencySymbol, isLondon, tiers]);

  useEffect(() => {
    // Pre-fill the form if an existing rating is provided
    setPrice(existingRating?.price || 0);
    setQuality(existingRating?.quality || 0);
    setPriceInput(existingRating?.exact_price?.toString() || '');
    setMessage(existingRating?.message || '');
    setIsPrivate(existingIsPrivate || false);
    setGuinnessZeroStatus('unknown'); // Always reset this, as it's a one-time report per rating submission
    setImagePreview(existingImageUrl || null);
    setImageFile(null);
    setImageWasRemoved(false);
    setImageToCrop(null);
    setIsCropperOpen(false);
    setValidationError(null); // Reset validation error on prop change
  }, [existingRating, existingImageUrl, existingIsPrivate]);

  // Clear validation error once the form becomes valid
  useEffect(() => {
    if (price > 0 && quality > 0) {
        setValidationError(null);
    }
  }, [price, quality]);

  const handlePriceInputChange = (e) => {
    const newPrice = e.target.value;
    setPriceInput(newPrice);
    setPrice(getStarRatingFromPrice(newPrice, isLondon, tiers));
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
     // Reset both inputs to allow re-selecting the same file
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
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

  const handleAddPhotoClick = async () => {
    if (isDesktop) {
        galleryInputRef.current?.click();
        return;
    }

    if (Capacitor.isNativePlatform()) {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Prompt, // Ask user to choose between Camera and Gallery
                saveToGallery: true,
            });

            if (image.webPath) {
                setImageToCrop(image.webPath);
                setIsCropperOpen(true);
            }
        } catch (error) {
            // This error can happen if the user cancels the camera/gallery selection.
            // We can safely ignore it.
            console.log('Capacitor Camera action cancelled or failed:', error);
        }
    } else {
        // For web browsers, show our custom chooser
        setShowImageSourceChooser(true);
    }
  };

  const buttonText = existingRating ? 'Update Rating' : 'Submit Rating';
  const isFormInvalid = price === 0 || quality === 0;

  const handleSubmit = () => {
    if (price > 0 && quality > 0) {
      setValidationError(null); // Clear error on successful submit
      onSubmit({ price, quality, exact_price: parseFloat(priceInput) || null, message, imageFile, imageWasRemoved, is_private: isPrivate, guinnessZeroStatus });
      // Don't reset form on update, but do on initial submit
      if (!existingRating) {
        setPrice(0);
        setQuality(0);
        setPriceInput('');
        setMessage('');
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
    <ImageSourceChooser 
        isOpen={showImageSourceChooser}
        onClose={() => setShowImageSourceChooser(false)}
        onSelectCamera={() => {
            cameraInputRef.current?.click();
            setShowImageSourceChooser(false);
        }}
        onSelectGallery={() => {
            galleryInputRef.current?.click();
            setShowImageSourceChooser(false);
        }}
    />
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
    <form className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-4">
      <fieldset>
        <legend className="block text-gray-700 dark:text-gray-300 mb-2">Price Rating: (Higher is cheaper)</legend>
        <StarRating
          name="price-rating"
          rating={price}
          onRatingChange={handlePriceStarChange}
          interactive
          color="text-green-400"
          labels={priceLabels}
        />
      </fieldset>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">OR</div>

      <div>
        <label htmlFor="price-input" className="block text-gray-700 dark:text-gray-300 mb-2">Enter Exact Pint Price (Optional)</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">{currencySymbol}</span>
          <input
            id="price-input"
            type="number"
            step="0.01"
            min="0"
            value={priceInput}
            onChange={handlePriceInputChange}
            placeholder={`e.g., ${examplePrice}`}
            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <fieldset className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <legend className="block text-gray-700 dark:text-gray-300 mb-2">Quality Rating:</legend>
        <StarRating name="quality-rating" rating={quality} onRatingChange={setQuality} interactive color="text-amber-400" />
      </fieldset>

       <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <label htmlFor="message-input" className="block text-gray-700 dark:text-gray-300 mb-2">Add a message (Optional)</label>
        <textarea
            id="message-input"
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How was the pint? e.g., 'Great atmosphere, but a bit warm...'"
            maxLength="280"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <p className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">{message.length} / 280</p>
      </div>
      
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">Does this pub sell Guinness 0.0?</label>
          <div className="flex rounded-lg bg-gray-200 dark:bg-gray-700/50 p-1 space-x-1">
              <button type="button" onClick={() => setGuinnessZeroStatus('confirm')} className={`w-1/3 py-2 text-sm rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${guinnessZeroStatus === 'confirm' ? 'bg-green-500 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                  <span>Yes</span>
              </button>
              <button type="button" onClick={() => setGuinnessZeroStatus('deny')} className={`w-1/3 py-2 text-sm rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${guinnessZeroStatus === 'deny' ? 'bg-red-500 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                   <span>No</span>
              </button>
              <button type="button" onClick={() => setGuinnessZeroStatus('unknown')} className={`w-1/3 py-2 text-sm rounded-md font-bold transition-colors flex items-center justify-center space-x-2 ${guinnessZeroStatus === 'unknown' ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                   <span>Not Sure</span>
              </button>
          </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">Add a Photo (Optional)</label>
          {imagePreview ? (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                  <img src={imagePreview} alt="Pint preview" className="w-full h-full object-cover" />
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
              <>
                <button
                    type="button"
                    onClick={handleAddPhotoClick}
                    className="w-full aspect-square cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <i className="fas fa-camera text-3xl mb-2"></i>
                    <span className="font-semibold">{isDesktop ? 'Choose from Files...' : 'Add Photo of Your Pint'}</span>
                </button>
                <input
                    type="file"
                    ref={cameraInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                />
                <input
                    type="file"
                    ref={galleryInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                />
              </>
          )}
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <label htmlFor="is-private-toggle" className="flex items-center justify-between cursor-pointer p-1">
          <span className="flex flex-col">
              <span className="font-medium text-gray-700 dark:text-gray-300">Keep this rating private</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Private ratings won't appear on community feeds.</span>
          </span>
          <div className="relative">
            <input
              id="is-private-toggle"
              type="checkbox"
              className="sr-only peer"
              checked={isPrivate}
              onChange={() => setIsPrivate(p => !p)}
            />
            <div className="block w-14 h-8 rounded-full transition-colors bg-gray-300 peer-checked:bg-green-500 dark:bg-gray-600"></div>
            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
          </div>
        </label>
      </div>

      <div>
        <p className="text-xs text-center text-gray-700 dark:text-yellow-200 italic mb-3 p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800/60">
          How was the pint of Guinness? Honest ratings help keep Stoutly accurate for everyone.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          className={`w-full font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center ${
            (isFormInvalid || isSubmitting) 
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
              : 'bg-amber-500 text-black hover:bg-amber-400'
          }`}
        >
          {isSubmitting ? (
              <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                  <span>{existingRating ? 'Updating...' : 'Submitting...'}</span>
              </>
          ) : (
              buttonText
          )}
        </button>
        {validationError && (
            <p className="text-red-500 text-sm text-center mt-2 animate-fade-in-down" role="alert">
                {validationError}
            </p>
        )}
      </div>
    </form>
    </>
  );
};

export default RatingForm;