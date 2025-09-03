import React from 'react';

const ProgressBar = ({ current, max }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    const boundedPercentage = Math.min(100, Math.max(0, percentage));

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
            <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${boundedPercentage}%` }}
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin="0"
                aria-valuemax={max}
            ></div>
        </div>
    );
};

export default ProgressBar;