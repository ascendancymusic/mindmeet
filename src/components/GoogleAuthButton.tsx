import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { NewAccountSetup } from "./NewAccountSetup"

interface GoogleAuthButtonProps {
  buttonText: string
  redirectPath: string
  onUserDetailsFetched: (details: { email: string; avatar: string; username: string }) => void
}

export function GoogleAuthButton({ buttonText, redirectPath, onUserDetailsFetched }: GoogleAuthButtonProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser, validateSession } = useAuthStore()
  const [showNewAccountSetup, setShowNewAccountSetup] = useState(false)
  const [userData, setUserData] = useState<{
    id: string
    email: string
    username: string
    avatar: string
  } | null>(null)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false) // New state for loading indicator

  useEffect(() => {
    let isProcessing = false
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get("error")
    const errorDescription = urlParams.get("error_description")

    if (error && errorDescription) {
      setErrorMessage(`${error}: ${errorDescription}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    const handleAuthCallback = async () => {
      if (isProcessing) return
      isProcessing = true
      setIsProcessingAuth(true) // Show loading indicator

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        // Navigate immediately to the redirectPath
        navigate(redirectPath, { state: { isNewAccount: false } })

        const { id } = session.user
        let attempts = 0
        const maxAttempts = 3
        const delay = 100 // 1 second

        while (attempts < maxAttempts) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, email, full_name, avatar_url, join_date")
            .eq("id", id)
            .single()

          if (profile) {
            const { username, email, avatar_url, join_date } = profile
            const joinDate = join_date ? new Date(join_date) : new Date()
            const now = new Date()
            const minutesDiff = (now.getTime() - joinDate.getTime()) / (1000 * 60)
            const isNewAccount = minutesDiff < 5

            const userDetails = {
              email: email || "",
              avatar: avatar_url || "",
              username: username || "",
            }

            setUser({
              id: session.user.id,
              username: username || "",
              avatar_url: avatar_url || "",
            })

            // Validate the session after setting the user
            await validateSession()

            onUserDetailsFetched(userDetails)

            if (isNewAccount) {
              setUserData({
                id: session.user.id,
                email: email || "",
                username: username || "",
                avatar: avatar_url || "",
              })
              navigate(redirectPath, {
                state: {
                  isNewAccount: true,
                  userData: {
                    id: session.user.id,
                    email: email || "",
                    username: username || "",
                    avatar: avatar_url || "",
                  },
                },
              })
            }
            break
          }

          await new Promise((resolve) => setTimeout(resolve, delay))
          attempts++
        }
      }

      setIsProcessingAuth(false) // Hide loading indicator after processing
      isProcessing = false
    }

    handleAuthCallback()

    return () => {
      isProcessing = true
    }
  }, [navigate, redirectPath, setUser, onUserDetailsFetched])

  const handleGoogleAuth = async () => {
    try {
      setIsGoogleLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            scope:
              "email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
          },
        },
      })

      if (error) {
        throw new Error(`OAuth Error: ${error.message}`)
      }
      if (!data?.url) {
        throw new Error("No redirect URL provided by Supabase")
      }

      window.location.href = data.url
    } catch (error: any) {
      const message = error.message || "An unexpected error occurred"
      setErrorMessage(message)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleAccountSetupComplete = async ({ username, fullName }: { username: string; fullName: string }) => {
    try {
      if (!userData) return

      // This is redundant now, but kept for consistency
      const { error } = await supabase.from("profiles").update({ username, full_name: fullName }).eq("id", userData.id)

      if (error) {
        return
      }

      setUser({
        id: userData.id,
        username: username,
        avatar_url: userData.avatar || "",
      })

      // Validate the session after setting the user
      await validateSession()

      setShowNewAccountSetup(false) // This closes the modal
      navigate(redirectPath)

    } catch (error) {
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isGoogleLoading}
        className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <img src="/assets/picar/google.svg" alt="Google" className="w-5 h-5" />
        {isGoogleLoading ? "Signing in..." : buttonText}
      </button>
      {errorMessage && <p className="text-red-500 mt-2 text-sm">{errorMessage}</p>}

      {isProcessingAuth && (
        <div className="flex items-center justify-center mt-4">
          <p className="text-white">Processing authentication, please wait...</p>
        </div>
      )}

      {showNewAccountSetup && userData && (
        <NewAccountSetup
          userId={userData.id}
          initialEmail={userData.email}
          initialUsername={userData.username}
          initialAvatar={userData.avatar}
          onComplete={handleAccountSetupComplete}
        />
      )}
    </div>
  )
}