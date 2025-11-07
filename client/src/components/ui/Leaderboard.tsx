import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrophyIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  EyeIcon,
  UserIcon,
  ChevronDownIcon,
  FireIcon
} from '@heroicons/react/24/solid';
import UserLevel from './UserLevel';

interface LeaderboardEntry {
  user_id: number;
  username: string;
  avatar_url?: string;
  level: number;
  level_title: string;
  badge_icon: string;
  score: number;
  rank_position?: number;
  exp_rank?: number;
  spender_rank?: number;
  earner_rank?: number;
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
  category: string;
  period: string;
  onCategoryChange?: (category: string) => void;
  onPeriodChange?: (period: string) => void;
  loading?: boolean;
}

const CATEGORIES = [
  { value: 'experience', label: 'Experience', icon: TrophyIcon, color: 'text-yellow-500' },
  { value: 'tokens_spent', label: 'Big Spenders', icon: CurrencyDollarIcon, color: 'text-green-500' },
  { value: 'tokens_earned', label: 'Top Earners', icon: CurrencyDollarIcon, color: 'text-blue-500' },
  { value: 'watch_time', label: 'Watch Time', icon: ClockIcon, color: 'text-purple-500' },
  { value: 'stream_time', label: 'Stream Time', icon: EyeIcon, color: 'text-red-500' }
];

const PERIODS = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all_time', label: 'All Time' }
];

export const Leaderboard: React.FC<LeaderboardProps> = ({
  data,
  category,
  period,
  onCategoryChange,
  onPeriodChange,
  loading = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [showUserDetails, setShowUserDetails] = useState<number | null>(null);

  const currentCategory = useMemo(
    () => CATEGORIES.find(cat => cat.value === selectedCategory) || CATEGORIES[0],
    [selectedCategory]
  );

  const formatScore = (score: number, category: string) => {
    switch (category) {
      case 'experience':
        return `${score.toLocaleString()} XP`;
      case 'tokens_spent':
      case 'tokens_earned':
        return `${score.toLocaleString()} tokens`;
      case 'watch_time':
      case 'stream_time':
        const hours = Math.floor(score / 60);
        const minutes = score % 60;
        return `${hours}h ${minutes}m`;
      default:
        return score.toLocaleString();
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <TrophyIcon className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <TrophyIcon className="w-6 h-6 text-gray-400" />;
      case 3:
        return <TrophyIcon className="w-6 h-6 text-orange-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">#{position}</div>;
    }
  };

  const getRankBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20 border-gray-200 dark:border-gray-600';
      case 3:
        return 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Category Selector */}
        <div className="relative flex-1">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              onCategoryChange?.(e.target.value);
            }}
            className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Period Selector */}
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              onPeriodChange?.(e.target.value);
            }}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {PERIODS.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Leaderboard Header */}
      <div className="flex items-center gap-3">
        <currentCategory.icon className={`w-8 h-8 ${currentCategory.color}`} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentCategory.label} Leaderboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {PERIODS.find(p => p.value === selectedPeriod)?.label}
          </p>
        </div>
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        <AnimatePresence>
          {data.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No data available
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Be the first to top the leaderboard in {currentCategory.label.toLowerCase()}!
              </p>
            </motion.div>
          ) : (
            data.map((entry, index) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  relative overflow-hidden rounded-lg border p-4 transition-all duration-200 hover:shadow-lg
                  ${getRankBg(entry.rank_position || index + 1)}
                `}
                onClick={() => setShowUserDetails(showUserDetails === entry.user_id ? null : entry.user_id)}
              >
                {/* Ranking */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {getRankIcon(entry.rank_position || index + 1)}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {entry.avatar_url ? (
                        <img 
                          src={entry.avatar_url} 
                          alt={entry.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {entry.username}
                        {index < 3 && (
                          <FireIcon className="inline w-4 h-4 text-orange-500 ml-1" />
                        )}
                      </h3>
                      <UserLevel
                        level={entry.level}
                        title={entry.level_title}
                        badge_icon={entry.badge_icon}
                        experience_points={0}
                        exp_to_next_level={0}
                        experience_required={100}
                        size="sm"
                        showProgress={false}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatScore(entry.score, selectedCategory)}
                    </div>
                    {entry.rank_position && entry.rank_position <= 10 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Rank #{entry.rank_position}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {showUserDetails === entry.user_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Level:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{entry.level}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Title:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{entry.level_title}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {data.length > 0 && data.length % 50 === 0 && (
        <div className="text-center">
          <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;