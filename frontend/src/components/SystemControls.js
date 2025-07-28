import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemControls = ({ systemStatus, onStatusUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkInterval, setCheckInterval] = useState(2);
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const startSystem = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/system/start`, {
        check_interval_minutes: checkInterval
      });
      
      if (response.status === 200) {
        alert('System started successfully! 🚀');
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Failed to start system:', error);
      alert('Failed to start system: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const stopSystem = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/system/stop`);
      
      if (response.status === 200) {
        alert('System stopped successfully! 🛑');
        onStatusUpdate();
        setShowConfirmStop(false);
      }
    } catch (error) {
      console.error('Failed to stop system:', error);
      alert('Failed to stop system: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const runTestCheck = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/test/check-once`);
      
      if (response.data.success) {
        alert(`✅ Test completed successfully!\n\nResults:\n• Slots found: ${response.data.slots_found}\n• Check the Appointments tab for details.`);
        onStatusUpdate();
      } else {
        alert('❌ Test check failed. Please check the logs for more details.');
      }
    } catch (error) {
      console.error('Test check failed:', error);
      alert('❌ Test check failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const isSystemRunning = systemStatus.status === 'running';
  const isSystemStopped = systemStatus.status === 'stopped';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">System Controls</h1>
        <p className="text-gray-600">
          Manage the BLS2 automation system. Start or stop the monitoring process and run test checks.
        </p>
      </div>

      {/* System Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Current Status</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${
                  isSystemRunning ? 'bg-green-500' : 
                  systemStatus.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-lg font-semibold capitalize">
                  {systemStatus.status}
                </span>
              </div>
              
              {systemStatus.uptime_minutes && isSystemRunning && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  Running for {systemStatus.uptime_minutes} minutes
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Last Check</p>
              <p className="font-medium">
                {systemStatus.last_check 
                  ? new Date(systemStatus.last_check).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Control Panel</h2>
        </div>
        <div className="p-6 space-y-6">
          
          {/* Start System Section */}
          {isSystemStopped && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Start System</h3>
              <p className="text-green-800 mb-4">
                Begin continuous monitoring for visa appointment slots.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    Check Interval (minutes)
                  </label>
                  <select
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(parseInt(e.target.value))}
                    className="w-32 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isLoading}
                  >
                    <option value={1}>1 minute</option>
                    <option value={2}>2 minutes</option>
                    <option value={3}>3 minutes</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                  </select>
                  <p className="text-xs text-green-700 mt-1">
                    How often to check for new appointment slots
                  </p>
                </div>

                <button
                  onClick={startSystem}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Start System</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Stop System Section */}
          {isSystemRunning && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-3">Stop System</h3>
              <p className="text-red-800 mb-4">
                Stop the continuous monitoring process.
              </p>
              
              {!showConfirmStop ? (
                <button
                  onClick={() => setShowConfirmStop(true)}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <span>🛑</span>
                  <span>Stop System</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-red-900 font-medium">Are you sure you want to stop the system?</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={stopSystem}
                      disabled={isLoading}
                      className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Stopping...' : 'Yes, Stop'}
                    </button>
                    <button
                      onClick={() => setShowConfirmStop(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Check Section */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Test Check</h3>
            <p className="text-blue-800 mb-4">
              Run a single appointment check to test the system without starting continuous monitoring.
            </p>
            
            <button
              onClick={runTestCheck}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <span>🧪</span>
                  <span>Run Test Check</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">System Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">BLS Website:</p>
            <p className="text-gray-600">algeria.blsspainglobal.com</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Account Email:</p>
            <p className="text-gray-600">nomadsam6@gmail.com</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Notification Email:</p>
            <p className="text-gray-600">nomadsam6@gmail.com</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">OCR API:</p>
            <p className="text-gray-600">Configured ✅</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ Important Notes</h3>
        <ul className="space-y-2 text-yellow-800 text-sm">
          <li>• The system will continuously check for appointments at the specified interval</li>
          <li>• You will receive email notifications when slots are found or bookings are successful</li>
          <li>• Use the Test Check first to ensure everything is working properly</li>
          <li>• The system handles captchas automatically using the OCR service</li>
          <li>• All activity is logged and can be viewed in the Logs section</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemControls;