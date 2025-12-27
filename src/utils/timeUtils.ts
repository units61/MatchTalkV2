/**
 * Time utility functions for relative time display
 */

/**
 * Get relative time string (e.g., "15 sn önce", "2 dk önce")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 0) {
    return 'şimdi'
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} sn önce`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dk önce`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} sa önce`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} gün önce`
}










