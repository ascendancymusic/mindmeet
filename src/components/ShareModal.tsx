"use client"

import React, { useState } from "react"
import { Copy, X, Twitter, Facebook, Linkedin, MessageCircle } from "lucide-react"
import UserSelectModal from "./UserSelectModal"
import { useChatStore } from "../store/chatStore"

interface ShareModalProps {
  title: string
  url: string
  creator: string
  onClose: () => void
  isMainMap?: boolean
  mindmapPermalink?: string // Add mindmapPermalink prop
}

const ShareModal: React.FC<ShareModalProps> = ({ title, url, creator, onClose, isMainMap = false, mindmapPermalink }) => {
  const [copySuccess, setCopySuccess] = useState(false)
  const [isUserSelectModalOpen, setIsUserSelectModalOpen] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [isLoadingUserModal, setIsLoadingUserModal] = useState(false)

  // Generate the @username URL if it's a main map
  const shareUrl = isMainMap ? `${window.location.origin}/@${creator}` : url

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
      })
  }
  const shareOnSocialMedia = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(`Check out this mind map: ${title}`)

    let socialShareUrl = ""

    switch (platform) {
      case "twitter":
        socialShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
        break
      case "facebook":
        socialShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case "linkedin":
        socialShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        break
      case "instagram":
        // Instagram doesn't have a direct web sharing API, so we'll show a message
        alert("Copy the link and paste it into your Instagram DM or story")
        return
      case "snapchat":
        // Snapchat doesn't have a direct web sharing API, so we'll show a message
        alert("Copy the link and paste it into your Snapchat message")
        return
      default:
        return
    }

    window.open(socialShareUrl, "_blank", "width=600,height=400")
  }

  // Function to handle opening the user select modal
  const handleOpenUserSelectModal = () => {
    setIsLoadingUserModal(true)
    // Pre-fetch users data to speed up modal loading
    useChatStore.getState().fetchUsers().then(() => {
      setIsUserSelectModalOpen(true)
      // Add a small delay to ensure the modal animation starts
      setTimeout(() => {
        setIsLoadingUserModal(false)
      }, 100)
    })
  }

  // Function to handle sharing to chat with multiple users
  const handleShareToChat = (selectedUsers: { id: string, username: string }[], customMessage: string) => {
    if (!mindmapPermalink) {
      console.error("Cannot share to chat: Missing mindmap permalink")
      return
    }

    if (selectedUsers.length === 0) {
      return
    }

    try {
      // First fetch all conversations
      useChatStore.getState().fetchConversations().then(async () => {
        const conversations = useChatStore.getState().conversations

        // Process each selected user
        const sharePromises = selectedUsers.map(async (user) => {
          const existingConversation = conversations.find(c =>
            !c.isAI && c.userId === user.id
          )

          let conversationId: number

          if (existingConversation) {
            // If conversation exists, use it
            conversationId = existingConversation.id
          } else {
            // Create a new conversation with this user
            conversationId = await useChatStore.getState().createConversation(
              user.id,
              user.username,
              false
            )
          }

          // Set the active conversation to the current one
          useChatStore.getState().setActiveConversation(conversationId)

          // Send the mindmap to the chat
          const message = customMessage
          await useChatStore.getState().sendMessage(message, mindmapPermalink)

          return conversationId
        })

        // Wait for all shares to complete
        await Promise.all(sharePromises)

        // Show success message
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      })
    } catch (error) {
      console.error("Error sharing to chat:", error)
    }
  }
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/30">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
              Share <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">{title}</span>
            </h3>
            <p className="text-sm text-slate-400">
              by <span className="text-slate-300 font-medium">@{creator}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>        <div className="mb-6">
          <p className="text-sm font-medium text-slate-300 mb-3">Copy link</p>
          <div className="flex items-center rounded-xl border border-slate-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 overflow-hidden">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-slate-800/50 px-4 py-3 text-sm text-slate-200 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 transition-all duration-200 flex items-center justify-center"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          {copySuccess && (
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <p className="text-green-400 text-sm font-medium">Link copied to clipboard!</p>
            </div>
          )}
        </div>        {/* Share to Chat Section */}
        {mindmapPermalink && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-300 mb-3">Share to chat</p>
            <button
              onClick={handleOpenUserSelectModal}
              disabled={isLoadingUserModal}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-700/80 hover:to-purple-700/80 disabled:from-slate-700/50 disabled:to-slate-600/50 text-white rounded-xl transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 disabled:border-slate-600/30 shadow-lg disabled:shadow-none"
            >
              {isLoadingUserModal ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                  <span className="font-medium">Loading users...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">Share with users</span>
                </>
              )}
            </button>
            {shareSuccess && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <p className="text-green-400 text-sm font-medium">Mindmap shared to chat successfully!</p>
              </div>
            )}
          </div>
        )}        <div>
          <p className="text-sm font-medium text-slate-300 mb-4">Share on social media</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => shareOnSocialMedia("twitter")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-blue-400 transition-all duration-200 group"
            >
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-2.5 rounded-lg group-hover:from-blue-600/20 group-hover:to-blue-700/20 transition-all duration-200">
                <Twitter className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">Twitter</span>
            </button>
            <button
              onClick={() => shareOnSocialMedia("facebook")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-blue-600 transition-all duration-200 group"
            >
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-2.5 rounded-lg group-hover:from-blue-600/20 group-hover:to-blue-700/20 transition-all duration-200">
                <Facebook className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">Facebook</span>
            </button>
            <button
              onClick={() => shareOnSocialMedia("linkedin")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-blue-500 transition-all duration-200 group"
            >
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-2.5 rounded-lg group-hover:from-blue-500/20 group-hover:to-blue-600/20 transition-all duration-200">
                <Linkedin className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">LinkedIn</span>
            </button>
            <button
              onClick={() => shareOnSocialMedia("instagram")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-pink-500 transition-all duration-200 group"
            >
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-2.5 rounded-lg group-hover:from-pink-500/20 group-hover:to-pink-600/20 transition-all duration-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-instagram"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
              <span className="text-xs font-medium">Instagram</span>
            </button>
            <button
              onClick={() => shareOnSocialMedia("snapchat")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-yellow-400 transition-all duration-200 group"
            >
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-2.5 rounded-lg group-hover:from-yellow-400/20 group-hover:to-yellow-500/20 transition-all duration-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-ghost"
                >
                  <path d="M9 10h.01" />
                  <path d="M15 10h.01" />
                  <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Snapchat</span>
            </button>
          </div>
        </div></div>

      {/* User Select Modal for Chat Sharing */}
      {isUserSelectModalOpen && (
        <UserSelectModal
          isOpen={isUserSelectModalOpen}
          onClose={() => setIsUserSelectModalOpen(false)}
          onSelectUsers={handleShareToChat}
          initialMessage=""
          mode="share"
        />
      )}
    </div>
  )
}

export default ShareModal
