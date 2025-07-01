import React from 'react';
import { Link } from 'react-router-dom';

const LoggedOutNavigation: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
      <div className="max-w-9xl mx-auto flex justify-between items-center px-4 py-3">
        <h1
          className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-purple-600 bg-clip-text text-transparent cursor-pointer transition-all duration-300 hover:from-blue-500 hover:via-purple-600 hover:to-purple-700"
        >
          <Link to="/">MindMeet</Link>
        </h1>
        <nav className="flex items-center space-x-3">
          <Link
            to="/login"
            className="px-6 py-2.5 text-sm font-medium text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 hover:border-slate-600/50 hover:text-white transition-all duration-200"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 border border-blue-500/30 rounded-xl hover:from-blue-700 hover:to-purple-700 hover:border-blue-400/50 transition-all duration-200 shadow-lg"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default LoggedOutNavigation;
