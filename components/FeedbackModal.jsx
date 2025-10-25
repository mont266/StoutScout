import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../analytics.js';
import { Capacitor } from '@capacitor/core';

const FeedbackModal = ({ userProfile, onClose }) => {
    const [type, setType] = useState('bug');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [formState, setFormState] = useState({ loading: false, success: false, error: null });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormState({ loading: true, success: false, error: null });
        trackEvent('generate_lead', { lead_type: 'feedback_form', feedback_type: type });

        const formData = new FormData();
        formData.append('form-name', 'feedback');
        if (userProfile) {
            formData.append('user_id', userProfile.id);
            formData.append('username', userProfile.username);
        }
        formData.append('type', type);
        formData.append('subject', subject);
        formData.append('description', description);
        
        try {
            const postUrl = Capacitor.isNativePlatform() 
              ? 'https://www.stoutly.co.uk/.netlify/functions/submit-form'
              : '/';

            const response = await fetch(postUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString(),
            });

            if (response.ok) {
                setFormState({ loading: false, success: true, error: null });
                trackEvent('feedback_form_success', { feedback_type: type });
            } else {
                const errorText = await response.text();
                throw new Error(`Form submission failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
        } catch (error) {
            setFormState({ loading: false, success: false, error: error.message });
            trackEvent('feedback_form_failed', { feedback_type: type, error_message: error.message });
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close feedback modal"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="feedback-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Submit Feedback
                </h2>

                {formState.success ? (
                     <div className="text-center py-8">
                        <i className="fas fa-check-circle text-green-500 text-5xl mb-4"></i>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Feedback Sent!</h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Thank you for helping us improve Stoutly. We appreciate your input!</p>
                        <button onClick={onClose} className="mt-6 w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors">
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="feedback-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback Type</label>
                            <select id="feedback-type" name="type" value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-no-repeat bg-right pr-8" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                                <option value="bug">Bug Report</option>
                                <option value="feature">Feature Request</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="feedback-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                            <input id="feedback-subject" name="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="e.g., Map doesn't load on Safari" required />
                        </div>
                        <div>
                            <label htmlFor="feedback-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea id="feedback-description" name="description" rows="5" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Please provide as much detail as possible..." required></textarea>
                        </div>
                        {formState.error && <p className="text-red-500 text-sm">{formState.error}</p>}
                        <div className="flex justify-end pt-2">
                            <button type="submit" disabled={formState.loading} className="bg-amber-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center min-w-[150px]">
                                {formState.loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> : 'Submit Feedback'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default FeedbackModal;
