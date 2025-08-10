"use client"

import type React from "react"
import { useState } from "react"
import { X, Eraser, Check, Edit3, Square, Circle, Triangle, Minus } from "lucide-react"
import { HexColorPicker } from "react-colorful"

interface DrawModalProps {
  isOpen: boolean
  onClose: () => void
}

type DrawingTool = "pen" | "eraser" | "rectangle" | "circle" | "triangle" | "line"

export const DrawModal: React.FC<DrawModalProps> = ({ isOpen, onClose }) => {
  const [selectedColor, setSelectedColor] = useState("#ffffff")
  const [tempColor, setTempColor] = useState("#ffffff")
  const [lineWidth, setLineWidth] = useState(3)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedTool, setSelectedTool] = useState<DrawingTool>("pen")

  if (!isOpen) return null

  const handleColorPickerOpen = () => {
    setTempColor(selectedColor)
    setShowColorPicker(true)
  }

  const handleColorConfirm = () => {
    setSelectedColor(tempColor)
    setShowColorPicker(false)
    document.dispatchEvent(new CustomEvent("drawing-settings-changed", { detail: { color: tempColor } }))
  }

  const handleToolChange = (tool: DrawingTool) => {
    setSelectedTool(tool)
    document.dispatchEvent(
      new CustomEvent("drawing-settings-changed", { detail: { tool, isEraserMode: tool === "eraser" } }),
    )
  }

  const handleColorCancel = () => {
    setTempColor(selectedColor)
    setShowColorPicker(false)
  }

  return (
    <>
      <style>{`
        .draw-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 4px 12px rgba(96,165,250,0.35);
        }
        .draw-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 4px 12px rgba(96,165,250,0.35);
        }
      `}</style>

      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-4xl -translate-x-1/2 transform px-4 pb-4">
        <div className="mx-auto w-full rounded-t-3xl border border-white/10 bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-purple-900/90 p-4 backdrop-blur-xl shadow-2xl">
          {/* Row 1: Tools + Close */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-200">Tools:</span>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-1 py-1">
                {/* Pen */}
                <button
                  onClick={() => handleToolChange("pen")}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                    selectedTool === "pen"
                      ? "border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                      : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  title="Pen tool"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
                {/* Eraser */}
                <button
                  onClick={() => handleToolChange("eraser")}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                    selectedTool === "eraser"
                      ? "border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                      : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  title="Eraser tool"
                >
                  <Eraser className="h-5 w-5" />
                </button>

                {/* Divider */}
                <div className="mx-1 h-6 w-px bg-white/10" />

                {/* Rectangle */}
                <button
                  onClick={() => handleToolChange("rectangle")}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                    selectedTool === "rectangle"
                      ? "border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                      : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  title="Rectangle tool"
                >
                  <Square className="h-5 w-5" />
                </button>
                {/* Circle */}
                <button
                  onClick={() => handleToolChange("circle")}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                    selectedTool === "circle"
                      ? "border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                      : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  title="Circle tool"
                >
                  <Circle className="h-5 w-5" />
                </button>
                {/* Triangle */}
                <button
                  onClick={() => handleToolChange("triangle")}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                    selectedTool === "triangle"
                      ? "border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                      : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  title="Triangle tool"
                >
                  <Triangle className="h-5 w-5" />
                </button>
                {/* Line */}
                <button
                  onClick={() => handleToolChange("line")}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                    selectedTool === "line"
                      ? "border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                      : "border-transparent text-slate-300 hover:bg-white/10"
                  }`}
                  title="Line tool"
                >
                  <Minus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Row 2: Color + Width */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Color */}
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-200">Color:</span>
              <div className="relative">
                <button
                  onClick={handleColorPickerOpen}
                  className="rounded-lg border-2 border-white/20 shadow-lg transition-all duration-200"
                  style={{ backgroundColor: selectedColor, width: 40, height: 40 }}
                  title="Choose color"
                />
                {showColorPicker && (
                  <div className="absolute bottom-full left-0 z-50 mb-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 p-4 shadow-2xl backdrop-blur-xl">
                    <HexColorPicker color={tempColor} onChange={setTempColor} className="!h-48 w-full" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={handleColorCancel}
                        className="rounded-xl p-3 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
                        title="Cancel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleColorConfirm}
                        className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-3 text-white shadow-lg transition-all duration-200 hover:from-green-400 hover:to-emerald-400 hover:shadow-green-500/25"
                        title="Apply"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Width */}
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-200">Width:</span>
              <input
                type="range"
                min={1}
                max={20}
                value={lineWidth}
                onChange={(e) => {
                  const width = Number.parseInt(e.target.value)
                  setLineWidth(width)
                  document.dispatchEvent(new CustomEvent("drawing-settings-changed", { detail: { lineWidth: width } }))
                }}
                className="draw-slider h-2 w-40 cursor-pointer appearance-none rounded-lg"
                style={{
                  background: `linear-gradient(to right, #60a5fa 0%, #60a5fa ${
                    ((lineWidth - 1) / 19) * 100
                  }%, rgba(255,255,255,0.1) ${((lineWidth - 1) / 19) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={lineWidth}
                onChange={(e) => {
                  const width = Math.max(1, Math.min(100, Number.parseInt(e.target.value) || 1))
                  setLineWidth(width)
                  document.dispatchEvent(new CustomEvent("drawing-settings-changed", { detail: { lineWidth: width } }))
                }}
                className="h-10 w-16 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-white outline-none focus:border-white/20"
              />
              <span className="text-slate-300">px</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
