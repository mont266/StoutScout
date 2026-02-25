import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const AuthCallbackPage = () => {
  const [status, setStatus] = useState('Verifying...');
  const [message, setMessage] = useState('Please wait while we confirm your email address.');

  useEffect(() => {
    // This effect runs once on component mount.
    // It checks the URL hash for an access_token or an error.
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    if (params.has('access_token')) {
      // Success case
      setStatus('Email Confirmed!');
      setMessage('Thank you for verifying your email. You will be redirected to the app shortly.');
      setTimeout(() => {
        window.location.assign('/');
      }, 3000);
    } else if (params.has('error')) {
      // Error case
      setStatus('Link Invalid or Expired');
      const errorDescription = params.get('error_description') || 'Please try signing up again.';
      setMessage(`This confirmation link is no longer valid. ${errorDescription}`);
    } else {
      // Fallback for unexpected cases
      setStatus('Verification Failed');
      setMessage('Could not verify email. The link may be incomplete. Please return to the homepage and try again.');
    }
  }, [navigate]);

  return (
    <div className="w-full h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="w-20 h-20 mx-auto mb-6">
          <Icon className="w-full h-full" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{status}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
        {status.includes('Failed') || status.includes('Expired') ? (
          <button
            onClick={() => window.location.assign('/')}
            className="mt-6 w-full bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors"
          >
            Back to Homepage
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
