import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import RatingCard from './RatingCard.jsx';
import PostCard from './PostCard.jsx';
import Avatar from './Avatar.jsx';
import ScrollToTopButton from './ScrollToTopButton.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import CreatePostInput from './CreatePostInput.jsx';

const PAGE_SIZE = 10; // Used when filtering to a single content type
const RATINGS_PER_PAGE_MIXED = 7;
const POSTS_PER_PAGE_MIXED = 3;

const filterOptions = [
    { label: 'Newest', sortBy: 'created_at', timePeriod: 'all' },
    { label: 'Top Today', sortBy: 'likes', timePeriod: '1d' },
    { label: 'Top This Week', sortBy: 'likes', timePeriod: '7d' },
    { label: 'Top This Month', sortBy: 'likes', timePeriod: '1M' },
    { label: 'Top This Year', sortBy: 'likes', timePeriod: '1Y' },
    { label: 'Top All Time', sortBy: 'likes', timePeriod: 'all' },
];

const contentFilterOptions = [
    { id: 'all', label: 'All', icon: 'fa-stream' },
    { id: 'ratings', label: 'Ratings', icon: 'fa-star' },
    { id: 'posts', label: 'Posts', icon: 'fa-comments' },
];

const PULL_THRESHOLD = 80;

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
        }, 300);

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
                               <button onClick={() => onViewProfile(res.id, 'user_search')} className="flex items-center space-x-3 flex-grow min-w-0 text-left">
                                   <Avatar avatarId={res.avatar_id} className="w-10 h-10 flex-shrink-0" />
                                   <div className="truncate">
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


const FriendsFeed = ({ onViewProfile, userLikes, onToggleLike, onLoginRequest, onViewImage, userProfile, friendships, onFriendRequest, onFriendAction, onViewPub, filter, onFilterChange, contentFilter, onContentFilterChange, postSubFilter, onPostSubFilterChange, loggedInUserProfile, commentsByRating, isCommentsLoading, onFetchComments, onAddComment, onDeleteComment, onReportComment, onOpenShareRatingModal, dbPubs, onMobileScroll, onOpenCreatePostModal, userPostLikes, onTogglePostLike, postSuccessCount, commentsByPost, isPostCommentsLoading, onFetchCommentsForPost, onAddPostComment, onDeletePostComment, pubScores, onEditPost, onDeletePost, onOpenSharePostModal }) => {
    const [view, setView] = useState('feed');
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const loaderRef = useRef(null);
    const filterMenuRef = useRef(null);
    
    const [pullPosition, setPullPosition] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const touchStartRef = useRef(0);
    const containerRef = useRef(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const isDesktop = useIsDesktop();

    const lastScrollY = useRef(0);
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(true);

    const isRefreshing = loading && page === 1;
    const hasFriends = friendships.some(f => f.status === 'accepted');

    const dbPubsMap = useMemo(() => {
        return new Map((dbPubs || []).map(p => [p.id, p]));
    }, [dbPubs]);

    const fetchFeedItems = useCallback(async (pageNum) => {
        if (!userProfile) return;
    
        const friendIds = friendships
            .filter(f => f.status === 'accepted')
            .map(f => f.user_id_1 === userProfile.id ? f.user_id_2 : f.user_id_1);
    
        if (friendIds.length === 0) {
            setFeedItems([]);
            setHasMore(false);
            setLoading(false);
            return;
        }
    
        setLoading(true);
        setError(null);
        if (pageNum === 1) trackEvent('view_friends_feed', { filter, content_filter: contentFilter, post_sub_filter: postSubFilter });
    
        try {
            let ratingsQuery = contentFilter !== 'posts'
                ? supabase.from('ratings').select(`*, user:user_id!inner(id, username, avatar_id, level, is_banned, is_developer), pub:pub_id!inner(id, name, address, lat, lng, country_code, country_name)`).in('user_id', friendIds).eq('is_private', false).eq('user.is_banned', false)
                : null;
            let postsQuery = contentFilter !== 'ratings'
                ? supabase.from('posts').select(`*, user:user_id!inner(id, username, avatar_id, level, is_banned, is_developer), attached_pubs:post_pubs(pub_id, pub:pubs(id, name, address, lat, lng))`).in('user_id', friendIds).eq('user.is_banned', false)
                : null;
    
            if (filter.timePeriod !== 'all') {
                const now = new Date();
                let startDate;
                switch (filter.timePeriod) {
                    case '1d': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
                    case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
                    case '1M': startDate = new Date(new Date().setMonth(new Date().getMonth() - 1)); break;
                    case '1Y': startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)); break;
                }
                if (startDate) {
                    if (ratingsQuery) ratingsQuery = ratingsQuery.gte('created_at', startDate.toISOString());
                    if (postsQuery) postsQuery = postsQuery.gte('created_at', startDate.toISOString());
                }
            }
            
            const sortOptions = { ascending: false, nullsLast: true };
            if (ratingsQuery) ratingsQuery = ratingsQuery.order(filter.sortBy, sortOptions);
            if (postsQuery) {
                postsQuery = postsQuery.order(filter.sortBy, sortOptions);
                if (postSubFilter === 'announcements') {
                    postsQuery = postsQuery.eq('is_announcement', true);
                }
            }
            
            const from = (pageNum - 1);
            const promises = [];

            if (ratingsQuery) {
                const pageSize = contentFilter === 'ratings' ? PAGE_SIZE : RATINGS_PER_PAGE_MIXED;
                promises.push(ratingsQuery.range(from * pageSize, from * pageSize + pageSize - 1));
            } else {
                promises.push(Promise.resolve({ data: [], error: null }));
            }

            if (postsQuery) {
                const pageSize = contentFilter === 'posts' ? PAGE_SIZE : POSTS_PER_PAGE_MIXED;
                promises.push(postsQuery.range(from * pageSize, from * pageSize + pageSize - 1));
            } else {
                promises.push(Promise.resolve({ data: [], error: null }));
            }
            
            const [ratingsResult, postsResult] = await Promise.all(promises);

            if (ratingsResult.error) throw ratingsResult.error;
            if (postsResult.error) throw postsResult.error;
    
            const newRatings = (ratingsResult.data || []).map(r => ({ ...r, item_type: 'rating' }));
            const newPosts = (postsResult.data || []).map(p => ({ ...p, item_type: 'post' }));

            const combined = [...newRatings, ...newPosts];
    
            setFeedItems(prev => {
                const allItems = pageNum === 1 ? combined : [...prev, ...combined];
                const uniqueItems = Array.from(new Map(allItems.map(item => [`${item.item_type}-${item.id}`, item])).values());
                return uniqueItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            });
            
            if (contentFilter === 'ratings') setHasMore(newRatings.length === PAGE_SIZE);
            else if (contentFilter === 'posts') setHasMore(newPosts.length === PAGE_SIZE);
            else setHasMore(newRatings.length === RATINGS_PER_PAGE_MIXED || newPosts.length === POSTS_PER_PAGE_MIXED);
    
        } catch (err) {
            console.error("Error fetching friends feed:", err);
            setError(err.message || 'Could not load your friends feed.');
        } finally {
            setLoading(false);
        }
    }, [userProfile, friendships, filter, contentFilter, postSubFilter]);
    
    const handleFeedToggleLike = (ratingToToggle) => {
        setFeedItems(currentItems => 
            currentItems.map(item => {
                if (item.item_type === 'rating' && item.id === ratingToToggle.id) {
                    const isLiked = userLikes.has(ratingToToggle.id);
                    const newLikeCount = isLiked ? Math.max(0, (item.like_count || 1) - 1) : (item.like_count || 0) + 1;
                    return { ...item, like_count: newLikeCount };
                }
                return item;
            })
        );
        onToggleLike(ratingToToggle);
    };

    const handleFeedTogglePostLike = (postToToggle) => {
        setFeedItems(currentItems => 
            currentItems.map(item => {
                if (item.item_type === 'post' && item.id === postToToggle.id) {
                    const isLiked = userPostLikes.has(postToToggle.id);
                    const newLikeCount = isLiked ? Math.max(0, (item.like_count || 1) - 1) : (item.like_count || 0) + 1;
                    return { ...item, like_count: newLikeCount };
                }
                return item;
            })
        );
        onTogglePostLike(postToToggle);
    };

    const handleFeedAddComment = async (ratingId, content, parentId) => {
        await onAddComment(ratingId, content, parentId);
        setFeedItems(currentItems =>
            currentItems.map(item => {
                if (item.item_type === 'rating' && item.id === ratingId) {
                    return { ...item, comment_count: (item.comment_count || 0) + 1 };
                }
                return item;
            })
        );
    };

    const handleFeedAddPostComment = async (postId, content, parentId) => {
        await onAddPostComment(postId, content, parentId);
        setFeedItems(currentItems =>
            currentItems.map(item => {
                if (item.item_type === 'post' && item.id === postId) {
                    return { ...item, comment_count: (item.comment_count || 0) + 1 };
                }
                return item;
            })
        );
    };

    const handleFeedDeleteComment = async (commentId, ratingId) => {
        await onDeleteComment(commentId, ratingId);
        setFeedItems(currentItems =>
            currentItems.map(item => {
                if (item.item_type === 'rating' && item.id === ratingId) {
                    return { ...item, comment_count: Math.max(0, (item.comment_count || 1) - 1) };
                }
                return item;
            })
        );
    };

     const handleFeedDeletePostComment = async (commentId, postId) => {
        await onDeletePostComment(commentId, postId);
         setFeedItems(currentItems => 
            currentItems.map(item => {
                if (item.item_type === 'post' && item.id === postId) {
                    return { ...item, comment_count: Math.max(0, (item.comment_count || 1) - 1) };
                }
                return item;
            })
        );
    };

    const handleRefresh = useCallback((method = 'button') => {
        if (loading) return;
        trackEvent('refresh_feed', { feed_type: 'friends', method });
        setPage(1);
        setHasMore(true);
        fetchFeedItems(1);
    }, [fetchFeedItems, loading]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        setFeedItems([]);
        fetchFeedItems(1);
    }, [fetchFeedItems, postSuccessCount]);

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

    useEffect(() => {
        if (page > 1) fetchFeedItems(page);
    }, [page, fetchFeedItems]);
    
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

    const handleTouchStart = (e) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            setIsPulling(true);
            touchStartRef.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling || isRefreshing) return;
        const touchY = e.touches[0].clientY;
        const pullDistance = touchY - touchStartRef.current;
        if (pullDistance > 0) {
            const dampenedPull = Math.pow(pullDistance, 0.85);
            setPullPosition(dampenedPull);
        }
    };

    const handleTouchEnd = () => {
        if (!isPulling || isRefreshing) return;
        setIsPulling(false);
        if (pullPosition > PULL_THRESHOLD) {
            handleRefresh('pull');
        } else {
            setPullPosition(0);
        }
    };
    
    useEffect(() => {
        if (!isRefreshing) {
            setPullPosition(0);
        }
    }, [isRefreshing]);

    const handleScroll = useCallback((e) => {
        const scrollContainer = e.target;
        if (!scrollContainer) return;
    
        const currentScrollY = scrollContainer.scrollTop;
    
        setShowScrollTop(currentScrollY > 400);

        const filterScrollThreshold = 50; 
        if (currentScrollY > lastScrollY.current && currentScrollY > filterScrollThreshold) {
            setIsFilterPanelVisible(false);
        } else if (currentScrollY < lastScrollY.current) {
            setIsFilterPanelVisible(true);
        }
    
        if (!isDesktop) {
            const scrollThreshold = 10;
            const scrollingDown = currentScrollY > lastScrollY.current && currentScrollY > scrollThreshold;
            if (onMobileScroll) {
                onMobileScroll(scrollingDown);
            }
        }
        
        lastScrollY.current = currentScrollY <= 0 ? 0 : currentScrollY;
    }, [isDesktop, onMobileScroll]);


    const handleScrollToTop = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
    };

    const activeFilterLabel = filterOptions.find(opt => opt.sortBy === filter.sortBy && opt.timePeriod === filter.timePeriod)?.label || 'Newest';

    if (view === 'search') {
        return <UserSearch onBack={() => setView('feed')} onViewProfile={onViewProfile} userProfile={userProfile} onFriendRequest={onFriendRequest} onFriendAction={onFriendAction} />;
    }

    if (!hasFriends && !loading) {
         return (
            <div className="bg-gray-100 dark:bg-gray-900 h-full overflow-y-auto relative">
                <div className="sticky top-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Friends</h2>
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
        if (loading && page === 1 && !isPulling) {
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
                    <button onClick={() => fetchFeedItems(1)} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                </div>
            );
        }

        if (feedItems.length === 0 && !loading) {
            return (
                <div className="p-4 h-full flex items-center justify-center text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                        <i className="fas fa-wind fa-3x mb-4"></i>
                        <h2 className="text-xl font-bold">Nothing to see here... yet!</h2>
                        <p className="mt-2">Your friends haven't posted any content that matches this filter.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-2 sm:p-4 space-y-4">
                {feedItems.map(item => {
                    if (item.item_type === 'rating') {
                        const fallbackPubData = dbPubsMap.get(item.pub_id);
                        return (
                            <RatingCard 
                                key={`rating-${item.id}`}
                                rating={item}
                                userLikes={userLikes}
                                onToggleLike={loggedInUserProfile ? handleFeedToggleLike : null}
                                onViewProfile={onViewProfile}
                                onLoginRequest={onLoginRequest}
                                onViewImage={onViewImage}
                                onViewPub={onViewPub}
                                loggedInUserProfile={loggedInUserProfile}
                                comments={commentsByRating.get(item.id)}
                                isCommentsLoading={isCommentsLoading}
                                onFetchComments={onFetchComments}
                                onAddComment={handleFeedAddComment}
                                onDeleteComment={handleFeedDeleteComment}
                                onReportComment={onReportComment}
                                onOpenShareRatingModal={onOpenShareRatingModal}
                                fallbackLocationData={fallbackPubData}
                            />
                        );
                    }
                    if (item.item_type === 'post') {
                         return (
                             <PostCard 
                                key={`post-${item.id}`}
                                post={item}
                                userPostLikes={userPostLikes}
                                onToggleLike={loggedInUserProfile ? handleFeedTogglePostLike : null}
                                onViewProfile={onViewProfile}
                                onLoginRequest={onLoginRequest}
                                onViewPub={onViewPub}
                                commentsByPost={commentsByPost}
                                isPostCommentsLoading={isPostCommentsLoading}
                                onFetchCommentsForPost={onFetchCommentsForPost}
                                onAddPostComment={handleFeedAddPostComment}
                                onDeletePostComment={handleFeedDeletePostComment}
                                onReportComment={onReportComment}
                                onOpenSharePostModal={onOpenSharePostModal}
                                loggedInUserProfile={loggedInUserProfile}
                                pubScores={pubScores}
                                onEditPost={onEditPost}
                                onDeletePost={onDeletePost}
                            />
                        )
                    }
                    return null;
                })}
                <div ref={loaderRef} className="h-10 text-center">
                    {loading && page > 1 && <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto mt-4"></div>}
                    {!loading && !hasMore && <p className="text-gray-500 dark:text-gray-400 mt-4">You've reached the end of your friends' feed!</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full relative flex flex-col">
            <div className="sticky top-0 z-10 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className={`hidable-feed-header ${!isFilterPanelVisible ? 'hide' : ''}`}>
                    <div className="p-3">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Friends</h2>
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
                                    onClick={() => setView('search')}
                                    className="w-10 h-10 flex-shrink-0 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    aria-label="Search for users"
                                    title="Search for users"
                                >
                                    <i className="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="px-3 pb-3 space-y-2">
                        <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700/50 rounded-full space-x-1 content-filter-bar">
                            {contentFilterOptions.map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => onContentFilterChange(opt.id)}
                                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center justify-center space-x-2 ${
                                        contentFilter === opt.id
                                        ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                                    }`}
                                >
                                    <i className={`fas ${opt.icon} w-4 text-center`}></i>
                                    <span className="tab-label">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        {contentFilter === 'posts' && (
                            <div className="mt-2 flex items-center p-1 bg-gray-200/50 dark:bg-gray-900/50 rounded-full space-x-1 animate-fade-in-down">
                                <button 
                                    onClick={() => onPostSubFilterChange('all')}
                                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center justify-center space-x-2 ${
                                        postSubFilter === 'all'
                                        ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                                    }`}
                                >
                                    <i className="fas fa-comments w-4 text-center"></i>
                                    <span>All Posts</span>
                                </button>
                                <button 
                                    onClick={() => onPostSubFilterChange('announcements')}
                                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center justify-center space-x-2 ${
                                        postSubFilter === 'announcements'
                                        ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/50'
                                    }`}
                                >
                                    <i className="fas fa-bullhorn w-4 text-center"></i>
                                    <span>Announcements</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div 
                ref={containerRef}
                className="bg-gray-100 dark:bg-gray-900 flex-grow overflow-y-auto overscroll-y-contain"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onScroll={handleScroll}
            >
                <div
                    style={{
                        transform: `translateY(${isRefreshing ? PULL_THRESHOLD : (isPulling ? pullPosition : 0)}px)`,
                        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
                    }}
                >
                    <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center -translate-y-full">
                        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg w-10 h-10 flex items-center justify-center">
                            {isRefreshing ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-400"></div>
                            ) : (
                                <i
                                    className="fas fa-arrow-down text-amber-500 text-xl transition-transform"
                                    style={{
                                        transform: `rotate(${pullPosition > PULL_THRESHOLD ? 180 : 0}deg)`,
                                        opacity: Math.min(pullPosition / (PULL_THRESHOLD / 1.5), 1)
                                    }}
                                ></i>
                            )}
                        </div>
                    </div>
                    {loggedInUserProfile && (
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                            <CreatePostInput userProfile={loggedInUserProfile} onClick={() => onOpenCreatePostModal({ origin: 'friends_feed' })} />
                        </div>
                    )}
                    {renderContent()}
                </div>
            </div>
            <ScrollToTopButton show={showScrollTop} onClick={handleScrollToTop} isDesktop={isDesktop} />
        </div>
    );
};

export default FriendsFeed;
