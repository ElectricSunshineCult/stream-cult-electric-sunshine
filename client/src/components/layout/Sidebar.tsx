'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  TvIcon,
  FireIcon,
  UserGroupIcon,
  MapPinIcon,
  Cog6ToothIcon,
  HeartIcon,
  WalletIcon,
  UserIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  TvIcon as TvIconSolid,
  FireIcon as FireIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  MapPinIcon as MapPinIconSolid,
} from '@heroicons/react/24/solid';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badge?: string;
}

const navigation: NavItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    name: 'Live Streams',
    href: '/live',
    icon: TvIcon,
    iconSolid: TvIconSolid,
  },
  {
    name: 'Trending',
    href: '/trending',
    icon: FireIcon,
    iconSolid: FireIconSolid,
  },
  {
    name: 'Following',
    href: '/following',
    icon: UserGroupIcon,
    iconSolid: UserGroupIconSolid,
    roles: ['viewer', 'streamer', 'moderator', 'admin'],
  },
];

const regions: NavItem[] = [
  {
    name: 'North America',
    href: '/region/1',
    icon: MapPinIcon,
    iconSolid: MapPinIconSolid,
  },
  {
    name: 'Europe',
    href: '/region/2',
    icon: MapPinIcon,
    iconSolid: MapPinIconSolid,
  },
  {
    name: 'Asia',
    href: '/region/3',
    icon: MapPinIcon,
    iconSolid: MapPinIconSolid,
  },
  {
    name: 'South America',
    href: '/region/4',
    icon: MapPinIcon,
    iconSolid: MapPinIconSolid,
  },
  {
    name: 'Oceania',
    href: '/region/5',
    icon: MapPinIcon,
    iconSolid: MapPinIconSolid,
  },
  {
    name: 'Africa',
    href: '/region/6',
    icon: MapPinIcon,
    iconSolid: MapPinIconSolid,
  },
];

const streamerNav: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: ChartBarIcon,
    iconSolid: ChartBarIcon,
    roles: ['streamer', 'moderator', 'admin'],
  },
  {
    name: 'My Streams',
    href: '/my-streams',
    icon: TvIcon,
    iconSolid: TvIcon,
    roles: ['streamer', 'moderator', 'admin'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIcon,
    roles: ['streamer', 'moderator', 'admin'],
  },
  {
    name: 'Token History',
    href: '/tokens',
    icon: WalletIcon,
    iconSolid: WalletIcon,
    roles: ['streamer', 'moderator', 'admin'],
  },
];

const adminNav: NavItem[] = [
  {
    name: 'Admin Panel',
    href: '/admin',
    icon: ShieldCheckIcon,
    iconSolid: ShieldCheckIcon,
    roles: ['admin'],
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UserGroupIcon,
    iconSolid: UserGroupIcon,
    roles: ['admin'],
  },
  {
    name: 'System Stats',
    href: '/admin/stats',
    icon: ChartBarIcon,
    iconSolid: ChartBarIcon,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const hasRole = (requiredRoles?: string[]) => {
    if (!requiredRoles || !user) return true;
    return requiredRoles.includes(user.role);
  };

  return (
    <div className={`bg-white border-r border-cult-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} hidden lg:flex lg:flex-col`}>
      {/* Collapse Toggle */}
      <div className="flex h-16 items-center justify-end px-4 border-b border-cult-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-2 text-cult-400 hover:text-cult-600 hover:bg-cult-50"
        >
          <svg
            className={`h-5 w-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigation
            .filter(item => hasRole(item.roles))
            .map((item) => {
              const Icon = isActive(item.href) ? item.iconSolid : item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-cult-purple text-white'
                      : 'text-cult-700 hover:bg-cult-50 hover:text-cult-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive(item.href) ? 'text-white' : 'text-cult-400 group-hover:text-cult-600'
                    }`}
                  />
                  {!isCollapsed && (
                    <>
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-cult-100 px-2.5 py-0.5 text-xs font-medium text-cult-800">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
        </div>

        {/* Regions Section */}
        {!isCollapsed && (
          <div className="pt-6">
            <h3 className="px-2 text-xs font-semibold text-cult-500 uppercase tracking-wider">
              Regions
            </h3>
            <div className="mt-2 space-y-1">
              {regions.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-cult-100 text-cult-900'
                      : 'text-cult-600 hover:bg-cult-50 hover:text-cult-900'
                  }`}
                >
                  <MapPinIcon className="mr-3 h-5 w-5 text-cult-400 group-hover:text-cult-600" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Streamer Section */}
        {isAuthenticated && hasRole(['streamer', 'moderator', 'admin']) && (
          <div className="pt-6">
            {!isCollapsed && (
              <h3 className="px-2 text-xs font-semibold text-cult-500 uppercase tracking-wider">
                Creator Tools
              </h3>
            )}
            <div className="mt-2 space-y-1">
              {streamerNav
                .filter(item => hasRole(item.roles))
                .map((item) => {
                  const Icon = isActive(item.href) ? item.iconSolid : item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-cult-100 text-cult-900'
                          : 'text-cult-600 hover:bg-cult-50 hover:text-cult-900'
                      }`}
                    >
                      <Icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive(item.href) ? 'text-cult-600' : 'text-cult-400 group-hover:text-cult-600'
                        }`}
                      />
                      {!isCollapsed && item.name}
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Admin Section */}
        {isAuthenticated && user?.role === 'admin' && (
          <div className="pt-6">
            {!isCollapsed && (
              <h3 className="px-2 text-xs font-semibold text-cult-500 uppercase tracking-wider">
                Administration
              </h3>
            )}
            <div className="mt-2 space-y-1">
              {adminNav
                .filter(item => hasRole(item.roles))
                .map((item) => {
                  const Icon = isActive(item.href) ? item.iconSolid : item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-red-100 text-red-900'
                          : 'text-red-600 hover:bg-red-50 hover:text-red-900'
                      }`}
                    >
                      <Icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive(item.href) ? 'text-red-600' : 'text-red-400 group-hover:text-red-600'
                        }`}
                      />
                      {!isCollapsed && item.name}
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      {isAuthenticated && (
        <div className="border-t border-cult-200 p-4">
          <Link
            href="/profile"
            className={`group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              isActive('/profile')
                ? 'bg-cult-100 text-cult-900'
                : 'text-cult-600 hover:bg-cult-50 hover:text-cult-900'
            }`}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="mr-3 h-6 w-6 rounded-full"
              />
            ) : (
              <UserIcon className="mr-3 h-6 w-6 text-cult-400" />
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{user.username}</div>
                <div className="text-xs text-cult-500 truncate">
                  {user.tokens_balance.toLocaleString()} CULT
                </div>
              </div>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}