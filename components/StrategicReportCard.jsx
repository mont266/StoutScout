import React, { useState } from 'react';
import { trackEvent } from '../analytics.js';

const StrategicReportCard = ({ title, content }) => {
    const [copyStatus, setCopyStatus] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopyStatus(true);
        trackEvent('social_hub_copy_report', { report_title: title });
        setTimeout(() => setCopyStatus(false), 2000);
    };
    
    // A simple markdown-to-HTML converter for basic formatting
    const renderMarkdown = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
            .replace(/^(#+)\s*(.*)/gm, (match, hashes, content) => { // Headers
                const level = hashes.length;
                return `<h${level + 3} class="font-bold mt-4 mb-2">${content}</h${level + 3}>`;
            })
            .replace(/-\s(.*)/g, '<li class="ml-5 list-disc">$1</li>') // List items
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>') // Wrap lists
            .replace(/\n/g, '<br />'); // Newlines
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-blue-500 animate-fade-in-down">
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{title}</h3>
                    <button
                        onClick={handleCopy}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold py-1 px-3 rounded-md transition-colors"
                    >
                        {copyStatus ? 'Copied!' : 'Copy Text'}
                    </button>
                </div>

                <div
                    className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-2"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
            </div>
        </div>
    );
};

export default StrategicReportCard;
