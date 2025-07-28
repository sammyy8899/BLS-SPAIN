import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemLogs = ({ websocket }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [selectedLevel]);

  useEffect(() => {
    if (websocket) {
      const handleMessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'log') {
            setLogs(prevLogs => [message.data, ...prevLogs]);
            
            // Auto scroll to top when new logs arrive
            if (autoScroll) {
              setTimeout(() => {
                const logsContainer = document.getElementById('logs-container');
                if (logsContainer) {
                  logsContainer.scrollTop = 0;
                }
              }, 100);
            }
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      websocket.addEventListener('message', handleMessage);
      
      return () => {
        websocket.removeEventListener('message', handleMessage);
      };
    }
  }, [websocket, autoScroll]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const levelParam = selectedLevel !== 'all' ? `&level=${selectedLevel}` : '';
      const response = await axios.get(`${API}/logs?limit=100${levelParam}`);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    if (window.confirm('Are you sure you want to clear the displayed logs? This will only clear the current view, not the database.')) {
      setLogs([]);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getStepColor = (step) => {
    switch (step) {
      case 'STEP1_LOGIN': return 'bg-blue-100 text-blue-800';
      case 'STEP2_CAPTCHA': return 'bg-purple-100 text-purple-800';
      case 'STEP3_CHECK': return 'bg-green-100 text-green-800';
      case 'STEP4_VISA': return 'bg-yellow-100 text-yellow-800';
      case 'STEP5_BOOKING': return 'bg-red-100 text-red-800';
      case 'SYSTEM_START': return 'bg-emerald-100 text-emerald-800';
      case 'SYSTEM_STOP': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Filter logs based on search term
  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.step && log.step.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const logLevels = [
    { value: 'all', label: 'All Levels', count: logs.length },
    { value: 'success', label: 'Success', count: logs.filter(l => l.level === 'success').length },
    { value: 'error', label: 'Errors', count: logs.filter(l => l.level === 'error').length },
    { value: 'warning', label: 'Warnings', count: logs.filter(l => l.level === 'warning').length },
    { value: 'info', label: 'Info', count: logs.filter(l => l.level === 'info').length }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">System Logs</h1>
            <p className="text-gray-600">
              Real-time system activity and debugging information.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${websocket ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {websocket ? 'Live Updates' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Level Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {logLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label} ({level.count})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Auto-scroll</span>
            </label>
            <button
              onClick={clearLogs}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear View
            </button>
          </div>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Activity Log ({filteredLogs.length} entries)
          </h2>
        </div>
        
        <div id="logs-container" className="max-h-96 overflow-y-auto">
          {isLoading && logs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading system logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Logs Found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No logs match your search criteria.' : 'No system logs available yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg mt-0.5">{getLogLevelIcon(log.level)}</span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLogLevelColor(log.level)} border`}>
                          {log.level.toUpperCase()}
                        </span>
                        
                        {log.step && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStepColor(log.step)}`}>
                            {log.step}
                          </span>
                        )}
                        
                        <span className="text-xs text-gray-500">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-1">{log.message}</p>
                      
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                            Show Details
                          </summary>
                          <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded border overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Log Steps Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">STEP1_LOGIN</span>
            <span className="text-gray-600">Initial email submission</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">STEP2_CAPTCHA</span>
            <span className="text-gray-600">Password & captcha handling</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">STEP3_CHECK</span>
            <span className="text-gray-600">Appointment availability check</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">STEP4_VISA</span>
            <span className="text-gray-600">Visa type selection</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">STEP5_BOOKING</span>
            <span className="text-gray-600">Appointment booking</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">GENERAL</span>
            <span className="text-gray-600">System operations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;