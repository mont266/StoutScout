import React from 'react';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-4">
      <h1 className="text-6xl font-bold text-amber-500 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-8">The page you are looking for does not seem to exist.</p>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md">
        <p className="font-bold">Email Confirmation Notice</p>
        <p>If you have just confirmed your email, please open your app and try to login again.</p>
      </div>
      <a href="/" className="mt-8 px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors">
        Go to Homepage
      </a>
    </div>
  );
};

export default NotFoundPage;
