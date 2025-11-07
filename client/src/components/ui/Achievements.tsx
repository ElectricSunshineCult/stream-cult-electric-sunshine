import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrophyIcon, 
  StarIcon, 
  FireIcon,
  CheckCircleIcon,
  LockClosedIcon,
  CalendarIcon
} from '@heroicons/react/24/solid';
import { format } from 'date-fns';

interface Achievement {
  id: number;
  name: string;
  description: string;
  badge_icon: string;
  experience_reward: number;
  unlocked_at?: string;
  progress?: any;
  is_completed: boolean;
}

interface AchievementsProps {
  achievements: Achievement[];
  onCheckAchievements?: () => void;
  loading?: boolean;
}

const CATEGORY_COLORS = {
  default: 'from-gray-400 to-gray-600',
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-gray-400 to-gray-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-purple-400 to-purple-600',
  diamond: 'from-blue-400 to-blue-600'
};

const getAchievementCategory = (expReward: number) => {
  if (expReward >= 2000) return 'diamond';
  if (expReward >= 1500) return 'platinum';
  if (expReward >= 1000) return 'gold';
  if (expReward >= 500) return 'silver';
  if (expReward >= 100) return 'bronze';
  return 'default';
};

export const Achievements: React.FC<AchievementsProps> = ({
  achievements,
  onCheckAchievements,
  loading = false
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'reward' | 'date'>('name');

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'completed') return achievement.is_completed;
    if (filter === 'pending') return !achievement.is_completed;
    return true;
  });

  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    switch (sortBy) {
      case 'reward':
        return b.experience_reward - a.experience_reward;
      case 'date':
        if (!a.unlocked_at && !b.unlocked_at) return 0;
        if (!a.unlocked_at) return 1;
        if (!b.unlocked_at) return -1;
        return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const completedCount = achievements.filter(a => a.is_completed).length;
  const totalExp = achievements
    .filter(a => a.is_completed)
    .reduce((sum, a) => sum + a.experience_reward, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
              </div>
              <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {completedCount}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-300">
                Achievements Unlocked
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <StarIcon className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {totalExp.toLocaleString()}
              </div>
              <div className="text-sm text-green-600 dark:text-green-300">
                Experience Earned
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <FireIcon className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {Math.round((completedCount / achievements.length) * 100)}%
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-300">
                Completion Rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'completed', 'pending'] as const).map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${filter === filterType
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'reward' | 'date')}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="name">Sort by Name</option>
          <option value="reward">Sort by Reward</option>
          <option value="date">Sort by Date</option>
        </select>

        {/* Check Achievements Button */}
        {onCheckAchievements && (
          <button
            onClick={onCheckAchievements}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check for New Achievements
          </button>
        )}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {sortedAchievements.map((achievement, index) => {
            const category = getAchievementCategory(achievement.experience_reward);
            const isCompleted = achievement.is_completed;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-lg
                  ${isCompleted
                    ? `bg-gradient-to-br ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]} border-transparent text-white`
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                {/* Completion Badge */}
                {isCompleted ? (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                  </div>
                ) : (
                  <div className="absolute top-2 right-2">
                    <LockClosedIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* Achievement Icon */}
                <div className="text-4xl mb-3">
                  {achievement.badge_icon}
                </div>

                {/* Achievement Info */}
                <h3 className={`font-bold text-lg mb-2 ${isCompleted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {achievement.name}
                </h3>
                
                <p className={`text-sm mb-3 ${isCompleted ? 'text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                  {achievement.description}
                </p>

                {/* Experience Reward */}
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-medium ${isCompleted ? 'text-yellow-300' : 'text-yellow-600'}`}>
                    +{achievement.experience_reward} XP
                  </div>
                  
                  {achievement.unlocked_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(achievement.unlocked_at), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>

                {/* Progress Bar (if not completed and has progress) */}
                {!isCompleted && achievement.progress && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (achievement.progress.current / achievement.progress.target) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {achievement.progress.current || 0} / {achievement.progress.target || 1}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {sortedAchievements.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No achievements found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'completed' 
              ? "You haven't unlocked any achievements yet. Keep using the platform!"
              : filter === 'pending'
              ? "All available achievements have been completed!"
              : "No achievements match your current filters."
            }
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Achievements;