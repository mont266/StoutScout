import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { formatTimeAgo, getRankData } from '../utils.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import { trackEvent } from '../analytics.js';

const MAX_COMMENT_LENGTH = 150;
const MAX_SUBMIT_LENGTH = 500;

const CommentsSection = ({ ratingId, comments, isLoading, currentUserProfile, onAddComment, onDeleteComment, onReportComment, onLoginRequest, onViewProfile }) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState({ isOpen: false, onConfirm: null, message: '' });
    const [expandedComments, setExpandedComments] = useState(new Set());
    const [openMenuId, setOpenMenuId] = useState(null);
    const textareaRef = useRef(null);
    const isDesktop = useIsDesktop();

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleCommentChange = (e) => {
        setNewComment(e.target.value);
    };
    
    const handleKeyDown = (e) => {
        if (e.shiftKey && e.key === 'Enter' && !isSubmitting) {
             e.preventDefault();
             handleCommentSubmit(e);
        }
    };

    const toggleExpanded = (commentId) => {
        setExpandedComments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
                trackEvent('expand_comment', { rating_id: ratingId, comment_id: commentId });
            }
            return newSet;
        });
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserProfile || isSubmitting) return;
        
        setIsSubmitting(true);
        await onAddComment(ratingId, newComment.trim());
        setNewComment('');
        
        if(textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setIsSubmitting(false);
    };

    const confirmDelete = (commentId) => {
        setConfirmation({
            isOpen: true,
            title: "Delete Comment?",
            message: "Are you sure you want to permanently delete this comment?",
            onConfirm: () => {
                onDeleteComment(commentId, ratingId);
                setConfirmation({ isOpen: false });
            },
            theme: 'red',
            confirmText: 'Delete',
        });
    };

    const renderComment = (comment) => {
        const isOwnComment = currentUserProfile?.id === comment.user.id;
        const isDeveloper = currentUserProfile?.is_developer;
        const canReport = currentUserProfile && !isOwnComment;

        const showDelete = isOwnComment || isDeveloper;
        const showReport = canReport;
        const showMenu = showDelete || showReport;

        const isExpanded = expandedComments.has(comment.id);
        const isLong = comment.content.length > MAX_COMMENT_LENGTH;
        const contentToShow = isLong && !isExpanded ? `${comment.content.substring(0, MAX_COMMENT_LENGTH)}...` : comment.content;
        
        const rankData = comment.user.level ? getRankData(comment.user.level) : null;
        
        return (
            <li key={comment.id} id={`comment-${comment.id}`} className="flex items-start space-x-3 py-3">
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
                            {comment.user.is_developer && (
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" title="Developer"></div>
                            )}
                            {rankData && (
                                <i className={`fas ${rankData.icon} text-xs text-amber-500 dark:text-amber-400`} title={rankData.name}></i>
                            )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTimeAgo(new Date(comment.created_at).getTime())}</span>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words whitespace-pre-wrap">
                        {contentToShow}
                    </p>

                    {isLong && (
                        <button onClick={() => toggleExpanded(comment.id)} className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline mt-1">
                            {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
                <div className="flex-shrink-0 relative">
                    {showMenu && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === comment.id ? null : comment.id);
                                }}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center"
                                aria-haspopup="true"
                                aria-expanded={openMenuId === comment.id}
                                aria-label="Comment options"
                            >
                                <i className="fas fa-ellipsis-h"></i>
                            </button>
                            <div
                                role="menu"
                                className={`absolute top-full right-0 mt-1 w-28 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-10 transition-all duration-150 ease-in-out transform ${
                                    openMenuId === comment.id 
                                    ? 'opacity-100 scale-100 pointer-events-auto' 
                                    : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                            >
                                {showDelete && (
                                    <button
                                        role="menuitem"
                                        onClick={() => confirmDelete(comment.id)}
                                        className={`w-full text-left text-sm px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 ${showReport ? 'rounded-t-md' : 'rounded-md'}`}
                                    >
                                        Delete
                                    </button>
                                )}
                                {showReport && (
                                    <button
                                        role="menuitem"
                                        onClick={() => onReportComment(comment)}
                                        className={`w-full text-left text-sm px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 ${showDelete ? 'rounded-b-md' : 'rounded-md'}`}
                                    >
                                        Report
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </li>
        );
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900/50 p-3">
            {confirmation.isOpen && <ConfirmationModal {...confirmation} onClose={() => setConfirmation({isOpen: false})} />}
            
            <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
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
                {!isLoading && comments?.length === 0 && (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No comments yet. Be the first!</p>
                )}
                {comments?.map(renderComment)}
            </ul>
            
            <div className="relative mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                {currentUserProfile ? (
                    <form onSubmit={handleCommentSubmit} className="flex items-start space-x-2">
                        <Avatar avatarId={currentUserProfile.avatar_id} className="w-8 h-8 flex-shrink-0 mt-1" />
                        <div className="flex-grow">
                             <textarea
                                ref={textareaRef}
                                value={newComment}
                                onChange={handleCommentChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isDesktop ? "Add a comment... Shift+Enter to send" : "Add a comment..."}
                                maxLength={MAX_SUBMIT_LENGTH}
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                rows="1"
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                            />
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                                {newComment.length}/{MAX_SUBMIT_LENGTH}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="bg-amber-500 text-black font-bold py-1.5 px-3 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed self-center h-8 w-10 flex items-center justify-center"
                        >
                            {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div> : <i className="fas fa-paper-plane"></i>}
                        </button>
                    </form>
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