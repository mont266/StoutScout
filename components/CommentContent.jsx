import React from 'react';

// A simple component to render text content, respecting whitespace.
const CommentContent = ({ content }) => {
    return (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words whitespace-pre-wrap">
            {content}
        </p>
    );
};

export default CommentContent;
