import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { formatTimeAgo } from '../utils.js';
import Avatar from './Avatar.jsx';
import ImageModal from './ImageModal.jsx';
import { trackEvent } from '../analytics.js';

const PAGE_SIZE = 12;

const ImageGallery = ({ totalImages, onBack, onViewProfile }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [imageToView, setImageToView] = useState(null);

    const totalPages = Math.ceil(totalImages / PAGE_SIZE);

    const fetchImages = useCallback(async (pageNum) => {
        setLoading(true);
        setError(null);
        trackEvent('view_image_gallery_page', { page: pageNum });

        try {
            const { data, error } = await supabase.rpc('get_all_images', {
                page_number: pageNum,
                page_size: PAGE_SIZE,
            });

            if (error) throw error;
            setImages(data || []);

        } catch (err) {
            console.error("Error fetching images:", err);
            setError(err.message || 'Could not load images. Ensure the database function is deployed correctly.');
            setImages([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchImages(page);
    }, [page, fetchImages]);

    const handleNextPage = () => {
        if (page < totalPages) {
            setPage(p => p + 1);
        }
    };

    const handlePrevPage = () => {
        if (page > 1) {
            setPage(p => p - 1);
        }
    };
    
    const handleViewImage = (image) => {
        const ratingForModal = {
            image_url: image.image_url,
            user: { username: image.uploader_username }
        };
        setImageToView(ratingForModal);
    }

    const renderGrid = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
                <div key={image.rating_id} className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <button onClick={() => handleViewImage(image)} className="w-full aspect-square block">
                        <img src={image.image_url} alt={`Pint at ${image.pub_name}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <i className="fas fa-search-plus text-white text-3xl"></i>
                        </div>
                    </button>
                    <div className="p-3 text-sm">
                        <p className="font-semibold text-gray-800 dark:text-white truncate" title={image.pub_name}>{image.pub_name || 'Unknown Pub'}</p>
                         <button 
                            onClick={() => onViewProfile(image.uploader_id, 'image_gallery')}
                            className="text-amber-600 dark:text-amber-400 hover:underline truncate"
                            title={`View profile of ${image.uploader_username}`}
                        >
                            by {image.uploader_username}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeAgo(new Date(image.created_at).getTime())}</p>
                    </div>
                </div>
            ))}
        </div>
    );
    
    const renderPagination = () => (
        <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-900">
            <button 
                onClick={handlePrevPage} 
                disabled={page <= 1}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
                <i className="fas fa-chevron-left mr-2"></i>
                Previous
            </button>
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages || 1}
            </span>
            <button 
                onClick={handleNextPage} 
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
                Next
                <i className="fas fa-chevron-right ml-2"></i>
            </button>
        </div>
    );

    return (
        <>
            {imageToView && (
                <ImageModal
                    rating={imageToView}
                    onClose={() => setImageToView(null)}
                    canReport={false} // Reporting not needed in this dev view
                    canAdminRemove={false} // Removal is handled elsewhere
                />
            )}
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold">Back to Stats</span>
                    </button>
                </div>
                <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">All Uploaded Images</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A chronological list of all pint photos submitted by the community. ({totalImages.toLocaleString()} total)</p>
                </header>
                <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                            <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                            <p className="font-semibold">Error Loading Images</p>
                            <p className="text-sm">{error}</p>
                            <button onClick={() => fetchImages(page)} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                        </div>
                    ) : images.length > 0 ? (
                        renderGrid()
                    ) : (
                        <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <i className="fas fa-image fa-2x mb-2"></i>
                            <p>No images have been uploaded yet.</p>
                        </div>
                    )}
                </main>
                {totalPages > 1 && renderPagination()}
            </div>
        </>
    );
};

export default ImageGallery;