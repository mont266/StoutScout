import React from 'react';
import Avatar from './Avatar.jsx';

const ProfileAvatar = ({ userProfile, levelRequirements, size = 48, onClick }) => {
    
    const getLevelProgress = () => {
        if (!levelRequirements || levelRequirements.length === 0 || !userProfile?.level) {
            return { percentage: 0, progressText: '' };
        }
        
        const { level, reviews } = userProfile;
        const currentLevelInfo = levelRequirements.find(lr => lr.level === level);
        const nextLevelInfo = levelRequirements.find(lr => lr.level === level + 1);
        
        if (!currentLevelInfo) {
            return { percentage: 0, progressText: 'Syncing...' };
        }
        
        if (!nextLevelInfo) {
            return { percentage: 100, progressText: 'Max Level!' };
        }
        
        const ratingsForThisLevel = nextLevelInfo.total_ratings_required - currentLevelInfo.total_ratings_required;
        const progressIntoThisLevel = Math.max(0, reviews - currentLevelInfo.total_ratings_required);
        const percentage = ratingsForThisLevel > 0 ? (progressIntoThisLevel / ratingsForThisLevel) * 100 : 0;
        
        return {
            percentage: Math.min(100, Math.max(0, percentage)),
            progressText: `${progressIntoThisLevel} / ${ratingsForThisLevel} to Lvl ${level + 1}`
        };
    };

    const { percentage, progressText } = getLevelProgress();
    const isMaxLevel = percentage === 100 && progressText === 'Max Level!';

    const strokeWidth = size / 12;
    const radius = (size / 2) - (strokeWidth / 2);
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const WrapperComponent = onClick ? 'button' : 'div';
    
    return (
        <div className="group relative">
            <WrapperComponent 
                onClick={onClick} 
                className={`relative flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${onClick ? 'cursor-pointer' : ''}`}
                style={{ width: size, height: size }}
                aria-label={userProfile ? `View profile for ${userProfile.username}` : 'Profile avatar'}
            >
                <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background track */}
                    <circle
                        className="text-gray-200 dark:text-gray-700"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress ring */}
                    <circle
                        className={`transition-all duration-500 ease-in-out ${isMaxLevel ? 'text-amber-400 animate-pulse-halo' : 'text-amber-500'}`}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                        transform={`rotate(-90 ${size/2} ${size/2})`}
                    />
                </svg>
                <div style={{ width: size - (strokeWidth * 2.5), height: size - (strokeWidth * 2.5) }}>
                    <Avatar avatarId={userProfile?.avatar_id} className="w-full h-full" />
                </div>
            </WrapperComponent>
            {progressText && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 text-sm font-semibold text-white bg-gray-900/80 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all delay-300 pointer-events-none z-50">
                    {progressText}
                </div>
            )}
        </div>
    );
};

export default ProfileAvatar;