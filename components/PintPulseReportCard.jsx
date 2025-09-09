import React, { useState, useMemo } from 'react';
import { trackEvent } from '../analytics.js';

const PintPulseReportCard = ({ title, content }) => {
    const [copyStatus, setCopyStatus] = useState(false);

    const parsedContent = useMemo(() => {
        if (!content) return {};
        const sections = {};
        // More robust regex to handle markdown headers (# or ##) and optional colons/text.
        const patterns = {
            vibe: /#+\s*Overall Vibe\s*[:\s]*([\s\S]*?)(?=\n#+\s*Top Trends|$)/i,
            trends: /#+\s*Top Trends(?: \(.*?\))?[:\s]*([\s\S]*?)(?=\n#+\s*Hidden Gem|$)/i,
            gem: /#+\s*Hidden Gem\s*[:\s]*([\s\S]*?)(?=\n#+\s*Data-Driven Question for the Community|$)/i,
            question: /#+\s*Data-Driven Question for the Community\s*[:\s]*([\s\S]*?)(?=\n#+\s*Summary|$)/i,
            summary: /#+\s*Summary\s*[:\s]*([\s\S]*)/i
        };

        sections.vibe = content.match(patterns.vibe)?.[1]?.trim();
        sections.trends = content.match(patterns.trends)?.[1]?.trim().split(/[\r\n]+/).map(item => {
            const trimmedItem = item.trim();
            if (!trimmedItem) return null;
            // Match patterns like "* **Title:** Text" or "- **Title:** Text"
            const match = trimmedItem.match(/^[*\-]\s*\*\*(.*?):\*\*\s*(.*)/);
            if (match) {
                return { title: match[1].trim(), text: match[2].trim() };
            }
            // Fallback for simple list items without a bolded title
            return { title: null, text: trimmedItem.replace(/^[*\-]\s*/, '').trim() };
        }).filter(Boolean); // Use filter(Boolean) to remove null entries
        sections.gem = content.match(patterns.gem)?.[1]?.trim().replace(/\*\*(.*?)\*\*/g, '$1');
        sections.question = content.match(patterns.question)?.[1]?.trim().replace(/\*\*(.*?)\*\*/g, '$1');
        sections.summary = content.match(patterns.summary)?.[1]?.trim();

        return sections;
    }, [content]);

    const hasParsedContent = Object.values(parsedContent).some(value => value && (!Array.isArray(value) || value.length > 0));

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopyStatus(true);
        trackEvent('social_hub_copy_report', { report_title: title });
        setTimeout(() => setCopyStatus(false), 2000);
    };
    
    const TrendCard = ({ trend, icon }) => (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex items-start space-x-3">
            <i className={`fas ${icon} text-amber-500 mt-1`}></i>
            <div>
                {trend.title && <h5 className="font-semibold text-gray-800 dark:text-white">{trend.title}</h5>}
                <p className={`text-sm text-gray-600 dark:text-gray-300 ${trend.title ? 'mt-1' : ''}`}>{trend.text}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-blue-500 animate-fade-in-down">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                        <i className="fas fa-chart-line text-2xl text-blue-500"></i>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold py-1 px-3 rounded-md transition-colors"
                    >
                        {copyStatus ? 'Copied!' : 'Copy Text'}
                    </button>
                </div>

                <div className="space-y-4">
                    {hasParsedContent ? (
                        <>
                            {parsedContent.vibe && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                    <p className="text-sm italic text-gray-700 dark:text-gray-300">"{parsedContent.vibe}"</p>
                                </div>
                            )}

                            {parsedContent.trends?.length > 0 && (
                                <div className="space-y-3">
                                    {parsedContent.trends.map((trend, index) => {
                                        const trendIcons = ['fa-lightbulb', 'fa-map-signs', 'fa-money-bill-wave', 'fa-gavel'];
                                        return <TrendCard key={index} trend={trend} icon={trendIcons[index % trendIcons.length]} />;
                                    })}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                {parsedContent.gem && (
                                    <div className="p-3 bg-green-500/10 rounded-lg">
                                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1 flex items-center space-x-2">
                                            <i className="fas fa-gem"></i>
                                            <span>Hidden Gem</span>
                                        </h4>
                                        <p className="text-sm text-green-700 dark:text-green-400">{parsedContent.gem}</p>
                                    </div>
                                )}

                                {parsedContent.question && (
                                    <div className="p-3 bg-blue-500/10 rounded-lg">
                                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 flex items-center space-x-2">
                                            <i className="fas fa-question-circle"></i>
                                            <span>Community Question</span>
                                        </h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-400">{parsedContent.question}</p>
                                    </div>
                                )}
                            </div>
                            
                            {parsedContent.summary && (
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{parsedContent.summary}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Full Report (Unstructured)</h4>
                            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
                                {content || "The AI did not return a response for this report."}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PintPulseReportCard;