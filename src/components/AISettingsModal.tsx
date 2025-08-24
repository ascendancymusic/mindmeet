import React, { useState, useEffect } from 'react';
import { useAISettingsStore, AVAILABLE_AI_MODELS } from '../store/aiSettingsStore';
import { useChatStore } from '../store/chatStore';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number | null;
}

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, conversationId }) => {
  const { conversations } = useChatStore();
  const conversation = conversationId ? conversations.find(c => c.id === conversationId) : null;
  const supabaseConvId = conversation?.supabaseId || '';
  
  // Get the AI settings store
  const {
    defaultMemoryLength,
    defaultCustomContext,
    defaultModel,
    setDefaultMemoryLength,
    setDefaultCustomContext,
    setDefaultModel,
    setConversationMemoryLength,
    setConversationCustomContext,
    setConversationModel,
    getConversationSettings
  } = useAISettingsStore();
  
  // Local state for form values
  const [memoryLength, setMemoryLength] = useState(10);
  const [customContext, setCustomContext] = useState('');
  const [model, setModel] = useState(AVAILABLE_AI_MODELS[1]);
  const [isGlobal, setIsGlobal] = useState(false);
  
  // Load settings when the component mounts or conversation changes
  useEffect(() => {
    if (supabaseConvId) {
      // Load conversation-specific settings
      const settings = getConversationSettings(supabaseConvId);
      setMemoryLength(settings.memoryLength);
      setCustomContext(settings.customContext);
      setModel(settings.model);
      setIsGlobal(false);
    } else {
      // Load global defaults
      setMemoryLength(defaultMemoryLength);
      setCustomContext(defaultCustomContext);
      setModel(defaultModel);
      setIsGlobal(true);
    }
  }, [supabaseConvId, defaultMemoryLength, defaultCustomContext, defaultModel, getConversationSettings]);

  // Handle form submission
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (isGlobal || !supabaseConvId) {
      // Update global defaults
      setDefaultMemoryLength(memoryLength);
      setDefaultCustomContext(customContext);
      setDefaultModel(model);
    } else {
      // Update conversation-specific settings
      setConversationMemoryLength(supabaseConvId, memoryLength);
      setConversationCustomContext(supabaseConvId, customContext);
      setConversationModel(supabaseConvId, model);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          {supabaseConvId ? `AI Memory Settings - ${conversation?.name}` : 'Default AI Memory Settings'}
        </h2>
        
        <form onSubmit={handleSave}>
          {supabaseConvId && (
            <div className="mb-4">
              <label className="mb-2 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isGlobal}
                  onChange={() => setIsGlobal(!isGlobal)}
                  className="rounded bg-gray-800 border-gray-700"
                />
                <span>Use as default for all new conversations</span>
              </label>
            </div>
          )}
          
          {/* Model Selection */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">
              AI Model
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg"
            >
              {AVAILABLE_AI_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Memory Length Slider */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">
              Memory Length: {memoryLength} messages
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={memoryLength}
              onChange={(e) => setMemoryLength(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
          
          {/* Custom Context */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">
              Custom Context (What should AI know about this conversation?)
            </label>
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg h-32"
              placeholder="Enter any details or context you want the AI to know about this conversation..."
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 rounded text-white hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500 transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AISettingsModal;
