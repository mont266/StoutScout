import React, { useState } from 'react';
import { trackEvent } from '../analytics.js';

const BannedPage = ({ userProfile, onLogout }) => {
    const { username, ban_reason, banned_at } = userProfile;
    const [appealReason, setAppealReason] = useState('');
    const [formState, setFormState] = useState({ loading: false, success: false, error: null });

    const formattedBanDate = banned_at ? new Date(banned_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }) : 'an unknown date';

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormState({ loading: true, success: false, error: null });
        trackEvent('generate_lead', { lead_type: 'ban_appeal' });

        const formData = new FormData();
        formData.append('form-name', 'ban-appeal');
        formData.append('user_id', userProfile.id);
        formData.append('username', username);
        formData.append('appeal_reason', appealReason);

        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString(),
            });

            if (response.ok) {
                setFormState({ loading: false, success: true, error: null });
                trackEvent('ban_appeal_success');
            } else {
                throw new Error('Form submission failed. Please try again later.');
            }
        } catch (error) {
            setFormState({ loading: false, success: false, error: error.message });
            trackEvent('ban_appeal_failed', { error_message: error.message });
        }
    };


    return (
        <div className="w-full h-dvh flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border-t-8 border-red-600">
                <div className="text-center">
                    <i className="fas fa-gavel text-5xl text-red-500 mb-4"></i>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Account Banned</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Your account, <span className="font-bold">{username}</span>, was banned on {formattedBanDate}.
                    </p>
                </div>

                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg">
                    <h2 className="font-semibold text-red-800 dark:text-red-300">Reason for Ban:</h2>
                    <p className="mt-1 text-red-700 dark:text-red-400">{ban_reason || 'No reason was provided.'}</p>
                </div>

                <div className="mt-6">
                    {formState.success ? (
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <i className="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                            <h3 className="font-semibold text-green-800 dark:text-green-300">Appeal Submitted</h3>
                            <p className="text-sm text-green-700 dark:text-green-400">Thank you. We have received your appeal and will review it shortly.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                             <div>
                                <label htmlFor="appeal-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    If you believe this was a mistake, you may submit an appeal:
                                </label>
                                <textarea
                                    id="appeal-reason"
                                    name="appeal_reason"
                                    rows="4"
                                    value={appealReason}
                                    onChange={(e) => setAppealReason(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                                    required
                                    placeholder="Please explain why you believe your ban should be lifted."
                                ></textarea>
                            </div>
                            {formState.error && (
                                <p className="text-red-500 text-sm">{formState.error}</p>
                            )}
                            <button
                                type="submit"
                                disabled={formState.loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-gray-800 disabled:bg-amber-300 disabled:cursor-wait"
                            >
                                {formState.loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    'Submit Appeal'
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
                    <button
                        onClick={onLogout}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BannedPage;