

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import Logo from './Logo.jsx';
import { trackEvent } from '../analytics.js';

const AuthPage = ({ onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRequiresConfirmation(false);

    try {
      if (isSignUp) {
        // Sign Up
        if (!username) {
          setError('Please enter a username.');
          setLoading(false);
          return;
        }
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              full_name: username, // Also set full_name in metadata
            },
          },
        });

        if (signUpError) throw signUpError;
        
        trackEvent('sign_up', { method: 'email' });

        // If signup is successful and requires email confirmation, show a message.
        if (data.user && !data.session) {
          setRequiresConfirmation(true);
        }
        // If there is a session, onAuthStateChange in App.jsx will handle closing the modal.
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // On successful sign in, the onAuthStateChange listener in App.jsx will close the modal.
    } catch (err) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Render a confirmation message instead of the form if needed.
  if (requiresConfirmation) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div className="max-w-sm w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-t-4 border-amber-400 text-center" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Check your email</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We've sent a confirmation link to <span className="font-bold">{email}</span>. Please click the link to complete your registration.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-t-4 border-amber-400">
          <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
              aria-label="Close authentication"
          >
              <i className="fas fa-times fa-lg"></i>
          </button>
          
          <div className="mb-6">
              <Logo />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
            {isSignUp ? 'Join the community!' : 'Sign in to continue'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  type="text"
                  placeholder="YourUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-300 flex items-center justify-center"
            >
              {loading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>}
              {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;