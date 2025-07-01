import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  username: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, username }) => {
  if (!isTyping) return null;

  return (
    <div className="text-xs text-gray-400 italic px-3 py-1">
      {username} is typing...
    </div>
  );
};

export default TypingIndicator;
