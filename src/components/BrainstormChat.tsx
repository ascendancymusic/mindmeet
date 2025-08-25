import React, { useState, useRef, useEffect } from 'react';


interface Collaborator {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface BrainstormChatProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  avatarUrl?: string;
  collaborators?: Collaborator[];
}



const BrainstormChat: React.FC<BrainstormChatProps> = ({ isOpen, onClose, username, collaborators }) => {
  if (!isOpen) return null;
  // Only show Collaboration Chat tab if there are collaborators (other than self)
  const hasCollab = Array.isArray(collaborators) && collaborators.length > 0;
  const [activeTab, setActiveTab] = useState<'collab' | 'ai'>(hasCollab ? 'collab' : 'ai');

  const [collabMessages, setCollabMessages] = useState<string[]>([]);
  const [aiMessages, setAiMessages] = useState<{ user: string; text: string; time: string }[]>([
    { user: 'Mystical nordic prophet', text: 'How can I help you with this mindmap?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  // Tooltip state for all messages (AI tab)
  const [tooltipIdx, setTooltipIdx] = React.useState<number | null>(null);
  const [collabInput, setCollabInput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [collabMessages, aiMessages, activeTab, isOpen]);


  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'collab') {
      if (collabInput.trim() === '') return;
      setCollabMessages([...collabMessages, collabInput]);
      setCollabInput('');
    } else {
      if (aiInput.trim() === '') return;
      setAiMessages([
        ...aiMessages,
        {
          user: username || 'You',
          text: aiInput,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setAiInput('');
    }
  };

  // Custom resize state

  const panelRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState({ width: 380, height: 320 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; width: number; height: number; left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; left: number; top: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number }>(() => {
    const padding = 16;
    if (typeof window !== 'undefined') {
      return {
        left: window.innerWidth - 380 - padding,
        top: window.innerHeight - 320 - padding,
      };
    }
    return { left: 100, top: 100 };
  });


  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isResizing && resizeStart) {
        const dx = e.clientX - resizeStart.mouseX;
        const dy = e.clientY - resizeStart.mouseY;
        // Resize from top left: increase width/height, move left/top so handle stays under cursor
        const minWidth = 320;
        const minHeight = 200;
        const NAVBAR_HEIGHT = 56;
        let newWidth = resizeStart.width - dx;
        let newHeight = resizeStart.height - dy;
        let newLeft = resizeStart.left + dx;
        let newTop = resizeStart.top + dy;

        // Clamp width/height at min, and if at min, don't move position further
        if (newWidth < minWidth) {
          newLeft = resizeStart.left + (resizeStart.width - minWidth);
          newWidth = minWidth;
          if (newLeft < 0) newLeft = 0;
        }
        if (newHeight < minHeight) {
          newTop = resizeStart.top + (resizeStart.height - minHeight);
          newHeight = minHeight;
        }

        // Prevent expanding top beyond navbar
        if (newTop < NAVBAR_HEIGHT) {
          // Adjust height so top stays at NAVBAR_HEIGHT
          newHeight = newHeight - (NAVBAR_HEIGHT - newTop);
          newTop = NAVBAR_HEIGHT;
          // If height would go below min, clamp
          if (newHeight < minHeight) {
            newHeight = minHeight;
          }
        }

        // Clamp so panel doesn't go out of viewport
        if (newLeft < 0) newLeft = 0;
        if (newLeft + newWidth > window.innerWidth) {
          newLeft = window.innerWidth - newWidth;
        }
        if (newTop + newHeight > window.innerHeight) {
          newTop = window.innerHeight - newHeight;
        }

        setPanelSize({ width: newWidth, height: newHeight });
        setPanelPos({ left: newLeft, top: newTop });
      } else if (isDragging && dragStart) {
        const dx = e.clientX - dragStart.mouseX;
        const dy = e.clientY - dragStart.mouseY;
        // Clamp left, right, top, bottom
        // Account for navigation bar height (e.g. 56px)
        const NAVBAR_HEIGHT = 56;
        const newLeft = Math.max(0, Math.min(dragStart.left + dx, window.innerWidth - panelSize.width));
        const newTop = Math.max(NAVBAR_HEIGHT, Math.min(dragStart.top + dy, window.innerHeight - panelSize.height));
        setPanelPos({
          left: newLeft,
          top: newTop,
        });
      }
    }
    function onMouseUp() {
      setIsResizing(false);
      setIsDragging(false);
    }
    if (isResizing || isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, resizeStart, isDragging, dragStart]);

  return (
    <div
      className="fixed z-50"
      style={{ left: panelPos.left, top: panelPos.top, width: panelSize.width, height: panelSize.height }}
    >
      <div
        ref={panelRef}
        className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-auto relative w-full h-full"
        style={{ minHeight: 200, minWidth: 320, height: '100%', width: '100%' }}
      >
        {/* Custom resize handle at top left */}
        <div
          onMouseDown={e => {
            setIsResizing(true);
            setResizeStart({
              mouseX: e.clientX,
              mouseY: e.clientY,
              width: panelSize.width,
              height: panelSize.height,
              left: panelPos.left,
              top: panelPos.top,
            });
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10 bg-slate-700 rounded-tl-2xl flex items-center justify-center"
          title="Resize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="0,12 0,0 12,0" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2 }}/></svg>
        </div>
        {/* Header (draggable) */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/80 rounded-t-2xl select-none cursor-move"
          onMouseDown={e => {
            // Only drag if not clicking the close button or tab
            if ((e.target as HTMLElement).closest('button, .chat-tab')) return;
            setIsDragging(true);
            setDragStart({
              mouseX: e.clientX,
              mouseY: e.clientY,
              left: panelPos.left,
              top: panelPos.top,
            });
            e.preventDefault();
          }}
        >
          <div className="flex items-center gap-2">
            {hasCollab && (
              <button
                className={`chat-tab px-3 py-1 rounded-lg font-semibold text-sm transition-colors duration-150 ${activeTab === 'collab' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-white'}`}
                style={{ borderBottom: activeTab === 'collab' ? '2px solid #00ffc8' : '2px solid transparent' }}
                onClick={() => setActiveTab('collab')}
                type="button"
              >
                Collaboration Chat
              </button>
            )}
            <button
              className={`chat-tab px-3 py-1 rounded-lg font-semibold text-sm transition-colors duration-150 ${activeTab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-white'}`}
              style={{ borderBottom: activeTab === 'ai' ? '2px solid #00ffc8' : '2px solid transparent' }}
              onClick={() => setActiveTab('ai')}
              type="button"
            >
              AI Chat
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl font-bold px-2"
            title="Close"
          >
            ×
          </button>
        </div>
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-slate-900">
          {activeTab === 'collab' ? (
            collabMessages.length === 0 ? (
              <div className="text-slate-400 text-center mt-8">Start brainstorming! ✨</div>
            ) : (
              collabMessages.map((msg, idx) => (
                <div key={idx} className="flex flex-col items-start max-w-[80%] relative group">
                  <span className="text-xs font-bold mb-1 flex items-center gap-2 group/username" style={{ color: '#00ffc8', letterSpacing: 0.5 }}>
                    {username} <span className="ml-1 text-xs text-slate-400">(me)</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-2 opacity-0 group-hover/username:opacity-100 transition-opacity duration-150">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <div
                    className="pl-3 border-l-4 text-white border-[#00ffc8] break-words whitespace-pre-line"
                    style={{ fontSize: '1.08rem', lineHeight: '1.5', wordBreak: 'break-word' }}
                  >
                    {msg}
                  </div>
                </div>
              ))
            )
          ) : (
            aiMessages.length === 0 ? (
              <div className="text-slate-400 text-center mt-8">AI Chat coming soon...</div>
            ) : (
              aiMessages.map((msg, idx) => {
                const isAI = msg.user === 'Mystical nordic prophet';
                const isMe = !isAI && (msg.user === (username || 'You'));
                const usernameColor = isAI ? '#7dd3fc' : '#facc15'; // AI: sky-300, User: yellow-400
                const borderColor = isAI ? '#7dd3fc' : '#facc15';
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-start max-w-[80%] relative group"
                    onMouseEnter={() => setTooltipIdx(idx)}
                    onMouseLeave={() => setTooltipIdx(null)}
                  >
                    <span className="text-xs font-bold mb-1 flex items-center gap-2 group/username" style={{ color: usernameColor, letterSpacing: 0.5 }}>
                      {msg.user}
                      {isAI && (
                        <span className="ml-0 text-xs text-slate-400">(AI)</span>
                      )}
                      {isMe && (
                        <span className="ml-0 text-xs text-slate-400">(me)</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-normal ml-2 opacity-0 group-hover/username:opacity-100 transition-opacity duration-150">{msg.time}</span>
                    </span>
                    <div
                      className="pl-3 border-l-4 text-white break-words whitespace-pre-line"
                      style={{
                        fontSize: '1.08rem',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        borderLeft: `4px solid ${borderColor}`
                      }}
                    >
                      {msg.text}
                    </div>
                    {/* Time is now shown next to username, no tooltip */}
                  </div>
                );
              })
            )
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-slate-700/50 bg-slate-800/80 rounded-b-2xl">
          <input
            type="text"
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={activeTab === 'collab' ? 'Type your message...' : 'Type your AI message...'}
            value={activeTab === 'collab' ? collabInput : aiInput}
            onChange={e => activeTab === 'collab' ? setCollabInput(e.target.value) : setAiInput(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            disabled={activeTab === 'collab' ? collabInput.trim() === '' : aiInput.trim() === ''}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default BrainstormChat;
