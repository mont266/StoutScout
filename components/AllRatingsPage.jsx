import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { formatTimeAgo } from '../utils.js';
import Avatar from './Avatar.jsx';
import StarRating from './StarRating.jsx';
import ImageModal from './ImageModal.jsx';
import { trackEvent } from '../analytics.js';

const PAGE_SIZE = 15;

const AllRatingsPage = ({ totalRatings, onBack, onViewProfile }) => {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [imageToView, setImageToView] = useState(null);
    const loaderRef = useRef(null);

    const fetchRatings = useCallback(async (pageNum) => {
        setLoading(true);
        setError(null);
        if (pageNum === 1) {
            trackEvent('view_all_ratings');
        } else {
            trackEvent('load_more_all_ratings', { page: pageNum });
        }

        try {
            const from = (pageNum - 1) * PAGE_SIZE;
            const to = pageNum * PAGE_SIZE - 1;

            // Query the new 'all_ratings_view' instead of the old RPC
            const { data, error } = await supabase
                .from('all_ratings_view')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            
            const formattedData = data.map(r => ({
                ...r,
                // this is for the image modal
                user: { id: r.uploader_id, username: r.uploader_username }
            }));

            setRatings(prev => pageNum === 1 ? formattedData : [...prev, ...formattedData]);
            if (data.length < PAGE_SIZE) {
                setHasMore(false);
            }

        } catch (err) {
            console.error("Error fetching ratings:", err);
            setError(err.message || 'Could not load ratings. Ensure the database view is created correctly.');
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Initial fetch
    useEffect(() => {
        fetchRatings(1);
    }, [fetchRatings]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    setPage(prevPage => prevPage + 1);
                }
            },
            { threshold: 1.0 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [loading, hasMore]);

    // Fetch more data when page changes
    useEffect(() => {
        if (page > 1) {
            fetchRatings(page);
        }
    }, [page, fetchRatings]);


    const renderList = () => {
         if (ratings.length === 0 && !loading) {
            return (
                <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p>No ratings found.</p>
                </div>
            );
        }

        return (
            <ul className="space-y-4">
                {ratings.map(rating => {
                    return (
                        <li key={rating.rating_id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                            <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex-grow pr-4 min-w-0">
                                    <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{rating.pub_name || 'Unknown Pub'}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Rated by <button onClick={() => onViewProfile(rating.uploader_id, 'all_ratings_list')} className="font-semibold hover:underline text-amber-600 dark:text-amber-400">{rating.uploader_username}</button>
                                    </p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(new Date(rating.created_at).getTime())}</p>
                                </div>
                            </div>
                            <div className="flex space-x-4 items-start">
                                {rating.image_url && (
                                    <button onClick={() => setImageToView(rating)} className="flex-shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none transition">
                                        <img src={rating.image_url} alt="Pint of Guinness" className="w-24 h-24 object-cover" />
                                    </button>
                                )}
                                <div className="flex-grow space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">Price Rating:</span>
                                        <StarRating rating={rating.price} color="text-green-400" />
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">Quality Rating:</span>
                                        <StarRating rating={rating.quality} color="text-amber-400" />
                                    </div>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        )
    }


    return (
        <>
        {imageToView && (
            <ImageModal 
                rating={imageToView}
                onClose={() => setImageToView(null)}
                canReport={false}
                canAdminRemove={false}
            />
        )}
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {onBack && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                        <i className="fas fa-arrow-left"></i>
                        <span className="font-semibold">Back to Stats</span>
                    </button>
                </div>
            )}
             <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">All Ratings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A chronological feed of every rating submitted. ({totalRatings.toLocaleString()} total)</p>
            </header>
            <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6">
                {error && (
                    <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                        <p>{error}</p>
                        <button onClick={() => fetchRatings(1)} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                    </div>
                )}
                
                {renderList()}

                <div ref={loaderRef} className="h-10 text-center">
                    {loading && <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto mt-4"></div>}
                    {!loading && !hasMore && ratings.length > 0 && <p className="text-gray-500 mt-4">You've reached the end!</p>}
                </div>
            </main>
        </div>
        </>
    );
};

export default AllRatingsPage;