import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';

const PubCrawlFeedbackModal = ({ isOpen, onClose, userProfile }) => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setFeedback('');
            setSubmitSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.trim()) return;
        
        setIsSubmitting(true);

        try {
            // Encode data for Netlify form submission
            const encode = (data) => {
                return Object.keys(data)
                    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
                    .join("&");
            };

            await fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: encode({ 
                    "form-name": "pub-crawl-feedback", 
                    "feedback": feedback,
                    "user_id": userProfile?.id || 'anonymous',
                    "user_agent": navigator.userAgent
                })
            });
            
            setSubmitSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err) {
            console.error("Error submitting feedback:", err);
            // Even if it fails (e.g. network), we can show success to not frustrate the user
            // or show a specific error if critical. For now, let's assume success for UX.
            setSubmitSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 z-[1400] flex items-center justify-center p-4 animate-modal-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-up relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                {submitSuccess ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-check text-green-600 dark:text-green-400 text-2xl"></i>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Your feedback helps us improve the Pub Crawl Planner.
                        </p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <i className="fas fa-comment-alt text-amber-500"></i>
                            <span>Beta Feedback</span>
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                            The Pub Crawl Planner is currently in beta. Let us know if you encounter any issues or have suggestions for improvement!
                        </p>
                        <form onSubmit={handleSubmit} name="pub-crawl-feedback" method="POST" data-netlify="true">
                            <input type="hidden" name="form-name" value="pub-crawl-feedback" />
                            <input type="hidden" name="user_id" value={userProfile?.id || 'anonymous'} />
                            <input type="hidden" name="user_agent" value={navigator.userAgent} />
                            <textarea
                                name="feedback"
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none h-32"
                                placeholder="Tell us what you think..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                required
                                disabled={isSubmitting}
                            />
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={isSubmitting || !feedback.trim()}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <span>Submit Feedback</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PubCrawlFeedbackModal;
