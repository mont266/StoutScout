import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../imageUtils.js';

const ImageCropper = ({ imageSrc, onCropComplete, onClose }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((newCrop) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);
  
  const onComplete = useCallback((_, newCroppedAreaPixels) => {
    setCroppedAreaPixels(newCroppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
        const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
        if (croppedImageFile) {
            onCropComplete(croppedImageFile);
        }
    } catch (e) {
      console.error(e);
      alert('There was an error processing the image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div 
        className="fixed inset-0 bg-black/90 z-[2100] flex flex-col items-center justify-center p-4 animate-modal-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-image-title"
    >
      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col">
        <div className="flex-shrink-0 text-center p-4">
            <h2 id="crop-image-title" className="text-xl font-bold text-white">Frame Your Pint</h2>
            <p className="text-sm text-gray-300">Pan and zoom to get the perfect shot.</p>
        </div>
        
        <div className="relative flex-grow w-full h-auto">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1 / 1} // Square aspect ratio
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onComplete}
          />
        </div>

        <div className="flex-shrink-0 p-4 space-y-4">
            <div className="flex items-center space-x-4">
                <i className="fas fa-search-minus text-white"></i>
                <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <i className="fas fa-search-plus text-white"></i>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onClose} className="w-full sm:w-1/2 py-3 px-4 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition-colors">
                    Cancel
                </button>
                <button
                    onClick={handleSaveCrop}
                    disabled={isProcessing}
                    className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center"
                >
                    {isProcessing ? (
                        <>
                           <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                           <span>Processing...</span>
                        </>
                    ) : 'Save Crop'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(modalContent, modalRoot);
};

export default ImageCropper;
