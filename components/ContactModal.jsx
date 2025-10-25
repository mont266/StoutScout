import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../analytics.js';
import { Capacitor } from '@capacitor/core';

const ContactModal = ({ userProfile, session, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [formState, setFormState] = useState({ loading: false, success: false, error: null });

    useEffect(() => {
        if (userProfile) {
            setName(userProfile.username);
        }
        if (session?.user) {
            setEmail(session.user.email);
        }
    }, [userProfile, session]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormState({ loading: true, success: false, error: null });
        trackEvent('generate_lead', { lead_type: 'contact_form' });

        const formData = new FormData();
        formData.append('form-name', 'contact');
        if (userProfile) {
            formData.append('user_id', userProfile.id);
            formData.append('username', userProfile.username);
        }
        formData.append('name', name);
        formData.append('email', email);
        formData.append('message', message);
        
        try {
            const postUrl = Capacitor.isNativePlatform() 
              ? 'https://stoutly.co.uk/.netlify/functions/submit-form' 
              : '/';
              
            const response = await fetch(postUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString(),
            });

            if (response.ok) {
                setFormState({ loading: false, success: true, error: null });
                trackEvent('contact_form_success');
            } else {
                const errorText = await response.text();
                throw new Error(`Form submission failed: ${response.status} ${response.statusText}. ${errorText}`);
            }
        } catch (error) {
            setFormState({ loading: false, success: false, error: error.message });
            trackEvent('contact_form_failed', { error_message: error.message });
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-us-title"
        >
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-amber-500"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
                    aria-label="Close contact modal"
                >
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <h2 id="contact-us-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Contact Us
                </h2>

                {formState.success ? (
                    <div className="text-center py-8">
                        <i className="fas fa-check-circle text-green-500 text-5xl mb-4"></i>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Message Sent!</h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Thanks for reaching out. We'll get back to you as soon as possible.</p>
                        <button onClick={onClose} className="mt-6 w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors">
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input id="contact-name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Your Name" />
                        </div>
                        <div>
                            <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input id="contact-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="you@example.com" required />
                        </div>
                        <div>
                            <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                            <textarea id="contact-message" name="message" rows="4" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="How can we help?" required></textarea>
                        </div>
                        {formState.error && <p className="text-red-500 text-sm">{formState.error}</p>}
                        <div className="flex justify-end pt-2">
                            <button type="submit" disabled={formState.loading} className="bg-amber-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center min-w-[120px]">
                                {formState.loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> : 'Send Message'}
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

export default ContactModal;