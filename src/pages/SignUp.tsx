import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient'; // Import Supabase client
import { Eye, EyeOff } from 'lucide-react'; // Import eye icons from lucide-react
import { GoogleAuthButton } from '../components/GoogleAuthButton'; // Import the new component
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';

export default function SignUp() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // Add username state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Add showPassword state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const navigate = useNavigate();
  const { setLoading, setError, error, isLoading } = useAuthStore();

  useEffect(() => {
    return () => setError(null); // Clear error when component unmounts
  }, [setError]);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setError(null); // Clear error when typing
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    const sanitized = value.replace(/[^a-z0-9_]/g, "");
    setUsername(sanitized);
    setError(null); // Clear error when typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) {
      setError('Please fill all fields');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters long and can only contain letters and numbers');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if username already exists
      // Inside handleSubmit, before the supabase calls
      const lowercaseUsername = username.toLowerCase();
      
      // Update the username checks
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', lowercaseUsername)
        .single();

      if (existingUsername) {
        throw new Error('Username is already taken');
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('Email is already registered');
      }

      // Create the auth user with additional metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            username: lowercaseUsername, // Use lowercase version
            avatar_url: null
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('Password should contain at least one character')) {
          throw new Error('Password must include at least:\n- 8 characters\n- 1 number\n- 1 special character');
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error('Failed to create user');

      // Remove automatic login and just redirect to login page with success message
      navigate('/login', { state: { successMessage: 'Signup successful!\nPlease check your email, including spam folder for email confirmation.' } });
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md mx-auto px-6 lg:px-8 flex flex-col justify-center" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Enhanced Title */}
        <h1 className="text-4xl md:text-3xl sm:text-2xl font-bold mb-8 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Create Account
        </h1>
        
        {/* Enhanced Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl text-red-400 text-sm backdrop-blur-sm">
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 text-base md:text-sm sm:text-xs">
          {/* Enhanced Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm md:text-xs font-medium text-slate-300 mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleInputChange(setName)}
              maxLength={25}
              className="w-full px-4 py-3 md:px-3 md:py-2 sm:px-2 sm:py-1 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm text-base md:text-sm sm:text-xs"
              placeholder="John Doe"
            />
          </div>

          {/* Enhanced Username Input */}
          <div>
            <label htmlFor="username" className="block text-sm md:text-xs font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              maxLength={20}
              className="w-full px-4 py-3 md:px-3 md:py-2 sm:px-2 sm:py-1 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm text-base md:text-sm sm:text-xs"
              placeholder="dude123"
            />
          </div>

          {/* Enhanced Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm md:text-xs font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleInputChange(setEmail)}
              className="w-full px-4 py-3 md:px-3 md:py-2 sm:px-2 sm:py-1 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm text-base md:text-sm sm:text-xs"
              placeholder="dude@example.com"
            />
          </div>

          {/* Enhanced Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm md:text-xs font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handleInputChange(setPassword)}
                className="w-full px-4 py-3 md:px-3 md:py-2 sm:px-2 sm:py-1 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm pr-12 text-base md:text-sm sm:text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-blue-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Enhanced Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 md:px-3 md:py-2 sm:px-2 sm:py-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 font-medium transform hover:scale-105 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-base md:text-sm sm:text-xs"
            disabled={isLoading}
          >
            {isLoading ? 'Signing up...' : 'Sign up'}
          </button>

          {/* Enhanced Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
            <span className="text-slate-400 text-sm md:text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
          </div>

          <GoogleAuthButton 
            buttonText="Continue with Google" 
            redirectPath="/" 
            onUserDetailsFetched={(userDetails) => {
              console.log('User details fetched:', userDetails);
              // Handle user details if needed
            }} 
          />

          {/* Enhanced Sign In Link */}
          <div className="text-center pt-6">
            <span className="text-sm md:text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null); // Clear error when navigating
                  navigate('/login');
                }}
                className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-all duration-200 font-semibold"
              >
                Log in
              </button>
            </span>
          </div>
        </form>

        {/* Enhanced Terms and Privacy Links */}
        <div className="mt-8 text-sm md:text-xs text-slate-400 text-center">
          By continuing, you agree to our
          <button 
            onClick={() => setShowTermsModal(true)}
            className="text-blue-400 hover:text-blue-300 mx-1 underline transition-colors"
          >
            Terms
          </button>
          and
          <button 
            onClick={() => setShowPrivacyModal(true)}
            className="text-blue-400 hover:text-blue-300 mx-1 underline transition-colors"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* Modals */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
}

