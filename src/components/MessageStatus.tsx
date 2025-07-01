import React from 'react';

interface MessageStatusProps {
  status?: 'sent' | 'delivered' | 'read';
  readAt?: Date | string;
  className?: string;
  isLastMessage?: boolean;
}

// This component is now empty as we don't want to show any checkmarks
// Read receipts are handled directly in Chat.tsx
const MessageStatus: React.FC<MessageStatusProps> = () => {
  return null;
};

export default MessageStatus;
