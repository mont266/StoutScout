import { useState, useEffect } from 'react';

// Breakpoints
const TABLET_MIN_WIDTH = 768;
const DESKTOP_MIN_WIDTH = 1280;

/**
 * Determines if the desktop layout should be used based on screen width and orientation.
 * - Phones (<768px): Always use mobile layout.
 * - Tablets (768px - 1279px): Use desktop in landscape, mobile in portrait.
 * - Desktops (>=1280px): Always use desktop layout.
 */
const getShouldUseDesktopLayout = () => {
  const width = window.innerWidth;
  
  if (width < TABLET_MIN_WIDTH) {
    // It's a phone.
    return false; // Use mobile layout
  }
  
  if (width >= DESKTOP_MIN_WIDTH) {
    // It's a large desktop screen.
    return true; // Use desktop layout regardless of orientation
  }

  // It's in the tablet range (e.g., 768px <= width < 1280px).
  // In this range, layout depends on orientation.
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  return isLandscape; // Use desktop for landscape, mobile for portrait
};

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(getShouldUseDesktopLayout());

  useEffect(() => {
    const handleResizeAndOrientation = () => {
      setIsDesktop(getShouldUseDesktopLayout());
    };
    
    // We listen to both resize and orientation changes
    window.addEventListener('resize', handleResizeAndOrientation);
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    mediaQuery.addEventListener('change', handleResizeAndOrientation);

    return () => {
      window.removeEventListener('resize', handleResizeAndOrientation);
      mediaQuery.removeEventListener('change', handleResizeAndOrientation);
    };
  }, []);

  return isDesktop;
};

export default useIsDesktop;
