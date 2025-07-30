import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import RatingCard from './RatingCard.jsx';

const PAGE_SIZE = 5;

const filterOptions = [
    { label: 'Newest', sortBy: 'created_at', timePeriod: 'all' },
    { label: 'Top Today', sortBy: 'likes', timePeriod: '1d' },
    { label: 'Top This Week', sortBy: 'likes', timePeriod: '7d' },
    { label: 'Top This Month', sortBy: 'likes', timePeriod: '1M' },
    { label: 'Top This Year', sortBy: 'likes', timePeriod: '1Y' },
    { label: 'Top All Time', sortBy: 'likes', timePeriod: 'all' },
];

const CommunityFeed = ({ onViewProfile, userLikes, onToggleLike, onLoginRequest, onViewImage, allRatings, onViewPub, filter, onFilterChange }) => {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const loaderRef = useRef(null);
    const filterMenuRef = useRef(null);

    const fetchRatings = useCallback(async (pageNum) => {
        setLoading(true);
        setError(null);
        if (pageNum === 1) trackEvent('view_community_feed', { filter });

        try {
            const { data, error: rpcError } = await supabase.rpc('get_community_feed', {
                page_number: pageNum,
                page_size: PAGE_SIZE,
                sort_by: filter.sortBy,
                time_period: filter.timePeriod,
            });

            if (rpcError) throw rpcError;

            const formattedData = data.map(r => ({
                id: r.rating_id, created_at: r.created_at, quality: r.quality, price: r.price,
                exact_price: r.exact_price, image_url: r.image_url, like_count: r.like_count,
                pub_id: r.pub_id,
                pub_name: r.pub_name, pub_address: r.pub_address,
                pub_lat: r.pub_lat,
                pub_lng: r.pub_lng,
                user: { id: r.uploader_id, username: r.uploader_username, avatar_id: r.uploader_avatar_id, level: r.uploader_level }
            }));
            
            setRatings(prev => pageNum === 1 ? formattedData : [...prev, ...formattedData]);
            if (data.length < PAGE_SIZE) setHasMore(false);

        } catch (err) {
            console.error("Error fetching community feed:", err);
            setError(err.message || 'Could not load the community feed.');
        } finally {
            setLoading(false);
        }
    }, [filter]);
    
    const handleRefresh = useCallback(() => {
        if (loading) return; // Prevent multiple refreshes
        trackEvent('refresh_feed', { feed_type: 'community' });
        setPage(1);
        setHasMore(true);
        fetchRatings(1);
    }, [fetchRatings, loading]);

    // Re-fetch from page 1 when the filter changes
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        setRatings([]); // Clear existing ratings to show loading state
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
            { threshold: 1.0, rootMargin: '0px 0px 200px 0px' } // Load 200px before it's visible
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [loading, hasMore]);

    // Fetch more data when page changes
    useEffect(() => {
        if (page > 1) fetchRatings(page);
    }, [page, fetchRatings]);
    
    // Close filter menu on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setIsFilterMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFilterSelect = (newFilter) => {
        onFilterChange(newFilter);
        setIsFilterMenuOpen(false);
    };

    const activeFilterLabel = filterOptions.find(opt => opt.sortBy === filter.sortBy && opt.timePeriod === filter.timePeriod)?.label || 'Newest';

    const renderContent = () => {
        if (loading && page === 1) {
            return (
                <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
                  <p className="mt-4">Finding the latest pints...</p>
                </div>
            );
        }

        if (error) {
             return (
                 <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg m-4">
                    <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>{error}</p>
                    <button onClick={() => fetchRatings(1)} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                </div>
            );
        }

        if (ratings.length === 0 && !loading) {
            return (
                <div className="p-4 h-full flex items-center justify-center text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                        <i className="fas fa-ghost fa-3x mb-4"></i>
                        <h2 className="text-xl font-bold">It's quiet in here...</h2>
                        <p className="mt-2">No ratings match the current filter. Try a different one!</p>
                    </div>
                </div>
            );
        }

        const ratingsWithGlobalLikes = ratings.map(rating => {
            const pubRatings = allRatings.get(rating.pub_id);
            const globalRating = pubRatings?.find(r => r.id === rating.id);
            if (globalRating && globalRating.like_count !== rating.like_count) {
                return { ...rating, like_count: globalRating.like_count };
            }
            return rating;
        });

        return (
            <div className="p-2 sm:p-4 space-y-4">
                {ratingsWithGlobalLikes.map(rating => (
                    <RatingCard 
                        key={rating.id}
                        rating={rating}
                        userLikes={userLikes}
                        onToggleLike={onToggleLike}
                        onViewProfile={onViewProfile}
                        onLoginRequest={onLoginRequest}
                        onViewImage={onViewImage}
                        onViewPub={onViewPub}
                    />
                ))}
                <div ref={loaderRef} className="h-10 text-center">
                    {loading && page > 1 && <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto mt-4"></div>}
                    {!loading && !hasMore && <p className="text-gray-500 dark:text-gray-400 mt-4">You've seen it all!</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-full">
            <div className="sticky top-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Community Feed</h2>
                    <div className="flex items-center gap-2">
                        <div ref={filterMenuRef} className="relative">
                            <button 
                                onClick={() => setIsFilterMenuOpen(p => !p)}
                                className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700/50 px-3 py-1.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
                                aria-haspopup="true"
                                aria-expanded={isFilterMenuOpen}
                            >
                                <i className="fas fa-filter text-xs"></i>
                                <span>{activeFilterLabel}</span>
                            </button>
                            {isFilterMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-down z-20">
                                    <ul>
                                        {filterOptions.map(opt => (
                                            <li key={opt.label}>
                                                <button 
                                                    onClick={() => handleFilterSelect({ sortBy: opt.sortBy, timePeriod: opt.timePeriod })}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${filter.sortBy === opt.sortBy && filter.timePeriod === opt.timePeriod ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={loading && page === 1}
                            className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh feed"
                            title="Refresh feed"
                        >
                            <i className={`fas fa-sync-alt ${loading && page === 1 ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default CommunityFeed;