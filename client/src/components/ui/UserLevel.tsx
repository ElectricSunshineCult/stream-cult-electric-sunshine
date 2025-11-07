import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrophyIcon, 
  StarIcon, 
  FireIcon,
  SparklesIcon,
  ArrowUpIcon
} from '@heroicons/react/24/solid';
import { useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { 
  getUserLevelInfo, 
  getUserAchievements,
  getUserAnalytics 
} from '@/lib/api/levelService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface UserLevelProps {
  userId?: string;
  compact?: boolean;
  showDetails?: boolean;
  animated?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

interface LevelData {
  level: number;
  level_title: string;
  experience_points: number;
  badge_icon: string;
  exp_to_next_level: number;
  next_level_exp: number;
  progress_percentage: number;
  total_experience: number;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  badge_icon: string;
  is_completed: boolean;
  progress?: number;
}

export const UserLevel: React.FC<UserLevelProps> = ({
  userId,
  compact = false,
  showDetails = true,
  animated = true,
  className = '',
  size = 'md',
  showProgress = true
}) => {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;
  const [showTooltip, setShowTooltip] = useState(false);
  const [recentLevelUp, setRecentLevelUp] = useState(false);

  // Intersection observer for performance
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  // Fetch user level data
  const { data: levelData, isLoading: levelLoading, error: levelError } = useQuery({
    queryKey: ['userLevel', targetUserId],
    queryFn: () => getUserLevelInfo(targetUserId),
    enabled: !!targetUserId && inView,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    refetchOnWindowFocus: false
  });

  // Fetch user achievements
  const { data: achievements } = useQuery({
    queryKey: ['userAchievements', targetUserId],
    queryFn: () => getUserAchievements(targetUserId),
    enabled: !!targetUserId && inView,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Calculate level progress
  const levelProgress = useMemo(() => {
    if (!levelData) return null;

    const progress = levelData.next_level_exp > 0 
      ? ((levelData.experience_points % levelData.next_level_exp) / levelData.next_level_exp) * 100
      : 100;

    return {
      current: levelData.experience_points,
      next: levelData.next_level_exp,
      progress: Math.min(progress, 100),
      remaining: levelData.exp_to_next_level
    };
  }, [levelData]);

  // Check for level up animation
  useEffect(() => {
    if (levelData && animated && targetUserId) {
      const currentLevel = levelData.level;
      const previousLevel = localStorage.getItem(`userLevel_${targetUserId}`);
      
      if (previousLevel && parseInt(previousLevel) < currentLevel) {
        setRecentLevelUp(true);
        toast.success(`🎉 Level Up! You're now level ${currentLevel}!`, {
          duration: 5000,
          icon: '⬆️'
        });
        
        setTimeout(() => {
          setRecentLevelUp(false);
        }, 3000);
      }
      
      localStorage.setItem(`userLevel_${targetUserId}`, currentLevel.toString());
    }
  }, [levelData, targetUserId, animated]);

  // Get level color based on level number
  const getLevelColor = (level: number) => {
    if (level >= 20) return 'text-yellow-500'; // Legendary
    if (level >= 15) return 'text-purple-500'; // Epic
    if (level >= 10) return 'text-blue-500'; // Rare
    if (level >= 5) return 'text-green-500'; // Uncommon
    return 'text-gray-500'; // Common
  };

  // Get progress bar color
  const getProgressColor = (level: number) => {
    if (level >= 20) return 'from-yellow-400 to-yellow-600';
    if (level >= 15) return 'from-purple-400 to-purple-600';
    if (level >= 10) return 'from-blue-400 to-blue-600';
    if (level >= 5) return 'from-green-400 to-green-600';
    return 'from-gray-400 to-gray-600';
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'text-sm',
      badgeSize: 'w-6 h-6',
      levelSize: 'w-3 h-3 text-xs',
      spacing: 'gap-1',
      padding: 'px-1 py-0.5',
      progressHeight: 'h-1'
    },
    md: {
      container: 'text-base',
      badgeSize: 'w-8 h-8',
      levelSize: 'w-4 h-4 text-xs',
      spacing: 'gap-2',
      padding: 'px-2 py-1',
      progressHeight: 'h-1.5'
    },
    lg: {
      container: 'text-lg',
      badgeSize: 'w-10 h-10',
      levelSize: 'w-5 h-5 text-sm',
      spacing: 'gap-3',
      padding: 'px-3 py-1.5',
      progressHeight: 'h-2'
    }
  };

  const config = sizeConfig[size];

  // Animated container variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  // Error state
  if (levelError && !levelData) {
    return (
      <div className={`user-level-error ${className}`}>
        <div className="flex items-center space-x-2 text-red-500">
          <span className="text-sm">⚠️</span>
          <span className="text-sm">Failed to load level data</span>
        </div>
      </div>
    );
  }

  // Loading state
  if (levelLoading || !levelData) {
    return (
      <div className={`user-level-skeleton ${className} ${config.container}`}>
        <div className={`flex items-center ${config.spacing}`}>
          <div className={`${config.badgeSize} bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex items-center justify-center`}>
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
          {showDetails && (
            <div className="flex-1">
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              {showProgress && (
                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded mt-1 animate-pulse"></div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const levelComponent = (
    <div 
      ref={ref}
      className={`
        user-level-container relative 
        ${config.container}
        ${className}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <AnimatePresence>
        {recentLevelUp && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full p-1">
              <FireIcon className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={animated ? containerVariants : {}}
        initial={animated ? "hidden" : "visible"}
        animate="visible"
        className={`flex items-center ${config.spacing}`}
      >
        {/* Level Badge */}
        <motion.div 
          variants={animated ? itemVariants : {}}
          className="relative"
        >
          <div className={`
            ${config.badgeSize} rounded-full flex items-center justify-center
            bg-gradient-to-br ${getProgressColor(levelData.level)}
            text-white font-bold shadow-lg
            ${recentLevelUp ? 'animate-pulse' : ''}
            transition-all duration-300
          `}>
            <span className={config.levelSize}>{levelData.badge_icon}</span>
          </div>
          
          {/* Level Number */}
          <div className={`
            ${config.levelSize} rounded-full
            bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
            flex items-center justify-center font-bold
            ${getLevelColor(levelData.level)}
            absolute -bottom-0.5 -right-0.5
          `}>
            {levelData.level}
          </div>
        </motion.div>

        {/* Level Info */}
        {showDetails && (
          <motion.div 
            variants={animated ? itemVariants : {}}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center space-x-1">
              <span className={`font-semibold ${getLevelColor(levelData.level)}`}>
                {levelData.level_title}
              </span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                {levelData.experience_points.toLocaleString()} XP
              </span>
            </div>
            
            {showProgress && levelProgress && levelProgress.next > 0 && (
              <div className="mt-1">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Next Level</span>
                  <span>{levelProgress.remaining.toLocaleString()} XP</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getProgressColor(levelData.level)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            )}

            {levelData.level >= 10 && (
              <div className="flex items-center space-x-1 mt-1">
                <StarIcon className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                  {levelData.level >= 20 ? 'LEGENDARY' : levelData.level >= 15 ? 'EPIC' : 'MAX LEVEL'}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Enhanced Tooltip */}
      <AnimatePresence>
        {showTooltip && !compact && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute top-full left-0 mt-2 p-3 bg-gray-900 dark:bg-gray-800 
                     text-white text-sm rounded-lg shadow-xl z-50 min-w-64"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{levelData.level_title}</span>
                <span className="text-gray-300">Level {levelData.level}</span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Current XP:</span>
                  <span>{levelData.experience_points.toLocaleString()}</span>
                </div>
                {levelProgress && levelProgress.next > 0 && (
                  <div className="flex justify-between">
                    <span>Next Level:</span>
                    <span>{levelProgress.next.toLocaleString()} XP</span>
                  </div>
                )}
                {achievements && (
                  <div className="flex justify-between">
                    <span>Achievements:</span>
                    <span>
                      {achievements.filter(a => a.is_completed).length} / {achievements.length}
                    </span>
                  </div>
                )}
              </div>

              {levelProgress && levelProgress.next > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex items-center space-x-1 text-xs text-gray-300">
                    <ArrowUpIcon className="w-3 h-3" />
                    <span>
                      {Math.ceil(levelProgress.remaining / 100)} activities to next level
                    </span>
                  </div>
                </div>
              )}

              {/* Level progression suggestions */}
              <div className="pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-400">
                  💡 Earn XP by: watching streams, sending tips, or purchasing tokens
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return levelComponent;
};

export default UserLevel;