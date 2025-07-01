import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export function GoogleConfirm() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';
  const avatar = queryParams.get('avatar') || '';
  const username = queryParams.get('username') || '';

  const confirmAndProceed = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          data: { username },
        },
      });

      if (error) {
        console.error('Supabase OAuth Error:', error.message);
        alert('Authentication failed. Please try again.');
        return;
      }

      if (!data?.url) {
        console.error('No redirect URL returned from Supabase.');
        alert('Authentication failed. No redirect URL was provided.');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Google Auth Error:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg shadow-lg w-96 text-white">
        <h2 className="text-lg font-bold mb-4">Confirm Your Details</h2>
        <div className="mb-4">
          <img
            src={avatar}
            alt="Avatar"
            className="w-16 h-16 rounded-full mx-auto border-2 border-gray-600"
          />
        </div>
        <p className="text-sm mb-2 text-gray-300">
          <strong>Email:</strong> {email}
        </p>
        <p className="text-sm mb-4 text-gray-300">
          <strong>Username:</strong> {username}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={confirmAndProceed}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
