"use client"

import type React from "react"
import { useState } from "react"
import { X, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface LoginPromptProps {
  onClose?: () => void
}

export const LoginPrompt: React.FC<LoginPromptProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const [isHoveringLogin, setIsHoveringLogin] = useState(false)
  const [isHoveringSignUp, setIsHoveringSignUp] = useState(false)

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 -z-10" />

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-blue-600/20 blur-2xl" />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-gray-800/50 hover:bg-gray-700/70 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        )}

        {/* Content */}
        <div className="p-8 md:p-10">
          <div className="flex flex-col items-center">
            {/* Logo/Title */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                MindMeet
              </h1>
            </div>

            {/* Description */}
            <p className="mb-8 text-center text-gray-300 max-w-xs">
              Sign up to save mindmaps, see posts and much more!
            </p>

            {/* Buttons */}
            <div className="space-y-4 w-full max-w-xs">
              <button
                onClick={() => navigate("/login")}
                onMouseEnter={() => setIsHoveringLogin(true)}
                onMouseLeave={() => setIsHoveringLogin(false)}
                className="relative w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 group overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Login
                  <ChevronRight
                    className={`ml-1 w-5 h-5 transition-transform duration-300 ${isHoveringLogin ? "translate-x-1" : ""}`}
                  />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <button
                onClick={() => navigate("/signup")}
                onMouseEnter={() => setIsHoveringSignUp(true)}
                onMouseLeave={() => setIsHoveringSignUp(false)}
                className="relative w-full py-3 px-6 rounded-xl bg-gray-800 text-white font-medium border border-gray-700 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 group"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Sign Up
                  <ChevronRight
                    className={`ml-1 w-5 h-5 transition-transform duration-300 ${isHoveringSignUp ? "translate-x-1" : ""}`}
                  />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-sm text-gray-400">
              By continuing, you agree to our
              <a href="#" className="text-blue-400 hover:text-blue-300 mx-1">
                Terms
              </a>
              and
              <a href="#" className="text-blue-400 hover:text-blue-300 mx-1">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ConditionalLoginPrompt: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LoginPrompt onClose={onClose} />
)

