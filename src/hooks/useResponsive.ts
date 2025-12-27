/**
 * Responsive Hook
 * Provides responsive utilities and breakpoint detection
 */

import {useState, useEffect} from 'react';
import {Platform, Dimensions} from 'react-native';
import {
  breakpoints,
  Breakpoint,
  getCurrentBreakpoint,
  matchesBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
} from '../theme/breakpoints';

export interface UseResponsiveReturn {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  matches: (breakpoint: Breakpoint) => boolean;
  width: number;
  height: number;
}

/**
 * Hook for responsive design
 */
export function useResponsive(): UseResponsiveReturn {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return getCurrentBreakpoint();
    }
    // React Native: Use Dimensions API
    const {width} = Dimensions.get('window');
    return width < 768 ? 'sm' : width < 1024 ? 'md' : 'lg';
  });

  const [dimensions, setDimensions] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    // React Native: Use Dimensions API
    const {width, height} = Dimensions.get('window');
    return {width, height};
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        const newBreakpoint = getCurrentBreakpoint();
        setBreakpoint(newBreakpoint);
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      // Initial check
      handleResize();

      // Add event listener
      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } else {
      // React Native: Listen to dimension changes
      const subscription = Dimensions.addEventListener('change', ({window}) => {
        const {width, height} = window;
        setDimensions({width, height});
        setBreakpoint(width < 768 ? 'sm' : width < 1024 ? 'md' : 'lg');
      });

      return () => {
        subscription?.remove();
      };
    }
  }, []);

  return {
    breakpoint,
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    matches: matchesBreakpoint,
    width: dimensions.width,
    height: dimensions.height,
  };
}

/**
 * Hook for specific breakpoint matching
 */
export function useBreakpoint(targetBreakpoint: Breakpoint): boolean {
  const {matches} = useResponsive();
  return matches(targetBreakpoint);
}

/**
 * Hook for mobile detection
 */
export function useIsMobile(): boolean {
  const {isMobile} = useResponsive();
  return isMobile;
}

/**
 * Hook for tablet detection
 */
export function useIsTablet(): boolean {
  const {isTablet} = useResponsive();
  return isTablet;
}

/**
 * Hook for desktop detection
 */
export function useIsDesktop(): boolean {
  const {isDesktop} = useResponsive();
  return isDesktop;
}








