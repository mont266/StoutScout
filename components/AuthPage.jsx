import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import Icon from './Icon.jsx';
import { trackEvent } from '../analytics.js';

const AuthPage = ({ onClose }) => {
  const [view, setView] = useState('signIn'); // 'signIn', 'signUp', 'forgotPassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showResendLink, setShowResendLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  const resetFormState = () => {
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
    setShowResendLink(false);
    // keep email and username for convenience
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFormState();

    try {
      if (view === 'signUp') {
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }
        if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
            throw new Error('Username must be 3-20 characters and contain only letters, numbers, or underscores.');
        }
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });

        if (signUpError) throw signUpError;
        trackEvent('sign_up', { method: 'email' });

        if (data.user && !data.session) {
          setMessage("We've sent a confirmation link to your email. Please click it to complete your registration.");
        }
      } else { // 'signIn'
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // onAuthStateChange in App.jsx will handle closing modal on success
      }
    } catch (err) {
      const errorMessage = err.error_description || err.message;
      setError(errorMessage);

      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        setShowResendLink(true);
      }

      if (view === 'signIn') {
        trackEvent('login_failed', { error_message: err.message });
      } else if (view === 'signUp') {
        trackEvent('sign_up_failed', { error_message: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setShowResendLink(false);
    trackEvent('resend_verification_request');

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (resendError) {
      setError(resendError.message);
      setShowResendLink(true); // Allow user to try again
    } else {
      setMessage("A new verification link has been sent to your email.");
    }
    setLoading(false);
  };


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetFormState();
    trackEvent('password_reset_request');
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    
    if (resetError) {
        setError(resetError.message);
    } else {
        setMessage('Check your email for a password reset link.');
    }
    setLoading(false);
  };

  const handleClose = () => {
    // Only track this event if the user is actively closing the modal,
    // not when it's closed automatically after success or on a message screen.
    if (!message && !loading) { 
      trackEvent('auth_modal_closed', { on_view: view });
    }
    onClose();
  };
  
  const renderContent = () => {
    if (message) {
      return (
        <div className="text-center">
            <i className="fas fa-paper-plane text-amber-500 text-4xl mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Check your email</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <button
                onClick={() => { resetFormState(); setView('signIn'); }}
                className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
            >
                Back to Sign In
            </button>
        </div>
      );
    }
    
    if (view === 'forgotPassword') {
        return (
            <>
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Reset Password</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Enter your email to get a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email-reset">Email</label>
                        <input id="email-reset" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center">
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div> : 'Send Instructions'}
                    </button>
                </form>
                 <div className="mt-6 text-center">
                    <button onClick={() => { resetFormState(); setView('signIn'); }} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                        Back to Sign In
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">{view === 'signUp' ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{view === 'signUp' ? 'Join the community!' : 'Sign in to continue'}</p>
            <form onSubmit={handleAuth} className="space-y-4">
                {view === 'signUp' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="username">Username</label>
                        <input id="username" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="text" placeholder="YourUsername" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">Email</label>
                    <input id="email" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">Password</label>
                    <input id="password" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {view === 'signUp' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirm-password">Confirm Password</label>
                        <input id="confirm-password" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                )}
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {showResendLink && (
                    <p className="text-center text-sm -mt-2">
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={loading}
                            className="text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                        >
                            Resend verification email
                        </button>
                    </p>
                )}
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center">
                    {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>}
                    {loading ? 'Please wait...' : view === 'signUp' ? 'Sign Up' : 'Sign In'}
                </button>
            </form>
            <div className="mt-4 text-center">
                {view === 'signIn' && (
                    <button onClick={() => { resetFormState(); setView('forgotPassword'); }} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                        Forgot Password?
                    </button>
                )}
            </div>
            <div className="mt-6 text-center">
                <button onClick={() => { resetFormState(); setView(view === 'signIn' ? 'signUp' : 'signIn'); }} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                    {view === 'signIn' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </button>
            </div>
        </>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-[1200] flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-t-4 border-amber-400">
          <button
              onClick={handleClose}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
              aria-label="Close authentication"
          >
              <i className="fas fa-times fa-lg"></i>
          </button>
          
          <div className="mb-6 h-20 w-20 mx-auto">
              <Icon className="w-full h-full" />
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
