import React, { useState, useEffect, useMemo, useRef } from 'react';
import Avatar from './Avatar.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

const MAX_SUBMIT_LENGTH = 500;

const CommentForm = ({ currentUserProfile, isSubmitting, onSubmit, placeholder, initialValue = '', onCancel, autoFocus = false }) => {
    const [content, setContent] = useState(initialValue);
    const textareaRef = useRef(null);
    const isDesktop = useIsDesktop();

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to the end
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = content.length;
        }
    }, [autoFocus, content.length]);

    const effectivePlaceholder = useMemo(() => {
        if (placeholder) return placeholder; // If a specific placeholder is passed (like "Replying to..."), use it.
        return "Add a comment...";
    }, [placeholder]);

    const handleKeyDown = (e) => {
        if (isDesktop && e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isSubmitting) {
             e.preventDefault();
             handleSubmit(e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim() || isSubmitting) return;
        onSubmit(content.trim());
        setContent(''); // Clear after submit
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="flex items-start space-x-2 pt-2">
            <Avatar avatarId={currentUserProfile.avatar_id} className="w-8 h-8 flex-shrink-0 mt-1" />
            <div className="flex-grow">
                 <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={effectivePlaceholder}
                    maxLength={MAX_SUBMIT_LENGTH}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    rows="1"
                    onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                />
                <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                    {content.length}/{MAX_SUBMIT_LENGTH}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="text-xs font-semibold px-3 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!content.trim() || isSubmitting}
                        className="bg-amber-500 text-black font-bold py-1 px-3 rounded-lg text-sm hover:bg-amber-400 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isSubmitting ? '...' : 'Post'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default CommentForm;