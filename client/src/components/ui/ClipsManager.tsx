import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Edit, 
  Trash2, 
  Download, 
  Share, 
  Eye, 
  Heart, 
  MessageCircle,
  Calendar,
  Clock,
  Filter,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Settings,
  Star,
  Tag,
  Users,
  BarChart3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Clip {
  id: string;
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  duration: number;
  thumbnail_path: string;
  quality: string;
  is_public: boolean;
  is_featured: boolean;
  view_count: number;
  download_count: number;
  tags: string[];
  created_at: string;
  stream_title?: string;
  reaction_count?: number;
  comment_count?: number;
}

interface ClipsManagerProps {
  userId: string;
  isOwner?: boolean;
  showAnalytics?: boolean;
}

const ClipsManager: React.FC<ClipsManagerProps> = ({
  userId,
  isOwner = false,
  showAnalytics = false
}) => {
  // State management
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterPublic, setFilterPublic] = useState<'all' | 'public' | 'private'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Modal states
  const [showClipModal, setShowClipModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Analytics
  const [analytics, setAnalytics] = useState({
    totalClips: 0,
    totalViews: 0,
    totalDownloads: 0,
    totalLikes: 0,
    publicClips: 0,
    averageDuration: 0
  });

  // Load clips
  const loadClips = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        sort: sortBy,
        order: sortOrder
      });
      
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      
      const response = await fetch(`/api/clips/profile/${userId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load clips');
      }
      
      const result = await response.json();
      setClips(result.clips);
      
      // Calculate analytics
      const totalViews = result.clips.reduce((sum: number, clip: Clip) => sum + clip.view_count, 0);
      const totalDownloads = result.clips.reduce((sum: number, clip: Clip) => sum + clip.download_count, 0);
      const totalLikes = result.clips.reduce((sum: number, clip: Clip) => sum + (clip.reaction_count || 0), 0);
      const publicClips = result.clips.filter((clip: Clip) => clip.is_public).length;
      const totalDuration = result.clips.reduce((sum: number, clip: Clip) => sum + clip.duration, 0);
      
      setAnalytics({
        totalClips: result.clips.length,
        totalViews,
        totalDownloads,
        totalLikes,
        publicClips,
        averageDuration: result.clips.length > 0 ? Math.round(totalDuration / result.clips.length) : 0
      });
      
    } catch (error) {
      toast({
        title: "Loading Failed",
        description: "Could not load your clips",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete clip
  const deleteClip = async (clipId: string) => {
    if (!confirm('Are you sure you want to delete this clip?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete clip');
      }
      
      setClips(prev => prev.filter(clip => clip.id !== clipId));
      
      toast({
        title: "Clip Deleted",
        description: "Your clip has been deleted successfully"
      });
      
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete the clip",
        variant: "destructive"
      });
    }
  };

  // Update clip
  const updateClip = async (clip: Clip) => {
    try {
      const response = await fetch(`/api/clips/${clip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: clip.title,
          description: clip.description,
          is_public: clip.is_public,
          tags: clip.tags
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update clip');
      }
      
      const result = await response.json();
      
      setClips(prev => prev.map(c => c.id === clip.id ? result.clip : c));
      setEditingClip(null);
      
      toast({
        title: "Clip Updated",
        description: "Your clip has been updated successfully"
      });
      
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update the clip",
        variant: "destructive"
      });
    }
  };

  // Download clip
  const downloadClip = async (clip: Clip) => {
    try {
      const response = await fetch(`/api/clips/${clip.id}/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to record download');
      }
      
      // Update download count in UI
      setClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, download_count: c.download_count + 1 } : c
      ));
      
      // Trigger actual download
      const downloadUrl = `/api/clips/${clip.id}/file`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${clip.title || 'clip'}-${clip.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your clip is being downloaded"
      });
      
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the clip",
        variant: "destructive"
      });
    }
  };

  // Share clip
  const shareClip = async (clip: Clip) => {
    const shareUrl = `${window.location.origin}/clips/${clip.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: clip.title,
          text: clip.description,
          url: shareUrl
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied",
          description: "Clip link has been copied to clipboard"
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Clip link has been copied to clipboard"
      });
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter clips
  const filteredClips = clips.filter(clip => {
    const matchesSearch = !searchQuery || 
      clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPublic = filterPublic === 'all' ||
      (filterPublic === 'public' && clip.is_public) ||
      (filterPublic === 'private' && !clip.is_public);
    
    const matchesTag = selectedTag === 'all' || clip.tags.includes(selectedTag);
    
    return matchesSearch && matchesPublic && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(clips.flatMap(clip => clip.tags)));

  useEffect(() => {
    loadClips();
  }, [userId, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading clips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{analytics.totalClips}</div>
              <div className="text-sm text-muted-foreground">Total Clips</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{analytics.totalViews}</div>
              <div className="text-sm text-muted-foreground">Total Views</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{analytics.totalDownloads}</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{analytics.totalLikes}</div>
              <div className="text-sm text-muted-foreground">Likes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{analytics.publicClips}</div>
              <div className="text-sm text-muted-foreground">Public</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{formatDuration(analytics.averageDuration)}</div>
              <div className="text-sm text-muted-foreground">Avg Duration</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-2 items-center flex-1">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              
              <select
                value={filterPublic}
                onChange={(e) => setFilterPublic(e.target.value as any)}
                className="p-2 border rounded-md"
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center gap-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="p-2 border rounded-md"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="view_count-desc">Most Viewed</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
              
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clips Display */}
      {filteredClips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              {clips.length === 0 ? 'No clips created yet' : 'No clips match your filters'}
            </div>
            {clips.length === 0 && isOwner && (
              <p className="text-sm">
                Start creating clips from your streams to see them here!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-4"
        }>
          {filteredClips.map((clip) => (
            <Card key={clip.id} className="overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {clip.thumbnail_path ? (
                  <img
                    src={clip.thumbnail_path}
                    alt={clip.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                    <Play className="w-8 h-8" />
                  </div>
                )}
                
                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(clip.duration)}
                </div>
                
                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {!clip.is_public && (
                    <Badge variant="secondary" className="text-xs">Private</Badge>
                  )}
                  {clip.is_featured && (
                    <Badge variant="default" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setSelectedClip(clip);
                      setShowClipModal(true);
                    }}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold truncate">{clip.title || 'Untitled Clip'}</h3>
                  
                  {clip.stream_title && (
                    <p className="text-sm text-muted-foreground">
                      From: {clip.stream_title}
                    </p>
                  )}
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {clip.description || 'No description'}
                  </p>
                  
                  {/* Tags */}
                  {clip.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {clip.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {clip.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{clip.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {clip.view_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      {clip.download_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {clip.reaction_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {clip.comment_count || 0}
                    </div>
                  </div>
                  
                  {/* Date */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {formatDate(clip.created_at)}
                  </div>
                  
                  {/* Actions */}
                  {isOwner && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingClip(clip);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadClip(clip)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareClip(clip)}
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteClip(clip.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clip Viewer Modal */}
      {showClipModal && selectedClip && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{selectedClip.title}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowClipModal(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="aspect-video bg-black rounded mb-4 flex items-center justify-center">
                <Play className="w-16 h-16 text-white" />
                {/* Video player would go here */}
              </div>
              
              <div className="space-y-2">
                <p>{selectedClip.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatDuration(selectedClip.duration)}</span>
                  <span>{formatDate(selectedClip.created_at)}</span>
                  <span>{selectedClip.quality}</span>
                </div>
                
                {selectedClip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedClip.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Clip Modal */}
      {showEditModal && editingClip && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Edit Clip</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingClip.title}
                  onChange={(e) => setEditingClip({ ...editingClip, title: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingClip.description || ''}
                  onChange={(e) => setEditingClip({ ...editingClip, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingClip.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => {
                      setEditingClip({
                        ...editingClip,
                        tags: editingClip.tags.filter(t => t !== tag)
                      });
                    }}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add tags..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value && !editingClip.tags.includes(value)) {
                        setEditingClip({
                          ...editingClip,
                          tags: [...editingClip.tags, value]
                        });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-public"
                  checked={editingClip.is_public}
                  onChange={(e) => setEditingClip({ ...editingClip, is_public: e.target.checked })}
                />
                <Label htmlFor="edit-public">Make this clip public</Label>
              </div>
            </div>
            
            <div className="p-4 border-t flex gap-2">
              <Button
                onClick={() => {
                  updateClip(editingClip);
                  setShowEditModal(false);
                }}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipsManager;