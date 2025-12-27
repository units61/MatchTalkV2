/**
 * Avatar generation utility
 * Seed'den deterministik avatar oluşturur
 * Backend'deki AnonymityService ile aynı mantık
 */

/**
 * Seed'den avatar URL'i veya gradient bilgilerini döndürür
 */
export function generateAvatarFromSeed(seed: number): {
  url?: string;
  gradient?: {from: string; to: string};
  index?: number;
} {
  // Backend'deki AnonymityService ile aynı mantık
  const avatarIndex = seed % 20;

  const colors = [
    {from: '#06b6d4', to: '#8b5cf6'}, // cyan-purple
    {from: '#f59e0b', to: '#ef4444'}, // amber-red
    {from: '#10b981', to: '#3b82f6'}, // green-blue
    {from: '#ec4899', to: '#f97316'}, // pink-orange
    {from: '#6366f1', to: '#14b8a6'}, // indigo-teal
    {from: '#f43f5e', to: '#eab308'}, // rose-yellow
    {from: '#8b5cf6', to: '#06b6d4'}, // purple-cyan
    {from: '#3b82f6', to: '#10b981'}, // blue-green
    {from: '#ef4444', to: '#f59e0b'}, // red-amber
    {from: '#14b8a6', to: '#6366f1'}, // teal-indigo
    {from: '#eab308', to: '#f43f5e'}, // yellow-rose
    {from: '#06b6d4', to: '#f59e0b'}, // cyan-amber
    {from: '#8b5cf6', to: '#10b981'}, // purple-green
    {from: '#f59e0b', to: '#6366f1'}, // amber-indigo
    {from: '#ef4444', to: '#14b8a6'}, // red-teal
    {from: '#10b981', to: '#ec4899'}, // green-pink
    {from: '#3b82f6', to: '#f97316'}, // blue-orange
    {from: '#ec4899', to: '#06b6d4'}, // pink-cyan
    {from: '#6366f1', to: '#f43f5e'}, // indigo-rose
    {from: '#14b8a6', to: '#eab308'}, // teal-yellow
  ];

  const colorPair = colors[avatarIndex];

  return {
    gradient: colorPair,
    index: avatarIndex,
  };
}

/**
 * Avatar URL'i döndürür
 * Eğer seed varsa gradient avatar oluşturur, yoksa fallback kullanır
 */
export function getAvatarUrl(seed?: number, fallback?: string): string | {from: string; to: string} | undefined {
  if (seed !== undefined && seed !== null) {
    const avatar = generateAvatarFromSeed(seed);
    // Gradient avatar için CSS gradient string döndür
    if (avatar.gradient) {
      return avatar.gradient;
    }
  }
  return fallback;
}

/**
 * Gradient CSS string'i oluşturur (React Native için kullanılmaz, ama backward compatibility için)
 */
export function getGradientStyle(gradient: {from: string; to: string}): string {
  return `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`;
}
