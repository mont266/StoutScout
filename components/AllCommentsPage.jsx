import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { formatTimeAgo } from '../utils.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';
import CommentContent from './CommentContent.jsx';

const PAGE_SIZE = 15;

const AllCommentsPage = ({ totalComments, onBack, onViewProfile, onViewPub, loggedInUserProfile, onAdminDeleteComment }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef(null);
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [alertInfo, setAlertInfo] = useState({ isOpen: false });

    const fetchComments = useCallback(async (pageNum) => {
        setLoading(true);
        setError(null);
        if (pageNum === 1) {
            trackEvent('view_all_comments');
        } else {
            trackEvent('load_more_all_comments', { page: pageNum });
        }

        try {
            const from = (pageNum - 1) * PAGE_SIZE;
            const to = pageNum * PAGE_SIZE - 1;

            const { data, error } = await supabase
                .from('comments')
                .select(`
                    comment_id:id,
                    created_at,
                    content,
                    user:profiles!comments_user_id_fkey(id, username, avatar_id),
                    rating:ratings!inner(pub:pubs!inner(id, name, address, lat, lng))
                `)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            
            const formattedData = data.map(c => ({
                comment_id: c.comment_id,
                created_at: c.created_at,
                content: c.content,
                user_id: c.user.id,
                username: c.user.username,
                avatar_id: c.user.avatar_id,
                pub_id: c.rating.pub.id,
                pub_name: c.rating.pub.name,
                pub_address: c.rating.pub.address,
                pub_lat: c.rating.pub.lat,
                pub_lng: c.rating.pub.lng,
            }));

            setComments(prev => pageNum === 1 ? formattedData : [...prev, ...formattedData]);
            if (data.length < PAGE_SIZE) {
                setHasMore(false);
            }

        } catch (err) {
            console.error("Error fetching comments:", err);
            setError(err.message || 'Could not load comments. Ensure the database function is deployed correctly.');
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchComments(1);
    }, [fetchComments]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    setPage(prevPage => prevPage + 1);
                }
            },
            { threshold: 1.0, rootMargin: '0px 0px 200px 0px' }
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

    useEffect(() => {
        if (page > 1) {
            fetchComments(page);
        }
    }, [page, fetchComments]);
    
    const handleDelete = (comment) => {
        setConfirmation({
            isOpen: true,
            isLoading: false,
            title: 'Delete Comment?',
            message: `Permanently delete this comment by ${comment.username}? This will update the rating's comment count.`,
            onConfirm: async () => {
                setConfirmation(prev => ({ ...prev, isLoading: true }));
                const result = await onAdminDeleteComment(comment.comment_id);
                setConfirmation({ isOpen: false, isLoading: false });

                if (result.success) {
                    setComments(prev => prev.filter(c => c.comment_id !== comment.comment_id));
                    setAlertInfo({ isOpen: true, title: 'Success', message: 'Comment deleted.', theme: 'success' });
                } else {
                    setAlertInfo({ isOpen: true, title: 'Error', message: result.error, theme: 'error' });
                }
            },
            confirmText: 'Delete',
            theme: 'red'
        });
    };

    const handlePubClick = (comment) => {
        if (!onViewPub) return;
        const pubForSelection = {
            id: comment.pub_id,
            name: comment.pub_name,
            address: comment.pub_address,
            location: { lat: comment.pub_lat, lng: comment.pub_lng }
        };
        onViewPub(pubForSelection);
    };

    const renderList = () => {
        if (comments.length === 0 && !loading) {
            return (
                <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p>No comments have been posted yet.</p>
                </div>
            );
        }

        return (
            <ul className="space-y-4">
                {comments.map(comment => {
                    const isDeveloper = loggedInUserProfile?.is_developer;
                    return (
                        <li key={comment.comment_id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                            <div className="flex items-start space-x-3">
                                <button onClick={() => onViewProfile(comment.user_id, 'all_comments_list')} className="flex-shrink-0">
                                    <Avatar avatarId={comment.avatar_id} className="w-10 h-10" />
                                </button>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => onViewProfile(comment.user_id, 'all_comments_list')} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline truncate">
                                            {comment.username}
                                        </button>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(new Date(comment.created_at).getTime())}</span>
                                    </div>
                                    <CommentContent 
                                        content={comment.content}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">
                                        on a rating at{' '}
                                        <button onClick={() => handlePubClick(comment)} className="font-medium hover:underline">
                                            {comment.pub_name || 'a deleted pub'}
                                        </button>
                                    </p>
                                </div>
                                {isDeveloper && (
                                    <div className="flex-shrink-0">
                                        <button 
                                            onClick={() => handleDelete(comment)}
                                            className="text-gray-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full"
                                            aria-label="Delete comment"
                                            title="Delete comment"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <>
            {confirmation.isOpen && <ConfirmationModal {...confirmation} onClose={() => setConfirmation({ isOpen: false })} />}
            {alertInfo.isOpen && <AlertModal {...alertInfo} onClose={() => setAlertInfo({ isOpen: false })} />}
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
                    <h3 className="text-xl font-bold text-amber-500 dark:text-amber-400">All Comments</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A chronological feed of every comment submitted. ({totalComments.toLocaleString()} total)</p>
                </header>
                <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6">
                    {error && (
                        <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">
                            <p>{error}</p>
                            <button onClick={() => fetchComments(1)} className="mt-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Retry</button>
                        </div>
                    )}
                    
                    {renderList()}

                    <div ref={loaderRef} className="h-10 text-center">
                        {loading && <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto mt-4"></div>}
                        {!loading && !hasMore && comments.length > 0 && <p className="text-gray-500 mt-4">You've reached the end!</p>}
                    </div>
                </main>
            </div>
        </>
    );
};

export default AllCommentsPage;