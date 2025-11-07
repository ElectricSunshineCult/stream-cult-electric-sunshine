import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  PhotoIcon, 
  TrashIcon, 
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface CustomEmote {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  isActive: boolean;
  usageCount: number;
}

interface CustomEmoteManagerProps {
  streamerId: string;
  streamerUsername: string;
  isOwner: boolean;
  onEmoteSelect?: (emoteName: string) => void;
}

export const CustomEmoteManager: React.FC<CustomEmoteManagerProps> = ({
  streamerId,
  streamerUsername,
  isOwner,
  onEmoteSelect
}) => {
  const [emotes, setEmotes] = useState<CustomEmote[]>([]);
  const [isAddingEmote, setIsAddingEmote] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emoteName, setEmoteName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load emotes for streamer
  useEffect(() => {
    // TODO: Load emotes from API
    console.log(`Loading emotes for streamer ${streamerId}`);
  }, [streamerId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAddEmote = async () => {
    if (!selectedFile || !emoteName.trim()) return;

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', emoteName);
      formData.append('streamerId', streamerId);

      // TODO: Upload to API
      const newEmote: CustomEmote = {
        id: Date.now().toString(),
        name: emoteName,
        imageUrl: URL.createObjectURL(selectedFile),
        createdAt: new Date().toISOString(),
        isActive: true,
        usageCount: 0
      };

      setEmotes([...emotes, newEmote]);
      setIsAddingEmote(false);
      setSelectedFile(null);
      setEmoteName('');
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error adding emote:', error);
    }
  };

  const handleDeleteEmote = (emoteId: string) => {
    setEmotes(emotes.filter(e => e.id !== emoteId));
  };

  const handleToggleEmote = (emoteId: string) => {
    setEmotes(emotes.map(e => 
      e.id === emoteId ? { ...e, isActive: !e.isActive } : e
    ));
  };

  const handleEmoteClick = (emote: CustomEmote) => {
    if (onEmoteSelect && emote.isActive) {
      onEmoteSelect(emote.name);
      // Increment usage count
      setEmotes(emotes.map(e => 
        e.id === emote.id ? { ...e, usageCount: e.usageCount + 1 } : e
      ));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Custom Emotes
        </h3>
        {isOwner && (
          <button
            onClick={() => setIsAddingEmote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Emote
          </button>
        )}
      </div>

      {/* Add Emote Modal */}
      <AnimatePresence>
        {isAddingEmote && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50"
          >
            <h4 className="font-medium text-gray-900 mb-4">Add New Emote</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emote Name
                </label>
                <input
                  type="text"
                  value={emoteName}
                  onChange={(e) => setEmoteName(e.target.value)}
                  placeholder="Enter emote name (e.g., Kappa, PogChamp)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emote Image
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <PhotoIcon className="w-5 h-5" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  
                  {previewUrl && (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                      <button
                        onClick={() => {
                          setPreviewUrl(null);
                          setSelectedFile(null);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleAddEmote}
                  disabled={!selectedFile || !emoteName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Emote
                </button>
                <button
                  onClick={() => {
                    setIsAddingEmote(false);
                    setSelectedFile(null);
                    setEmoteName('');
                    setPreviewUrl(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emotes Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        <AnimatePresence>
          {emotes.map((emote) => (
            <motion.div
              key={emote.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`relative group cursor-pointer ${
                !emote.isActive ? 'opacity-50' : ''
              }`}
              onClick={() => handleEmoteClick(emote)}
            >
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-300 transition-colors">
                <img
                  src={emote.imageUrl}
                  alt={emote.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-emote.png';
                  }}
                />
              </div>
              
              {/* Emote Info Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center text-white text-xs">
                  <div className="font-medium">{emote.name}</div>
                  <div className="text-gray-300">used {emote.usageCount}x</div>
                </div>
              </div>

              {/* Controls (only for owner) */}
              {isOwner && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEmote(emote.id);
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      emote.isActive
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}
                  >
                    <EyeIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEmote(emote.id);
                    }}
                    className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {emotes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No custom emotes yet</p>
          {isOwner && (
            <p className="text-sm">Create your first emote to get started</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomEmoteManager;