/**
 * Utility functions for React Native
 * clsx ve tailwind-merge yerine basit bir className birleştirme fonksiyonu
 */

export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}



