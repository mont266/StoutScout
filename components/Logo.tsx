import React from 'react';

const Logo: React.FC = () => (
  <div className="flex flex-col items-center">
    <h1 className="text-2xl font-bold text-amber-400 leading-tight">StoutScout</h1>
    <div className="flex items-center space-x-1.5 mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <p className="text-gray-300 text-sm">Find your perfect pint</p>
    </div>
  </div>
);

export default Logo;
