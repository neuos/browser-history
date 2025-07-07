/**
 * Theme detection utilities for the extension
 * 
 * IMPORTANT NOTE: This implementation provides theme detection within popup/options contexts,
 * but due to Chrome Extension Manifest V3 limitations, real-time theme-aware icons are not
 * reliably achievable. Background service workers cannot access window.matchMedia() and there
 * are no extension events for system theme changes.
 * 
 * Best practices for theme-aware extensions:
 * 1. Provide manual theme toggle in popup/options
 * 2. Update icon when popup is opened 
 * 3. Store user preference and respect it
 */

export interface ThemeInfo {
  isDark: boolean;
  colorScheme: 'light' | 'dark';
}

export type ThemePreference = 'light' | 'dark' | 'auto';

/**
 * Detect the current color scheme preference (popup/content script context only)
 */
export function detectTheme(): ThemeInfo {
  // Check if we're in a browser environment with window.matchMedia
  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      isDark: prefersDark,
      colorScheme: prefersDark ? 'dark' : 'light'
    };
  }
  
  // Fallback to light theme if we can't detect
  return {
    isDark: false,
    colorScheme: 'light'
  };
}

/**
 * Listen for theme changes and call the callback (popup/content script context only)
 */
export function onThemeChange(callback: (theme: ThemeInfo) => void): () => void {
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      callback(detectTheme());
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Return cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }
  
  // Return no-op cleanup function if we can't listen
  return () => {};
}

/**
 * Get the stored theme preference
 */
export async function getStoredThemePreference(): Promise<ThemePreference> {
  if (typeof globalThis !== 'undefined' && 'chrome' in globalThis && (globalThis as any).chrome?.storage) {
    const result = await (globalThis as any).chrome.storage.sync.get({ themePreference: 'auto' });
    return result.themePreference as ThemePreference;
  }
  return 'auto';
}

/**
 * Store the theme preference
 */
export async function setStoredThemePreference(preference: ThemePreference): Promise<void> {
  if (typeof globalThis !== 'undefined' && 'chrome' in globalThis && (globalThis as any).chrome?.storage) {
    await (globalThis as any).chrome.storage.sync.set({ themePreference: preference });
  }
}

/**
 * Get the effective theme based on preference
 */
export function getEffectiveTheme(preference: ThemePreference, detectedTheme: ThemeInfo): ThemeInfo {
  if (preference === 'auto') {
    return detectedTheme;
  }
  
  return {
    isDark: preference === 'dark',
    colorScheme: preference
  };
}

// Legacy functions for backward compatibility
export const detectSystemTheme = (): boolean => {
  return detectTheme().isDark;
};

export const listenForThemeChanges = (callback: (isDark: boolean) => void): (() => void) => {
  return onThemeChange((theme) => callback(theme.isDark));
};
