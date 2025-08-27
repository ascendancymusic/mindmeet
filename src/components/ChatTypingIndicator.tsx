import React from "react";
import "./ChatTypingIndicator.css";
import { Bot } from "lucide-react";

const ChatTypingIndicator: React.FC = () => (
  <div className="group">
    <div className="flex items-center gap-3 py-2 rounded-xl transition-all">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 bg-gradient-to-br from-purple-400 to-blue-500">
        <Bot className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-purple-300">Mystical nordic prophet</span>
          <span className="text-xs text-slate-500">(AI)</span>
        </div>
        <div className="text-white text-sm leading-relaxed break-words">
          <span className="inline-block">
            <span className="chat-typing-indicator">
              <span className="chat-typing-dot">•</span>
              <span className="chat-typing-dot">•</span>
              <span className="chat-typing-dot">•</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default ChatTypingIndicator;
