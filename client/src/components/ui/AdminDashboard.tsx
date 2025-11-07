import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Ban, 
  Settings, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Lock, 
  Eye, 
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_verified: boolean;
  registration_date: string;
  last_seen: string;
  status: string;
  total_streaming_time: number;
  is_banned: boolean;
  ban_reason?: string;
  ban_until?: string;
  premium_until?: string;
}

interface AdminAnalytics {
  total_users: number;
  active_users: number;
  banned_users: number;
  new_registrations: number;
  total_streaming_time: number;
  total_tips: number;
  platform_revenue: number;
  average_session_time: number;
}

interface SystemLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
  user_info?: {
    username: string;
    email: string;
  };
}

interface AdminDashboardProps {
  adminId: string;
  permissions: string[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminId,
  permissions
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'settings'>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned' | 'new'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'logs', name: 'Logs', icon: Activity },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  useEffect(() => {
    loadAnalytics();
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'logs') {
      loadSystemLogs();
    }
  }, [activeTab, searchTerm, filterStatus]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        status: filterStatus,
        page: '1',
        limit: '50'
      });
      
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        severity: 'all'
      });
      
      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load system logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const banUser = async (userId: string, reason: string, duration?: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason,
          duration,
          admin_id: adminId
        })
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, is_banned: true, ban_reason: reason }
            : user
        ));
        setShowUserModal(false);
        
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'User banned successfully';
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          admin_id: adminId
        })
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, is_banned: false, ban_reason: undefined, ban_until: undefined }
            : user
        ));
        setShowUserModal(false);
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  const exportData = async (type: 'users' | 'logs') => {
    try {
      const response = await fetch(`/api/admin/export/${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-900 bg-opacity-20';
      case 'error': return 'text-red-400 bg-red-900 bg-opacity-10';
      case 'warning': return 'text-yellow-400 bg-yellow-900 bg-opacity-10';
      case 'info': return 'text-blue-400 bg-blue-900 bg-opacity-10';
      default: return 'text-gray-400 bg-gray-900 bg-opacity-10';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 bg-opacity-20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{analytics.total_users}</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{analytics.active_users}</div>
                <div className="text-sm text-gray-400">Active Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 bg-opacity-20 rounded-lg">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{analytics.banned_users}</div>
                <div className="text-sm text-gray-400">Banned Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 bg-opacity-20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{analytics.new_registrations}</div>
                <div className="text-sm text-gray-400">New Today</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Metrics */}
      {analytics && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400">Total Streaming Time</div>
              <div className="text-2xl font-bold text-white">
                {Math.floor(analytics.total_streaming_time / 60)} hours
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Tips</div>
              <div className="text-2xl font-bold text-green-400">
                ${analytics.total_tips.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Platform Revenue</div>
              <div className="text-2xl font-bold text-blue-400">
                ${analytics.platform_revenue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Recent Alerts
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-yellow-900 bg-opacity-20 border border-yellow-600 border-opacity-30 rounded-lg">
            <div className="text-sm text-yellow-400">High API usage detected</div>
            <div className="text-xs text-gray-400">2 minutes ago</div>
          </div>
          <div className="p-3 bg-red-900 bg-opacity-20 border border-red-600 border-opacity-30 rounded-lg">
            <div className="text-sm text-red-400">Spam attack detected from IP 192.168.1.100</div>
            <div className="text-xs text-gray-400">15 minutes ago</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
        >
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="new">New</option>
        </select>
        <button
          onClick={() => exportData('users')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Streaming Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <span className="px-2 py-1 bg-red-900 text-red-400 rounded text-xs">Banned</span>
                    ) : user.is_verified ? (
                      <span className="px-2 py-1 bg-green-900 text-green-400 rounded text-xs">Verified</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">Regular</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {Math.floor(user.total_streaming_time / 60)}h {user.total_streaming_time % 60}m
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatDate(user.registration_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {user.is_banned ? (
                        <button
                          onClick={() => unbanUser(user.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Ban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-4">
      {/* Log Filters */}
      <div className="flex gap-4">
        <button
          onClick={() => exportData('logs')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export Logs
        </button>
        <button
          onClick={loadSystemLogs}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Refresh
        </button>
      </div>

      {/* Logs List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {systemLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700">
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {log.user_info?.username || 'System'}
                  </td>
                  <td className="px-4 py-3 text-white text-sm">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Platform administration and monitoring</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            System Online
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-[600px]"
          >
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'settings' && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Admin Settings</h3>
                <p className="text-gray-400">Settings panel coming soon...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* User Detail Modal */}
        <AnimatePresence>
          {showUserModal && selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-900 rounded-lg p-6 w-full max-w-lg"
              >
                <h3 className="text-lg font-semibold text-white mb-4">User Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400">Username</div>
                    <div className="text-white font-medium">{selectedUser.username}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <div className="text-white">{selectedUser.email}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400">Status</div>
                    <div className="flex gap-2 mt-1">
                      {selectedUser.is_verified && (
                        <span className="px-2 py-1 bg-green-900 text-green-400 rounded text-xs">Verified</span>
                      )}
                      {selectedUser.is_banned ? (
                        <span className="px-2 py-1 bg-red-900 text-red-400 rounded text-xs">Banned</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-900 text-blue-400 rounded text-xs">Active</span>
                      )}
                    </div>
                  </div>
                  
                  {selectedUser.is_banned && (
                    <div>
                      <div className="text-sm text-gray-400">Ban Reason</div>
                      <div className="text-white">{selectedUser.ban_reason}</div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-sm text-gray-400">Streaming Time</div>
                    <div className="text-white">
                      {Math.floor(selectedUser.total_streaming_time / 60)}h {selectedUser.total_streaming_time % 60}m
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {!selectedUser.is_banned ? (
                    <button
                      onClick={() => {
                        const reason = prompt('Ban reason:');
                        if (reason) {
                          banUser(selectedUser.id, reason);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Ban User
                    </button>
                  ) : (
                    <button
                      onClick={() => unbanUser(selectedUser.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Unban User
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;