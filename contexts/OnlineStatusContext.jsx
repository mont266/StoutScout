import React from 'react';

/**
 * Provides the set of online user IDs to any component that needs it.
 * Default value is an empty Set.
 */
export const OnlineStatusContext = React.createContext({ 
    onlineUserIds: new Set(),
});
