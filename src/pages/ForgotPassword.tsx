import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're in password reset mode by looking for the token in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    setIsResetMode(type === 'recovery');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isResetMode) {
      if (!password) {
        setError('Please enter a new password');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/.test(password)) {
        setError('Password must include at least:\n- 8 characters\n- 1 number\n- 1 special character');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) throw error;

        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        console.error('Error updating password:', error);
        setError(error instanceof Error ? error.message : 'Failed to update password');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!email) {
        setError('Please enter your email address');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        setSuccess(true);
      } catch (error) {
        console.error('Error sending reset password email:', error);
        setError(error instanceof Error ? error.message : 'Failed to send reset email');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6 lg:px-8">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(isLoggedIn ? '/settings' : '/login')}
          className="flex items-center text-slate-400 hover:text-purple-300 transition-colors duration-200 mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
          {isLoggedIn ? 'Back to Settings' : 'Back to Login'}
        </button>

        <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400">
          {isResetMode ? 'Set New Password' : 'Reset Password'}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm whitespace-pre-line backdrop-blur-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl text-white backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-2 text-green-400">
              {isResetMode ? 'Password Updated Successfully' : 'Check your email'}
            </h2>
            <p className="text-sm text-slate-300">
              {isResetMode
                ? 'Your password has been updated. Redirecting to login...'
                : "We've sent you an email with a link to reset your password. Please check your inbox and spam folder."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isResetMode ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/40 border border-purple-500/20 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm"
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/40 border border-purple-500/20 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-purple-400 transition-colors duration-200 flex items-center"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/40 border border-purple-500/20 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Confirm new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-purple-400 transition-colors duration-200 flex items-center"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/25"
            >
              {isLoading
                ? isResetMode
                  ? 'Updating...'
                  : 'Sending...'
                : isResetMode
                ? 'Update Password'
                : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}