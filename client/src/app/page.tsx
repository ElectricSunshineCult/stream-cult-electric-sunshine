/**
 * Stream Cult - Advanced Streaming Platform (Client)
 * 
 * Copyright (c) 2025 Corey Setzer
 * Unknown Artist Developer & Director Of Electric Sunshine Cult
 * 
 * This software is proprietary and confidential. Unauthorized reproduction,
 * distribution, or use of this software is strictly prohibited.
 * 
 * Electric Sunshine Cult reserves all rights to this intellectual property.
 * 
 * For licensing inquiries, contact: info@electricsunshinecult.com
 * 
 * ELECTRIC SUNSHINE CULT MARK - This code is protected under the Electric Sunshine Cult brand
 * Any unauthorized use will result in immediate legal action.
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StreamGrid } from '@/components/streams/StreamGrid';
import { FeaturedStreams } from '@/components/streams/FeaturedStreams';
import { HeroSection } from '@/components/home/HeroSection';
import { CategoryFilter } from '@/components/streams/CategoryFilter';
import { RegionSelector } from '@/components/RegionSelector';
import Leaderboard from '@/components/ui/Leaderboard';
import Achievements from '@/components/ui/Achievements';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  TrophyIcon, 
  StarIcon, 
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid';

type TabType = 'streams' | 'leaderboards' | 'achievements';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('streams');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [achievementsData, setAchievementsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Mock data for demonstration - in real app, this would come from API
  useEffect(() => {
    if (activeTab === 'leaderboards') {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLeaderboardData([
          { user_id: 1, username: 'StreamMaster', level: 5, level_title: 'Elite', badge_icon: '👑', score: 15000, rank_position: 1 },
          { user_id: 2, username: 'TokenKing', level: 4, level_title: 'Fan', badge_icon: '💎', score: 12500, rank_position: 2 },
          { user_id: 3, username: 'ViewQueen', level: 3, level_title: 'Supporter', badge_icon: '🥇', score: 9800, rank_position: 3 },
          { user_id: 4, username: 'ChatBot', level: 2, level_title: 'Viewer', badge_icon: '🥈', score: 7500, rank_position: 4 },
          { user_id: 5, username: 'NewStreamer', level: 1, level_title: 'Newbie', badge_icon: '🥉', score: 2500, rank_position: 5 }
        ]);
        setLoading(false);
      }, 1000);
    } else if (activeTab === 'achievements') {
      setLoading(true);
      setTimeout(() => {
        setAchievementsData([
          { id: 1, name: 'First Steps', description: 'Complete your profile', badge_icon: '👤', experience_reward: 50, is_completed: true, unlocked_at: '2025-01-01' },
          { id: 2, name: 'Generous Soul', description: 'Send your first tip', badge_icon: '💝', experience_reward: 100, is_completed: true, unlocked_at: '2025-01-02' },
          { id: 3, name: 'Community Member', description: 'Send 100 messages', badge_icon: '💬', experience_reward: 200, is_completed: false },
          { id: 4, name: 'Level Climber', description: 'Reach level 5', badge_icon: '🧗', experience_reward: 500, is_completed: false },
          { id: 5, name: 'Night Owl', description: 'Watch 50 hours', badge_icon: '🦉', experience_reward: 300, is_completed: false },
          { id: 6, name: 'Big Spender', description: 'Spend 10,000 tokens', badge_icon: '💰', experience_reward: 1000, is_completed: false }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [activeTab]);

  const tabs = [
    { id: 'streams' as TabType, label: 'Live Streams', icon: ChartBarIcon },
    { id: 'leaderboards' as TabType, label: 'Leaderboards', icon: TrophyIcon },
    { id: 'achievements' as TabType, label: 'Achievements', icon: StarIcon }
  ];

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <HeroSection />
          <div className="container mx-auto px-4 py-8">
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab.id
                          ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }
                      `}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'streams' && (
                <div className="space-y-8">
                  <FeaturedStreams />
                  <div className="mt-12">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Live Streams
                      </h2>
                      <div className="flex gap-4">
                        <RegionSelector />
                        <CategoryFilter />
                      </div>
                    </div>
                    <StreamGrid />
                  </div>
                </div>
              )}

              {activeTab === 'leaderboards' && (
                <Leaderboard
                  data={leaderboardData}
                  category="experience"
                  period="weekly"
                  loading={loading}
                />
              )}

              {activeTab === 'achievements' && (
                <Achievements
                  achievements={achievementsData}
                  loading={loading}
                  onCheckAchievements={() => console.log('Check achievements')}
                />
              )}
            </motion.div>

            {/* Quick Stats for Authenticated Users */}
            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12"
              >
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FireIcon className="w-5 h-5 text-orange-500" />
                    Your Progress
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">Level 1</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Current Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">0 XP</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Experience</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">2</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Achievements</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}