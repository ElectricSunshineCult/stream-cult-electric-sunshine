import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Download, 
  Share, 
  Heart, 
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Laugh,
  Surprise,
  Eye,
  Calendar,
  Clock,
  User,
  Tag,
  Send,
  MoreHorizontal,
  Flag
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
  view_count: number;
  download_count: number;
  tags: string[];
  created_at: string;
  username: string;
  display_name: string;
  stream_title?: string;
  reaction_count?: number;
  comment_count?: number;
}

interface ClipViewerProps {
  clip: Clip;
  onBack?: () => void;
  showComments?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

interface Reaction {
  like: number;
  love: number;
  laugh: number;
  wow: number;
  dislike: number;
}

const ClipViewer: React.FC<ClipViewerProps> = ({ 
  clip, 
  onBack, 
  showComments = true 
}) => {
  // Video states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // UI states
  const [reactions, setReactions] = useState<Reaction>({ like: 0, love: 0, laugh: 0, wow: 0, dislike: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Load reactions
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const response = await fetch(`/api/clips/${clip.id}/reactions`);
        if (response.ok) {
          const data = await response.json();
          setReactions(data.reactions);
        }
      } catch (error) {
        console.error('Failed to load reactions:', error);
      }
    };
    
    loadReactions();
  }, [clip.id]);
  
  // Load comments
  useEffect(() => {
    if (showComments) {
      const loadComments = async () => {
        try {
          const response = await fetch(`/api/clips/${clip.id}/comments`);
          if (response.ok) {
            const data = await response.json();
            setComments(data.comments);
          }
        } catch (error) {
          console.error('Failed to load comments:', error);
        }
      };
      
      loadComments();
    }
  }, [clip.id, showComments]);
  
  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  // Video controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };
  
  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = time;
    setCurrentTime(time);
  };
  
  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };
  
  // Reactions
  const reactToClip = async (reactionType: string) => {
    try {
      const response = await fetch(`/api/clips/${clip.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reactionType })
      });
      
      if (response.ok) {
        setUserReaction(reactionType);
        
        // Update reaction counts (in a real app, you'd refetch from server)
        setReactions(prev => ({
          ...prev,
          [reactionType]: (prev[reactionType as keyof Reaction] || 0) + 1
        }));
        
        toast({
          title: "Reaction Added",
          description: "Your reaction has been recorded"
        });
      }
    } catch (error) {
      toast({
        title: "Failed to React",
        description: "Could not add your reaction",
        variant: "destructive"
      });
    }
  };
  
  // Comments
  const addComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const response = await fetch(`/api/clips/${clip.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          content: newComment,
          parentId: replyTo 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setComments(prev => [result.comment, ...prev]);
        setNewComment('');
        setReplyTo(null);
        
        toast({
          title: "Comment Added",
          description: "Your comment has been posted"
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Comment",
        description: "Could not post your comment",
        variant: "destructive"
      });
    }
  };
  
  // Share
  const shareClip = async () => {
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
          description: "Clip link copied to clipboard"
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Clip link copied to clipboard"
      });
    }
    
    setShowShareMenu(false);
  };
  
  // Download
  const downloadClip = async () => {
    try {
      const response = await fetch(`/api/clips/${clip.id}/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Trigger download
        const a = document.createElement('a');
        a.href = result.filePath;
        a.download = `${clip.title || 'clip'}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({
          title: "Download Started",
          description: "Your clip is being downloaded"
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the clip",
        variant: "destructive"
      });
    }
  };
  
  // Format helpers
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'like': return <ThumbsUp className="w-4 h-4" />;
      case 'love': return <Heart className="w-4 h-4" />;
      case 'laugh': return <Laugh className="w-4 h-4" />;
      case 'wow': return <Smile className="w-4 h-4" />;
      case 'dislike': return <ThumbsDown className="w-4 h-4" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };
  
  const getReactionColor = (type: string, isActive: boolean = false) => {
    if (isActive) {
      switch (type) {
        case 'like': return 'bg-blue-500 text-white';
        case 'love': return 'bg-red-500 text-white';
        case 'laugh': return 'bg-yellow-500 text-white';
        case 'wow': return 'bg-green-500 text-white';
        case 'dislike': return 'bg-gray-500 text-white';
        default: return 'bg-primary text-primary-foreground';
      }
    }
    return 'bg-muted text-muted-foreground hover:bg-muted/80';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back
        </Button>
      )}
      
      {/* Video Player */}
      <Card className="overflow-hidden">
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            poster={clip.thumbnail_path}
            onClick={togglePlay}
          />
          
          {/* Video Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={togglePlay}
              >
                <Play className="w-8 h-8" />
              </Button>
            </div>
          )}
          
          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full mb-2"
            />
            
            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={togglePlay}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20"
                  />
                </div>
                
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={downloadClip}>
                  <Download className="w-4 h-4" />
                </Button>
                
                <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Clip Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-xl">{clip.title}</CardTitle>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>by {clip.display_name || clip.username}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(clip.created_at)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{clip.view_count} views</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  <span>{clip.download_count} downloads</span>
                </div>
              </div>
              
              {clip.stream_title && (
                <div className="text-sm text-muted-foreground">
                  From: {clip.stream_title}
                </div>
              )}
              
              {clip.description && (
                <CardDescription className="text-base">
                  {clip.description}
                </CardDescription>
              )}
              
              {clip.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {clip.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={shareClip}>
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              <Button variant="outline" onClick={downloadClip}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Reactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(reactions).map(([type, count]) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => reactToClip(type)}
                className={`${getReactionColor(type, userReaction === type)}`}
              >
                {getReactionIcon(type)}
                <span className="ml-1">{count}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Comments */}
      {showComments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {replyTo ? 'Replying to comment' : ''}
                </div>
                <Button onClick={addComment} disabled={!newComment.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Comment
                </Button>
              </div>
            </div>
            
            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {comment.user.display_name || comment.user.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm">{comment.content}</p>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <Heart className="w-3 h-3 mr-1" />
                          Like
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-1"
                          onClick={() => setReplyTo(comment.id)}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                      
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                                <User className="w-3 h-3" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs">
                                    {reply.user.display_name || reply.user.username}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(reply.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {comments.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClipViewer;