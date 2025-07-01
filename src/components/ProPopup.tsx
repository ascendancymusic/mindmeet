"use client"

import { useState } from "react"
import { Modal } from "./Modal"
import { Check, Network, Zap } from "lucide-react"

interface ProPopupProps {
  isOpen: boolean
  onClose: () => void
}

export const ProPopup = ({ isOpen, onClose }: ProPopupProps) => {
  const [hoverCount, setHoverCount] = useState(0)
  const [selectedTier, setSelectedTier] = useState<"plus" | "elite">("elite")

  if (!isOpen) return null

  const tiers = {
    plus: {
      name: "Plus",
      price: "5€",
      color: "from-blue-400 to-blue-600",
      icon: <Network className="w-full h-full text-gray-900 p-2 sm:p-3" />,
      features: [
        "Unlimited images",
        "Unlimited links",
        "Remix maps",
        "Profile customization",
        { name: "Custom name colors", hover: true },
        "Gif avatar",
      ],
    },
    elite: {
      name: "Elite",
      price: "15€",
      color: "from-blue-500 to-blue-700",
      icon: <Zap className="w-full h-full text-gray-900 p-2 sm:p-3" />,
      features: [
        "Everything in Plus",
        "AI features",
        "Map fill",
        { name: "Bigglesmooth AI", description: "Based!" },
        "Priority support",
        "Early access to new features",
      ],
    },
  }

  const getGradientClass = (count: number) => {
    const gradients = [
      "from-blue-400 to-blue-600",
      "from-green-400 to-green-600",
      "from-red-400 to-red-600",
      "from-yellow-400 to-yellow-600",
    ]
    return gradients[count % gradients.length]
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl p-8 shadow-2xl max-w-4xl w-full mx-auto text-center">
        {/* Electric border layer */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl z-0">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 animate-pulse"></div>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25 animate-pulse">
            <Network className="w-full h-full text-white p-3" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-8 drop-shadow-2xl">
            MindMeet Pro
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Plus Tier */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 transition-all duration-500 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 h-full flex flex-col hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    {tiers.plus.name}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Monthly subscription</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    {tiers.plus.price}
                  </span>
                  <span className="text-slate-400 font-medium">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {tiers.plus.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                      <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      {typeof feature === "string" ? (
                        <span className="text-slate-200 font-medium">{feature}</span>
                      ) : (
                        <div className="relative">
                          <span
                            className={
                              feature.hover
                                ? `transition-all duration-300 font-medium ${hoverCount > 0 ? "bg-gradient-to-r bg-clip-text text-transparent " + getGradientClass(hoverCount - 1) : "text-slate-200"}`
                                : "text-slate-200 font-medium"
                            }
                            onMouseEnter={() => feature.hover && setHoverCount((prev) => prev + 1)}
                          >
                            {feature.name}
                          </span>
                          {feature.description && (
                            <span className="absolute -bottom-4 left-[calc(100%-2em)] text-xs font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent transform -rotate-6 pointer-events-none animate-pulse">
                              {feature.description}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {}}
                className="w-full py-4 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105
             bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
             shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                Subscribe to Plus
              </button>
            </div>

            {/* Elite Tier */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-600/50 transition-all duration-500 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 h-full flex flex-col relative overflow-hidden hover:-translate-y-1">
              <div className="absolute -right-10 top-6 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-xs font-bold px-12 py-2 transform rotate-45 shadow-lg">
                WOWZERS!
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">
                    {tiers.elite.name}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Monthly subscription</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">
                    {tiers.elite.price}
                  </span>
                  <span className="text-slate-400 font-medium">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {tiers.elite.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                      <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      {typeof feature === "string" ? (
                        <span className="text-slate-200 font-medium">{feature}</span>
                      ) : (
                        <div className="relative">
                          <span
                            className={
                              feature.hover
                                ? `transition-all duration-300 font-medium ${hoverCount > 0 ? "bg-gradient-to-r bg-clip-text text-transparent " + getGradientClass(hoverCount - 1) : "text-slate-200"}`
                                : "text-slate-200 font-medium"
                            }
                            onMouseEnter={() => feature.hover && setHoverCount((prev) => prev + 1)}
                          >
                            {feature.name}
                          </span>
                          {feature.description && (
                            <span className="absolute -bottom-4 left-[calc(100%-2em)] text-xs font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent transform -rotate-6 pointer-events-none animate-pulse">
                              {feature.description}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {}}
                className="w-full py-4 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105
             bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500
             shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                Subscribe to Elite
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800/50 text-slate-400 rounded-xl hover:bg-slate-700/50 hover:text-slate-300 transition-all duration-300 font-medium border border-slate-700/50 hover:border-slate-600/50 backdrop-blur-sm"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </Modal>
  )
}
