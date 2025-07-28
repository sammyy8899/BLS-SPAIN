import React, { useState, useEffect } from 'react';
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

// Components
import Dashboard from './components/Dashboard';
import SystemControls from './components/SystemControls';
import AppointmentSlots from './components/AppointmentSlots';
import SystemLogs from './components/SystemLogs';
import Header from './components/Header';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [systemStatus, setSystemStatus] = useState({
    status: 'stopped',
    last_check: null,
    total_checks: 0,
    slots_found: 0,
    successful_bookings: 0,
    error_count: 0,
    uptime_minutes: 0
  });
  const [websocket, setWebsocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setWebsocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setWebsocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [BACKEND_URL]);

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'log':
        // Handle new log entries
        console.log('New log:', message.data);
        break;
      case 'slots_found':
        // Handle new slots found
        console.log('New slots found:', message.data);
        fetchSystemStatus(); // Refresh status
        break;
      case 'system_status':
        // Handle system status updates
        setSystemStatus(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get(`${API}/system/status`);
      setSystemStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  // Fetch initial system status
  useEffect(() => {
    fetchSystemStatus();
    
    // Set up periodic status updates
    const interval = setInterval(fetchSystemStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <BrowserRouter>
        <Header 
          systemStatus={systemStatus} 
          isConnected={isConnected}
        />
        
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                systemStatus={systemStatus}
                onStatusUpdate={fetchSystemStatus}
                websocket={websocket}
              />
            } />
            <Route path="/controls" element={
              <SystemControls 
                systemStatus={systemStatus}
                onStatusUpdate={fetchSystemStatus}
              />
            } />
            <Route path="/appointments" element={
              <AppointmentSlots 
                onStatusUpdate={fetchSystemStatus}
              />
            } />
            <Route path="/logs" element={
              <SystemLogs websocket={websocket} />
            } />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;