import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabaseClient"
import AvatarEditor from "react-avatar-editor"
import { Camera, X, Check, Loader2 } from "lucide-react"

interface NewAccountSetupProps {
  userId: string
  initialEmail: string // Kept for compatibility
  initialUsername: string
  initialAvatar: string
  onComplete: (details: { username: string; fullName: string }) => Promise<void>
}

export function NewAccountSetup({
  userId,
  initialUsername: propInitialUsername,
  initialAvatar,
  onComplete
}: NewAccountSetupProps) {
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [isFetchingProfile, setIsFetchingProfile] = useState(true)
  
  // Avatar editor state
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const [avatarImage, setAvatarImage] = useState<File | null>(null)
  const [avatarScale, setAvatarScale] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState(initialAvatar)
  const avatarEditorRef = useRef<AvatarEditor | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch profile data from Supabase on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetchingProfile(true)
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", userId)
          .single()

        if (error) {
          console.error("Error fetching profile:", error.message)
          setUsername(propInitialUsername || "")
          setFullName("")
          setCurrentAvatar(initialAvatar)
        } else {
          setUsername(data?.username || propInitialUsername || "")
          setFullName(data?.full_name || "")
          setCurrentAvatar(data?.avatar_url || initialAvatar)
        }
      } catch (err) {
        console.error("Error in fetchProfile:", err)
        setUsername(propInitialUsername || "")
        setFullName("")
        setCurrentAvatar(initialAvatar)
      } finally {
        setIsFetchingProfile(false)
      }
    }

    fetchProfile()
  }, [userId, propInitialUsername, initialAvatar])

  // Check username availability when it changes
  useEffect(() => {
    if (!username || username === propInitialUsername) {
      setUsernameAvailable(true)
      return
    }

    const checkUsername = async () => {
      setIsCheckingUsername(true)
      setError(null)

      try {
        console.log("Checking username availability:", username)
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error("Error checking username:", error.message)
          throw error
        }

        setUsernameAvailable(!data)
        console.log("Username available:", !data)
      } catch (err) {
        setUsernameAvailable(true)
      } finally {
        setIsCheckingUsername(false)
      }
    }

    const debounceTimer = setTimeout(checkUsername, 500)
    return () => clearTimeout(debounceTimer)
  }, [username, propInitialUsername])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!usernameAvailable) {
      setError("Username is already taken")
      return
    }

    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("Submitting profile update:", { username, fullName })
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username, full_name: fullName })
        .eq("id", userId)

      if (updateError) {
        throw updateError
      }

      await onComplete({ username, fullName })
      console.log("Profile update completed")
    } catch (err: any) {
      console.error("Account setup error:", err.message || err)
      setError(err.message || "Failed to update profile")
      setIsLoading(false)
    }
  }

  // Avatar upload handlers
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]

      // Check file size (3MB max)
      if (file.size > 3 * 1024 * 1024) {
        alert("Image size must be less than 3MB")
        return
      }

      setAvatarImage(file)
      setIsAvatarEditorOpen(true)
    }
  }

  const handleSaveAvatar = async () => {
    if (!avatarEditorRef.current || !userId) return

    setIsUploading(true)

    try {
      // Get canvas with cropped image
      const canvas = avatarEditorRef.current.getImageScaledToCanvas()

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
          },
          "image/jpeg",
          0.95,
        )
      })

      // Create a consistent filename based on user ID
      const fileName = `user-${userId}.jpg`
      const avatarFile = new File([blob], fileName, { type: "image/jpeg" })

      // Upload to Supabase Storage with upsert to replace existing file
      const { error } = await supabase.storage.from("avatars").upload(fileName, avatarFile, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

      // Add cache busting parameter to force browser to reload the image
      const timestamp = new Date().getTime()
      const avatarUrl = `${urlData.publicUrl}?t=${timestamp}`

      // Update profile with new avatar URL
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId)

      if (updateError) throw updateError

      // Update local state
      setCurrentAvatar(avatarUrl)

      // Close editor
      setIsAvatarEditorOpen(false)
      setAvatarImage(null)
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Failed to upload avatar. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/80 backdrop-blur-xl rounded-2xl max-w-md w-full p-8 border border-slate-700/40 shadow-2xl relative">
        <div className="flex flex-col items-center mb-8">
          <div
            className="relative group cursor-pointer mb-4"
            onClick={handleAvatarClick}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden ring-4 ring-slate-600/20 transition-all duration-300 group-hover:ring-blue-400/40">
              <img
                src={currentAvatar || "/placeholder.svg"}
                alt="Profile"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-1">
            Welcome!
          </h2>
          <p className="text-slate-400">Customize your profile to get started</p>
        </div>
  
        {isFetchingProfile ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-t-transparent border-purple-500 rounded-full animate-spin animate-reverse"></div>
            </div>
            <p className="text-gray-400 animate-pulse">Loading your profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value.slice(0, 25))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-400 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-2 focus:border-transparent transition ${
                  !usernameAvailable ? "border-red-500 focus:ring-red-500" : "border-slate-700 focus:ring-blue-500"
                }`}
                placeholder="Your unique username"
                required
              />
              {isCheckingUsername && (
                <p className="text-slate-400 text-sm mt-1">Checking availability...</p>
              )}
              {!isCheckingUsername && !usernameAvailable && (
                <p className="text-red-500 text-sm mt-1">Username is already taken</p>
              )}
              {!isCheckingUsername && usernameAvailable && username && username !== propInitialUsername && (
                <p className="text-green-500 text-sm mt-1">Username is available</p>
              )}
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 shadow-lg hover:from-blue-400 hover:to-purple-500"
              disabled={isLoading || !usernameAvailable || isCheckingUsername}
            >
              {isLoading ? "Saving..." : "Accept"}
            </button>
          </form>
        )}
  
        {/* Avatar Editor Modal */}
        {isAvatarEditorOpen && avatarImage && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !isUploading && setIsAvatarEditorOpen(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 w-full max-w-md flex flex-col items-center border border-slate-700/50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Edit Profile Picture</h2>
              <div className="mb-4 rounded-full overflow-hidden border-2 border-slate-700">
                <AvatarEditor
                  ref={avatarEditorRef}
                  image={avatarImage}
                  width={250}
                  height={250}
                  border={0}
                  borderRadius={125}
                  color={[0, 0, 0, 0.6]}
                  scale={avatarScale}
                  rotate={0}
                />
              </div>
              <div className="w-full mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Zoom</label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.01"
                  value={avatarScale}
                  onChange={(e) => setAvatarScale(Number.parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  disabled={isUploading}
                />
              </div>
              <div className="flex justify-center space-x-4 w-full">
                <button
                  onClick={() => !isUploading && setIsAvatarEditorOpen(false)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveAvatar}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}