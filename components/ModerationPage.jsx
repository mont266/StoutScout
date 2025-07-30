import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import Avatar from './Avatar.jsx';
import { trackEvent } from '../analytics.js';
import { formatTimeAgo } from '../utils.js';
import ConfirmationModal from './ConfirmationModal.jsx';
import AlertModal from './AlertModal.jsx';

const TabButton = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-bold transition-all duration-300 border-b-2 ${
            isActive 
                ? 'text-red-500 border-red-500' 
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-red-500/70 hover:border-red-500/30'
        }`}
    >
        {label}
    </button>
);

const ModerationPage = ({ onViewProfile, onBack, onDataRefresh }) => {
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'images'
    const [flaggedUsers, setFlaggedUsers] = useState([]);
    const [reportedImages, setReportedImages] = useState([]);
    const [loading, setLoading] = useState({ users: true, images: true });
    const [error, setError] = useState({ users: null, images: null });
    const [processingActionId, setProcessingActionId] = useState(null); // stores user or report ID being processed
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [alertInfo, setAlertInfo] = useState({ isOpen: false });

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

    const fetchReportedImages = useCallback(async () => {
        setLoading(p => ({ ...p, images: true }));
        setError(p => ({ ...p, images: null }));
        trackEvent('refresh_moderation_list', { type: 'images' });

        const { data, error } = await supabase
            .from('reported_images')
            .select(`
                *,
                rating:ratings!inner(
                  id,
                  image_url,
                  user_id,
                  uploader:profiles!user_id (id, username, avatar_id),
                  pub:pubs!pub_id (name)
                ),
                reporter:profiles!reported_images_reporter_id_fkey (id, username)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching reported images:', error);
            setError(p => ({...p, images: 'Could not load reported images.'}));
            setReportedImages([]);
        } else {
            setReportedImages(data || []);
        }
        setLoading(p => ({ ...p, images: false }));
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchFlaggedUsers();
        } else if (activeTab === 'images') {
            fetchReportedImages();
        }
    }, [activeTab, fetchFlaggedUsers, fetchReportedImages]);

    const handleRefresh = () => {
        if (activeTab === 'users') {
            fetchFlaggedUsers();
        } else {
            fetchReportedImages();
        }
    };
    
    const confirmResolveReport = (report, action) => {
        setConfirmation({
            isOpen: true,
            title: `Confirm Action: ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            message: `Are you sure you want to '${action}' this image? This action is permanent.`,
            onConfirm: async () => {
                await handleResolveReport(report, action);
                setConfirmation({ isOpen: false });
            },
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            theme: action === 'remove' ? 'red' : 'green'
        });
    };

    const handleResolveReport = async (report, action) => {
        setProcessingActionId(report.id);
        trackEvent('resolve_image_report', { report_id: report.id, action });

        if (!report.rating || !report.rating.uploader) {
            setAlertInfo({ isOpen: true, title: 'Error', message: 'Missing rating or uploader data for this report. Cannot proceed.', theme: 'error'});
            setProcessingActionId(null);
            return;
        }

        const { error } = await supabase.functions.invoke('resolve-report', {
            body: { 
                report_id: report.id, 
                action: action,
                rating_id: report.rating.id,
                uploader_id: report.rating.uploader.id,
            },
        });
        
        if (error) {
            setAlertInfo({ isOpen: true, title: 'Action Failed', message: `Failed to resolve report: ${error.context?.responseJson?.error || error.message}`, theme: 'error'});
        } else {
            setReportedImages(current => current.filter(r => r.id !== report.id));
            if (onDataRefresh) onDataRefresh();
            fetchFlaggedUsers();
        }
        setProcessingActionId(null);
    };

    const confirmIgnoreFlag = (userId) => {
        setConfirmation({
            isOpen: true,
            title: 'Ignore Flags?',
            message: "Are you sure you want to ignore this user's flags? They won't appear here for 30 days unless they trigger new criteria.",
            onConfirm: async () => {
                await handleIgnoreFlag(userId);
                setConfirmation({ isOpen: false });
            },
            confirmText: 'Ignore',
            theme: 'blue'
        });
    };

    const handleIgnoreFlag = async (userId) => {
        setProcessingActionId(userId);
        trackEvent('ignore_user_flag', { ignored_user_id: userId });

        const { error } = await supabase.functions.invoke('ignore-user-flag', {
            body: { user_id: userId },
        });

        if (error) {
            setAlertInfo({ isOpen: true, title: 'Action Failed', message: `Failed to ignore flag: ${error.context?.responseJson?.error || error.message}`, theme: 'error'});
        } else {
            setFlaggedUsers(current => current.filter(u => u.id !== userId));
        }
        setProcessingActionId(null);
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
                        <div className="flex items-center space-x-4">
                            <Avatar avatarId={user.avatar_id} className="w-12 h-12 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{user.username}</p>
                                <div className="text-sm text-red-600 dark:text-red-400 font-semibold space-y-1">
                                    {user.one_star_quality_ratings > 0 && user.total_ratings > 0 && (user.one_star_quality_ratings / user.total_ratings) > 0.5 && (
                                        <div><i className="fas fa-star w-4"></i>{user.one_star_quality_ratings} of {user.total_ratings} ratings are 1-star.</div>
                                    )}
                                    {user.removed_image_count > 0 && (
                                         <div><i className="fas fa-image w-4"></i>{user.removed_image_count} image(s) removed.</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <button
                                    onClick={() => confirmIgnoreFlag(user.id)}
                                    disabled={processingActionId === user.id}
                                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs disabled:opacity-50"
                                >
                                    {processingActionId === user.id ? '...' : 'Ignore'}
                                </button>
                                <button 
                                    onClick={() => onViewProfile(user.id, 'moderation')}
                                    disabled={processingActionId === user.id}
                                    className="bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors text-sm disabled:opacity-50"
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };
    
    const renderReportedImages = () => {
        if (loading.images) return <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400 mx-auto mt-8"></div>;
        if (error.images) return <div className="text-center text-red-500 p-6 bg-red-500/10 rounded-lg">{error.images}</div>;
        if (reportedImages.length === 0) return (
             <div className="text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <i className="fas fa-check-circle fa-2x mb-2 text-green-500"></i>
                <p className="font-semibold">All clear!</p>
                <p className="text-sm">No images are currently waiting for review.</p>
            </div>
        );

        return (
            <ul className="space-y-4">
                {reportedImages.map(report => {
                    if (!report.rating || !report.rating.image_url) {
                        return (
                             <li key={report.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-yellow-500 p-4 text-center">
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    The image for this report was deleted. This can be ignored.
                                </p>
                            </li>
                        );
                    }
                    return (
                    <li key={report.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-red-500 flex flex-col sm:flex-row">
                        <img src={report.rating.image_url} alt="Reported pint" className="w-full sm:w-32 h-32 object-cover flex-shrink-0 rounded-t-lg sm:rounded-l-lg sm:rounded-t-none" />
                        <div className="p-3 flex-grow">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Reported {formatTimeAgo(new Date(report.created_at).getTime())} by <span className="font-semibold">{report.reporter?.username || 'Unknown'}</span>
                            </div>
                             <div className="font-bold text-red-600 dark:text-red-400 mt-1">Reason: {report.reason}</div>
                            <div className="mt-2 text-sm">
                                <p>Uploader: <button onClick={() => onViewProfile(report.rating.uploader.id, 'moderation')} className="font-semibold hover:underline text-amber-600 dark:text-amber-400">{report.rating.uploader.username}</button></p>
                                <p>Pub: <span className="font-semibold">{report.rating.pub?.name || 'Unknown Pub'}</span></p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 p-3 flex sm:flex-col items-center justify-around sm:justify-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={() => confirmResolveReport(report, 'allow')}
                                disabled={processingActionId === report.id}
                                className="w-full sm:w-auto bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-300 font-bold py-2 px-4 rounded-lg hover:bg-green-200 dark:hover:bg-green-700/50 transition-colors text-sm disabled:opacity-50"
                            >
                                {processingActionId === report.id ? '...' : 'Allow'}
                            </button>
                             <button 
                                onClick={() => confirmResolveReport(report, 'remove')}
                                disabled={processingActionId === report.id}
                                className="w-full sm:w-auto bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-300 font-bold py-2 px-4 rounded-lg hover:bg-red-200 dark:hover:bg-red-700/50 transition-colors text-sm disabled:opacity-50"
                            >
                                {processingActionId === report.id ? '...' : 'Remove'}
                            </button>
                        </div>
                    </li>
                )})}
            </ul>
        );
    }
    
    const isLoading = activeTab === 'users' ? loading.users : loading.images;

    return (
        <>
            {alertInfo.isOpen && (
                <AlertModal 
                    onClose={() => setAlertInfo({ isOpen: false })}
                    title={alertInfo.title}
                    message={alertInfo.message}
                    theme={alertInfo.theme}
                />
            )}
            {confirmation.isOpen && (
                <ConfirmationModal
                    onClose={() => setConfirmation({ isOpen: false })}
                    onConfirm={confirmation.onConfirm}
                    isLoading={!!processingActionId}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmText={confirmation.confirmText}
                    theme={confirmation.theme}
                />
            )}
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
                            disabled={isLoading}
                            className="w-10 h-10 text-lg rounded-full flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait"
                            aria-label="Refresh list"
                            title="Refresh list"
                        >
                            <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>
                    <div className="mt-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex">
                            <TabButton label="Flagged Users" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                            <TabButton label="Reported Images" isActive={activeTab === 'images'} onClick={() => setActiveTab('images')} />
                        </div>
                    </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    {activeTab === 'users' && renderFlaggedUsers()}
                    {activeTab === 'images' && renderReportedImages()}
                </div>
            </div>
        </>
    );
};

export default ModerationPage;