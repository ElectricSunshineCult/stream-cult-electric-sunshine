'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  TvIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import UserLevel from '@/components/ui/UserLevel';

export function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected } = useSocket();
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-cult-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center">
            <button
              type="button"
              className="rounded-md p-2 text-cult-600 hover:bg-cult-100 hover:text-cult-900 focus:outline-none focus:ring-2 focus:ring-cult-purple lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
            
            <Link href="/" className="ml-4 flex items-center lg:ml-0">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-cult-purple to-cult-gold flex items-center justify-center">
                  <TvIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text hidden sm:block">
                  TOKEN BASED STREAMING PROGRAM
                </span>
              </div>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cult-400" />
                <input
                  type="text"
                  placeholder="Search streams, streamers, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-cult-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-cult-400 focus:border-cult-purple focus:outline-none focus:ring-1 focus:ring-cult-purple"
                />
              </div>
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-error-500'}`} />
              <span className="text-xs text-cult-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button
                  type="button"
                  className="rounded-full bg-white p-1 text-cult-600 hover:text-cult-900 focus:outline-none focus:ring-2 focus:ring-cult-purple focus:ring-offset-2"
                >
                  <BellIcon className="h-6 w-6" />
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    type="button"
                    className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cult-purple focus:ring-offset-2"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    {user?.avatar_url ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={user.avatar_url}
                        alt={user.username}
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-cult-400" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="px-4 py-2 text-sm text-cult-700 border-b border-cult-200">
                        <div className="font-medium">{user?.username}</div>
                        <div className="text-cult-500">{user?.role}</div>
                        {user?.tokens_balance !== undefined && (
                          <div className="text-cult-600 font-mono">
                            {user.tokens_balance.toLocaleString()} CULT
                          </div>
                        )}
                        {/* Level Information */}
                        <div className="mt-2">
                          <UserLevel
                            level={1}
                            title="Newbie"
                            badge_icon="🥉"
                            experience_points={0}
                            exp_to_next_level={100}
                            experience_required={100}
                            size="sm"
                            showProgress={true}
                          />
                        </div>
                      </div>
                      
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-cult-700 hover:bg-cult-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-cult-400" />
                        Profile
                      </Link>
                      
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-cult-700 hover:bg-cult-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-cult-400" />
                        Settings
                      </Link>
                      
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm text-cult-700 hover:bg-cult-50"
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-cult-400" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-cult-600 hover:text-cult-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="btn-primary"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-cult-200 py-4 lg:hidden">
            <div className="space-y-1">
              <Link
                href="/"
                className="flex items-center px-2 py-2 text-base font-medium text-cult-700 hover:bg-cult-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <HomeIcon className="mr-3 h-6 w-6 text-cult-400" />
                Home
              </Link>
              <Link
                href="/live"
                className="flex items-center px-2 py-2 text-base font-medium text-cult-700 hover:bg-cult-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <TvIcon className="mr-3 h-6 w-6 text-cult-400" />
                Live Streams
              </Link>
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className="flex items-center px-2 py-2 text-base font-medium text-cult-700 hover:bg-cult-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <UserGroupIcon className="mr-3 h-6 w-6 text-cult-400" />
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}