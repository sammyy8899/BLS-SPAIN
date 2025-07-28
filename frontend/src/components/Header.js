import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ systemStatus, isConnected }) => {
  const location = useLocation();

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'paused': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🟢';
      case 'paused': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B2</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">BLS2 Automation</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/controls" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/controls') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Controls
            </Link>
            <Link 
              to="/appointments" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/appointments') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Appointments
            </Link>
            <Link 
              to="/logs" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/logs') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Logs
            </Link>
          </nav>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            {/* WebSocket Connection Status */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* System Status */}
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
              <span>{getStatusIcon(systemStatus.status)}</span>
              <span className={`text-sm font-medium capitalize ${getStatusColor(systemStatus.status)}`}>
                {systemStatus.status}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <span className="font-medium text-blue-600">{systemStatus.slots_found}</span>
                <span>slots found</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="font-medium text-green-600">{systemStatus.successful_bookings}</span>
                <span>booked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;