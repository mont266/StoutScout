import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import RatingCard from './RatingCard.jsx';
import Avatar from './Avatar.jsx';

const PAGE_SIZE = 5;

const filterOptions = [
    { label: 'Newest', sortBy: 'created_at', timePeriod: 'all' },
    { label: 'Top Today', sortBy: 'likes', timePeriod: '1d' },
    { label: 'Top This Week', sortBy: 'likes', timePeriod: '7d' },
    { label: 'Top This Month', sortBy: 'likes', timePeriod: '1M' },
    { label: 'Top This Year', sortBy: 'likes', timePeriod: '1Y' },
    { label: 'Top All Time', sortBy: 'likes', timePeriod: 'all' },
];

const SearchResultAction = ({ loggedInUser, targetUser, onFriendRequest, onFriendAction }) => {
    const { friendship_status, friendship_id, action_user_id } = targetUser;
    
    const [status, setStatus] = useState(friendship_status);
    const [friendshipId, setFriendshipId] = useState(friendship_id);
    const [localActionUserId, setLocalActionUserId] = useState(action_user_id);

    useEffect(() => {
        setStatus(targetUser.friendship_status);
        setFriendshipId(targetUser.friendship_id);
        setLocalActionUserId(targetUser.action_user_id);
    }, [targetUser]);
    
    // Optimistic updates
    const handleAddFriend = async () => {
        await onFriendRequest(targetUser.id);
        setStatus('pending');
        setLocalActionUserId(loggedInUser.id);
    };

    const handleAcceptRequest = async () => {
        await onFriendAction(friendshipId, 'accepted');
        setStatus('accepted');
    };

    const handleDeclineRequest = async () => {
        await onFriendAction(friendshipId, 'declined');
        setStatus('declined');
    };

    if (status === 'accepted') {
        return <button disabled className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-xs cursor-not-allowed"><i className="fas fa-user-check"></i> Friends</button>;
    }

    if (status === 'pending') {
        if (localActionUserId === loggedInUser.id) {
            return <button disabled className="bg-gray-400 dark:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg text-xs cursor-not-allowed">Request Sent</button>;
        } else {
            return (
                <div className="flex gap-2">
                    <button onClick={handleDeclineRequest} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors text-xs">Decline</button>
                    <button onClick={handleAcceptRequest} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm">Accept</button>
                </div>
            );
        }
    }
    
    // Default: no friendship, or a declined one
    return <button onClick={handleAddFriend} className="bg-blue-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-xs"><i className="fas fa-user-plus"></i> Add</button>;
};

const UserSearch = ({ onBack, onViewProfile, userProfile, onFriendRequest, onFriendAction }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (searchTerm.trim().length < 2) {
            setResults([]);
            return;
        }

        const handler = setTimeout(async () => {
            setIsSearching(true);
            setError(null);
            trackEvent('search_users', { search_term: searchTerm.trim() });
            const { data, error: rpcError } = await supabase.rpc('search_users', { search_term: searchTerm.trim() });
            
            if (rpcError) {
                console.error("User search error:", rpcError);
                setError("Could not perform search. Please try again.");
                setResults([]);
            } else {
                setResults(data);
            }
            setIsSearching(false);
        }, 300); // 300ms debounce

        return () => clearTimeout(handler);
    }, [searchTerm]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <button onClick={onBack} className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50">
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div className="relative flex-grow">
                     <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                     <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search for users..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                     />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-2">
                {isSearching && <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto mt-8"></div>}
                {!isSearching && error && <div className="text-center text-red-500 p-4">{error}</div>}
                {!isSearching && !error && searchTerm.length > 1 && results.length === 0 && (
                    <div className="text-center text-gray-500 p-6">No users found matching "{searchTerm}".</div>
                )}
                {!isSearching && results.length > 0 && (
                    <ul className="space-y-2">
                       {results.map(res => (
                           <li key={res.id} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg flex items-center space-x-3">
                               <button onClick={() => onViewProfile(res.id, 'user_search')} className="flex items-center space-x-3 flex-grow min-w-0">
                                   <Avatar avatarId={res.avatar_id} className="w-10 h-10 flex-shrink-0" />
                                   <div className="text-left">
                                       <p className="font-semibold text-gray-900 dark:text-white truncate">{res.username}</p>
                                       <p className="text-xs text-gray-500 dark:text-gray-400">Level {res.level}</p>
                                   </div>
                               </button>
                               <div className="flex-shrink-0">
                                   <SearchResultAction
                                        loggedInUser={userProfile}
                                        targetUser={res}
                                        onFriendRequest={onFriendRequest}
                                        onFriendAction={onFriendAction}
                                   />
                               </div>
                           </li>
                       ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


const FriendsFeed = ({ onViewProfile, userLikes, onToggleLike, onLoginRequest, onViewImage, userProfile, friendships, onFriendRequest, onFriendAction, allRatings, onViewPub, filter, onFilterChange }) => {
    const [view, setView] = useState('feed'); // 'feed' or 'search'
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const loaderRef = useRef(null);
    const filterMenuRef = useRef(null);

    const hasFriends = friendships.some(f => f.status === 'accepted');

    const fetchRatings = useCallback(async (pageNum) => {
        if (!hasFriends) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        if (pageNum === 1) trackEvent('view_friends_feed', { filter });

        try {
            const { data, error: rpcError } = await supabase.rpc('get_friends_feed', {
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
            console.error("Error fetching friends feed:", err);
            setError(err.message || 'Could not load your friends feed.');
        } finally {
            setLoading(false);
        }
    }, [hasFriends, filter]);
    
    const handleRefresh = useCallback(() => {
        if (loading) return;
        trackEvent('refresh_feed', { feed_type: 'friends' });
        setPage(1);
        setHasMore(true);
        fetchRatings(1);
    }, [fetchRatings, loading]);

    // Re-fetch from page 1 when the filter changes
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        setRatings([]);
        fetchRatings(1);
    }, [fetchRatings]);


    // Infinite scroll observer
    useEffect(() => {
        if (!hasFriends) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    setPage(prevPage => prevPage + 1);
                }
            },
            { threshold: 1.0, rootMargin: '0px 0px 200px 0px' }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [loading, hasMore, hasFriends]);

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

    if (view === 'search') {
        return <UserSearch onBack={() => setView('feed')} onViewProfile={onViewProfile} userProfile={userProfile} onFriendRequest={onFriendRequest} onFriendAction={onFriendAction} />;
    }

    if (!hasFriends && !loading) {
         return (
            <div className="bg-gray-100 dark:bg-gray-900 min-h-full">
                <div className="sticky top-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Friends Feed</h2>
                        <button
                            onClick={() => setView('search')}
                            className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            aria-label="Search for users"
                            title="Search for users"
                        >
                            <i className="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div className="p-4 h-full flex items-center justify-center text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                        <i className="fas fa-user-plus fa-3x mb-4"></i>
                        <h2 className="text-xl font-bold">Find Your Friends</h2>
                        <p className="mt-2 max-w-sm">Use the search button above to find and add friends. Their ratings will show up here!</p>
                    </div>
                </div>
            </div>
        );
    }
    
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
                    <p>{error}</p>
                    <button onClick={() => fetchRatings(1)} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                </div>
            );
        }

        if (ratings.length === 0 && !loading) {
            return (
                <div className="p-4 h-full flex items-center justify-center text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                        <i className="fas fa-wind fa-3x mb-4"></i>
                        <h2 className="text-xl font-bold">Nothing to see here... yet!</h2>
                        <p className="mt-2">Your friends haven't posted any ratings that match this filter.</p>
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
                    {!loading && !hasMore && <p className="text-gray-500 dark:text-gray-400 mt-4">You've reached the end of your friends' ratings!</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-full">
            <div className="sticky top-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Friends Feed</h2>
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
                        <button
                            onClick={() => setView('search')}
                            className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            aria-label="Search for users"
                            title="Search for users"
                        >
                            <i className="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default FriendsFeed;