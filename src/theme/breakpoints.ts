import { Dimensions, Platform } from 'react-native';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const breakpoints = {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
};

export function getCurrentBreakpoint(): Breakpoint {
    const { width } = Dimensions.get('window');
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    return 'xl';
}

export function matchesBreakpoint(breakpoint: Breakpoint): boolean {
    const current = getCurrentBreakpoint();
    const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    return order.indexOf(current) >= order.indexOf(breakpoint);
}

export function isMobile(): boolean {
    return getCurrentBreakpoint() === 'xs' || getCurrentBreakpoint() === 'sm';
}

export function isTablet(): boolean {
    return getCurrentBreakpoint() === 'md';
}

export function isDesktop(): boolean {
    return getCurrentBreakpoint() === 'lg' || getCurrentBreakpoint() === 'xl';
}
