import React, { useState, useEffect, useMemo, useRef } from 'react';
import StarRating from './StarRating.jsx';
import ImageCropper from './ImageCropper.jsx';

const getStarRatingFromPrice = (price) => {
    if (price === '' || isNaN(price)) return 0;
    const numericPrice = parseFloat(price);
    if (numericPrice < 4.50) return 5; // Very Cheap
    if (numericPrice <= 5.49) return 4; // Cheap
    if (numericPrice <= 5.99) return 3; // Average
    if (numericPrice <= 6.99) return 2; // Expensive
    return 1; // Very Expensive
};

const RatingForm = ({ onSubmit, existingRating, currencySymbol = '£', existingImageUrl, isSubmitting, existingIsPrivate, userZeroVote }) => {
  const [price, setPrice] = useState(0);
  const [quality, setQuality] = useState(0);
  const [priceInput, setPriceInput] = useState('');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [guinnessZeroStatus, setGuinnessZeroStatus] = useState('unknown'); // 'confirm', 'deny', 'unknown'
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageWasRemoved, setImageWasRemoved] = useState(false);
  const fileInputRef = useRef(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);


  // Dynamically create price labels based on the currency symbol
  const priceLabels = useMemo(() => [
    `Very Expensive\n(e.g., ${currencySymbol}7.00+)`,      // 1 star
    `Expensive\n(e.g., ${currencySymbol}6.00 - ${currencySymbol}6.99)`,   // 2 stars
    `Average\n(e.g., ${currencySymbol}5.50 - ${currencySymbol}5.99)`,     // 3 stars
    `Cheap\n(e.g., ${currencySymbol}4.50 - ${currencySymbol}5.49)`,       // 4 stars
    `Very Cheap\n(e.g., < ${currencySymbol}4.50)`          // 5 stars
  ], [currencySymbol]);

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
  }, [existingRating, existingImageUrl, existingIsPrivate]);

  const handlePriceInputChange = (e) => {
    const newPrice = e.target.value;
    setPriceInput(newPrice);
    setPrice(getStarRatingFromPrice(newPrice));
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
    // Reset file input so user can select the same file again if they wish
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (price > 0 && quality > 0) {
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
        alert("Please select a rating for both price and quality.");
    }
  };

  const buttonText = existingRating ? 'Update Rating' : 'Submit Rating';

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
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-4">
      <div>
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Price Rating: (Higher is cheaper)</label>
        <StarRating
          rating={price}
          onRatingChange={handlePriceStarChange}
          interactive
          color="text-green-400"
          labels={priceLabels}
        />
      </div>

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
            placeholder="e.g., 5.70"
            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Quality Rating:</label>
        <StarRating rating={quality} onRatingChange={setQuality} interactive color="text-amber-400" />
      </div>

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
              <label className="w-full aspect-square cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
                  <i className="fas fa-camera text-3xl mb-2"></i>
                  <span className="font-semibold">Add Photo of Your Pint</span>
                  <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                  />
              </label>
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
          type="submit"
          disabled={price === 0 || quality === 0 || isSubmitting}
          className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
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
      </div>
    </form>
    </>
  );
};

export default RatingForm;