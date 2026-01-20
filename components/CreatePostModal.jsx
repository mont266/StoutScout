import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar.jsx';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';

const MAX_POST_LENGTH = 750;
const MAX_PUBS_PER_POST = 10;
const MAX_TITLE_LENGTH = 100;

// Sub-component for selecting pubs, memoized to prevent unnecessary re-renders.
const PubSelectorView = memo(({ 
    onBack, selectedPubs, onTogglePub, userRatings, 
    searchTerm, setSearchTerm 
}) => {
    const recentlyRatedPubs = useMemo(() => {
        if (!userRatings) return [];
        const uniquePubs = new Map();
        userRatings.forEach(rating => {
            if (!uniquePubs.has(rating.pubId)) {
                uniquePubs.set(rating.pubId, {
                    id: rating.pubId,
                    name: rating.pubName,
                    address: rating.pubAddress,
                });
            }
        });
        return Array.from(uniquePubs.values()).slice(0, 10);
    }, [userRatings]);

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeout = useRef(null);
    const suggestionsContainerRef = useRef(null);


    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        if (searchTerm.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        debounceTimeout.current = setTimeout(async () => {
            const { data, error } = await supabase
                .from('pubs')
                .select('id, name, address')
                .or(`name.ilike.%${searchTerm.trim()}%,address.ilike.%${searchTerm.trim()}%`)
                .eq('is_closed', false)
                .limit(50);
            
            if (error) {
                console.error("Error searching pubs:", error);
                setSearchResults([]);
            } else {
                setSearchResults(data || []);
            }
            setIsSearching(false);
        }, 300); // 300ms debounce

        return () => clearTimeout(debounceTimeout.current);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target)) {
                setSearchResults([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [suggestionsContainerRef]);

    const pubsToShow = searchTerm ? searchResults : recentlyRatedPubs;
    const limitReached = selectedPubs.length >= MAX_PUBS_PER_POST;

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="text-gray-500 dark:text-gray-400 p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <h3 className="text-lg font-bold">Attach Pubs ({selectedPubs.length}/{MAX_PUBS_PER_POST})</h3>
                </div>
                <div className="relative mt-3">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for a pub by name or address..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md"
                        autoFocus
                    />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto">
                {limitReached && (
                    <p className="p-2 text-center text-sm font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                        Maximum of {MAX_PUBS_PER_POST} pubs reached.
                    </p>
                )}
                {!searchTerm && recentlyRatedPubs.length > 0 && (
                    <h4 className="p-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        Recently Rated
                    </h4>
                )}
                
                {isSearching ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-400 mx-auto"></div>
                        <p className="mt-2 text-sm">Searching...</p>
                    </div>
                ) : pubsToShow.length === 0 && searchTerm ? (
                    <p className="p-4 text-center text-gray-500 dark:text-gray-400">No pubs found for "{searchTerm}".</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pubsToShow.map(pub => {
                            const isSelected = selectedPubs.some(p => p.id === pub.id);
                            const isDisabled = limitReached && !isSelected;
                            return (
                                <li
                                    key={pub.id}
                                    onClick={isDisabled ? undefined : () => onTogglePub(pub)}
                                    className={`p-4 flex items-center justify-between transition-colors ${
                                        isDisabled ? 'opacity-50 cursor-not-allowed' :
                                        isSelected ? 'bg-amber-100 dark:bg-amber-900/50' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{pub.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.address}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-300 dark:border-gray-500'}`}>
                                        {isSelected && <i className="fas fa-check"></i>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
});

// Sub-component for the main post creation view, memoized for performance.
const MainView = memo(({
    userProfile, title, setTitle, content, setContent, handleSubmit, isLoading, error, onClose, onAttachPubsClick,
    selectedPubs, onTogglePubSelection, draggedIndex, dragOverIndex,
    handleDragStart, handleDragEnter, handleDragOver, handleDrop, handleDragEnd,
    isAnnouncement, setIsAnnouncement, isEditing, createPostModalOrigin
}) => {
    const textareaRef = useRef(null);
    const isEditingPost = !!isEditing;

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const buttonText = isEditingPost ? 'Save Changes' : 'Post';

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <button type="button" onClick={onClose} className="text-lg font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
                <h2 className="text-lg font-bold">{isEditingPost ? 'Edit Post' : 'New Post'}</h2>
                <button type="submit" disabled={isLoading} className="bg-amber-500 text-black font-bold py-1.5 px-4 rounded-full text-sm disabled:bg-amber-300 flex items-center">{isLoading ? 'Saving...' : buttonText}</button>
            </header>

            <div className="flex-grow overflow-y-auto space-y-4">
                 {createPostModalOrigin === 'friends_feed' && (
                    <div className="p-3 mx-4 mt-4 bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 rounded-r-lg">
                        <p className="font-semibold text-sm flex items-center gap-2">
                            <i className="fas fa-globe-europe"></i>
                            Heads up! Posts are visible to the entire community, not just your friends.
                        </p>
                    </div>
                )}
                <div className="flex items-start space-x-3 p-4">
                    <Avatar avatarId={userProfile.avatar_id} className="w-10 h-10 flex-shrink-0" />
                    <div className="flex-grow space-y-2">
                        <div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Add a catchy title..."
                                maxLength={MAX_TITLE_LENGTH}
                                className="w-full text-xl font-bold bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <p className={`text-right text-xs mt-1 ${title.length > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                {title.length} / {MAX_TITLE_LENGTH}
                            </p>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's happening?"
                                maxLength={MAX_POST_LENGTH}
                                className="w-full text-base bg-transparent focus:outline-none resize-none min-h-[100px]"
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                            />
                             <p className={`text-right text-xs mt-1 ${content.length > MAX_POST_LENGTH ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                {content.length} / {MAX_POST_LENGTH}
                            </p>
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-2 px-4">{error}</p>}
                
                {selectedPubs.length > 0 && (
                    <div className="px-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Attached Pubs (drag to re-order):</p>
                        <ul className="space-y-2">
                            {selectedPubs.map((pub, index) => (
                                <li
                                    key={pub.id} draggable onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)} onDragOver={handleDragOver}
                                    onDrop={handleDrop} onDragEnd={handleDragEnd}
                                    className={`p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md flex items-center justify-between transition-all duration-200 
                                        ${draggedIndex === index ? 'opacity-30' : 'opacity-100'}
                                        ${dragOverIndex === index ? 'border-2 border-dashed border-amber-500' : 'border-2 border-transparent'}`
                                    }
                                >
                                    <div className="flex items-center space-x-2 min-w-0">
                                        <i className="fas fa-grip-vertical text-gray-400 dark:text-gray-500 cursor-grab"></i>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{pub.name}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => onTogglePubSelection(pub)} className="w-6 h-6 text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 space-y-2">
                <button type="button" onClick={onAttachPubsClick} className="w-full flex items-center justify-center space-x-2 p-2 text-amber-500 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                    <i className="fas fa-beer text-xl"></i>
                    <span className="font-semibold text-sm">Attach Pubs ({selectedPubs.length}/{MAX_PUBS_PER_POST})</span>
                </button>
                {userProfile?.is_developer && (
                    <div className="px-2">
                        <label htmlFor="is-announcement-toggle" className="flex items-center justify-between cursor-pointer py-1">
                            <span className="flex flex-col">
                                <span className="font-semibold text-sm text-amber-600 dark:text-amber-400">Mark as Announcement</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Pins post and highlights it in feed.</span>
                            </span>
                            <div className="relative">
                                <input
                                    id="is-announcement-toggle"
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isAnnouncement}
                                    onChange={() => setIsAnnouncement(p => !p)}
                                />
                                <div className="block w-11 h-6 rounded-full transition-colors bg-gray-300 peer-checked:bg-amber-500 dark:bg-gray-600"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                            </div>
                        </label>
                    </div>
                )}
            </div>
        </form>
    );
});

const CreatePostModal = ({ userProfile, onClose, onPostSuccess, userRatings, editingPost = null, createPostModalOrigin }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [isPubSelectorOpen, setIsPubSelectorOpen] = useState(false);
    const [selectedPubs, setSelectedPubs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [isAnnouncement, setIsAnnouncement] = useState(false);

    useEffect(() => {
        if (editingPost) {
            setTitle(editingPost.title || '');
            setContent(editingPost.content || '');
            setIsAnnouncement(editingPost.is_announcement || false);
            const pubs = (editingPost.attached_pubs || []).map(ap => ap.pub).filter(Boolean);
            setSelectedPubs(pubs);
        }
    }, [editingPost]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!title.trim() && !content.trim() && selectedPubs.length === 0) {
            setError('Your post needs a title, some content, or at least one attached pub.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            if (editingPost) {
                // UPDATE LOGIC
                const { error: postError } = await supabase
                    .from('posts')
                    .update({ title: title.trim(), content: content.trim(), is_announcement: isAnnouncement })
                    .eq('id', editingPost.id);
                if (postError) throw postError;

                const { error: deleteError } = await supabase.from('post_pubs').delete().eq('post_id', editingPost.id);
                if (deleteError) throw deleteError;

                if (selectedPubs.length > 0) {
                    const postPubsData = selectedPubs.map((pub, index) => ({ post_id: editingPost.id, pub_id: pub.id, list_order: index + 1 }));
                    const { error: insertError } = await supabase.from('post_pubs').insert(postPubsData);
                    if (insertError) throw insertError;
                }
                trackEvent('edit_post', { post_id: editingPost.id, attached_pubs_count: selectedPubs.length });
            } else {
                // INSERT LOGIC
                const { data: postData, error: postError } = await supabase.from('posts').insert({ 
                    user_id: userProfile.id, 
                    title: title.trim(), 
                    content: content.trim(),
                    is_announcement: isAnnouncement,
                }).select().single();
                if (postError) throw postError;

                if (selectedPubs.length > 0) {
                    const postPubsData = selectedPubs.map((pub, index) => ({ post_id: postData.id, pub_id: pub.id, list_order: index + 1 }));
                    const { error: postPubsError } = await supabase.from('post_pubs').insert(postPubsData);
                    if (postPubsError) throw postPubsError;
                }
                trackEvent('create_post', { has_title: !!title.trim(), has_content: !!content.trim(), attached_pubs_count: selectedPubs.length, is_announcement: isAnnouncement });
            }
            onPostSuccess();
        } catch (err) {
            console.error("Error submitting post:", err);
            setError(`Could not submit post: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [title, content, selectedPubs, userProfile, onPostSuccess, isAnnouncement, editingPost]);
    
    const togglePubSelection = useCallback((pub) => {
        setSelectedPubs(prev => {
            const isAlreadySelected = prev.some(p => p.id === pub.id);
            if (isAlreadySelected) return prev.filter(p => p.id !== pub.id);
            if (prev.length >= MAX_PUBS_PER_POST) return prev;
            return [...prev, pub];
        });
    }, []);
    
    const handleDragStart = useCallback((e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragEnter = useCallback((e, index) => {
        e.preventDefault();
        if (index !== draggedIndex) {
            setDragOverIndex(index);
        }
    }, [draggedIndex]);
    
    const handleDragOver = useCallback((e) => e.preventDefault(), []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }
        const newSelectedPubs = [...selectedPubs];
        const [draggedItem] = newSelectedPubs.splice(draggedIndex, 1);
        newSelectedPubs.splice(dragOverIndex, 0, draggedItem);
        setSelectedPubs(newSelectedPubs);
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, [draggedIndex, dragOverIndex, selectedPubs]);

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, []);

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex justify-center items-center p-0 sm:p-4 animate-modal-fade-in"
            onClick={onClose} role="dialog" aria-modal="true"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg flex flex-col pt-[env(safe-area-inset-top)] sm:pt-0"
                onClick={(e) => e.stopPropagation()}
            >
                {isPubSelectorOpen ? (
                    <PubSelectorView 
                        onBack={() => setIsPubSelectorOpen(false)}
                        selectedPubs={selectedPubs}
                        onTogglePub={togglePubSelection}
                        userRatings={userRatings}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                ) : (
                    <MainView 
                        userProfile={userProfile}
                        title={title}
                        setTitle={setTitle}
                        content={content}
                        setContent={setContent}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        error={error}
                        onClose={onClose}
                        onAttachPubsClick={() => setIsPubSelectorOpen(true)}
                        selectedPubs={selectedPubs}
                        onTogglePubSelection={togglePubSelection}
                        draggedIndex={draggedIndex}
                        dragOverIndex={dragOverIndex}
                        handleDragStart={handleDragStart}
                        handleDragEnter={handleDragEnter}
                        handleDragOver={handleDragOver}
                        handleDrop={handleDrop}
                        handleDragEnd={handleDragEnd}
                        isAnnouncement={isAnnouncement}
                        setIsAnnouncement={setIsAnnouncement}
                        isEditing={!!editingPost}
                        createPostModalOrigin={createPostModalOrigin}
                    />
                )}
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    return modalRoot ? createPortal(modalContent, modalRoot) : null;
};

export default memo(CreatePostModal);
