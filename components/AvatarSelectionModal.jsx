import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import { supabase } from '../supabase.js';
import ImageCropper from './ImageCropper.jsx';
import { getCroppedImg } from '../imageUtils.js';


// A curated list of good-looking, varied styles
const DICEBEAR_STYLES = [
  { id: 'adventurer', name: 'Adventurer' },
  { id: 'bottts', name: 'Robots' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: 'miniavs', name: 'Miniavs' },
  { id: 'lorelei', name: 'Fantasy' },
  { id: 'micah', name: 'Avatars' },
  { id: 'notionists', name: 'Notion Style' },
  { id: 'fun-emoji', name: 'Emoji' },
];

const AvatarSelectionModal = ({ userProfile, currentAvatarId, onSelect, onClose }) => {
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'upload'

  // Dicebear tab state
  const [dicebearStyle, setDicebearStyle] = useState(DICEBEAR_STYLES[0].id);
  const [dicebearSeed, setDicebearSeed] = useState(userProfile?.username || 'stoutly-user');
  
  // Upload tab state
  const fileInputRef = useRef(null);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [croppedImagePreview, setCroppedImagePreview] = useState(null);


  useEffect(() => {
    try {
      const parsed = JSON.parse(currentAvatarId);
      if (parsed) {
        if (parsed.type === 'dicebear') {
          setActiveTab('create');
          setDicebearStyle(parsed.style || DICEBEAR_STYLES[0].id);
          setDicebearSeed(parsed.seed || userProfile?.username || 'stoutly-user');
        } else if (parsed.type === 'uploaded' && parsed.url) {
          setActiveTab('upload');
          setCroppedImagePreview(parsed.url);
        }
      }
    } catch (e) {
      setDicebearSeed(userProfile?.username || 'stoutly-user');
    }
  }, [currentAvatarId, userProfile?.username]);
  
  const handleStyleChange = (e) => {
    const newStyle = e.target.value;
    setDicebearStyle(newStyle);
    trackEvent('customize_dicebear_avatar', { action: 'change_style', style: newStyle });
  }

  const handleRandomizeSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 12);
    setDicebearSeed(randomSeed);
    trackEvent('customize_dicebear_avatar', { action: 'randomize_seed' });
  }
  
  const handleFileChange = (e) => {
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
        setCroppedImageFile(croppedFile);
        setCroppedImagePreview(URL.createObjectURL(croppedFile));
    }
    setIsCropperOpen(false);
    setImageToCrop(null);
  }

  const handleRemoveImage = () => {
    setCroppedImageFile(null);
    setCroppedImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'create') {
        const dicebearAvatarData = {
          type: 'dicebear',
          style: dicebearStyle,
          seed: dicebearSeed,
        };
        onSelect(JSON.stringify(dicebearAvatarData));
      } else { // Upload tab
        if (croppedImageFile) {
          trackEvent('update_avatar', { type: 'uploaded' });
          // Delete old avatar if it was an uploaded one
          if (currentAvatarId) {
              try {
                  const parsedOld = JSON.parse(currentAvatarId);
                  if (parsedOld.type === 'uploaded' && parsedOld.url) {
                      const oldPath = new URL(parsedOld.url).pathname.split('/avatars/')[1];
                      if (oldPath) {
                          await supabase.storage.from('avatars').remove([oldPath.split('?')[0]]); // Remove query params from path
                      }
                  }
              } catch(e) { /* was not an uploaded avatar or failed to parse, ignore */ }
          }
          // Upload new avatar
          const fileExt = croppedImageFile.name.split('.').pop() || 'jpeg';
          const filePath = `${userProfile.id}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, croppedImageFile, { upsert: true });
          
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
          
          const finalUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
          const uploadedAvatarData = { type: 'uploaded', url: finalUrl };
          onSelect(JSON.stringify(uploadedAvatarData));

        } else if (!croppedImageFile && !croppedImagePreview) {
            // Image was removed by the user
            trackEvent('update_avatar', { type: 'removed' });
            if (currentAvatarId) {
                try {
                    const parsedOld = JSON.parse(currentAvatarId);
                    if (parsedOld.type === 'uploaded' && parsedOld.url) {
                        const oldPath = new URL(parsedOld.url).pathname.split('/avatars/')[1];
                        if (oldPath) {
                            await supabase.storage.from('avatars').remove([oldPath.split('?')[0]]);
                        }
                    }
                } catch(e) { /* ignore */ }
            }
            onSelect(null); // Save null to DB to use default avatar
        } else {
            // No change, just close
            onClose();
        }
      }
    } catch (error) {
      console.error('Avatar save failed:', error);
      alert(`Save failed: ${error.message}. Please check if the 'avatars' storage bucket is created and has the correct RLS policies.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getDicebearPreviewId = () => {
     const dicebearAvatarData = {
        type: 'dicebear',
        style: dicebearStyle,
        seed: dicebearSeed,
      };
      return JSON.stringify(dicebearAvatarData);
  }
  
  const TabButton = ({ tabId, label }) => (
     <button
        onClick={() => setActiveTab(tabId)}
        className={`w-1/2 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === tabId
            ? 'border-amber-500 text-amber-500'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-amber-500/50'
        }`}
    >
        {label}
    </button>
  );

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
    <div
      className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-select-title"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border-t-4 border-amber-400 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
              aria-label="Close avatar selection"
            >
              <i className="fas fa-times fa-lg"></i>
            </button>
            <h3 id="avatar-select-title" className="text-xl font-bold text-gray-900 dark:text-white text-center">
              Change Avatar
            </h3>
        </div>
        
        <div className="flex border-b border-gray-200 dark:border-gray-700">
            <TabButton tabId="create" label="Create Avatar" />
            <TabButton tabId="upload" label="Upload Avatar" />
        </div>

        <div className="p-6 overflow-y-auto">
            {activeTab === 'create' && (
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <div className="w-40 h-40">
                            <Avatar avatarId={getDicebearPreviewId()} className="w-full h-full" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="dicebear-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style</label>
                        <select
                            id="dicebear-style"
                            value={dicebearStyle}
                            onChange={handleStyleChange}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-no-repeat bg-right pr-8"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}
                        >
                            {DICEBEAR_STYLES.map(style => (
                            <option key={style.id} value={style.id}>{style.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="dicebear-seed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seed</label>
                        <div className="flex space-x-2">
                            <input
                                id="dicebear-seed"
                                type="text"
                                value={dicebearSeed}
                                onChange={(e) => setDicebearSeed(e.target.value)}
                                placeholder="Enter any text..."
                                className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button 
                                onClick={handleRandomizeSeed} 
                                className="flex-shrink-0 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold p-2 w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
                                title="Randomize Seed" aria-label="Randomize Seed"
                            >
                                <i className="fas fa-random fa-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'upload' && (
                <div className="space-y-4">
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400">Upload a square image for the best results.</p>
                    {croppedImagePreview ? (
                         <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden">
                            <img src={croppedImagePreview} alt="Avatar preview" className="w-full h-full object-cover" />
                            <button
                                type="button" onClick={handleRemoveImage}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 transition-colors"
                                aria-label="Remove image"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>
                    ) : (
                        <div className="w-40 h-40 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                             <i className="fas fa-user text-5xl text-gray-400 dark:text-gray-500"></i>
                        </div>
                    )}
                    <label className="w-full cursor-pointer bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2">
                        <i className="fas fa-upload"></i>
                        <span>Choose a Photo...</span>
                        <input
                            type="file" ref={fileInputRef} className="hidden"
                            accept="image/*" onChange={handleFileChange}
                        />
                    </label>
                </div>
            )}
        </div>

        <div className="p-4 flex flex-col sm:flex-row gap-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
            <button
                onClick={onClose}
                className="w-full sm:w-1/2 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={handleSave} disabled={isLoading}
                className="w-full sm:w-1/2 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center"
            >
                {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> : 'Save'}
            </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default AvatarSelectionModal;