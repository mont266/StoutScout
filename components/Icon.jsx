import React from 'react';

// This is the new Icon component for use inside the app, e.g., in the DesktopNav.
// It features the redesigned logo, combining a map pin with a pint of stout.
const Icon = ({ className }) => (
  <svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' className={className}>
    <g transform='translate(0 2)'>
      <path 
        d='M50 5 C 29.5 5, 12.5 22.5, 12.5 42.5 C 12.5 67.5, 50 95, 50 95 C 50 95, 87.5 67.5, 87.5 42.5 C 87.5 22.5, 70.5 5, 50 5 Z' 
        fill='#1A120F'
        stroke='#F59E0B'
        strokeWidth='4'
        className="stoutly-logo-stroke"
      />
      <path 
        d='M25 45 C 40 30, 60 30, 75 45 C 75 35, 65 25, 50 25 C 35 25, 25 35, 25 45 Z' 
        fill='#FDEED4'
      />
    </g>
  </svg>
);

export default Icon;
