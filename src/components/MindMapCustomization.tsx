// Normalize fontFamily to match fontOptions values
function normalizeFontFamily(font: string | null | undefined): string {
  if (!font) return "aspekta"
  const map: Record<string, string> = {
    array: "array",
    "array-regular": "array",
    "array-wide": "array",
    switzer: "switzer",
    "switzer-regular": "switzer",
    "switzer-variable": "switzer",
    chillax: "chillax",
    "chillax-regular": "chillax",
    "chillax-variable": "chillax",
    aspekta: "aspekta",
  }
  const key = font.toLowerCase()
  return map[key] || "aspekta"
}
;("use client")

import type React from "react"

import { X, Network, Check, ChevronDown } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { useState, useRef, useEffect } from "react"

interface MindMapCustomizationProps {
  isOpen: boolean
  onClose: () => void
  edgeType: "default" | "straight" | "smoothstep"
  backgroundColor: string | null
  dotColor: string | null
  fontFamily: string | null
  onCustomizationChanges: (changes: {
    edgeType?: "default" | "straight" | "smoothstep"
    backgroundColor?: string
    dotColor?: string
    fontFamily?: string
  }) => void
}

export default function MindMapCustomization({
  isOpen,
  onClose,
  edgeType,
  backgroundColor,
  dotColor,
  fontFamily,
  onCustomizationChanges,
}: MindMapCustomizationProps) {
  const fontOptions = [
    { value: "Aspekta", label: "Standard", font: "Aspekta, sans-serif" },
    {
      value: "Chillax",
      label: "Chillax",
      font: "Chillax-Variable, Chillax-Regular, Chillax-Medium, Chillax-Bold, sans-serif",
    },
    {
      value: "Array",
      label: "Array",
      font: "Array-Wide, Array-Regular, Array-Semibold, Array-SemiboldWide, Array-BoldWide, Array-Bold, sans-serif",
    },
    {
      value: "Switzer",
      label: "Switzer",
      font: "Switzer-Variable, Switzer-Regular, Switzer-Medium, Switzer-Bold, sans-serif",
    },
  ]

  const [originalEdgeType, setOriginalEdgeType] = useState(edgeType)
  const [originalBackgroundColor, setOriginalBackgroundColor] = useState(backgroundColor || "#11192C")
  const [originalDotColor, setOriginalDotColor] = useState(dotColor || "#81818a")
  const [originalFontFamily, setOriginalFontFamily] = useState(fontFamily || "Aspekta")

  const [pendingEdgeType, setPendingEdgeType] = useState(edgeType)
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false)
  const [showDotColorPicker, setShowDotColorPicker] = useState(false)
  const [tempBackgroundColor, setTempBackgroundColor] = useState(backgroundColor || "#11192C")
  const [tempDotColor, setTempDotColor] = useState(dotColor || "#81818a")
  const [pendingFontFamily, setPendingFontFamily] = useState(() => {
    const normalized = normalizeFontFamily(fontFamily)
    return normalized
  })

  const [hasEdgeTypeChanged, setHasEdgeTypeChanged] = useState(false)
  const [hasFontFamilyChanged, setHasFontFamilyChanged] = useState(false)

  const [backgroundColorConfirmed, setBackgroundColorConfirmed] = useState(false)
  const [dotColorConfirmed, setDotColorConfirmed] = useState(false)

  const backgroundColorPickerRef = useRef<HTMLDivElement>(null)
  const dotColorPickerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeFontFamily(fontFamily)
      setOriginalEdgeType(edgeType)
      setOriginalBackgroundColor(backgroundColor || "#11192C")
      setOriginalDotColor(dotColor || "#81818a")
      setOriginalFontFamily(normalized)

      setPendingEdgeType(edgeType)
      setTempBackgroundColor(backgroundColor || "#11192C")
      setTempDotColor(dotColor || "#81818a")
      setPendingFontFamily(normalized)

      setHasEdgeTypeChanged(false)
      setHasFontFamilyChanged(false)
      setBackgroundColorConfirmed(false)
      setDotColorConfirmed(false)
    }
  }, [isOpen, edgeType, backgroundColor, dotColor, fontFamily])

  const handleBackgroundHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTempBackgroundColor(value)
  }

  const handleDotHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTempDotColor(value)
  }

  const validateHexColor = (color: string): string => {
    let cleanColor = color.trim()
    if (!cleanColor.startsWith("#")) {
      cleanColor = "#" + cleanColor
    }
    const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
    if (hexRegex.test(cleanColor)) {
      return cleanColor.toUpperCase()
    }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (backgroundColorPickerRef.current && !backgroundColorPickerRef.current.contains(event.target as Element)) {
        if (!backgroundColorConfirmed) {
          // Only reset if not confirmed - clicking outside cancels unconfirmed changes
          setTempBackgroundColor(backgroundColor || "#11192C")
        }
        setShowBackgroundColorPicker(false)
      }
      if (dotColorPickerRef.current && !dotColorPickerRef.current.contains(event.target as Element)) {
        if (!dotColorConfirmed) {
          // Only reset if not confirmed - clicking outside cancels unconfirmed changes
          setTempDotColor(dotColor || "#81818a")
        }
        setShowDotColorPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [backgroundColor, dotColor, backgroundColorConfirmed, dotColorConfirmed])

  // When opening either color picker, ensure its panel (including buttons) is scrolled into view
  useEffect(() => {
    if (!(showBackgroundColorPicker || showDotColorPicker)) return
    const target = showBackgroundColorPicker ? backgroundColorPickerRef.current : dotColorPickerRef.current
    const container = scrollContainerRef.current
    if (!target || !container) return
    // Wait a frame so the absolute panel has mounted & dimensions settle
    requestAnimationFrame(() => {
      const approxPanelExtra = 300 // approximate dropdown height incl. controls
      const targetTop = target.offsetTop
      const neededBottom = targetTop + target.offsetHeight + approxPanelExtra
      const currentBottom = container.scrollTop + container.clientHeight
      if (neededBottom > currentBottom) {
        // Scroll just enough so the panel buttons are visible
        container.scrollTo({ top: neededBottom - container.clientHeight + 16, behavior: 'smooth' })
      } else if (targetTop < container.scrollTop) {
        // If above current viewport, align nearer the top with a small offset
        container.scrollTo({ top: Math.max(targetTop - 16, 0), behavior: 'smooth' })
      }
    })
  }, [showBackgroundColorPicker, showDotColorPicker])

  const handleBackgroundColorConfirm = () => {
    setBackgroundColorConfirmed(true)
    setShowBackgroundColorPicker(false)
  }

  const handleBackgroundColorCancel = () => {
    setTempBackgroundColor(backgroundColor || "#11192C")
    setBackgroundColorConfirmed(false)
    setShowBackgroundColorPicker(false)
  }

  const handleDotColorConfirm = () => {
    setDotColorConfirmed(true)
    setShowDotColorPicker(false)
  }

  const handleDotColorCancel = () => {
    setTempDotColor(dotColor || "#81818a")
    setDotColorConfirmed(false)
    setShowDotColorPicker(false)
  }

  const handleBackgroundColorChange = (color: string) => {
    setTempBackgroundColor(color)
  }

  const handleDotColorChange = (color: string) => {
    setTempDotColor(color)
  }

  const handleFontFamilyChange = (font: string) => {
    const normalized = normalizeFontFamily(font)
    setPendingFontFamily(normalized)
    setHasFontFamilyChanged(true)
  }

  const handleBackgroundColorDefault = () => {
    setTempBackgroundColor("#11192C")
  }

  const handleDotColorDefault = () => {
    setTempDotColor("#81818a")
  }

  const handleCancel = () => {
    setPendingEdgeType(originalEdgeType)
    setTempBackgroundColor(originalBackgroundColor)
    setTempDotColor(originalDotColor)
    setPendingFontFamily(originalFontFamily)
    setBackgroundColorConfirmed(false)
    setDotColorConfirmed(false)
    setShowBackgroundColorPicker(false)
    setShowDotColorPicker(false)
    onClose()
  }

  const handleDone = () => {
    const edgeChanged = hasEdgeTypeChanged || pendingEdgeType !== originalEdgeType
    const fontChanged = hasFontFamilyChanged || pendingFontFamily !== originalFontFamily
    const backgroundChanged = backgroundColorConfirmed && tempBackgroundColor !== originalBackgroundColor
    const dotChanged = dotColorConfirmed && tempDotColor !== originalDotColor

    const changes: any = {}
    if (edgeChanged) changes.edgeType = pendingEdgeType
    if (fontChanged) changes.fontFamily = pendingFontFamily
    if (backgroundChanged) changes.backgroundColor = tempBackgroundColor
    if (dotChanged) changes.dotColor = tempDotColor

    if (Object.keys(changes).length > 0) {
      onCustomizationChanges(changes)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-1 sm:p-2 z-50 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-purple-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-3 sm:p-4 lg:p-6 xl:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 lg:mb-4 xl:mb-5">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="p-1.5 lg:p-2 xl:p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-white/10">
              <Network className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm lg:text-base xl:text-lg font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Customize Mindmap
              </h2>
              <p className="text-slate-400 text-xs lg:text-sm xl:text-base">Personalize your visualization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 lg:p-1.5 xl:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
          </button>
        </div>

  <div ref={scrollContainerRef} className="space-y-3 lg:space-y-4 xl:space-y-5 overflow-y-auto max-h-[70vh] pr-1 -mr-1">
          {/* Edge Type Section */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center space-x-1.5 lg:space-x-2">
              <div className="w-0.5 h-3 lg:h-4 xl:h-5 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
              <h3 className="text-xs lg:text-sm xl:text-base font-semibold text-white">Connection Style</h3>
            </div>

            <div className="grid gap-1.5 lg:gap-2 xl:gap-3">
              {edgeTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPendingEdgeType(option.value as any)
                    setHasEdgeTypeChanged(true)
                  }}
                  className={`group relative overflow-hidden p-2 lg:p-3 xl:p-4 text-left rounded-lg transition-all duration-300 border ${
                    pendingEdgeType === option.value
                      ? "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20"
                      : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5 lg:space-x-2 mb-0.5 lg:mb-1">
                        <div className="text-white font-medium text-xs lg:text-sm xl:text-base">{option.label}</div>
                        {pendingEdgeType === option.value && (
                          <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="text-slate-400 text-xs lg:text-sm leading-tight">{option.description}</div>
                    </div>
                    <div className="ml-2 lg:ml-3 text-slate-300 scale-75 lg:scale-90 xl:scale-100">
                      {option.preview}
                    </div>
                  </div>

                  {pendingEdgeType === option.value && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors Section */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center space-x-1.5 lg:space-x-2">
              <div className="w-0.5 h-3 lg:h-4 xl:h-5 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
              <h3 className="text-xs lg:text-sm xl:text-base font-semibold text-white">Color Palette</h3>
            </div>

            {/* Background Color */}
            <div className="space-y-1.5 lg:space-y-2">
              <div className="relative" ref={backgroundColorPickerRef}>
                <button
                  onClick={() => {
                    setShowBackgroundColorPicker(!showBackgroundColorPicker)
                    setShowDotColorPicker(false)
                  }}
                  className="group w-full p-2 lg:p-3 xl:p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="relative">
                      <div
                        className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded border-2 border-white/20 shadow-lg"
                        style={{ backgroundColor: tempBackgroundColor }}
                      ></div>
                      <div className="absolute inset-0 rounded bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div>
                      <div className="text-white font-medium text-xs lg:text-sm xl:text-base">Background</div>
                      <div className="text-slate-400 text-xs lg:text-sm uppercase tracking-wider">
                        {tempBackgroundColor}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-slate-400 transition-transform duration-200 ${showBackgroundColorPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {showBackgroundColorPicker && (
                  /* Increased color picker container size and made picker much larger */
                  <div className="absolute top-full left-0 right-0 mt-1 lg:mt-2 p-3 lg:p-4 xl:p-5 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 lg:space-y-3">
                      <HexColorPicker
                        color={tempBackgroundColor}
                        onChange={handleBackgroundColorChange}
                        className="w-full"
                        style={{ width: '100%', height: '260px', maxWidth: '100%' }}
                      />
                      <div className="flex items-end gap-2 lg:gap-3">
                        <div className="flex-shrink-0">
                          <div className="text-xs lg:text-sm text-slate-400 mb-1">Hex</div>
                          <input
                            type="text"
                            value={tempBackgroundColor}
                            onChange={handleBackgroundHexChange}
                            onBlur={handleBackgroundHexBlur}
                            className="w-20 lg:w-24 px-2 py-1.5 lg:px-3 lg:py-2 bg-white/5 border border-white/10 rounded text-white font-mono text-xs lg:text-sm uppercase tracking-wider focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all duration-200"
                            placeholder="#11192C"
                            maxLength={7}
                          />
                        </div>

                        <div className="flex gap-1.5 lg:gap-2 flex-1 justify-end">
                          <button
                            onClick={handleBackgroundColorDefault}
                            className="px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs lg:text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all duration-200"
                            title="Reset to Default"
                          >
                            Default
                          </button>
                          <button
                            onClick={handleBackgroundColorCancel}
                            className="p-1.5 lg:p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-400/30 rounded transition-all duration-200"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                          <button
                            onClick={handleBackgroundColorConfirm}
                            className="p-1.5 lg:p-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded transition-all duration-200 shadow-lg hover:shadow-green-500/25 border border-green-400/20"
                            title="Apply"
                          >
                            <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dot Color */}
            <div className="space-y-1.5 lg:space-y-2">
              <div className="relative" ref={dotColorPickerRef}>
                <button
                  onClick={() => {
                    setShowDotColorPicker(!showDotColorPicker)
                    setShowBackgroundColorPicker(false)
                  }}
                  className="group w-full p-2 lg:p-3 xl:p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="relative">
                      <div
                        className="w-6 h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded-full border-2 border-white/20 shadow-lg"
                        style={{ backgroundColor: tempDotColor }}
                      ></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div>
                      <div className="text-white font-medium text-xs lg:text-sm xl:text-base">Dot Pattern</div>
                      <div className="text-slate-400 text-xs lg:text-sm uppercase tracking-wider">{tempDotColor}</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-slate-400 transition-transform duration-200 ${showDotColorPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {showDotColorPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 lg:mt-2 p-3 lg:p-4 xl:p-5 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-purple-900/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 lg:space-y-3">
                      <HexColorPicker
                        color={tempDotColor}
                        onChange={handleDotColorChange}
                        className="w-full"
                        style={{ width: '100%', height: '260px', maxWidth: '100%' }}
                      />
                      <div className="flex items-end gap-2 lg:gap-3">
                        <div className="flex-shrink-0">
                          <div className="text-xs lg:text-sm text-slate-400 mb-1">Hex</div>
                          <input
                            type="text"
                            value={tempDotColor}
                            onChange={handleDotHexChange}
                            onBlur={handleDotHexBlur}
                            className="w-20 lg:w-24 px-2 py-1.5 lg:px-3 lg:py-2 bg-white/5 border border-white/10 rounded text-white font-mono text-xs lg:text-sm uppercase tracking-wider focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all duration-200"
                            placeholder="#81818a"
                            maxLength={7}
                          />
                        </div>

                        <div className="flex gap-1.5 lg:gap-2 flex-1 justify-end">
                          <button
                            onClick={handleDotColorDefault}
                            className="px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs lg:text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all duration-200"
                            title="Reset to Default"
                          >
                            Default
                          </button>
                          <button
                            onClick={handleDotColorCancel}
                            className="p-1.5 lg:p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-400/30 rounded transition-all duration-200"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                          <button
                            onClick={handleDotColorConfirm}
                            className="p-1.5 lg:p-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded transition-all duration-200 shadow-lg hover:shadow-green-500/25 border border-green-400/20"
                            title="Apply"
                          >
                            <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Font Family Section */}
            <div className="space-y-2 lg:space-y-3">
              <div className="flex items-center space-x-1.5 lg:space-x-2">
                <div className="w-0.5 h-3 lg:h-4 xl:h-5 bg-gradient-to-b from-pink-400 to-blue-400 rounded-full"></div>
                <h3 className="text-xs lg:text-sm xl:text-base font-semibold text-white">Font Family</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-1.5 lg:gap-2 xl:gap-3">
                {fontOptions.map((option) => {
                  const isSelected = pendingFontFamily === normalizeFontFamily(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFontFamilyChange(option.value)}
                      className={`group relative overflow-hidden p-2 lg:p-3 xl:p-4 text-left rounded-lg transition-all duration-300 border flex items-center space-x-1.5 lg:space-x-2 ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20"
                          : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                      }`}
                      style={{ fontFamily: option.font }}
                    >
                      <span className="text-white font-medium text-xs lg:text-sm xl:text-base">{option.label}</span>
                      {isSelected && (
                        <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-3 lg:mt-4 xl:mt-5 pt-2 lg:pt-3 border-t border-white/10">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 lg:px-4 lg:py-2 xl:px-5 xl:py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all duration-200 font-medium border border-white/10 hover:border-white/20 text-xs lg:text-sm xl:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="px-4 py-1.5 lg:px-5 lg:py-2 xl:px-6 xl:py-2.5 bg-gradient-to-r from-slate-600/80 to-slate-700/80 hover:from-slate-500/80 hover:to-slate-600/80 text-white rounded-lg transition-all duration-200 font-medium border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl text-xs lg:text-sm xl:text-base"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
