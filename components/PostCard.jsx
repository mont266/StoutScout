import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { getRankData, formatTimeAgo } from '../utils.js';
import CommentsSection from './CommentsSection.jsx';

const COLLAPSED_LIMIT = 3;
const CONTENT_TRUNCATION_LENGTH = 250;

const PostCard = ({ post, onToggleLike, userPostLikes, onViewProfile, onLoginRequest, onViewPub, loggedInUserProfile, commentsByPost, isPostCommentsLoading, onFetchCommentsForPost, onAddPostComment, onDeletePostComment, onReportComment, pubScores, onEditPost, onDeletePost, onOpenSharePostModal }) => {
    const { user, title, content, created_at, like_count, comment_count, attached_pubs, is_announcement } = post;
    const [isPubsExpanded, setIsPubsExpanded] = useState(false);
    const [isCommentsVisible, setIsCommentsVisible] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [isContentExpanded, setIsContentExpanded] = useState(false);

    const isLiked = userPostLikes && userPostLikes.has(post.id);
    const rankData = user.level ? getRankData(user.level) : null;
    const isOwner = loggedInUserProfile?.id === user.id;

    const hasMorePubs = attached_pubs && attached_pubs.length > COLLAPSED_LIMIT;
    const pubsToShow = hasMorePubs && !isPubsExpanded ? attached_pubs.slice(0, COLLAPSED_LIMIT) : attached_pubs;
    
    const isLongPost = content && content.length > CONTENT_TRUNCATION_LENGTH;
    
    const getScoreColorClasses = (s) => {
        if (s === null || s === undefined) return 'bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200';
        if (s >= 80) return 'bg-yellow-400 text-black';
        if (s >= 65) return 'bg-green-500 text-white';
        if (s >= 45) return 'bg-yellow-500 text-black';
        return 'bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200';
    };

    useEffect(() => {
        if (isCommentsVisible && onFetchCommentsForPost) {
            // Only fetch if comments aren't already loaded
            if (!commentsByPost || !commentsByPost.has(post.id)) {
                onFetchCommentsForPost(post.id);
            }
        }
    }, [isCommentsVisible, post.id, onFetchCommentsForPost, commentsByPost]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${is_announcement ? 'border-2 border-amber-400' : ''}`}>
             {is_announcement && (
                <div className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2 border-b border-amber-200 dark:border-amber-800 flex items-center space-x-2">
                    <i className="fas fa-bullhorn"></i>
                    <span className="font-bold text-sm">Announcement</span>
                </div>
            )}
            {/* Card Header */}
            <div className="p-3 flex items-center space-x-3">
                <button onClick={() => onViewProfile(user.id, 'post_feed')} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                    <Avatar avatarId={user.avatar_id} className="w-10 h-10" />
                </button>
                <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-1.5">
                        <button onClick={() => onViewProfile(user.id, 'post_feed')} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline truncate">
                            {user.username}
                        </button>
                        {user.is_developer && (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/20" title="This user is a Stoutly developer.">
                                DEV
                            </span>
                        )}
                        {rankData && (
                            <i className={`fas ${rankData.icon} text-sm text-amber-500 dark:text-amber-400`} title={rankData.name}></i>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(new Date(created_at).getTime())}</p>
                </div>
                {isOwner && (
                    <div ref={menuRef} className="relative flex-shrink-0">
                        <button
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                        >
                            <i className="fas fa-ellipsis-h"></i>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-28 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                                <button onClick={() => { onEditPost(post); setIsMenuOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-md">Edit</button>
                                <button onClick={() => { onDeletePost(post); setIsMenuOpen(false); }} className="w-full text-left text-sm px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-b-md">Delete</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Post Content */}
            {title && (
                <h3 className="px-4 pt-1 text-lg font-bold text-gray-900 dark:text-white break-words">
                    {title}
                </h3>
            )}
            {content && (
                <div className={`px-4 pb-3 ${title ? 'pt-2' : ''}`}>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {isLongPost && !isContentExpanded ? `${content.substring(0, CONTENT_TRUNCATION_LENGTH)}...` : content}
                    </p>
                    {isLongPost && (
                        <button
                            onClick={() => setIsContentExpanded(!isContentExpanded)}
                            className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline mt-2"
                        >
                            {isContentExpanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            )}


            {/* Attached Pubs */}
            {attached_pubs && attached_pubs.length > 0 && (
                <div className="px-4 pb-3">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        {attached_pubs.length > 1 ? 'Attached Pubs:' : 'Attached Pub:'}
                    </h4>
                    <ol className="space-y-2">
                        {pubsToShow.map((item, index) => {
                            const pub = item.pub;
                            if (!pub) return null;
                             const pubScore = pubScores?.get(pub.id);
                            return (
                                <li key={item.pub_id}>
                                    <button
                                        onClick={() => onViewPub({ id: pub.id, name: pub.name, address: pub.address, location: { lat: pub.lat, lng: pub.lng }})}
                                        className="w-full text-left p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-colors flex items-center space-x-3"
                                        aria-label={`View ${pub.name}`}
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{pub.name}</p>
                                                {pubScore !== null && pubScore !== undefined && (
                                                    <div className={`flex-shrink-0 w-8 h-5 rounded-full flex items-center justify-center text-xs font-bold ${getScoreColorClasses(pubScore)}`}>
                                                        {pubScore}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.address}</p>
                                        </div>
                                        <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500 flex-shrink-0"></i>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                    {hasMorePubs && (
                        <button
                            onClick={() => setIsPubsExpanded(prev => !prev)}
                            className="w-full text-center text-sm font-semibold text-amber-600 dark:text-amber-400 mt-2 p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50"
                        >
                            {isPubsExpanded ? 'Show less' : `Show ${attached_pubs.length - COLLAPSED_LIMIT} more...`}
                        </button>
                    )}
                </div>
            )}

            {/* Action Bar */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-around">
                <button
                    onClick={() => onToggleLike ? onToggleLike(post) : onLoginRequest()}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center ${
                        isLiked
                        ? 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={isLiked}
                    aria-label={isLiked ? `Unlike post, currently ${like_count || 0} likes` : `Like post, currently ${like_count || 0} likes`}
                >
                    <i className={`${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart transition-transform ${isLiked ? 'scale-110' : ''}`}></i>
                    <span>{like_count || 0}</span>
                </button>
                <button
                    onClick={() => setIsCommentsVisible(prev => !prev)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-expanded={isCommentsVisible}
                >
                    <i className="fa-regular fa-comment"></i>
                    <span>{comment_count || 0}</span>
                </button>
                <button
                    onClick={() => onOpenSharePostModal(post)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold w-full justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Share this post"
                >
                    <i className="fa-solid fa-share-from-square"></i>
                    <span>Share</span>
                </button>
            </div>
            
            {isCommentsVisible && (
                <CommentsSection
                    ratingId={post.id} // CommentsSection uses `ratingId` prop internally for any entity
                    comments={commentsByPost?.get(post.id)}
                    isLoading={isPostCommentsLoading}
                    currentUserProfile={loggedInUserProfile}
                    onAddComment={onAddPostComment}
                    onDeleteComment={onDeletePostComment}
                    onReportComment={onReportComment}
                    onLoginRequest={onLoginRequest}
                    onViewProfile={onViewProfile}
                />
            )}
        </div>
    );
};

export default PostCard;