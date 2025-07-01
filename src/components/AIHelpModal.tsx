import React from "react"
import { Modal } from "./Modal"
import { Network } from "lucide-react"

interface AIHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

const AIHelpModal: React.FC<AIHelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/70 rounded-2xl p-8 border border-slate-700/40 shadow-2xl max-w-lg mx-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-3 shadow-lg">
            <Network className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              AI fellas
            </h2>
            <p className="text-slate-400 text-sm">Helpar function</p>
          </div>
        </div>
        {/* Content */}
        <div className="space-y-6 mt-2">
          {/* Bigglesmooth */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/assets/avatars/bigglesmooth.jpg"
                alt="Bigglesmooth"
                className="w-9 h-9 rounded-full border-2 border-blue-500 object-cover"
                style={{ minWidth: 36, minHeight: 36 }}
              />
              <div className="font-semibold text-base text-blue-200">Bigglesmooth</div>
            </div>
            <div className="text-left w-full">
              <div className="text-slate-300 text-sm">
                <b>Best for editing mindmaps.</b> Ask Bigglesmooth to add, remove, or reorganize nodes, or to help you rewrite and improve your ideas.
                <div className="mt-2 text-slate-400">
                  <span className="font-semibold text-blue-300">Try prompts like (gotta rewrite these):</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>
                      <span className="text-slate-300">"Add a node about project deadlines under Planning"</span>
                    </li>
                    <li>
                      <span className="text-slate-300">"Reorganize the Marketing section for clarity"</span>
                    </li>
                    <li>
                      <span className="text-slate-300">"Rewrite the main idea to sound more professional"</span>
                    </li>
                    <li>
                      <span className="text-slate-300">"Move the Budget node under Resources"</span>
                    </li>
                    <li>
                      <span className="text-slate-300">"Delete the old Features branch"</span>
                    </li>
                  </ul>
                  <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                    <span>You must</span>
                    <span className="h-[28px] w-[28px] rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-slate-300 border border-slate-600/30 mindmap-button flex items-center justify-center">
                      <Network className="w-4 h-4 text-white-300" />
                    </span>
                    <span>attach your mindmap everytime you want to edit it.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Melvin */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/assets/avatars/melvin.webp"
                alt="Melvin"
                className="w-9 h-9 rounded-full border-2 border-purple-500 object-cover"
                style={{ minWidth: 36, minHeight: 36 }}
              />
              <div className="font-semibold text-base text-purple-200">Melvin Soyberg</div>
            </div>
            <div className="text-left w-full">
              <div className="text-slate-300 text-sm">
                <b>Best for analyzing mindmaps.</b> Melvin can summarize, find insights, or suggest improvements based on your mindmap structure.
                <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                  <span>Be sure to</span>
                  <span className="h-[28px] w-[28px] rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-slate-300 border border-slate-600/30 mindmap-button flex items-center justify-center">
                    <Network className="w-4 h-4 text-white-300" />
                  </span>
                  <span>attach your mindmap for analysis.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default AIHelpModal