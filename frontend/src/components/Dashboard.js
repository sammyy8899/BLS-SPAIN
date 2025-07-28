import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ systemStatus, onStatusUpdate, websocket }) => {
  const [recentLogs, setRecentLogs] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRecentData();
  }, []);

  const fetchRecentData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent logs
      const logsResponse = await axios.get(`${API}/logs?limit=10`);
      setRecentLogs(logsResponse.data.logs);

      // Fetch available slots
      const slotsResponse = await axios.get(`${API}/appointments/available?limit=5`);
      setAvailableSlots(slotsResponse.data.slots);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runTestCheck = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/test/check-once`);
      
      if (response.data.success) {
        alert(`Test completed! Found ${response.data.slots_found} slots.`);
        await fetchRecentData();
        onStatusUpdate();
      } else {
        alert('Test check failed. Check logs for details.');
      }
    } catch (error) {
      console.error('Test check failed:', error);
      alert('Test check failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to BLS2</h1>
        <p className="text-blue-100 mb-4">
          Automated Visa Appointment System for BLS Spain Algeria
        </p>
        <div className="flex items-center space-x-4">
          <button
            onClick={runTestCheck}
            disabled={isLoading}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Running...' : 'Test Check'}
          </button>
          <span className="text-blue-100 text-sm">
            Run a single appointment check to test the system
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Checks</p>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_checks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Slots Found</p>
              <p className="text-3xl font-bold text-blue-600">{systemStatus.slots_found}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Successful Bookings</p>
              <p className="text-3xl font-bold text-green-600">{systemStatus.successful_bookings}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Errors</p>
              <p className="text-3xl font-bold text-red-600">{systemStatus.error_count}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Current Status</p>
              <p className="text-lg font-semibold capitalize text-gray-900">
                {systemStatus.status}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Last Check</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDateTime(systemStatus.last_check)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Uptime</p>
              <p className="text-lg font-semibold text-gray-900">
                {systemStatus.uptime_minutes ? `${systemStatus.uptime_minutes} minutes` : 'Not running'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.slice(0, 5).map((log, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-lg">{getLogLevelIcon(log.level)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{log.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(log.timestamp)} • {log.step || 'General'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Available Slots */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Available Slots</h2>
          </div>
          <div className="p-6">
            {availableSlots.length > 0 ? (
              <div className="space-y-3">
                {availableSlots.map((slot, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{slot.visa_type}</p>
                        <p className="text-sm text-gray-600">
                          {slot.appointment_date} at {slot.appointment_time}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Available
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No slots found yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 Getting Started</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• <strong>Start the system:</strong> Go to Controls → Start System to begin monitoring</li>
          <li>• <strong>Monitor progress:</strong> Watch the dashboard for real-time updates</li>
          <li>• <strong>Check appointments:</strong> Available slots will appear in the Appointments tab</li>
          <li>• <strong>Review logs:</strong> Check the Logs tab for detailed system activity</li>
          <li>• <strong>Receive emails:</strong> You'll get notified when slots are found or bookings are successful</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;