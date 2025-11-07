import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SwatchIcon,
  TagIcon,
  SparklesIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  textColor: string;
  isCustom?: boolean;
}

interface StatusMessage {
  id: string;
  type: 'online' | 'away' | 'idle' | 'gaming' | 'music' | 'custom';
  message: string;
  color: string;
  emoji?: string;
  isActive: boolean;
  autoSwitch?: {
    enabled: boolean;
    schedules: { start: string; end: string; status: string }[];
  };
}

interface TabColorOverlay {
  id: string;
  name: string;
  tabs: {
    id: string;
    name: string;
    color: string;
    backgroundColor: string;
    textColor: string;
    gradient?: string;
    icon?: string;
  }[];
}

interface ColorCustomizationProps {
  userId: string;
  isOwner: boolean;
  currentUserId?: string;
  onUpdateTheme?: (theme: ColorTheme) => void;
  onUpdateStatusMessages?: (messages: StatusMessage[]) => void;
  onUpdateTabColors?: (overlay: TabColorOverlay) => void;
}

const presetThemes: ColorTheme[] = [
  {
    id: 'purple-dream',
    name: 'Purple Dream',
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#C4B5FD',
    gradient: 'from-purple-600 via-blue-600 to-pink-600',
    textColor: '#1F2937'
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    primary: '#0EA5E9',
    secondary: '#38BDF8',
    accent: '#7DD3FC',
    gradient: 'from-blue-600 via-cyan-600 to-teal-600',
    textColor: '#1F2937'
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    primary: '#F97316',
    secondary: '#FB923C',
    accent: '#FDBA74',
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    textColor: '#1F2937'
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#6EE7B7',
    gradient: 'from-green-600 via-emerald-600 to-teal-600',
    textColor: '#1F2937'
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    primary: '#F59E0B',
    secondary: '#FBBF24',
    accent: '#FCD34D',
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    textColor: '#1F2937'
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#A855F7',
    gradient: 'from-gray-900 via-purple-900 to-violet-900',
    textColor: '#F9FAFB'
  }
];

const statusTypes = [
  { value: 'online', label: 'Online', emoji: '🟢', defaultColor: '#10B981' },
  { value: 'away', label: 'Away', emoji: '🟡', defaultColor: '#F59E0B' },
  { value: 'idle', label: 'Idle', emoji: '🟠', defaultColor: '#F97316' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮', defaultColor: '#EF4444' },
  { value: 'music', label: 'Listening', emoji: '🎵', defaultColor: '#8B5CF6' },
  { value: 'custom', label: 'Custom', emoji: '✨', defaultColor: '#6B7280' }
];

export const ColorCustomization: React.FC<ColorCustomizationProps> = ({
  userId,
  isOwner,
  currentUserId,
  onUpdateTheme,
  onUpdateStatusMessages,
  onUpdateTabColors
}) => {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(presetThemes[0]);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [tabOverlay, setTabOverlay] = useState<TabColorOverlay>({
    id: 'default',
    name: 'Default Tabs',
    tabs: [
      { id: 'profile', name: 'Profile', color: '#8B5CF6', backgroundColor: '#F3F4F6', textColor: '#1F2937' },
      { id: 'stream', name: 'Stream', color: '#3B82F6', backgroundColor: '#EFF6FF', textColor: '#1E40AF' },
      { id: 'chat', name: 'Chat', color: '#10B981', backgroundColor: '#ECFDF5', textColor: '#065F46' },
      { id: 'emotes', name: 'Emotes', color: '#F59E0B', backgroundColor: '#FFFBEB', textColor: '#92400E' }
    ]
  });
  const [activeTab, setActiveTab] = useState<'themes' | 'status' | 'tabs'>('themes');
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    // TODO: Load user's color customization settings
    loadUserCustomizations();
  }, [userId]);

  const loadUserCustomizations = async () => {
    // TODO: API call to load user's color theme, status messages, and tab colors
    console.log('Loading user color customizations...');
  };

  const handleThemeChange = (theme: ColorTheme) => {
    setCurrentTheme(theme);
    onUpdateTheme?.(theme);
  };

  const handleAddStatusMessage = (statusType: string, message: string, color: string) => {
    const newMessage: StatusMessage = {
      id: Date.now().toString(),
      type: statusType as any,
      message,
      color,
      isActive: false
    };
    
    const updated = [...statusMessages, newMessage];
    setStatusMessages(updated);
    onUpdateStatusMessages?.(updated);
  };

  const handleUpdateStatusMessage = (id: string, updates: Partial<StatusMessage>) => {
    const updated = statusMessages.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    );
    setStatusMessages(updated);
    onUpdateStatusMessages?.(updated);
  };

  const handleDeleteStatusMessage = (id: string) => {
    const updated = statusMessages.filter(msg => msg.id !== id);
    setStatusMessages(updated);
    onUpdateStatusMessages?.(updated);
  };

  const handleTabColorUpdate = (tabId: string, color: string, backgroundColor: string) => {
    const updated = {
      ...tabOverlay,
      tabs: tabOverlay.tabs.map(tab =>
        tab.id === tabId ? { ...tab, color, backgroundColor } : tab
      )
    };
    setTabOverlay(updated);
    onUpdateTabColors?.(updated);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'themes', label: 'Themes', icon: SwatchIcon },
            { id: 'status', label: 'Status', icon: TagIcon },
            { id: 'tabs', label: 'Tabs', icon: AdjustmentsHorizontalIcon }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Themes */}
      <AnimatePresence>
        {activeTab === 'themes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Color Themes</h2>
              {isOwner && (
                <button
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {isCustomizing ? 'Stop Customizing' : 'Customize'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {presetThemes.map((theme) => (
                <motion.div
                  key={theme.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    currentTheme.id === theme.id
                      ? 'border-purple-500 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleThemeChange(theme)}
                >
                  {/* Theme Preview */}
                  <div className={`h-24 bg-gradient-to-r ${theme.gradient} relative`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="font-bold text-lg">{theme.name}</div>
                        <div className="text-sm opacity-90">Preview</div>
                      </div>
                    </div>
                    
                    {currentTheme.id === theme.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Theme Info */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{theme.name}</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.secondary }}></div>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Current Theme Preview */}
            <div className="mt-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Current Theme: {currentTheme.name}</h3>
              <div className={`h-16 bg-gradient-to-r ${currentTheme.gradient} rounded-lg flex items-center justify-center`}>
                <div className="text-center text-white">
                  <div className="font-bold text-xl">Sample Content</div>
                  <div className="text-sm opacity-90">This is how it looks</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Messages */}
      <AnimatePresence>
        {activeTab === 'status' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Custom Status Messages</h2>
              {isOwner && (
                <button
                  onClick={() => {/* Add status modal */}}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <TagIcon className="w-4 h-4" />
                  Add Status
                </button>
              )}
            </div>

            <div className="space-y-3">
              {statusTypes.map((statusType) => (
                <StatusMessageCard
                  key={statusType.value}
                  statusType={statusType}
                  messages={statusMessages.filter(msg => msg.type === statusType.value)}
                  isOwner={isOwner}
                  onUpdate={handleUpdateStatusMessage}
                  onDelete={handleDeleteStatusMessage}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Color Overlays */}
      <AnimatePresence>
        {activeTab === 'tabs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Tab Color Overlays</h2>
              {isOwner && (
                <button
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4" />
                  Customize
                </button>
              )}
            </div>

            <div className="space-y-4">
              {tabOverlay.tabs.map((tab) => (
                <div key={tab.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: tab.color }}
                      ></div>
                      <span className="font-medium text-gray-900">{tab.name}</span>
                    </div>
                    
                    {isCustomizing && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Color:</label>
                        <input
                          type="color"
                          value={tab.color}
                          onChange={(e) => handleTabColorUpdate(tab.id, e.target.value, e.target.value + '20')}
                          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Tab Preview */}
                  <div className="relative">
                    <button
                      className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                        isCustomizing ? 'ring-2 ring-purple-500' : ''
                      }`}
                      style={{
                        backgroundColor: tab.backgroundColor,
                        color: tab.textColor
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: tab.color }}
                        ></div>
                        <span className="font-medium">{tab.name} Tab</span>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusMessageCard: React.FC<{
  statusType: typeof statusTypes[0];
  messages: StatusMessage[];
  isOwner: boolean;
  onUpdate: (id: string, updates: Partial<StatusMessage>) => void;
  onDelete: (id: string) => void;
}> = ({ statusType, messages, isOwner, onUpdate, onDelete }) => {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">{statusType.emoji}</span>
        <h3 className="font-medium text-gray-900">{statusType.label}</h3>
        <span className="text-sm text-gray-500">({messages.length} messages)</span>
      </div>
      
      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No custom messages</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: message.color }}
                ></div>
                <span className="text-sm">{message.message}</span>
              </div>
              
              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdate(message.id, { isActive: !message.isActive })}
                    className={`p-1 rounded ${
                      message.isActive
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    title={message.isActive ? 'Active' : 'Inactive'}
                  >
                    <EyeIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ColorCustomization;