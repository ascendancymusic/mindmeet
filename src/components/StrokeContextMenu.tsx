"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { Palette, Check, X } from "lucide-react"

interface StrokePoint {
  x: number
  y: number
}

interface StrokeContextMenuProps {
  isVisible: boolean
  position: { x: number; y: number }
  strokeColor: string
  strokeWidth: number
  strokePoints: StrokePoint[]
  strokeType?: "pen" | "rectangle" | "circle" | "triangle" | "line"
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onAccept: () => void
  onCancel: () => void
}

export const StrokeContextMenu: React.FC<StrokeContextMenuProps> = ({
  isVisible,
  position,
  strokeColor,
  strokeWidth,
  strokePoints,
  strokeType = "pen",
  onColorChange,
  onWidthChange,
  onAccept,
  onCancel,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Local state for live preview
  const [previewColor, setPreviewColor] = useState(strokeColor)
  const [previewWidth, setPreviewWidth] = useState(strokeWidth)

  // Update local state when props change (when menu opens)
  useEffect(() => {
    if (isVisible) {
      setPreviewColor(strokeColor)
      setPreviewWidth(strokeWidth)
    }
  }, [isVisible, strokeColor, strokeWidth])

  // Calculate adjusted position to keep menu within viewport
  const getAdjustedPosition = () => {
    const menuWidth = 320
    const menuHeight = 420
    const padding = 20

    let adjustedX = position.x
    let adjustedY = position.y

    if (adjustedX + menuWidth > window.innerWidth - padding) {
      adjustedX = window.innerWidth - menuWidth - padding
    }
    if (adjustedX < padding) {
      adjustedX = padding
    }

    // Prefer showing above the cursor
    adjustedY = position.y - menuHeight - 10
    if (adjustedY < padding) {
      adjustedY = position.y + 10
    }

    return { x: adjustedX, y: adjustedY }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onCancel()
      }
    }
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isVisible, onCancel])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel()
      } else if (event.key === "Enter") {
        onAccept()
      }
    }
    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, onAccept, onCancel])

  if (!isVisible) return null

  const handleSliderWidth = (v: number) => {
    const width = Math.max(1, Math.min(20, v))
    setPreviewWidth(width)
    onWidthChange(width)
  }

  const handleColorChange = (color: string) => {
    setPreviewColor(color)
    onColorChange(color) // live update
  }

  // Render preview of the stroke
  const renderStrokePreview = () => {
    if (!strokePoints || strokePoints.length === 0) {
      return (
        <svg width="120" height="40" viewBox="0 0 120 40">
          <path
            d="M10,20 Q30,10 50,20 T90,20 L110,20"
            stroke={previewColor}
            strokeWidth={previewWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )
    }

    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY
    strokePoints.forEach((p) => {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })

    const pad = Math.max(previewWidth, 10)
    minX -= pad
    minY -= pad
    maxX += pad
    maxY += pad

    const w = maxX - minX
    const h = maxY - minY
    const baseW = Math.max(w, 120)
    const baseH = Math.max(h, 40)
    const maxW = 200
    const maxH = 80
    let scale = 1
    if (baseW > maxW || baseH > maxH) scale = Math.min(maxW / baseW, maxH / baseH)
    const viewBoxWidth = baseW
    const viewBoxHeight = baseH
    const displayWidth = baseW * scale
    const displayHeight = baseH * scale

    if (strokeType === "rectangle" && strokePoints.length >= 4) {
      const rx = Math.min(strokePoints[0].x, strokePoints[2].x)
      const ry = Math.min(strokePoints[0].y, strokePoints[2].y)
      const rw = Math.abs(strokePoints[2].x - strokePoints[0].x)
      const rh = Math.abs(strokePoints[2].y - strokePoints[0].y)
      return (
        <svg width={displayWidth} height={displayHeight} viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}>
          <rect x={rx} y={ry} width={rw} height={rh} stroke={previewColor} strokeWidth={previewWidth} fill="none" />
        </svg>
      )
    } else if (strokeType === "circle" && strokePoints.length >= 4) {
      let pminX = Number.POSITIVE_INFINITY,
        pminY = Number.POSITIVE_INFINITY,
        pmaxX = Number.NEGATIVE_INFINITY,
        pmaxY = Number.NEGATIVE_INFINITY
      strokePoints.forEach((p) => {
        pminX = Math.min(pminX, p.x)
        pminY = Math.min(pminY, p.y)
        pmaxX = Math.max(pmaxX, p.x)
        pmaxY = Math.max(pmaxY, p.y)
      })
      const cx = (pminX + pmaxX) / 2
      const cy = (pminY + pmaxY) / 2
      const rx = (pmaxX - pminX) / 2
      const ry = (pmaxY - pminY) / 2
      return (
        <svg width={displayWidth} height={displayHeight} viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={previewColor} strokeWidth={previewWidth} fill="none" />
        </svg>
      )
    } else {
      if (strokePoints.length < 2) {
        return (
          <svg width="120" height="40" viewBox="0 0 120 40">
            <circle cx="60" cy="20" r={Math.max(previewWidth / 2, 2)} fill={previewColor} />
          </svg>
        )
      }
      let d = `M ${strokePoints[0].x} ${strokePoints[0].y}`
      for (let i = 1; i < strokePoints.length; i++) d += ` L ${strokePoints[i].x} ${strokePoints[i].y}`
      return (
        <svg width={displayWidth} height={displayHeight} viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}>
          <path
            d={d}
            stroke={previewColor}
            strokeWidth={previewWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )
    }
  }

  const adjustedPosition = getAdjustedPosition()

  return (
    <>
      <style>{`
        .stroke-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.35);
          box-shadow: 0 4px 12px rgba(96,165,250,0.35);
        }
        .stroke-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.35);
          box-shadow: 0 4px 12px rgba(96,165,250,0.35);
        }
      `}</style>

      <div
        ref={menuRef}
        className="fixed z-50 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 p-4 shadow-2xl backdrop-blur-xl"
        style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-[300px] space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 text-slate-200">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-2">
              <Palette className="h-4 w-4 text-blue-200" />
            </div>
            <span className="font-medium">Stroke Properties</span>
          </div>

          {/* Line Width */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Line Width</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={previewWidth}
                onChange={(e) => handleSliderWidth(Number.parseInt(e.target.value))}
                className="stroke-slider h-2 flex-1 cursor-pointer appearance-none rounded-lg"
                style={{
                  background: `linear-gradient(to right, #60a5fa 0%, #60a5fa ${((previewWidth - 1) / 19) * 100
                    }%, rgba(255,255,255,0.12) ${((previewWidth - 1) / 19) * 100}%, rgba(255,255,255,0.12) 100%)`,
                }}
                aria-label="Line width"
              />
              <input
                type="number"
                min={1}
                max={30}
                value={previewWidth}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(30, Number.parseInt(e.target.value || "1")))
                  setPreviewWidth(n)
                  onWidthChange(n)
                }}
                className="h-9 w-16 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-white outline-none focus:border-white/20"
                aria-label="Line width value"
              />
              <span className="text-sm text-slate-400">px</span>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Color</label>
            <div className="flex justify-center">
              <HexColorPicker
                color={previewColor}
                onChange={handleColorChange}
                className="!h-32 !w-full max-w-none"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="border-t border-white/10 pt-2">
            <div className="mb-2 text-xs font-medium text-slate-300">Preview</div>
            <div className="flex min-h-[60px] items-center justify-center rounded-lg border border-white/10 bg-white/5 p-3">
              {renderStrokePreview()}
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">
              {previewColor.toUpperCase()} • {previewWidth}px
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-white/10 pt-2">
            <button
              onClick={onCancel}
              className="group relative flex items-center gap-2 rounded-xl border border-slate-400/20 bg-gradient-to-br from-slate-500/10 via-slate-600/5 to-slate-700/10 px-4 py-2.5 text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-slate-300/30 hover:from-slate-400/15 hover:via-slate-500/10 hover:to-slate-600/15 hover:text-slate-200 active:scale-95"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <X className="relative h-4 w-4 transition-colors duration-300" />
              <span className="relative text-sm font-medium transition-colors duration-300">Cancel</span>
            </button>
            <button
              onClick={onAccept}
              className="group relative flex items-center gap-2 rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 via-violet-500/15 to-purple-600/20 px-4 py-2.5 text-purple-100 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-purple-300/50 hover:from-purple-400/25 hover:via-violet-400/20 hover:to-purple-500/25 hover:shadow-purple-500/25 hover:shadow-xl active:scale-95"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Check className="relative h-4 w-4 text-purple-200 transition-colors duration-300 group-hover:text-white" />
              <span className="relative text-sm font-medium text-purple-200 transition-colors duration-300 group-hover:text-white">Apply</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
