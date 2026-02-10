import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import { formatTimeAgo } from '../utils.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';

const TabButton = ({ label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-bold transition-all duration-300 border-b-2 flex items-center justify-center gap-2 ${
            isActive 
                ? 'text-red-500 border-red-500' 
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-red-500/70 hover:border-red-500/30'
        }`}
    >
        <span>{label}</span>
        {count > 0 && <span className="bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
    </button>
);

const ReportCard = ({ report, onResolve, onViewProfile, isProcessing }) => {
    const {
        report_id, reported_at, reason, content_type,
        reporter_username, author_id, author_username, author_avatar_id,
        text_content, image_url, context_description
    } = report;

    return (
        <li className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-red-500 flex flex-col sm:flex-row">
            <div className="p-3 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="font-bold text-red-600 dark:text-red-400">Reason: {reason}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Reported {formatTimeAgo(new Date(reported_at).getTime())} by <span className="font-semibold">{reporter_username}</span>
                        </p>
                    </div>
                    <span className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs font-bold px-2 py-1 rounded-full capitalize">{content_type}</span>
                </div>
                
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                    {image_url && <img src={image_url} alt="Reported content" className="rounded-md w-full h-auto max-h-60 object-contain mb-2" />}
                    {text_content && <blockquote className="text-sm italic text-gray-700 dark:text-gray-300 break-words">"{text_content}"</blockquote>}
                    
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Avatar avatarId={author_avatar_id} className="w-6 h-6 flex-shrink-0" />
                        <div className="text-xs text-gray-500 dark:text-gray-400 min-w-0">
                            <p className="truncate">
                                Content by: <button onClick={() => onViewProfile(author_id, 'moderation')} className="font-semibold hover:underline text-amber-600 dark:text-amber-400">{author_username}</button>
                            </p>
                            <p className="truncate">Context: {context_description}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 p-3 flex sm:flex-col items-center justify-around sm:justify-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => onResolve(report_id, 'ignore')}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300 font-bold py-2 px-4 rounded-lg hover:bg-green-200 dark:hover:bg-green-700/50 transition-colors text-sm disabled:opacity-50"
                >
                    {isProcessing ? '...' : 'Ignore'}
                </button>
                <button 
                    onClick={() => onResolve(report_id, 'remove')}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-300 font-bold py-2 px-4 rounded-lg hover:bg-red-200 dark:hover:bg-red-700/50 transition-colors text-sm disabled:opacity-50"
                >
                    {isProcessing ? '...' : 'Remove'}
                </button>
            </div>
        </li>
    );
};

const ModerationPage = ({ onViewProfile, onBack, onDataRefresh, reports, onFetchReports, onResolveReport, onAdminDeleteComment }) => {
    const [activeTab, setActiveTab] = useState('reports'); // 'users', 'reports', 'ai'
    const [flaggedUsers, setFlaggedUsers] = useState([]);
    const [suggestedEdits, setSuggestedEdits] = useState([]);
    const [aiFlags, setAiFlags] = useState([]);
    const [loading, setLoading] = useState({ users: true, reports: true, edits: true, ai: true });
    const [error, setError] = useState({ users: null, reports: null, edits: null, ai: null });
    const [processingActionId, setProcessingActionId] = useState(null);
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [alertInfo, setAlertInfo] = useState({ isOpen: false });
    const [aiLastRun, setAiLastRun] = useState(null);


    const fetchFlaggedUsers = useCallback(async () => {
        setLoading(p => ({ ...p, users: true }));
        setError(p => ({ ...p, users: null }));
        trackEvent('refresh_moderation_list', { type: 'users' });

        const { data, error: rpcError } = await supabase.rpc('get_flagged_users');

        if (rpcError) {
            console.error('Error fetching flagged users:', rpcError);
            setError(p => ({ ...p, users: 'Could not load flagged users.' }));
            setFlaggedUsers([]);
        } else {
            setFlaggedUsers(data || []);
        }
        setLoading(p => ({ ...p, users: false }));
    }, []);
    
    const fetchSuggestedEdits = useCallback(async () => {
        setLoading(p => ({ ...p, edits: true }));
        setError(p => ({...p, edits: null}));
        trackEvent('refresh_moderation_list', { type: 'edits' });

        const { data, error } = await supabase
            .from('pub_edit_suggestions')
            .select('*, user:user_id(id, username, avatar_id)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching suggested edits:', error);
            setError(p => ({...p, edits: 'Could not load suggested edits.'}));
            setSuggestedEdits([]);
        } else {
            setSuggestedEdits(data || []);
        }
        setLoading(p => ({ ...p, edits: false }));
    }, []);

    const fetchAiFlags = useCallback(async () => {
        setLoading(p => ({ ...p, ai: true }));
        setError(p => ({ ...p, ai: null }));
        trackEvent('refresh_moderation_list', { type: 'ai_flags' });
    
        try {
            const { data: lastFlag, error: lastFlagError } = await supabase
                .from('ai_moderation_flags')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastFlagError && lastFlagError.code !== 'PGRST116') {
                console.error('Error fetching last AI flag timestamp:', lastFlagError);
            } else if (lastFlag) {
                setAiLastRun(lastFlag.created_at);
            }
            // Other AI flag fetching logic will go here
            setAiFlags([]);
    
        } catch (err) {
            console.error('Error fetching AI flags:', err);
            setError(p => ({ ...p, ai: 'Could not load AI-flagged content. ' + err.message }));
            setAiFlags([]);
        } finally {
            setLoading(p => ({ ...p, ai: false }));
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchFlaggedUsers();
        }
        if (activeTab === 'reports') {
            setLoading(p => ({ ...p, reports: true }));
            onFetchReports().finally(() => setLoading(p => ({ ...p, reports: false })));
            fetchSuggestedEdits();
        }
        if (activeTab === 'ai') {
            fetchAiFlags();
        }
    }, [activeTab, fetchFlaggedUsers, fetchSuggestedEdits, onFetchReports, fetchAiFlags]);

    const handleRefresh = () => {
        if (activeTab === 'users') fetchFlaggedUsers();
        if (activeTab === 'reports') {
            onFetchReports();
            fetchSuggestedEdits();
        }
        if (activeTab === 'ai') fetchAiFlags();
    };

    const handleApproveEdit = async (suggestionId) => {
        // ... (implementation exists in App.jsx and can be moved here if needed)
    };
    
    const handleRejectEdit = async (suggestionId) => {
        // ...
    };

    const confirmIgnoreFlag = (userId) => {
        // ...
    };

    const handleIgnoreFlag = async (userId) => {
        // ...
    };

    const renderFlaggedUsers = () => {
        if (loading.users) return <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400 mx-auto mt-8"></div>;
        if (error.users) return <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">{error.users}</div>;
        if (flaggedUsers.length === 0) return (
            <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <i className="fas fa-check-circle fa-2x mb-2 text-green-500"></i>
                <p className="font-semibold">All clear!</p>
                <p className="text-sm">No users are currently matching the flagging criteria.</p>
            </div>
        );

        return (
            <ul className="space-y-3">
                {flaggedUsers.map(user => (
                    <li key={user.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-md border-l-4 border-red-500">
                        {/* ... user item JSX ... */}
                    </li>
                ))}
            </ul>
        );
    };
    
    const renderReports = () => {
        if (loading.reports) return <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400 mx-auto mt-8"></div>;
        if ((reports || []).length === 0) return (
            <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <i className="fas fa-check-circle fa-2x mb-2 text-green-500"></i>
                <p className="font-semibold">All clear!</p>
                <p className="text-sm">No content is currently waiting for review.</p>
            </div>
        );
        return (
            <ul className="space-y-4">
                {reports.map(report => (
                    <ReportCard
                        key={report.report_id}
                        report={report}
                        onResolve={onResolveReport}
                        onViewProfile={onViewProfile}
                        isProcessing={processingActionId === report.report_id}
                    />
                ))}
            </ul>
        );
    };
    
    const renderSuggestedEdits = () => {
        // ... implementation
        return <div className="text-center text-gray-500 p-6">Edits section coming soon.</div>
    };

    const renderAiFlags = () => {
        // ... implementation
        return <div className="text-center text-gray-500 p-6">AI moderation coming soon.</div>
    };

    return (
        <>
            {alertInfo.isOpen && <AlertModal {...alertInfo} onClose={() => setAlertInfo({ isOpen: false })} />}
            {confirmation.isOpen && <ConfirmationModal {...confirmation} isLoading={!!processingActionId} onClose={() => setConfirmation({ isOpen: false })} />}
            <div className="flex flex-col h-full">
                {onBack && (
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg transition-colors">
                          <i className="fas fa-arrow-left"></i>
                          <span className="font-semibold">Back to Settings</span>
                      </button>
                  </div>
                )}
                <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-red-500 dark:text-red-400">Moderation Center</h3>
                        <button
                            onClick={handleRefresh}
                            disabled={loading[activeTab]}
                            className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh list"
                            title="Refresh list"
                        >
                            <i className={`fas fa-sync-alt ${loading[activeTab] ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                    <div className="mt-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex">
                            <TabButton label="User Reports" count={(reports || []).length} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                            <TabButton label="Flagged Users" count={flaggedUsers.length} isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                            <TabButton label="AI Moderator" count={aiFlags.length} isActive={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
                        </div>
                    </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    {activeTab === 'users' && renderFlaggedUsers()}
                    {activeTab === 'reports' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">User Submitted Reports ({reports.length})</h4>
                                {renderReports()}
                            </div>
                        </div>
                    )}
                     {activeTab === 'ai' && renderAiFlags()}
                </div>
            </div>
        </>
    );
};

export default ModerationPage;