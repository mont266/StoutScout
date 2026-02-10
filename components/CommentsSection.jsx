import React, { useState, useEffect, useRef, useMemo } from 'react';
import Avatar from './Avatar.jsx';
import { formatTimeAgo, getRankData } from '../utils.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import { trackEvent } from '../analytics.js';
import CommentContent from './CommentContent.jsx';
import { supabase } from '../supabase.js';
import CommentForm from './CommentForm.jsx';

const CommentsSection = ({ ratingId, comments, isLoading, currentUserProfile, onAddComment, onDeleteComment, onReportContent, onLoginRequest, onViewProfile, highlightedCommentId }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [expandedComments, setExpandedComments] = useState(new Set());
    const [openMenuId, setOpenMenuId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null); // { id: commentId, username: string }

    const highlightedCommentRef = useRef(null);

    // Tree structure for comments
    const commentTree = useMemo(() => {
        if (!comments) return [];
        const commentsById = new Map();
        const topLevelComments = [];

        comments.forEach(comment => {
            commentsById.set(comment.id, { ...comment, children: [] });
        });

        commentsById.forEach(comment => {
            if (comment.parent_comment_id && commentsById.has(comment.parent_comment_id)) {
                commentsById.get(comment.parent_comment_id).children.push(comment);
            } else {
                topLevelComments.push(comment);
            }
        });
        return topLevelComments;
    }, [comments]);
    
     useEffect(() => {
        if (highlightedCommentId && highlightedCommentRef.current) {
            setTimeout(() => {
                highlightedCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightedCommentRef.current.classList.add('highlight-comment');
                setTimeout(() => {
                    highlightedCommentRef.current?.classList.remove('highlight-comment');
                }, 2500);
            }, 100);
        }
    }, [highlightedCommentId, comments]);


    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleViewProfileByUsername = async (username) => {
        if (!onViewProfile) return;

        // Efficiently check if the mentioned user has also commented on this post
        const userInThread = comments?.find(c => c.user && c.user.username.toLowerCase() === username.toLowerCase())?.user;

        if (userInThread) {
            onViewProfile(userInThread.id, 'comment_mention');
            return;
        }

        // If not in the thread, query the DB
        try {
            trackEvent('fetch_profile_by_mention', { username });
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single();

            if (error) throw error;

            if (data) {
                onViewProfile(data.id, 'comment_mention');
            } else {
                alert(`User "${username}" not found.`);
            }
        } catch (err) {
            console.error("Error fetching user by username:", err);
            alert(`Could not fetch profile for "${username}".`);
        }
    };

    const handleCommentSubmit = async (content) => {
        if (!currentUserProfile) return;
        setIsSubmitting(true);
        await onAddComment(ratingId, content);
        setIsSubmitting(false);
    };

    const handleReplySubmit = async (content) => {
        if (!currentUserProfile || !replyingTo) return;
        setIsSubmitting(true);
        await onAddComment(ratingId, content, replyingTo.id);
        setReplyingTo(null);
        setIsSubmitting(false);
    };

    const confirmDelete = (commentId) => {
        setConfirmation({
            isOpen: true,
            title: "Delete Comment?",
            message: "Are you sure you want to permanently delete this comment? This will also delete all replies to it.",
            onConfirm: () => {
                onDeleteComment(commentId, ratingId);
                setConfirmation({ isOpen: false });
            },
            theme: 'red',
            confirmText: 'Delete',
        });
    };
    
    const renderCommentNode = (comment, level = 0) => {
        const isOwnComment = currentUserProfile?.id === comment.user.id;
        const isDeveloper = currentUserProfile?.is_developer;
        const canReport = currentUserProfile && !isOwnComment;
        const showDelete = isOwnComment || isDeveloper;
        const showMenu = showDelete || canReport;
        const rankData = comment.user.level ? getRankData(comment.user.level) : null;

        return (
            <div key={comment.id} ref={comment.id === highlightedCommentId ? highlightedCommentRef : null}>
                <div className={`flex items-start space-x-3 py-3 ${level > 0 ? 'ml-6 sm:ml-10' : ''}`}>
                    <Avatar avatarId={comment.user.avatar_id} className="w-8 h-8 flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-x-2">
                             <div className="flex items-center gap-x-2 min-w-0">
                                <button
                                    onClick={() => onViewProfile(comment.user.id, 'comment_author')}
                                    className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate hover:underline"
                                    disabled={!onViewProfile}
                                >
                                    {comment.user.username}
                                </button>
                                {rankData && (
                                    <i className={`fas ${rankData.icon} text-xs text-amber-500 dark:text-amber-400`} title={rankData.name}></i>
                                )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimeAgo(new Date(comment.created_at).getTime())}</span>
                        </div>
                        
                        <CommentContent
                            content={comment.content}
                            onViewProfileByUsername={handleViewProfileByUsername}
                        />

                        <div className="mt-2">
                            <button
                                onClick={() => currentUserProfile ? setReplyingTo({ id: comment.id, username: comment.user.username }) : onLoginRequest()}
                                className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                            >
                                Reply
                            </button>
                        </div>
                    </div>
                     <div className="flex-shrink-0 relative">
                        {showMenu && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === comment.id ? null : comment.id); }}
                                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center"
                                    aria-haspopup="true" aria-expanded={openMenuId === comment.id} aria-label="Comment options">
                                    <i className="fas fa-ellipsis-h"></i>
                                </button>
                                {openMenuId === comment.id && (
                                    <div role="menu" className="absolute top-full right-0 mt-1 w-28 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                                        {showDelete && <button role="menuitem" onClick={() => confirmDelete(comment.id)} className={`w-full text-left text-sm px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 ${canReport ? 'rounded-t-md' : 'rounded-md'}`}>Delete</button>}
                                        {canReport && <button role="menuitem" onClick={() => onReportContent({ contentId: comment.id, contentType: 'comment', contentCreatorUsername: comment.user.username })} className={`w-full text-left text-sm px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 ${showDelete ? 'rounded-b-md' : 'rounded-md'}`}>Report</button>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {replyingTo?.id === comment.id && (
                    <div className={`pl-6 sm:pl-10`}>
                        <CommentForm
                            currentUserProfile={currentUserProfile}
                            isSubmitting={isSubmitting}
                            onSubmit={handleReplySubmit}
                            placeholder={`Replying to ${replyingTo.username}...`}
                            initialValue={`@${replyingTo.username} `}
                            onCancel={() => setReplyingTo(null)}
                            autoFocus={true}
                        />
                    </div>
                )}
                {comment.children.length > 0 && (
                    <div>
                        {comment.children.map(reply => renderCommentNode(reply, level + 1))}
                    </div>
                )}
            </div>
        )
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900/50 p-3">
            {confirmation.isOpen && <ConfirmationModal {...confirmation} onClose={() => setConfirmation({isOpen: false})} />}
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {isLoading && !comments && (
                    <div className="space-y-3 py-3 animate-pulse">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                <div className="flex-grow space-y-2">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && commentTree.length === 0 && (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No comments yet. Be the first!</p>
                )}
                {commentTree.map(comment => renderCommentNode(comment))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                {currentUserProfile ? (
                     <CommentForm
                        currentUserProfile={currentUserProfile}
                        isSubmitting={isSubmitting}
                        onSubmit={handleCommentSubmit}
                    />
                ) : (
                    <div className="text-center">
                        <button onClick={onLoginRequest} className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                            Sign in to comment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentsSection;
