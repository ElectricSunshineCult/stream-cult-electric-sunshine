import React from 'react';
import { motion } from 'framer-motion';
import { StarIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/solid';

interface UserLevelProps {
  level: number;
  title: string;
  badge_icon: string;
  experience_points: number;
  exp_to_next_level: number;
  experience_required: number;
  className?: string;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UserLevel: React.FC<UserLevelProps> = ({
  level,
  title,
  badge_icon,
  experience_points,
  exp_to_next_level,
  experience_required,
  className = '',
  showProgress = true,
  size = 'md'
}) => {
  const progressPercentage = level >= 10 ? 100 : ((experience_required - exp_to_next_level) / experience_required) * 100;
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Level Badge */}
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="absolute -top-1 -right-1 text-xs bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {level}
        </span>
        <span className="px-2 py-1 text-xs">
          {badge_icon}
        </span>
      </motion.div>

      {/* Level Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={`font-semibold text-gray-900 dark:text-white ${sizeClasses[size]}`}>
            {title}
          </span>
          {level >= 5 && (
            <FireIcon className={`${iconSizes[size]} text-orange-500`} />
          )}
          {level >= 8 && (
            <TrophyIcon className={`${iconSizes[size]} text-yellow-500`} />
          )}
        </div>

        {showProgress && level < 10 && (
          <div className="mt-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{experience_points.toLocaleString()} XP</span>
              <span>{experience_required.toLocaleString()} XP</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {exp_to_next_level.toLocaleString()} XP to next level
            </div>
          </div>
        )}

        {level >= 10 && (
          <div className="flex items-center gap-1">
            <StarIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              MAX LEVEL
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserLevel;