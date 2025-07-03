"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { supabase } from "../supabaseClient" // Import Supabase client
import { Eye, EyeOff, Loader2 } from "lucide-react" // Import eye icons and loader from lucide-react
import { GoogleAuthButton } from "./GoogleAuthButton" // Import the new component

interface LoginFormProps {
  successMessage?: string
}

export function LoginForm({ successMessage = "" }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // Add state for button loading
  const [isRedirecting, setIsRedirecting] = useState(false) // Add state for redirecting
  const [isCompactMode, setIsCompactMode] = useState(false)
  const navigate = useNavigate()
  const { setUser, setLoading, setError, error, validateSession } = useAuthStore()
  
  // Check if screen height is less than 1090px and set compact mode
  useEffect(() => {
    const checkHeight = () => {
      setIsCompactMode(window.innerHeight < 1090);
    };
    
    // Initial check
    checkHeight();
    
    // Add resize listener
    window.addEventListener('resize', checkHeight);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkHeight);
  }, []);

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes("access_token") || hash.includes("error")) {
      setIsRedirecting(true) // Set redirecting state if hash contains access token or error
    }
    return () => setError(null) // Clear error only when component unmounts
  }, [setError])

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value)
      setError(null) // Clear error when typing
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setIsSubmitting(true) // Set loading state for button
      setError(null)

      // Determine if input is email or username
      const isEmail = email.includes("@")

      if (!isEmail) {
        // If username is provided, first find the associated email
        const { data: userByUsername, error: userError } = await supabase
          .from("profiles")
          .select("email, username")
          .eq("username", email.toLowerCase())
          .single()

        if (userError) {
          throw new Error("Invalid username or password")
        }

        if (!userByUsername?.email) {
          throw new Error("Username not found")
        }

        // Try login with found email
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userByUsername.email,
          password,
        })

        if (signInError) throw new Error("Invalid username or password")
        if (!authData.user) throw new Error("Failed to log in")
        if (!authData.user.email_confirmed_at) throw new Error("Please verify your email before logging in")

        setUser({
          id: authData.user.id,
          username: userByUsername?.username || "", // Map the username from the fetched profile
          avatar_url: authData.user.user_metadata?.avatar_url, // Map optional avatar_url if available
        })

        // Validate the session after setting the user
        await validateSession()

        // Set redirecting state before navigation
        setIsRedirecting(true)
        // Add a small delay before navigation to show the animation
        setTimeout(() => {
          navigate("/")
        }, 1500)
        return
      }

      // Handle email login
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Check if the error is due to invalid credentials
        if (signInError.message === "Invalid login credentials") {
          throw new Error("Invalid email or password")
        }
        // Pass through any other errors
        throw signInError
      }
      if (!authData.user) throw new Error("Failed to log in")
      if (!authData.user.email_confirmed_at)
        throw new Error(
          "Please verify your email before logging in. Check your inbox and spam folder for the verification email.",
        )

      setUser({
        id: authData.user.id,
        username: "", // Provide a default or fetch the username if available
        avatar_url: authData.user.user_metadata?.avatar_url, // Map optional avatar_url if available
      })

      // Validate the session after setting the user
      await validateSession()

      // Set redirecting state before navigation
      setIsRedirecting(true)
      // Add a small delay before navigation to show the animation
      setTimeout(() => {
        navigate("/")
      }, 0)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to log in")
    } finally {
      setLoading(false)
      setIsSubmitting(false) // Reset loading state for button
    }
  }

  return (
    <div
      className="w-full relative"
      style={{
        fontSize: isCompactMode ? 'clamp(0.85rem, 2vw, 1rem)' : '1rem',
        padding: 0,
      }}
    >
      {/* Enhanced Redirection overlay */}
      {isRedirecting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl animate-fadeIn border border-slate-700/50">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/20 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent animate-pulse">
                Redirecting you...
              </h2>
              <p className="text-slate-400 text-sm max-w-xs">
                You've successfully logged in. Taking you to your dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Welcome Message */}
      <h2
        className="text-xl md:text-lg sm:text-base font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-6"
        style={{ fontSize: isCompactMode ? 'clamp(1.1rem, 2vw, 1.25rem)' : '1.25rem' }}
      >
        Welcome back!
      </h2>

      {/* Enhanced Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl text-red-400 text-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Enhanced Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl text-white backdrop-blur-sm">
          <h3 className="text-lg font-bold text-blue-300 mb-2">Signup successful!</h3>
          <p className="text-slate-300 text-sm mb-1">
            Please check your email, including spam folder for email confirmation.
          </p>
          <p className="text-slate-300 text-sm">You can close this window.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={isCompactMode ? "space-y-4 text-base md:text-sm sm:text-xs" : "space-y-6 text-base"}>
        {/* Enhanced Email Input */}
        <div>
          <label htmlFor="email" className={`block font-medium text-slate-300 mb-2 ${isCompactMode ? "text-sm md:text-xs" : "text-sm"}`}>
            Email or Username
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={handleInputChange(setEmail)}
            className={`w-full rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm ${
              isCompactMode ? "px-3 py-2 md:px-2 md:py-1 sm:px-1 sm:py-1 text-base md:text-sm sm:text-xs" : "px-4 py-3 text-base"
            }`}
            placeholder="johndoe@gmail.com or username"
          />
        </div>

        {/* Enhanced Password Input */}
        <div>
          <label htmlFor="password" className={`block font-medium text-slate-300 mb-2 ${isCompactMode ? "text-sm md:text-xs" : "text-sm"}`}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handleInputChange(setPassword)}
              className={`w-full rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm ${
                isCompactMode ? "px-3 py-2 md:px-2 md:py-1 sm:px-1 sm:py-1 pr-10 text-base md:text-sm sm:text-xs" : "px-4 py-3 pr-12 text-base"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-blue-400 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                setError(null) // Clear error when navigating
                navigate("/reset-password")
              }}
              className={`text-slate-400 hover:text-blue-400 transition-colors font-medium ${isCompactMode ? "text-sm md:text-xs" : "text-sm"}`}
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* Enhanced Button Section */}
        <div className={isCompactMode ? "space-y-2 pt-0" : "space-y-4 pt-2"}>
          <button
            type="submit"
            className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 flex items-center justify-center font-medium transform hover:scale-105 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              isCompactMode ? "py-1.5 px-2 md:py-2 md:px-3 sm:py-1 sm:px-2 text-base md:text-sm sm:text-xs" : "py-3 px-4 text-base"
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className={isCompactMode ? "w-4 h-4" : "w-5 h-5"} /> : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/mindmap")}
            className={`w-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl transition-all duration-200 font-medium border border-slate-700/50 hover:border-slate-600/50 backdrop-blur-sm ${
              isCompactMode ? "py-1.5 px-2 md:py-2 md:px-3 sm:py-1 sm:px-2 text-base md:text-sm sm:text-xs" : "py-3 px-4 text-base"
            }`}
          >
            Continue as guest
          </button>
        </div>

        {/* Enhanced Divider */}
        <div className={`flex items-center gap-4 ${isCompactMode ? "my-4" : "my-6"}`}>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
          <span className={`text-slate-400 font-medium ${isCompactMode ? "text-xs" : "text-sm"}`}>or</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        </div>

        <GoogleAuthButton
          buttonText="Continue with Google"
          redirectPath="/"
          onUserDetailsFetched={() => {
            // Handle user details if needed
          }}
        />

        {/* Enhanced Sign Up Link */}
        <div className={`text-center ${isCompactMode ? "pt-4" : "pt-6"}`}>
          <span className={`text-slate-400 ${isCompactMode ? "text-xs" : "text-sm"}`}>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setError(null) // Clear error when navigating
                navigate("/signup")
              }}
              className={`bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-all duration-200 font-semibold ${isCompactMode ? "text-xs" : "text-sm"}`}
            >
              Sign up
            </button>
          </span>
        </div>
      </form>
    </div>
  )
}
