import { useState, useEffect } from 'react';

/**
 * A simple hook to determine the user's region based on browser language.
 * This is a non-invasive way to apply regional logic.
 * @returns {'gb' | 'other' | null} The detected region code.
 */
const useRegion = () => {
    const [region, setRegion] = useState(null);

    useEffect(() => {
        const lang = navigator.language?.toLowerCase();
        
        if (lang === 'en-gb') {
            setRegion('gb');
        } else {
            // A simple fallback for now. Could be expanded with more region codes later.
            setRegion('other');
        }
    }, []);

    return region;
};

export default useRegion;
