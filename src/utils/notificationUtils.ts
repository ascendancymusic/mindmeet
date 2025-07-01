// Utility functions for notification preferences

/**
 * Check if negative notifications should be shown based on user preference
 * @returns boolean indicating whether to show negative notifications
 */
export const shouldShowNegativeNotifications = (): boolean => {
  const preference = localStorage.getItem('showNegativeNotifications');
  // Default to true if no preference is set
  return preference === null ? true : preference === 'true';
};

/**
 * Check if a notification is considered negative
 * @param title - The notification title
 * @param type - The notification type
 * @returns boolean indicating if the notification is negative
 */
export const isNegativeNotification = (title: string, type: string): boolean => {
  return title.includes('Lost Follower') || 
         title.includes('Like Removed') || 
         title.includes('Unfollow') ||
         title.includes('Unlike') ||
         (type === 'unfollow') ||
         (type === 'unlike');
};
