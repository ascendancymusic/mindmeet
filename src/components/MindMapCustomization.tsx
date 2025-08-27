"use client"

import { X, Network, Check, ChevronDown } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { useState, useRef, useEffect } from "react"

interface MindMapCustomizationProps {
  isOpen: boolean
  onClose: () => void
  edgeType: "default" | "straight" | "smoothstep"
  onEdgeTypeChange: (newEdgeType: "default" | "straight" | "smoothstep") => void
  backgroundColor: string | null
  onBackgroundColorChange: (color: string) => void
  dotColor: string | null
  onDotColorChange: (color: string) => void
  // fontFamily?: string // (future prop for font)
}

export default function MindMapCustomization({
  isOpen,
  onClose,
  edgeType,
  onEdgeTypeChange,
  backgroundColor,
  onBackgroundColorChange,
  dotColor,
  onDotColorChange,
  // fontFamily,
}: MindMapCustomizationProps) {
  // Font selection state (not implemented yet)
  const fontOptions = [
    { value: 'aspekta', label: 'Standard' },
    { value: 'chillax', label: 'Chillax' },
    { value: 'array', label: 'Array' },
    { value: 'switzer', label: 'Switzer' },
  ];
  const [pendingFont, setPendingFont] = useState('aspekta');
  // Track original values - these will be updated when modal opens
  const [originalEdgeType, setOriginalEdgeType] = useState(edgeType)
  const [originalBackgroundColor, setOriginalBackgroundColor] = useState(backgroundColor || "#11192C")
  const [originalDotColor, setOriginalDotColor] = useState(dotColor || "#81818a")
  
  // Track pending changes
  const [pendingEdgeType, setPendingEdgeType] = useState(edgeType)
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false)
  const [showDotColorPicker, setShowDotColorPicker] = useState(false)
  const [tempBackgroundColor, setTempBackgroundColor] = useState(backgroundColor || "#11192C")
  const [tempDotColor, setTempDotColor] = useState(dotColor || "#81818a")
  
  // Track if user has made explicit changes (like clicking "Default")
  const [hasBackgroundColorChanged, setHasBackgroundColorChanged] = useState(false)
  const [hasDotColorChanged, setHasDotColorChanged] = useState(false)
  const [hasEdgeTypeChanged, setHasEdgeTypeChanged] = useState(false)

  const backgroundColorPickerRef = useRef<HTMLDivElement>(null)
  const dotColorPickerRef = useRef<HTMLDivElement>(null)

  // Update temp colors when props change (when component opens)
  useEffect(() => {
    if (isOpen) {
      // Update original values to current props when modal opens
      setOriginalEdgeType(edgeType)
      setOriginalBackgroundColor(backgroundColor || "#11192C")
      setOriginalDotColor(dotColor || "#81818a")
      
      // Update temp values
      setPendingEdgeType(edgeType)
      setTempBackgroundColor(backgroundColor || "#11192C")
      setTempDotColor(dotColor || "#81818a")
      
      // Reset change tracking when modal opens
      setHasBackgroundColorChanged(false)
      setHasDotColorChanged(false)
      setHasEdgeTypeChanged(false)
    }
  }, [isOpen, edgeType, backgroundColor, dotColor])

  // Handle hex input changes
  const handleBackgroundHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTempBackgroundColor(value)
    setHasBackgroundColorChanged(true)
  }

  const handleDotHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTempDotColor(value)
    setHasDotColorChanged(true)
  }

  // Validate and format hex color on blur
  const validateHexColor = (color: string): string => {
    // Remove any whitespace
    let cleanColor = color.trim()
    
    // Add # if missing
    if (!cleanColor.startsWith('#')) {
      cleanColor = '#' + cleanColor
    }
    
    // Check if it's a valid hex color (3 or 6 digits after #)
    const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
    if (hexRegex.test(cleanColor)) {
      return cleanColor.toUpperCase()
    }
    
    // If invalid, return original color
    return color
  }

  const handleBackgroundHexBlur = () => {
    const validatedColor = validateHexColor(tempBackgroundColor)
    setTempBackgroundColor(validatedColor)
  }

  const handleDotHexBlur = () => {
    const validatedColor = validateHexColor(tempDotColor)
    setTempDotColor(validatedColor)
  }

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (backgroundColorPickerRef.current && !backgroundColorPickerRef.current.contains(event.target as Element)) {
        setShowBackgroundColorPicker(false)
      }
      if (dotColorPickerRef.current && !dotColorPickerRef.current.contains(event.target as Element)) {
        setShowDotColorPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleBackgroundColorConfirm = () => {
    // Color editing disabled for now
    setShowBackgroundColorPicker(false)
  }

  const handleBackgroundColorCancel = () => {
    setTempBackgroundColor(backgroundColor || "#11192C")
    setShowBackgroundColorPicker(false)
  }

  const handleDotColorConfirm = () => {
    // Color editing disabled for now
    setShowDotColorPicker(false)
  }

  const handleDotColorCancel = () => {
    setTempDotColor(dotColor || "#81818a")
    setShowDotColorPicker(false)
  }

  const handleBackgroundColorChange = (color: string) => {
    setTempBackgroundColor(color)
    setHasBackgroundColorChanged(true)
  }

  const handleDotColorChange = (color: string) => {
    setTempDotColor(color)
    setHasDotColorChanged(true)
  }

  const handleBackgroundColorDefault = () => {
    setTempBackgroundColor("#11192C")
    setHasBackgroundColorChanged(true)
  }

  const handleDotColorDefault = () => {
    setTempDotColor("#81818a")
    setHasDotColorChanged(true)
  }

  const handleCancel = () => {
    // Reset all pending changes
    setPendingEdgeType(originalEdgeType)
    setTempBackgroundColor(originalBackgroundColor)
    setTempDotColor(originalDotColor)
    setShowBackgroundColorPicker(false)
    setShowDotColorPicker(false)
    onClose()
  }

  const handleDone = () => {
    // Check if any changes were made (either values changed OR user explicitly clicked default)
    const backgroundChanged = hasBackgroundColorChanged || tempBackgroundColor !== originalBackgroundColor
    const dotChanged = hasDotColorChanged || tempDotColor !== originalDotColor
    const edgeChanged = hasEdgeTypeChanged || pendingEdgeType !== originalEdgeType
    
    // Only apply changes if something actually changed
    if (edgeChanged) {
      onEdgeTypeChange(pendingEdgeType)
    }
    if (backgroundChanged) {
      onBackgroundColorChange(tempBackgroundColor)
    }
    if (dotChanged) {
      onDotColorChange(tempDotColor)
    }

    setShowBackgroundColorPicker(false)
    setShowDotColorPicker(false)
    onClose()
  }

  if (!isOpen) return null

  const edgeTypeOptions = [
    {
      value: "default",
      label: "Bezier",
      description: "Smooth curved connections",
      preview: (
        <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-60">
          <path d="M5 15 Q20 5 35 15" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
    {
      value: "smoothstep",
      label: "Smooth Step",
      description: "Right-angled with curves",
      preview: (
        <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-60">
          <path
            d="M5 15 L15 15 Q20 15 20 10 L20 10 Q20 5 25 5 L35 5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      ),
    },
    {
      value: "straight",
      label: "Straight",
      description: "Direct linear connections",
      preview: (
        <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-60">
          <path d="M5 15 L35 5" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-white/10">
              <Network className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Customize Mindmap
              </h2>
              <p className="text-slate-400 text-sm mt-1">Personalize your visualization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>



        <div className="space-y-8 overflow-y-auto max-h-[60vh] pr-2 -mr-2">
          {/* Edge Type Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white">Connection Style</h3>
            </div>

            <div className="grid gap-3">
              {edgeTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPendingEdgeType(option.value as any)
                    setHasEdgeTypeChanged(true)
                  }}
                  className={`group relative overflow-hidden p-4 text-left rounded-2xl transition-all duration-300 border ${
                    pendingEdgeType === option.value
                      ? "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20"
                      : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="text-white font-medium">{option.label}</div>
                        {pendingEdgeType === option.value && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm">{option.description}</div>
                    </div>
                    <div className="ml-4 text-slate-300">{option.preview}</div>
                  </div>

                  {pendingEdgeType === option.value && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white">Color Palette</h3>
            </div>

            {/* Background Color */}
            <div className="space-y-3">
              <div className="relative" ref={backgroundColorPickerRef}>
                <button
                  onClick={() => {
                    setShowBackgroundColorPicker(!showBackgroundColorPicker)
                    setShowDotColorPicker(false)
                  }}
                  className="group w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-white/20 shadow-lg"
                        style={{ backgroundColor: tempBackgroundColor }}
                      ></div>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div>
                      <div className="text-white font-medium">Background</div>
                      <div className="text-slate-400 text-sm uppercase tracking-wider">{tempBackgroundColor}</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showBackgroundColorPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {showBackgroundColorPicker && (
                  <div className="absolute top-full left-0 right-0 mt-3 p-6 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4">
                      <HexColorPicker
                        color={tempBackgroundColor}
                        onChange={handleBackgroundColorChange}
                        className="w-full !h-48"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="text-xs text-slate-400 mb-1">Hex Color</div>
                          <input
                            type="text"
                            value={tempBackgroundColor}
                            onChange={handleBackgroundHexChange}
                            onBlur={handleBackgroundHexBlur}
                            className="w-full bg-transparent text-white font-mono text-sm uppercase tracking-wider focus:outline-none"
                            placeholder="#11192C"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleBackgroundColorDefault}
                            className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20"
                            title="Reset to Default"
                          >
                            Default
                          </button>
                          <button
                            onClick={handleBackgroundColorCancel}
                            className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleBackgroundColorConfirm}
                            className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/25"
                            title="Apply"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dot Color */}
            <div className="space-y-3">
              <div className="relative" ref={dotColorPickerRef}>
                <button
                  onClick={() => {
                    setShowDotColorPicker(!showDotColorPicker)
                    setShowBackgroundColorPicker(false)
                  }}
                  className="group w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-full border-2 border-white/20 shadow-lg"
                        style={{ backgroundColor: tempDotColor }}
                      ></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div>
                      <div className="text-white font-medium">Dot Pattern</div>
                      <div className="text-slate-400 text-sm uppercase tracking-wider">{tempDotColor}</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showDotColorPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {showDotColorPicker && (
                  <div className="absolute top-full left-0 right-0 mt-3 p-6 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4">
                      <HexColorPicker color={tempDotColor} onChange={handleDotColorChange} className="w-full !h-48" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="text-xs text-slate-400 mb-1">Hex Color</div>
                          <input
                            type="text"
                            value={tempDotColor}
                            onChange={handleDotHexChange}
                            onBlur={handleDotHexBlur}
                            className="w-full bg-transparent text-white font-mono text-sm uppercase tracking-wider focus:outline-none"
                            placeholder="#81818a"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDotColorDefault}
                            className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20"
                            title="Reset to Default"
                          >
                            Default
                          </button>
                          <button
                            onClick={handleDotColorCancel}
                            className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleDotColorConfirm}
                            className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/25"
                            title="Apply"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
        {/* Font Family Section (preview only, no logic) - moved to just above footer */}
        <div className="space-y-4 mt-10">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-gradient-to-b from-pink-400 to-blue-400 rounded-full"></div>
            <h3 className="text-lg font-semibold text-white">Font Family</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'aspekta', label: 'Standard', font: 'Aspekta, sans-serif' },
              { value: 'chillax', label: 'Chillax', font: 'Chillax-Variable, Chillax-Regular, Chillax-Medium, Chillax-Bold, sans-serif' },
              { value: 'array', label: 'Array', font: 'Array-Wide, Array-Regular, Array-Semibold, Array-SemiboldWide, Array-BoldWide, Array-Bold, sans-serif' },
              { value: 'switzer', label: 'Switzer', font: 'Switzer-Variable, Switzer-Regular, Switzer-Medium, Switzer-Bold, sans-serif' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`group relative overflow-hidden p-3 text-left rounded-2xl transition-all duration-300 border flex items-center space-x-3 bg-white/5 border-white/10`}
                style={{ fontFamily: option.font }}
                disabled
              >
                <span className="text-white font-medium">{option.label}</span>
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-1">(Font selection coming soon)</div>
        </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl transition-all duration-200 font-medium border border-white/10 hover:border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="px-8 py-3 bg-gradient-to-r from-slate-600/80 to-slate-700/80 hover:from-slate-500/80 hover:to-slate-600/80 text-white rounded-2xl transition-all duration-200 font-medium border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
