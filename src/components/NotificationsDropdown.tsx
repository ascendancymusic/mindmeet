import React, { useEffect, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, Notification } from '../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { shouldShowNegativeNotifications, isNegativeNotification } from '../utils/notificationUtils';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, clearAll } = useNotificationStore();
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isOpen) {
      fetchNotifications(user.id);
    }
  }, [user, isOpen, fetchNotifications]);

  useEffect(() => {
    const fetchAvatars = async () => {
      const userIds = notifications
        .filter(n => n.related_user)
        .map(n => n.related_user as string);

      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);

      if (!error && data) {
        const avatarMap = data.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile.avatar_url
        }), {});
        setAvatars(avatarMap);
      }
    };

    fetchAvatars();
  }, [notifications]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);

    switch (notification.type) {
      case 'follow':
        if (notification.related_user) {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', notification.related_user)
            .single();

          if (data?.username) {
            onClose();
            navigate(`/${data.username}`);
          }
        }
        break;

      case 'like':
      case 'comment':
        // Handle mindmap like and comment notifications
        if (notification.mindmap_id) {
          console.log(`Navigating to mindmap with key (${notification.type}):`, notification.mindmap_id);

          try {
            // First, get the mindmap details using the mindmap_id
            const { data: mindmapData, error: mindmapError } = await supabase
              .from('mindmaps')
              .select('permalink, creator')
              .eq('id', notification.mindmap_id)
              .single();

            if (mindmapError) {
              console.error('Error fetching mindmap details:', mindmapError);
              return;
            }

            if (!mindmapData) {
              console.error('Mindmap not found with key:', notification.mindmap_id);
              return;
            }

            // Get the creator's username
            const { data: creatorData, error: creatorError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', mindmapData.creator)
              .single();

            if (creatorError) {
              console.error('Error fetching creator details:', creatorError);
              return;
            }

            if (!creatorData?.username) {
              console.error('Creator username not found for mindmap');
              return;
            }

            // Navigate to the mindmap
            onClose();
            const url = `/${creatorData.username}/${mindmapData.permalink}`;

            // For comment notifications, add a hash to scroll to comments section and the comment ID
            let finalUrl = url;

            if (notification.type === 'comment') {
              if (notification.comment_id) {
                console.log('Comment notification has comment_id:', notification.comment_id);
                // Include the comment ID in the URL to highlight the specific comment
                finalUrl = `${url}#comment-${notification.comment_id}`;
              } else {
                // Fallback to just scrolling to the comments section
                finalUrl = `${url}#comments-section`;
              }
            }

            navigate(finalUrl);
            console.log(`Navigated to ${finalUrl}`);
          } catch (error) {
            console.error(`Error navigating to mindmap (${notification.type}):`, error);
          }        } else {
          console.error(`Missing mindmap_id in ${notification.type} notification:`, notification);
        }
        break;

      case 'publish':
        // Handle mindmap publish notifications
        if (notification.mindmap_id) {
          console.log(`Navigating to published mindmap with key:`, notification.mindmap_id);

          try {
            // First, get the mindmap details using the mindmap_id
            const { data: mindmapData, error: mindmapError } = await supabase
              .from('mindmaps')
              .select('permalink, creator')
              .eq('id', notification.mindmap_id)
              .single();

            if (mindmapError) {
              console.error('Error fetching mindmap details:', mindmapError);
              return;
            }

            if (!mindmapData) {
              console.error('Mindmap not found with key:', notification.mindmap_id);
              return;
            }

            // Get the creator's username
            const { data: creatorData, error: creatorError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', mindmapData.creator)
              .single();

            if (creatorError) {
              console.error('Error fetching creator details:', creatorError);
              return;
            }

            if (!creatorData?.username) {
              console.error('Creator username not found for mindmap');
              return;
            }

            // Navigate to the mindmap
            onClose();
            const url = `/${creatorData.username}/${mindmapData.permalink}`;
            navigate(url);
            console.log(`Navigated to published mindmap: ${url}`);
          } catch (error) {
            console.error(`Error navigating to published mindmap:`, error);
          }
        } else {
          console.error(`Missing mindmap_id in publish notification:`, notification);
        }
        break;
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Just now';
    }
  };
  const formatMessage = (message: string, type: string, title: string) => {
    // Check if this is a negative notification
    const isNegative = title.includes('Lost Follower') || title.includes('Like Removed');

    if (type === 'like' || type === 'comment' || type === 'publish') {
      // Split the message into three parts: before mindmap:, mindmap: itself, and the title
      const [mainPart, mindmapTitle] = message.split('mindmap: ');

      if (!mindmapTitle) return formatUsername(message, isNegative);      return (
        <>
          {formatUsername(mainPart, isNegative)}
          mindmap: <span className="text-white font-medium hover:text-blue-400 hover:underline transition-colors cursor-pointer">{mindmapTitle}</span>
        </>
      );
    }

    return formatUsername(message, isNegative);
  };
  const formatUsername = (text: string, isNegative: boolean = false) => {
    return text.split(/([@]\w+)/).map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1); // Remove the @ symbol
        return (
          <span
            key={index}
            className={`${isNegative ? 'text-red-400' : 'text-blue-400'} font-medium cursor-pointer hover:underline transition-colors`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent the notification click event
              onClose();
              navigate(`/${username}`);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };
  return (
    <div className="absolute right-0 mt-2 w-80 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-1 z-10 transform opacity-100 scale-100 transition-all duration-200 ease-out overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={() => user && clearAll(user.id)}
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-700/50"
          >
            Clear all
          </button>
        )}      </div>
      {(() => {
        const filteredNotifications = notifications.filter((notification) => {
          // Filter out negative notifications if user has disabled them
          if (isNegativeNotification(notification.title, notification.type)) {
            return shouldShowNegativeNotifications();
          }
          return true;
        });
        
        return filteredNotifications.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">No notifications yet</p>
            <p className="text-xs text-slate-500">We'll notify you when something happens</p>
          </div>
        ) : (<div className="max-h-96 overflow-y-auto">
          {notifications
            .filter((notification) => {
              // Filter out negative notifications if user has disabled them
              if (isNegativeNotification(notification.title, notification.type)) {
                return shouldShowNegativeNotifications();
              }
              return true;
            })
            .map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`px-4 py-3 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-200 cursor-pointer border-b border-slate-700/30 last:border-b-0 ${
                !notification.read ? 'bg-gradient-to-r from-blue-500/5 to-purple-500/5' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {notification.related_user ? (
                  <div
                    className="cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation(); // Prevent the notification click event

                      // Get the username of the related user
                      const { data } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', notification.related_user)
                        .single();

                      if (data?.username) {
                        onClose();
                        navigate(`/${data.username}`);
                      }
                    }}
                  >
                    {avatars[notification.related_user] ? (
                      <img
                        src={avatars[notification.related_user]}
                        alt=""
                        className="w-10 h-10 rounded-full hover:ring-2 hover:ring-blue-500/50 transition-all duration-200 border border-slate-600/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center hover:from-slate-600 hover:to-slate-700 transition-all duration-200 border border-slate-600/50">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center border border-slate-600/50">
                    <Bell className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-semibold text-slate-200 truncate">{notification.title}</h4>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    {formatMessage(notification.message, notification.type, notification.title)}
                  </p>
                </div>              </div>
            </div>
          ))}
        </div>
        );
      })()}
    </div>
  );
};

export default NotificationsDropdown;