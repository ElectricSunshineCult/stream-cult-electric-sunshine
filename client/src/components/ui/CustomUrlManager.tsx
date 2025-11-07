import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PencilIcon,
  GlobeAltIcon,
  LockClosedIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface CustomUrl {
  id: string;
  userId: string;
  url: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastUsed?: string;
  totalVisits: number;
  category: 'personal' | 'brand' | 'content' | 'campaign';
  description?: string;
  isPublic: boolean;
  allowDirectTips: boolean;
  customMetadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

interface CustomUrlManagerProps {
  currentUserId: string;
  onCreateUrl?: (url: Omit<CustomUrl, 'id' | 'createdAt' | 'totalVisits'>) => void;
  onUpdateUrl?: (id: string, updates: Partial<CustomUrl>) => void;
  onDeleteUrl?: (id: string) => void;
  onCheckAvailability?: (url: string) => Promise<boolean>;
}

const urlCategories = [
  { value: 'personal', label: 'Personal', icon: '👤', description: 'Your personal page' },
  { value: 'brand', label: 'Brand', icon: '🏢', description: 'Professional brand page' },
  { value: 'content', label: 'Content', icon: '📺', description: 'Stream or content hub' },
  { value: 'campaign', label: 'Campaign', icon: '🚀', description: 'Special events or campaigns' }
];

const reservedUrls = [
  'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'support', 'help',
  'about', 'terms', 'privacy', 'contact', 'login', 'register', 'dashboard',
  'settings', 'profile', 'stream', 'chat', 'tips', 'emotes', 'levels',
  'leaderboard', 'achievements', 'friends', 'blocked', 'search'
];

const urlPatterns = {
  personal: ['username', 'streamer', 'creator'],
  brand: ['brand', 'company', 'business', 'official'],
  content: ['stream', 'live', 'channel', 'shows'],
  campaign: ['event', 'special', 'limited', 'exclusive']
};

export const CustomUrlManager: React.FC<CustomUrlManagerProps> = ({
  currentUserId,
  onCreateUrl,
  onUpdateUrl,
  onDeleteUrl,
  onCheckAvailability
}) => {
  const [customUrls, setCustomUrls] = useState<CustomUrl[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [urlForm, setUrlForm] = useState({
    url: '',
    category: 'personal' as CustomUrl['category'],
    description: '',
    isPublic: true,
    allowDirectTips: false,
    customMetadata: {
      title: '',
      description: '',
      keywords: [] as string[]
    }
  });
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'unknown' | 'available' | 'taken' | 'invalid'>('unknown');

  useEffect(() => {
    // Load user's custom URLs
    loadCustomUrls();
  }, [currentUserId]);

  const loadCustomUrls = async () => {
    // TODO: API call to load user's custom URLs
    console.log('Loading custom URLs...');
  };

  const validateUrl = (url: string): { isValid: boolean; error?: string } => {
    // Check length
    if (url.length < 3) {
      return { isValid: false, error: 'URL must be at least 3 characters' };
    }
    if (url.length > 50) {
      return { isValid: false, error: 'URL must be less than 50 characters' };
    }

    // Check format
    if (!/^[a-z0-9-]+$/.test(url)) {
      return { isValid: false, error: 'URL can only contain lowercase letters, numbers, and hyphens' };
    }

    // Can't start or end with hyphen
    if (url.startsWith('-') || url.endsWith('-')) {
      return { isValid: false, error: 'URL cannot start or end with a hyphen' };
    }

    // Can't have consecutive hyphens
    if (url.includes('--')) {
      return { isValid: false, error: 'URL cannot contain consecutive hyphens' };
    }

    // Check if it's a reserved URL
    if (reservedUrls.includes(url)) {
      return { isValid: false, error: 'This URL is reserved and cannot be used' };
    }

    return { isValid: true };
  };

  const checkUrlAvailability = async (url: string) => {
    const validation = validateUrl(url);
    if (!validation.isValid) {
      setAvailabilityStatus('invalid');
      return false;
    }

    setIsCheckingAvailability(true);
    try {
      const isAvailable = await onCheckAvailability?.(url) ?? true;
      setAvailabilityStatus(isAvailable ? 'available' : 'taken');
      return isAvailable;
    } catch (error) {
      setAvailabilityStatus('invalid');
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (urlForm.url) {
      const timeoutId = setTimeout(() => {
        checkUrlAvailability(urlForm.url);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setAvailabilityStatus('unknown');
    }
  }, [urlForm.url]);

  const handleCreateUrl = async () => {
    const validation = validateUrl(urlForm.url);
    if (!validation.isValid) {
      return;
    }

    const isAvailable = await checkUrlAvailability(urlForm.url);
    if (!isAvailable) {
      return;
    }

    const newUrl: Omit<CustomUrl, 'id' | 'createdAt' | 'totalVisits'> = {
      userId: currentUserId,
      url: urlForm.url,
      isActive: true,
      isVerified: false,
      category: urlForm.category,
      description: urlForm.description || undefined,
      isPublic: urlForm.isPublic,
      allowDirectTips: urlForm.allowDirectTips,
      customMetadata: {
        title: urlForm.customMetadata.title || undefined,
        description: urlForm.customMetadata.description || undefined,
        keywords: urlForm.customMetadata.keywords.length > 0 ? urlForm.customMetadata.keywords : undefined
      }
    };

    onCreateUrl?.(newUrl);
    
    // Reset form
    setUrlForm({
      url: '',
      category: 'personal',
      description: '',
      isPublic: true,
      allowDirectTips: false,
      customMetadata: {
        title: '',
        description: '',
        keywords: []
      }
    });
    setShowCreateModal(false);
    setAvailabilityStatus('unknown');
  };

  const handleUpdateUrl = (id: string, updates: Partial<CustomUrl>) => {
    onUpdateUrl?.(id, updates);
    setCustomUrls(urls => urls.map(url => 
      url.id === id ? { ...url, ...updates } : url
    ));
  };

  const handleDeleteUrl = (id: string) => {
    onDeleteUrl?.(id);
    setCustomUrls(urls => urls.filter(url => url.id !== id));
  };

  const generateUrlSuggestions = (category: CustomUrl['category']) => {
    const patterns = urlPatterns[category] || [];
    const suggestions: string[] = [];
    
    // Add pattern-based suggestions
    patterns.forEach(pattern => {
      suggestions.push(`${pattern}-${Date.now().toString().slice(-4)}`);
      suggestions.push(`${pattern}-${Math.random().toString(36).substr(2, 4)}`);
    });
    
    // Add time-based suggestions
    const now = new Date();
    const timePatterns = [
      `live-${now.getFullYear()}`,
      `stream-${now.getMonth() + 1}${now.getDate()}`,
      `today-${now.getTime().toString().slice(-4)}`
    ];
    
    return [...suggestions, ...timePatterns].slice(0, 6);
  };

  const getCategoryColor = (category: CustomUrl['category']) => {
    const colors = {
      personal: 'bg-blue-100 text-blue-800 border-blue-200',
      brand: 'bg-purple-100 text-purple-800 border-purple-200',
      content: 'bg-green-100 text-green-800 border-green-200',
      campaign: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[category];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Custom URLs</h2>
            <p className="text-gray-600">Create memorable URLs for your profile and content</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Create URL
          </button>
        </div>
      </div>

      {/* URLs List */}
      <div className="space-y-4">
        {customUrls.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <LinkIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom URLs Yet</h3>
            <p className="text-gray-600 mb-6">
              Create a custom URL to make it easier for people to find and remember your page
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Your First URL
            </button>
          </div>
        ) : (
          customUrls.map((url) => (
            <div key={url.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl font-mono text-purple-600">
                      /{url.url}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(url.category)}`}>
                      {urlCategories.find(c => c.value === url.category)?.label}
                    </span>
                    {url.isVerified && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" title="Verified" />
                    )}
                    {url.isActive ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Active"></div>
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" title="Inactive"></div>
                    )}
                  </div>
                  
                  {url.description && (
                    <p className="text-gray-600 mb-3">{url.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <GlobeAltIcon className="w-4 h-4" />
                      {url.totalVisits} visits
                    </div>
                    {url.lastUsed && (
                      <div>Last used: {new Date(url.lastUsed).toLocaleDateString()}</div>
                    )}
                    <div className="flex items-center gap-1">
                      {url.isPublic ? <EyeIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                      {url.isPublic ? 'Public' : 'Private'}
                    </div>
                    {url.allowDirectTips && (
                      <div className="text-purple-600">Direct Tips Enabled</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateUrl(url.id, { isActive: !url.isActive })}
                    className={`px-3 py-1 rounded text-sm ${
                      url.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {url.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => {/* Edit modal */}}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUrl(url.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create URL Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Create Custom URL</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* URL Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    URL Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {urlCategories.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => setUrlForm({ ...urlForm, category: category.value as any })}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          urlForm.category === category.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{category.icon}</span>
                          <span className="font-medium">{category.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{category.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">/</span>
                    </div>
                    <input
                      type="text"
                      value={urlForm.url}
                      onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value.toLowerCase() })}
                      placeholder="your-custom-url"
                      className={`w-full pl-8 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                        availabilityStatus === 'available'
                          ? 'border-green-300 focus:ring-green-500'
                          : availabilityStatus === 'taken' || availabilityStatus === 'invalid'
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-purple-500'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {isCheckingAvailability ? (
                        <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                      ) : availabilityStatus === 'available' ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      ) : availabilityStatus === 'taken' ? (
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  
                  {availabilityStatus === 'available' && (
                    <p className="text-sm text-green-600 mt-1">URL is available!</p>
                  )}
                  {availabilityStatus === 'taken' && (
                    <p className="text-sm text-red-600 mt-1">This URL is already taken</p>
                  )}
                  {availabilityStatus === 'invalid' && (
                    <p className="text-sm text-red-600 mt-1">Please enter a valid URL</p>
                  )}
                  
                  {/* URL Suggestions */}
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {generateUrlSuggestions(urlForm.category).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setUrlForm({ ...urlForm, url: suggestion })}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={urlForm.description}
                    onChange={(e) => setUrlForm({ ...urlForm, description: e.target.value })}
                    placeholder="Brief description of this URL"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    maxLength={100}
                  />
                </div>

                {/* Custom Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={urlForm.customMetadata.title}
                      onChange={(e) => setUrlForm({
                        ...urlForm,
                        customMetadata: { ...urlForm.customMetadata, title: e.target.value }
                      })}
                      placeholder="Custom page title"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keywords (Optional)
                    </label>
                    <input
                      type="text"
                      value={urlForm.customMetadata.keywords.join(', ')}
                      onChange={(e) => setUrlForm({
                        ...urlForm,
                        customMetadata: {
                          ...urlForm.customMetadata,
                          keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                        }
                      })}
                      placeholder="gaming, streaming, entertainment"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Description (Optional)
                  </label>
                  <textarea
                    value={urlForm.customMetadata.description}
                    onChange={(e) => setUrlForm({
                      ...urlForm,
                      customMetadata: { ...urlForm.customMetadata, description: e.target.value }
                    })}
                    placeholder="SEO-friendly page description"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                </div>

                {/* Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={urlForm.isPublic}
                      onChange={(e) => setUrlForm({ ...urlForm, isPublic: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                      Make this URL public (can be found via search)
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowDirectTips"
                      checked={urlForm.allowDirectTips}
                      onChange={(e) => setUrlForm({ ...urlForm, allowDirectTips: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="allowDirectTips" className="text-sm font-medium text-gray-700">
                      Allow direct tipping through this URL
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                  <div className="text-purple-600 font-mono text-lg">/{urlForm.url || 'your-url'}</div>
                  {urlForm.description && (
                    <p className="text-gray-600 text-sm mt-1">{urlForm.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded ${getCategoryColor(urlForm.category)}`}>
                      {urlCategories.find(c => c.value === urlForm.category)?.label}
                    </span>
                    <span>{urlForm.isPublic ? 'Public' : 'Private'}</span>
                    {urlForm.allowDirectTips && <span>Direct Tips</span>}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateUrl}
                    disabled={
                      !urlForm.url || 
                      availabilityStatus !== 'available' || 
                      isCheckingAvailability
                    }
                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Create URL
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomUrlManager;