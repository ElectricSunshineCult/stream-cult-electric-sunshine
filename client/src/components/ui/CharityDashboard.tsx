/**
 * Charity and Crowdfunding Dashboard Component
 * Date: 2025-11-07
 * Author: MiniMax Agent
 * Description: Main interface for charity and crowdfunding features with badges, milestones, and leaderboards
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Star, 
  Trophy, 
  Users, 
  DollarSign, 
  Calendar, 
  Target, 
  Award,
  TrendingUp,
  Gift,
  Play,
  Shield,
  Crown,
  Medal,
  Zap,
  Globe,
  HandHeart
} from 'lucide-react';

interface Charity {
  id: string;
  organization_name: string;
  organization_type: string;
  logo_url?: string;
  mission_statement: string;
  focus_areas: string[];
  total_raised: number;
}

interface Campaign {
  id: string;
  campaign_name: string;
  campaign_description: string;
  goal_amount: number;
  current_amount: number;
  progress_percentage: number;
  days_remaining: number;
  campaign_type: string;
  charity_id: string;
  organization_name: string;
  logo_url?: string;
}

interface Achievement {
  id: string;
  milestone_name: string;
  description: string;
  current_value: number;
  target_value: number;
  is_completed: boolean;
  badge_icon: string;
  badge_color: string;
  badge_earned: boolean;
  completed_at?: string;
}

interface UserStats {
  total_charity_donated: number;
  charity_campaigns_supported: number;
  charity_streams_hosted: number;
  charity_donations_made: number;
  charity_achievements_earned: number;
  charity_badges_earned: number;
}

interface LeaderboardEntry {
  id?: string;
  username?: string;
  organization_name?: string;
  avatar_url?: string;
  logo_url?: string;
  total_donated?: number;
  streams_hosted?: number;
  total_raised?: number;
  donation_count?: number;
  campaign_name?: string;
  current_amount?: number;
  goal_amount?: number;
  total_viewers?: number;
}

const CharityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-contributions' | 'stream' | 'leaderboard'>('browse');
  const [charities, setCharities] = useState<Charity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [leaderboardType, setLeaderboardType] = useState<'top_donors' | 'top_streamers' | 'top_campaigns'>('top_donors');
  const [loading, setLoading] = useState(true);
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCharities(),
        loadCampaigns(),
        loadUserStats(),
        loadAchievements(),
        loadLeaderboard()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCharities = async () => {
    try {
      const response = await fetch('/api/charities?verified=true&limit=6');
      const data = await response.json();
      if (data.success) {
        setCharities(data.data);
      }
    } catch (error) {
      console.error('Error loading charities:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/charity-campaigns?status=active&limit=6');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/charity-achievements', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserStats(data.data.user_stats);
        setAchievements(data.data.achievements);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`/api/charity-leaderboards/${selectedMonth}/${leaderboardType}`);
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handleDonation = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDonationModal(true);
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'heart': return <Heart className="w-6 h-6" />;
      case 'star': return <Star className="w-6 h-6" />;
      case 'crown': return <Crown className="w-6 h-6" />;
      case 'trophy': return <Trophy className="w-6 h-6" />;
      case 'handshake': return <HandHeart className="w-6 h-6" />;
      case 'bullhorn': return <Zap className="w-6 h-6" />;
      case 'shield': return <Shield className="w-6 h-6" />;
      case 'video': return <Play className="w-6 h-6" />;
      case 'tv': return <Play className="w-6 h-6" />;
      case 'broadcast': return <Users className="w-6 h-6" />;
      case 'mic': return <Zap className="w-6 h-6" />;
      case 'calendar': return <Calendar className="w-6 h-6" />;
      case 'calendar-check': return <Award className="w-6 h-6" />;
      default: return <Medal className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4 text-lg">Loading Charity Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Charity & Crowdfunding</h1>
                <p className="text-gray-300">Make a difference through streaming</p>
              </div>
            </div>
            
            {/* User Charity Stats */}
            {userStats && (
              <div className="flex items-center space-x-6 text-white">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">${userStats.total_charity_donated.toFixed(2)}</div>
                  <div className="text-sm text-gray-300">Total Donated</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{userStats.charity_badges_earned}</div>
                  <div className="text-sm text-gray-300">Badges Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">{userStats.charity_campaigns_supported}</div>
                  <div className="text-sm text-gray-300">Campaigns Supported</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
          {[
            { id: 'browse', label: 'Browse Campaigns', icon: <Globe className="w-5 h-5" /> },
            { id: 'my-contributions', label: 'My Contributions', icon: <Award className="w-5 h-5" /> },
            { id: 'stream', label: 'Charity Streaming', icon: <Play className="w-5 h-5" /> },
            { id: 'leaderboard', label: 'Leaderboards', icon: <Trophy className="w-5 h-5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'browse' && (
            <div className="space-y-8">
              {/* Featured Campaigns */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Target className="w-6 h-6 mr-2 text-yellow-400" />
                  Featured Campaigns
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <div className="flex items-start space-x-4">
                        <img 
                          src={campaign.logo_url || '/default-charity-logo.png'} 
                          alt={campaign.organization_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{campaign.campaign_name}</h3>
                          <p className="text-sm text-gray-300 mb-2">{campaign.organization_name}</p>
                          <p className="text-sm text-gray-400 line-clamp-2">{campaign.campaign_description}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-300 mb-2">
                          <span>${campaign.current_amount.toLocaleString()} raised</span>
                          <span>{campaign.days_remaining} days left</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(campaign.progress_percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {campaign.progress_percentage.toFixed(1)}% of ${campaign.goal_amount.toLocaleString()} goal
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDonation(campaign)}
                        className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Gift className="w-4 h-4" />
                        <span>Donate Now</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Charities */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-green-400" />
                  Verified Charities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {charities.map((charity) => (
                    <div key={charity.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <div className="flex items-start space-x-4">
                        <img 
                          src={charity.logo_url || '/default-charity-logo.png'} 
                          alt={charity.organization_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{charity.organization_name}</h3>
                          <p className="text-sm text-green-400 mb-2 capitalize">{charity.organization_type}</p>
                          <p className="text-sm text-gray-400 line-clamp-3">{charity.mission_statement}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {charity.focus_areas?.slice(0, 3).map((area) => (
                            <span key={area} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                              {area}
                            </span>
                          ))}
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">${charity.total_raised?.toLocaleString()}</div>
                          <div className="text-sm text-gray-300">Total Raised</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-contributions' && (
            <div className="space-y-8">
              {/* User Achievements */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Award className="w-6 h-6 mr-2 text-yellow-400" />
                  My Achievements & Badges
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 border ${
                      achievement.badge_earned ? 'border-yellow-400' : 'border-white/20'
                    }`}>
                      <div className="text-center">
                        <div 
                          className={`inline-flex p-4 rounded-full mb-4 ${
                            achievement.badge_earned 
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                              : 'bg-gray-600'
                          }`}
                          style={{ color: achievement.badge_earned ? achievement.badge_color : '#6B7280' }}
                        >
                          {getBadgeIcon(achievement.badge_icon)}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">{achievement.milestone_name}</h3>
                        <p className="text-sm text-gray-400 mb-4">{achievement.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Progress</span>
                            <span className="text-white">
                              {achievement.current_value.toFixed(2)} / {achievement.target_value.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                achievement.badge_earned 
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min((achievement.current_value / achievement.target_value) * 100, 100)}%` }}
                            />
                          </div>
                          
                          {achievement.badge_earned && achievement.completed_at && (
                            <div className="text-xs text-yellow-400">
                              Earned on {new Date(achievement.completed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Stats Summary */}
              {userStats && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h2 className="text-xl font-bold text-white mb-6">My Charity Impact</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">${userStats.total_charity_donated.toFixed(2)}</div>
                      <div className="text-sm text-gray-300">Total Donated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{userStats.charity_donations_made}</div>
                      <div className="text-sm text-gray-300">Donations Made</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{userStats.charity_campaigns_supported}</div>
                      <div className="text-sm text-gray-300">Campaigns Supported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">{userStats.charity_streams_hosted}</div>
                      <div className="text-sm text-gray-300">Charity Streams</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{userStats.charity_achievements_earned}</div>
                      <div className="text-sm text-gray-300">Achievements</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-400">{userStats.charity_badges_earned}</div>
                      <div className="text-sm text-gray-300">Badges Earned</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stream' && (
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Start a Charity Stream</h2>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Host a charity stream to support verified causes while engaging with your audience. 
                  Choose your charity percentage and make a real impact!
                </p>
                <button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200">
                  Schedule Charity Stream
                </button>
              </div>

              {/* Stream Revenue Sharing Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                  Charity Stream Revenue Sharing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-pink-400">20%</div>
                    <div className="text-sm text-gray-300">To Charity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">76.5%</div>
                    <div className="text-sm text-gray-300">To You (Streamer)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-400">2%</div>
                    <div className="text-sm text-gray-300">Platform Fee</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-400">1.5%</div>
                    <div className="text-sm text-gray-300">Admin/Moderator</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-8">
              {/* Leaderboard Controls */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                    Monthly Leaderboards
                  </h2>
                  
                  <div className="flex space-x-4">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="2025-11" className="text-black">November 2025</option>
                      <option value="2025-10" className="text-black">October 2025</option>
                      <option value="2025-09" className="text-black">September 2025</option>
                    </select>
                    
                    <select 
                      value={leaderboardType}
                      onChange={(e) => {
                        setLeaderboardType(e.target.value as any);
                        loadLeaderboard();
                      }}
                      className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="top_donors" className="text-black">Top Donors</option>
                      <option value="top_streamers" className="text-black">Top Streamers</option>
                      <option value="top_campaigns" className="text-black">Top Campaigns</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Leaderboard Content */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
                {leaderboardType === 'top_donors' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white p-6 border-b border-white/20">Top Donors</h3>
                    <div className="divide-y divide-white/20">
                      {leaderboard.map((entry, index) => (
                        <div key={entry.id || index} className="p-6 flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <img 
                            src={entry.avatar_url || '/default-avatar.png'} 
                            alt={entry.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{entry.username}</div>
                            <div className="text-sm text-gray-300">{entry.donation_count} donations</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-400">${(entry.total_donated || 0).toFixed(2)}</div>
                            <div className="text-sm text-gray-300">donated</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {leaderboardType === 'top_streamers' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white p-6 border-b border-white/20">Top Charity Streamers</h3>
                    <div className="divide-y divide-white/20">
                      {leaderboard.map((entry, index) => (
                        <div key={entry.id || index} className="p-6 flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <img 
                            src={entry.avatar_url || '/default-avatar.png'} 
                            alt={entry.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{entry.username}</div>
                            <div className="text-sm text-gray-300">{entry.streams_hosted} streams • {(entry.total_viewers || 0).toLocaleString()} total viewers</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-400">${(entry.total_raised || 0).toFixed(2)}</div>
                            <div className="text-sm text-gray-300">raised</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {leaderboardType === 'top_campaigns' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white p-6 border-b border-white/20">Top Campaigns</h3>
                    <div className="divide-y divide-white/20">
                      {leaderboard.map((entry, index) => (
                        <div key={entry.id || index} className="p-6 flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <img 
                            src={entry.logo_url || '/default-charity-logo.png'} 
                            alt={entry.organization_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{entry.campaign_name}</div>
                            <div className="text-sm text-gray-300">{entry.organization_name} • {entry.donation_count} donations</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-400">${(entry.current_amount || 0).toFixed(2)}</div>
                            <div className="text-sm text-gray-300">of ${(entry.goal_amount || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Donation Modal */}
      {showDonationModal && selectedCampaign && (
        <DonationModal 
          campaign={selectedCampaign}
          onClose={() => {
            setShowDonationModal(false);
            setSelectedCampaign(null);
          }}
          onDonate={async (donationData) => {
            try {
              const response = await fetch(`/api/charity-campaigns/${selectedCampaign.id}/donate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(donationData)
              });
              
              const result = await response.json();
              if (result.success) {
                alert('Donation successful! Thank you for your generosity.');
                setShowDonationModal(false);
                setSelectedCampaign(null);
                loadUserStats(); // Refresh user stats
              } else {
                alert('Donation failed: ' + result.error);
              }
            } catch (error) {
              console.error('Donation error:', error);
              alert('Donation failed. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
};

// Donation Modal Component
interface DonationModalProps {
  campaign: Campaign;
  onClose: () => void;
  onDonate: (data: { amount: number; tokens_used?: number; donation_message?: string; is_anonymous?: boolean }) => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ campaign, onClose, onDonate }) => {
  const [amount, setAmount] = useState(10);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [donationMessage, setDonationMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userTokens, setUserTokens] = useState(0);

  useEffect(() => {
    // Load user token balance
    const loadUserTokens = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
          setUserTokens(data.data.tokens);
        }
      } catch (error) {
        console.error('Error loading user tokens:', error);
      }
    };
    loadUserTokens();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 1) {
      alert('Minimum donation amount is $1.00');
      return;
    }
    if (tokensUsed > userTokens) {
      alert('Insufficient tokens');
      return;
    }
    onDonate({ amount, tokens_used: tokensUsed, donation_message: donationMessage, is_anonymous: isAnonymous });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Donate to Campaign</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">{campaign.campaign_name}</h3>
            <p className="text-sm text-gray-300">{campaign.organization_name}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Donation Amount ($)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Use Tokens (Available: {userTokens.toLocaleString()})
              </label>
              <input
                type="number"
                min="0"
                max={userTokens}
                value={tokensUsed}
                onChange={(e) => setTokensUsed(parseInt(e.target.value) || 0)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Message (Optional)</label>
              <textarea
                value={donationMessage}
                onChange={(e) => setDonationMessage(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-20 resize-none"
                placeholder="Share your motivation for this donation..."
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="anonymous" className="text-sm text-white">Make this donation anonymous</label>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Donate ${amount.toFixed(2)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CharityDashboard;