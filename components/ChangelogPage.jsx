import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { trackEvent } from '../analytics.js';
import { createPortal } from 'react-dom';

const ChangeItem = ({ type, description }) => {
    const config = {
        new: { icon: 'fa-star', color: 'text-green-500 dark:text-green-400', label: 'NEW' },
        improvement: { icon: 'fa-arrow-alt-circle-up', color: 'text-blue-500 dark:text-blue-400', label: 'IMPROVEMENT' },
        fix: { icon: 'fa-bug', color: 'text-orange-500 dark:text-orange-400', label: 'FIX' },
    }[type] || { icon: 'fa-info-circle', color: 'text-gray-500 dark:text-gray-400', label: 'UPDATE' };

    return (
        <li className="flex items-start space-x-3">
            <i className={`fas ${config.icon} ${config.color} mt-1 w-5 text-center`}></i>
            <p className="flex-1 text-gray-700 dark:text-gray-300">{description}</p>
        </li>
    );
};

const ChangelogPage = ({ onClose }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const fetchChangelog = async () => {
            setLoading(true);
            setError(null);
            trackEvent('view_changelog');
            try {
                const { data, error: dbError } = await supabase
                    .from('changelog_items')
                    .select('*')
                    .eq('is_published', true)
                    .order('release_date', { ascending: false });

                if (dbError) throw dbError;
                
                setItems(data || []);
                if (data && data.length > 0) {
                    setExpandedId(data[0].id); // Expand the latest item by default
                }
            } catch (err) {
                console.error("Error fetching changelog:", err);
                setError("Could not load the changelog. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchChangelog();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
        });
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h1 id="changelog-title" className="text-2xl font-bold text-gray-900 dark:text-white">What's New in Stoutly</h1>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full" aria-label="Close">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </header>
                <main className="flex-grow overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
                    {loading && (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                        </div>
                    )}
                    {error && <div className="text-center text-red-500">{error}</div>}
                    {!loading && !error && (
                        <div className="space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                                    <p>No updates to show right now. Check back soon!</p>
                                </div>
                            ) : (
                                items.map((item, index) => (
                                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <button
                                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                            className="w-full flex justify-between items-center text-left p-4"
                                            aria-expanded={expandedId === item.id}
                                        >
                                            <div className="flex-grow">
                                                <div className="flex items-center space-x-3">
                                                    <h2 className="font-bold text-lg text-gray-800 dark:text-white">{item.version}</h2>
                                                    {index === 0 && <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full">New</span>}
                                                </div>
                                                {item.title && <p className="text-amber-600 dark:text-amber-400 font-semibold mt-1">{item.title}</p>}
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(item.release_date)}</p>
                                            </div>
                                            <i className={`fas fa-chevron-down text-gray-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        <div className={`accordion-content ${expandedId === item.id ? 'expanded' : ''}`}>
                                            <div>
                                                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                                    <ul className="space-y-3">
                                                        {(item.changes || []).map((change, idx) => (
                                                            <ChangeItem key={idx} {...change} />
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default ChangelogPage;