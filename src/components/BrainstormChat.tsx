import React, { useState, useRef, useEffect } from 'react';

interface BrainstormChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const BrainstormChat: React.FC<BrainstormChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;
    setMessages([...messages, input]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/80 rounded-t-2xl">
          <span className="font-semibold text-lg text-white">Brainstorm Chat</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl font-bold px-2"
            title="Close"
          >
            ×
          </button>
        </div>
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-900">
          {messages.length === 0 ? (
            <div className="text-slate-400 text-center mt-8">Start brainstorming! ✨</div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="bg-slate-800/80 text-white px-4 py-2 rounded-xl max-w-[80%] self-end ml-auto">
                {msg}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-slate-700/50 bg-slate-800/80 rounded-b-2xl">
          <input
            type="text"
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            disabled={input.trim() === ''}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default BrainstormChat;
