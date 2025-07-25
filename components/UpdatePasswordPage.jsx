import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import Icon from './Icon.jsx';
import { trackEvent } from '../analytics.js';

const UpdatePasswordPage = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      trackEvent('reset_password');
      setTimeout(() => {
        onSuccess();
      }, 3500); // Close after 3.5 seconds
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-password-title"
    >
      <div className="max-w-sm w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-t-4 border-amber-400" onClick={e => e.stopPropagation()}>
        <div className="mb-6 h-20 w-20 mx-auto">
          <Icon className="w-full h-full" />
        </div>
        <h2 id="update-password-title" className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Update Your Password
        </h2>

        {success ? (
          <div className="text-center">
            <i className="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
            <p className="text-green-700 dark:text-green-300">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="new-password">
                New Password
              </label>
              <input
                id="new-password"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdatePasswordPage;