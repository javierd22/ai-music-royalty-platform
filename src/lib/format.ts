/**
 * Formatting utilities for currency, numbers, and dates
 *
 * Per PRD Section 9: UI/UX Guidelines - Clean data visualization
 */

/**
 * Format USD amount
 * @param amountUSD - Amount in USD (float)
 * @returns Formatted currency string
 */
export function formatCurrency(amountUSD: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountUSD);
}

/**
 * Format percentage
 * @param value - Value between 0 and 1
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format similarity/confidence score
 * @param score - Score between 0 and 1
 * @returns Formatted score with 3 decimal places
 */
export function formatScore(score: number): string {
  return score.toFixed(3);
}

/**
 * Format date for display
 * @param date - ISO date string or Date object
 * @param includeTime - Include time in output (default: true)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, includeTime: boolean = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return d.toLocaleDateString('en-US', options);
}

function pluralize(count: number, unit: string): string {
  return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - ISO date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return pluralize(diffMins, 'minute');

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return pluralize(diffHours, 'hour');

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return pluralize(diffDays, 'day');

  return formatDate(d, false);
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format large numbers with abbreviations (1K, 1M, etc.)
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1_000_000).toFixed(1)}M`;
}
