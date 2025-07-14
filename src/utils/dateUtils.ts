import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

export type DateFormat = 'month-day-year' | 'day-month-year';

/**
 * Format a date according to the user's preference stored in localStorage
 * @param date The date to format
 * @param fallbackFormat Optional fallback format if no preference is stored
 * @returns Formatted date string
 */
export const formatDateWithPreference = (date: Date | string, fallbackFormat: DateFormat = 'month-day-year'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Unknown date';
  }

  // Get user preference from localStorage
  const savedFormat = localStorage.getItem('dateFormat') as DateFormat | null;
  const formatToUse = savedFormat || fallbackFormat;

  switch (formatToUse) {
    case 'day-month-year':
      return format(dateObj, 'dd.MM.yyyy');
    case 'month-day-year':
    default:
      return format(dateObj, 'MMM d, yyyy');
  }
};

/**
 * Format a date with time according to the user's preference stored in localStorage
 * @param date The date to format
 * @param fallbackFormat Optional fallback format if no preference is stored
 * @returns Formatted date string with time
 */
export const formatDateTimeWithPreference = (date: Date | string, fallbackFormat: DateFormat = 'month-day-year'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'recently';
  }

  // Get user preference from localStorage
  const savedFormat = localStorage.getItem('dateFormat') as DateFormat | null;
  const formatToUse = savedFormat || fallbackFormat;

  switch (formatToUse) {
    case 'day-month-year':
      return format(dateObj, "dd.MM.yyyy 'at' h:mm a");
    case 'month-day-year':
    default:
      return format(dateObj, "MMM d, yyyy 'at' h:mm a");
  }
};

/**
 * Get the current date format preference from localStorage
 * @returns The current date format preference
 */
export const getDateFormatPreference = (): DateFormat => {
  return (localStorage.getItem('dateFormat') as DateFormat) || 'month-day-year';
};

/**
 * Format a date with smart relative/absolute formatting for better UX
 * Shows "Today at HH:MM AM/PM", "Yesterday", or absolute date based on recency
 * @param date The date to format
 * @param fallbackFormat Optional fallback format if no preference is stored
 * @returns Smart formatted date string
 */
export const formatDateSmart = (date: Date | string, fallbackFormat: DateFormat = 'month-day-year'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Unknown';
  }

  // Check for today and yesterday
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`;
  }

  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }

  // For dates within the last week, show "X days ago"
  const daysDiff = differenceInDays(new Date(), dateObj);
  if (daysDiff <= 7 && daysDiff > 0) {
    return `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} ago`;
  }

  // For older dates, use the preference format
  return formatDateWithPreference(dateObj, fallbackFormat);
};
