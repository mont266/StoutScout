import React from 'react';

const mentionRegex = /(@[\w]+)/g;

// A simple component to render text content, respecting whitespace and highlighting mentions.
const CommentContent = ({ content, onViewProfileByUsername }) => {
    // Split the text by the regex, which will interleave plain text with the matches.
    const parts = content.split(mentionRegex);

    return (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (onViewProfileByUsername && part.match(mentionRegex)) {
                    // If the part is a mention, wrap it in a styled button.
                    const username = part.substring(1); // remove '@'
                    return (
                        <button 
                            key={i} 
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent card click-through
                                onViewProfileByUsername(username);
                            }}
                            className="font-semibold text-amber-600 dark:text-amber-400 hover:underline focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                        >
                            {part}
                        </button>
                    );
                }
                // Otherwise, it's just plain text.
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
};

export default CommentContent;
