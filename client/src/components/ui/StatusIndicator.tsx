import React from 'react';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  WifiIcon, 
  MoonIcon, 
  EyeSlashIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';

export type UserStatus = 'online' | 'away' | 'idle' | 'invisible' | 'offline';

interface StatusIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  online: {
    color: 'bg-green-500',
    bgColor: 'bg-green-100',
    icon: WifiIcon,
    label: 'Online',
    pulse: true
  },
  away: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100',
    icon: UserIcon,
    label: 'Away',
    pulse: false
  },
  idle: {
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100',
    icon: MoonIcon,
    label: 'Idle',
    pulse: false
  },
  invisible: {
    color: 'bg-gray-400',
    bgColor: 'bg-gray-50',
    icon: EyeSlashIcon,
    label: 'Invisible',
    pulse: false
  },
  offline: {
    color: 'bg-gray-300',
    bgColor: 'bg-gray-50',
    icon: UserMinusIcon,
    label: 'Offline',
    pulse: false
  }
};

const sizeConfig = {
  sm: { dot: 'w-2 h-2', icon: 'w-3 h-3', text: 'text-xs' },
  md: { dot: 'w-3 h-3', icon: 'w-4 h-4', text: 'text-sm' },
  lg: { dot: 'w-4 h-4', icon: 'w-5 h-5', text: 'text-base' }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <motion.div
          className={`${sizeClasses.dot} ${config.color} rounded-full`}
          animate={config.pulse ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          } : {}}
          transition={{
            duration: 2,
            repeat: config.pulse ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        {config.pulse && (
          <motion.div
            className={`${sizeClasses.dot} ${config.color} rounded-full absolute inset-0 opacity-75`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.75, 0, 0.75]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        )}
      </div>
      
      {showLabel && (
        <span className={`${sizeClasses.text} font-medium text-gray-600`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;