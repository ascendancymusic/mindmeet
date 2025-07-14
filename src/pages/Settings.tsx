import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePageTitle } from '../hooks/usePageTitle';
import { Bell, User, Globe, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';

const Settings: React.FC = () => {
  const { deleteUserAccount } = useAuthStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isEmailVisible, setIsEmailVisible] = useState(false);
  const [dateFormat, setDateFormat] = useState<'month-day-year' | 'day-month-year'>('month-day-year');
  const [showNegativeNotifications, setShowNegativeNotifications] = useState(true);

  usePageTitle('Settings');

  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error.message);
        return;
      }
      setUserEmail(user?.email || null);
    };

    // Load date format preference from localStorage
    const savedDateFormat = localStorage.getItem('dateFormat') as 'month-day-year' | 'day-month-year' | null;
    if (savedDateFormat) {
      setDateFormat(savedDateFormat);
    }

    // Load negative notifications preference from localStorage
    const savedShowNegativeNotifications = localStorage.getItem('showNegativeNotifications');
    if (savedShowNegativeNotifications !== null) {
      setShowNegativeNotifications(savedShowNegativeNotifications === 'true');
    }

    fetchUserEmail();
  }, []);

  // Save date format preference when it changes
  const handleDateFormatChange = (newFormat: 'month-day-year' | 'day-month-year') => {
    setDateFormat(newFormat);
    localStorage.setItem('dateFormat', newFormat);
  };

  // Save negative notifications preference when it changes
  const handleNegativeNotificationsChange = (show: boolean) => {
    setShowNegativeNotifications(show);
    localStorage.setItem('showNegativeNotifications', show.toString());
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserAccount();
      setIsModalOpen(false);
      // The deleteUserAccount function handles navigation
    } catch (error) {
      console.error('Error deleting account:', error);
      // Keep modal open if there's an error
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-2" style={{ minHeight: '0', height: '100%', maxHeight: '100vh' }}>
      <div
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30 shadow-2xl overflow-y-auto"
        style={{ maxHeight: '90vh' }}
      >
        <h1 className="text-2xl md:text-xl sm:text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6">Settings</h1>

        {/* Account Settings Section */}
        <div className="mb-8">
          <h2 className="text-lg md:text-base sm:text-base font-semibold text-slate-200 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-indigo-400" />
            Account Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">Email Address</h3>
                <div className="flex items-center gap-2">
                  <p className={`text-sm md:text-xs text-slate-400 ${!isEmailVisible ? 'blur-sm select-none' : ''}`}>
                    {userEmail || 'Loading email...'}
                  </p>
                  <button
                    onClick={() => setIsEmailVisible(!isEmailVisible)}
                    className="p-1 hover:bg-slate-600/50 rounded-full transition-colors"
                  >
                    {isEmailVisible ? (
                      <EyeOff className="w-4 h-4 text-slate-400 hover:text-indigo-400 transition-colors" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400 hover:text-indigo-400 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">Password</h3>
                <p className="text-sm md:text-xs text-slate-400">Update your password</p>
              </div>
              <button 
                onClick={() => navigate('/reset-password')}
                className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 font-medium"
              >
                Update
              </button>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="mb-8">
          <h2 className="text-lg md:text-base sm:text-base font-semibold text-slate-200 mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-indigo-400" />
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">Email Notifications</h3>
                <p className="text-sm md:text-xs text-slate-400">Receive updates about your account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">Show negative notifications</h3>
                <p className="text-sm md:text-xs text-slate-400">Show notifications about unfollows and unlikes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={showNegativeNotifications}
                  onChange={(e) => handleNegativeNotificationsChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Content Filters */}
        <div className="mb-8">
          <h2 className="text-lg md:text-base sm:text-base font-semibold text-slate-200 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-indigo-400" />
            Content Filters
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">NSFW Filter</h3>
                <p className="text-sm md:text-xs text-slate-400">Filter out NSFW content from mind maps</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">Psyop Filter</h3>
                <p className="text-sm md:text-xs text-slate-400">Filter out Psyop content from mind maps</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="mb-8">
          <h2 className="text-lg md:text-base sm:text-base font-semibold text-slate-200 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
            Display Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 md:p-3 sm:p-2 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-all duration-200">
              <div>
                <h3 className="text-sm md:text-xs font-medium text-slate-200">Date Format</h3>
                <p className="text-sm md:text-xs text-slate-400">Choose how dates are displayed throughout the app</p>
              </div>
              <select 
                value={dateFormat}
                onChange={(e) => handleDateFormatChange(e.target.value as 'month-day-year' | 'day-month-year')}
                className="bg-slate-900 text-slate-200 text-sm rounded-xl px-4 py-2.5 border border-indigo-500/30 focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 shadow-lg transition-all duration-200 hover:bg-slate-800 hover:border-indigo-400/50 cursor-pointer"
                style={{
                  paddingRight: '2.5rem'
                }}
              >
                <option value="month-day-year">Month Day, Year ({format(new Date(), 'MMM d, yyyy')})</option>
                <option value="day-month-year">Day.Month.Year ({format(new Date(), 'dd.MM.yyyy')})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-lg md:text-base sm:text-base font-semibold text-red-400 mb-4 flex items-center">
            <Trash2 className="w-5 h-5 mr-2" />
            Danger Zone
          </h2>
          <div className="p-4 md:p-3 sm:p-2 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <h3 className="text-sm md:text-xs font-medium text-red-400 mb-2">Delete Account</h3>
            <p className="text-sm md:text-xs text-slate-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 md:px-3 md:py-2 sm:px-2 sm:py-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm md:text-xs font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="text-lg md:text-base font-semibold text-slate-200 mb-4">Confirm Account Deletion</h2>
            <p className="text-sm md:text-xs text-slate-400 mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 md:px-3 md:py-2 sm:px-2 sm:py-1 bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200 rounded-lg hover:from-slate-500 hover:to-slate-600 transition-all duration-200 text-sm md:text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 md:px-3 md:py-2 sm:px-2 sm:py-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm md:text-xs font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;