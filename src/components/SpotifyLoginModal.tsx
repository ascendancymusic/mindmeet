import React, { useCallback, useRef, useState } from 'react';
import { X, ExternalLink, Music, Loader2 } from 'lucide-react';
import { SpotifyIcon } from './icons/SpotifyIcon';

interface SpotifyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGotIt: () => void;
  onLoginSuccess?: () => void;
}

export function SpotifyLoginModal({ isOpen, onClose, onGotIt, onLoginSuccess }: SpotifyLoginModalProps) {
  const popupRef = useRef<Window | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleGotIt = () => {
    onGotIt();
    onClose();
  };

  const handleSpotifyLogin = useCallback(() => {
    setIsLoggingIn(true);

    // Close any existing popup
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    // Open Spotify login in a popup
    const popup = window.open(
      'https://accounts.spotify.com/login',
      'spotify-login',
      'width=500,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no'
    );

    if (!popup) {
      // Fallback to new tab if popup is blocked
      window.open('https://accounts.spotify.com/login', '_blank');
      setIsLoggingIn(false);
      return;
    }

    popupRef.current = popup;

    // Monitor the popup for successful login
    let loginDetected = false;
    let lastUrl = '';
    const startTime = Date.now();

    const checkPopup = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoggingIn(false);

          // If popup was open for more than 10 seconds before closing, assume successful login
          const timeOpen = Date.now() - startTime;
          if (timeOpen > 10000 && !loginDetected) {
            loginDetected = true;
            localStorage.setItem('spotify-login-modal-dismissed', 'true');
            onLoginSuccess?.();
            onClose();
          }
          return;
        }

        // Try to detect successful login by checking the URL
        try {
          const popupUrl = popup.location.href;

          // Check for successful login indicators
          if (popupUrl !== lastUrl) {
            lastUrl = popupUrl;

            // Look for Spotify success URLs or dashboard
            if (popupUrl.includes('open.spotify.com') ||
                popupUrl.includes('spotify.com/') &&
                !popupUrl.includes('login') &&
                !popupUrl.includes('authorize') &&
                !popupUrl.includes('accounts.spotify.com')) {

              clearInterval(checkPopup);
              loginDetected = true;
              setIsLoggingIn(false);

              // Give user a moment to see they're logged in, then close
              setTimeout(() => {
                popup.close();
                localStorage.setItem('spotify-login-modal-dismissed', 'true');
                onLoginSuccess?.();
                onClose();
              }, 2000);
            }
          }
        } catch (urlError) {
          // URL access blocked due to CORS - this is normal
          // Continue monitoring for popup closure
        }
      } catch (error) {
        // General error handling
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoggingIn(false);
        }
      }
    }, 1000);

    // Clean up after 5 minutes
    setTimeout(() => {
      clearInterval(checkPopup);
      setIsLoggingIn(false);
      if (popup && !popup.closed) {
        popup.close();
      }
    }, 300000);
  }, [onClose, onLoginSuccess]);

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-all duration-300" 
        onClick={onClose} 
      />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="relative w-full max-w-md bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 animate-fadeIn">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors z-50 p-1 rounded-full hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* Spotify Icon with animation */}
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                  <SpotifyIcon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Music className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-3">
                Listen to Full Songs
              </h2>

              {/* Description */}
              <p className="text-gray-300 mb-6 leading-relaxed">
                This mindmap contains Spotify tracks. Currently you're hearing 30-second previews.
                Log in to your free Spotify account to listen to the complete songs.
              </p>

              {/* Simple benefit highlight */}
              <div className="bg-gradient-to-r from-[#1DB954]/20 to-[#1ed760]/20 border border-[#1DB954]/30 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center gap-3 text-white">
                  <Music className="w-5 h-5 text-[#1DB954]" />
                  <span className="font-medium">30-second previews → Full songs</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleSpotifyLogin}
                  disabled={isLoggingIn}
                  className={`flex items-center justify-center gap-2 bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg ${
                    isLoggingIn ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'
                  }`}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Opening Spotify...</span>
                    </>
                  ) : (
                    <>
                      <SpotifyIcon className="w-5 h-5" />
                      <span>Login to Spotify</span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleGotIt}
                  className="px-6 py-3 text-gray-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
                >
                  Got it, don't show again
                </button>
              </div>

              {/* Instructions */}
              {isLoggingIn && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-200 text-center">
                    💡 Complete the login in the popup window. It will close automatically when done.
                  </p>
                </div>
              )}

              {/* Small note */}
              <p className="text-xs text-gray-500 mt-4">
                Spotify login is completely free and optional
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
