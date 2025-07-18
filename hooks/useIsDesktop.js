import { useState, useEffect } from 'react';

// Custom hook to detect if the screen is desktop-sized
const useIsDesktop = (breakpoint = 768) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= breakpoint);
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isDesktop;
};

export default useIsDesktop;