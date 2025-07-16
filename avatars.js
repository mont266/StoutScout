import React from 'react';

const AvatarWrapper = ({ children, bgColor = 'bg-gray-200 dark:bg-gray-700' }) => (
  <div className={`w-full h-full rounded-full flex items-center justify-center ${bgColor}`}>
    {children}
  </div>
);

// Each avatar is a simple functional component for easy rendering.
const AVATAR_COMPONENTS = {
  default: () => (
    <AvatarWrapper>
      <i className="fas fa-user text-4xl text-gray-400 dark:text-gray-500"></i>
    </AvatarWrapper>
  ),
  'beer-mug': () => (
    <AvatarWrapper bgColor="bg-yellow-100 dark:bg-yellow-900/50">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-yellow-500" fill="currentColor"><path d="M4 2h15v2H4V2zm0 3h15v13h-2V7H6v11H4V5zm2 13h2v2H6v-2zm7 0h2v2h-2v-2z"></path><path d="M6 7h8v10H6z"></path><path d="M8 9h4v6H8z" fill="#FFF"></path></svg>
    </AvatarWrapper>
  ),
  'pretzel': () => (
    <AvatarWrapper bgColor="bg-orange-100 dark:bg-orange-900/50">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-orange-500" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2.5 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm5 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-5 11c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"></path></svg>
    </AvatarWrapper>
  ),
  'hops': () => (
    <AvatarWrapper bgColor="bg-green-100 dark:bg-green-900/50">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-green-600" fill="currentColor"><path d="M12 2C9.2 2 6.8 3.1 5 4.9L6.4 6.3C7.8 5 9.8 4.2 12 4.2s4.2.8 5.6 2.1L19 4.9C17.2 3.1 14.8 2 12 2zm7.1 3.5L17.7 7C18.6 8.2 19 9.6 19 11c0 3.9-3.1 7-7 7s-7-3.1-7-7c0-1.4.4-2.8 1.3-4L4.9 5.5C3.5 7.1 2.8 9 2.8 11c0 5 4 9 9.2 9s9.2-4 9.2-9c0-2-.8-3.9-2.1-5.5zM12 6c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"></path></svg>
    </AvatarWrapper>
  ),
  'barrel': () => (
     <AvatarWrapper bgColor="bg-amber-800/10 dark:bg-amber-800/20">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-amber-700" fill="currentColor"><path d="M18 4h-2v2h2V4zm-4 0h-4v2h4V4zM8 4H6v2h2V4zM4 8v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8H4zm4 8H6v-6h2v6zm4 0h-2v-6h2v6zm4 0h-2v-6h2v6z"></path></svg>
    </AvatarWrapper>
  ),
  'crown': () => (
    <AvatarWrapper bgColor="bg-purple-100 dark:bg-purple-900/50">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-purple-500" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"></path></svg>
    </AvatarWrapper>
  ),
  'diamond': () => (
    <AvatarWrapper bgColor="bg-sky-100 dark:bg-sky-900/50">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-sky-500" fill="currentColor"><path d="M12 2L2 8.5l10 13.5L22 8.5 12 2zm0 2.31L19.53 8.5 12 18.31 4.47 8.5 12 4.31z"></path></svg>
    </AvatarWrapper>
  ),
};

export const AVATAR_LIST = Object.keys(AVATAR_COMPONENTS).filter(id => id !== 'default');

export default AVATAR_COMPONENTS;
