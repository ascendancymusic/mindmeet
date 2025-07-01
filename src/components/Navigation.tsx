import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Network, Home } from 'lucide-react';
import { LoginButton } from './LoginButton';
import { useAuthStore } from '../store/authStore';
import LoggedInNavigation from './LoggedInNavigation';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const isActive = (path: string) =>
    location.pathname === path
      ? 'bg-sky-500/20 text-sky-400'
      : 'text-gray-400 hover:bg-sky-500/10 hover:text-sky-300';

  if (user) {
    return <LoggedInNavigation />;
  }

  return (
    <nav className="glass-panel sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-4">
            <Link
              to="/"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                '/'
              )}`}
            >
              <Home className="w-5 h-5 mr-2" />
              Home
            </Link>
            <Link
              to="/mindmap"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(
                '/mindmap'
              )}`}
            >
              <Network className="w-5 h-5 mr-2" />
              Thought Map
            </Link>
          </div>
          <div>
            <LoginButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

