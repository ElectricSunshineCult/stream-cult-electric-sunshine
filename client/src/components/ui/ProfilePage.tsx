import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClipsManager from '@/components/ui/ClipsManager';
import { 
  User, 
  Video, 
  Film, 
  Calendar, 
  MapPin, 
  Link as LinkIcon,
  Heart,
  Eye,
  Download,
  Settings,
  Edit,
  Shield,
  Clock
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  website?: string;
  is_verified: boolean;
  created_at: string;
  follower_count: number;
  following_count: number;
  stream_count: number;
  total_views: number;
}

interface StreamStats {
  totalStreams: number;
  totalViews: number;
  totalClips: number;
  totalDownloads: number;
  averageViewDuration: number;
  topClips: any[];
}

interface ProfilePageProps {
  userId: string;
  isOwner?: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, isOwner = false }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // Load profile data
        const profileResponse = await fetch(`/api/users/${userId}/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData.user);
        }
        
        // Load stream stats
        const statsResponse = await fetch(`/api/users/${userId}/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
        
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          {/* Profile Header Skeleton */}
          <div className="bg-muted rounded-lg h-48"></div>
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6 text-center">
        <div className="text-muted-foreground">
          <User className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">User Not Found</h2>
          <p>The requested user profile could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        {/* Banner */}
        <div 
          className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative"
          style={{
            backgroundImage: profile.banner_url ? `url(${profile.banner_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {profile.banner_url && (
            <div className="absolute inset-0 bg-black/20" />
          )}
        </div>
        
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 -mt-16 relative z-10">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-muted overflow-hidden">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {profile.is_verified && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                  <span className="text-muted-foreground">@{profile.username}</span>
                  {profile.is_verified && (
                    <Badge className="bg-blue-500">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="4- h-4" />
                    Joined {formatDate(profile.created_at)}
                  </div>
                  
                  {profile.website && (
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(profile.follower_count)}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(profile.following_count)}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(profile.stream_count)}</div>
                  <div className="text-sm text-muted-foreground">Streams</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(profile.total_views)}</div>
                  <div className="text-sm text-muted-foreground">Total Views</div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            {isOwner && (
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="clips" className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            Clips
          </TabsTrigger>
          <TabsTrigger value="streams" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Streams
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{stats.totalClips}</div>
                  <div className="text-sm text-muted-foreground">Total Clips</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{stats.totalDownloads}</div>
                  <div className="text-sm text-muted-foreground">Clip Downloads</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{Math.round(stats.averageViewDuration / 60)}m</div>
                  <div className="text-sm text-muted-foreground">Avg View Duration</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{stats.topClips.length}</div>
                  <div className="text-sm text-muted-foreground">Top Clips</div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Recent Clips Preview */}
          {stats && stats.topClips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Clips</CardTitle>
                <CardDescription>Your latest and most popular clips</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.topClips.slice(0, 6).map((clip: any) => (
                    <div key={clip.id} className="border rounded-lg overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {clip.thumbnail_path ? (
                          <img 
                            src={clip.thumbnail_path} 
                            alt={clip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                            <Film className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(clip.duration / 60)}:{(clip.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold truncate">{clip.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatNumber(clip.view_count)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {formatNumber(clip.download_count)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clips Tab */}
        <TabsContent value="clips">
          <ClipsManager
            userId={userId}
            isOwner={isOwner}
            showAnalytics={isOwner}
          />
        </TabsContent>

        {/* Streams Tab */}
        <TabsContent value="streams">
          <Card>
            <CardHeader>
              <CardTitle>Stream History</CardTitle>
              <CardDescription>View all your past streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4" />
                <p>Stream history feature coming soon!</p>
                <p className="text-sm">This will show all your past streams with playback options.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Detailed insights into your content performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4" />
                <p>Analytics dashboard feature coming soon!</p>
                <p className="text-sm">This will show detailed charts and metrics for your clips and streams.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;