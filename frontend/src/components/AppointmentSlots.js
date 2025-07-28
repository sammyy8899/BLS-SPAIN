import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AppointmentSlots = ({ onStatusUpdate }) => {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/appointments/available`);
      setSlots(response.data.slots);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSlot = (slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
    setBookingConfirmed(false);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !bookingConfirmed) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`${API}/appointments/book`, {
        slot_id: selectedSlot.id,
        confirm_booking: true
      });

      if (response.status === 200) {
        alert(`🎉 Appointment booked successfully!\n\nConfirmation ID: ${response.data.confirmation_id}\n\nPlease check your email for details.`);
        setShowBookingModal(false);
        fetchSlots();
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('❌ Booking failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === 'TBD') return 'To be determined';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return '✅';
      case 'booked': return '📅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Slots</h1>
            <p className="text-gray-600">
              Available visa appointment slots found by the BLS2 system.
            </p>
          </div>
          <button
            onClick={fetchSlots}
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

      {/* Slots List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Available Slots ({slots.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading && slots.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading appointment slots...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Slots Available</h3>
              <p className="text-gray-600 mb-4">
                No appointment slots have been discovered yet. The system will notify you when slots become available.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> Make sure the system is running in the Controls section to automatically find new slots.
                </p>
              </div>
            </div>
          ) : (
            slots.map((slot, index) => (
              <div key={slot.id || index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xl">{getStatusIcon(slot.status)}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {slot.visa_type || 'Spain Visa'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(slot.status)}`}>
                        {slot.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium text-gray-700">📅 Date & Time</p>
                        <p>{slot.appointment_date || 'TBD'}</p>
                        <p>{slot.appointment_time || 'TBD'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">🏷️ Details</p>
                        <p>{slot.visa_category || 'General'}</p>
                        <p>{slot.location || 'Algeria'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">🕒 Found</p>
                        <p>{formatDateTime(slot.found_at)}</p>
                        <p>{slot.available_slots || 1} slot(s) available</p>
                      </div>
                    </div>

                    {slot.booking_details && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 font-medium">
                          ✅ Booked - Confirmation: {slot.booking_details.confirmation_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {slot.status === 'available' && (
                    <div className="ml-6">
                      <button
                        onClick={() => handleBookSlot(slot)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <span>📝</span>
                        <span>Book Now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Booking</h3>
            
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700">Appointment Details:</p>
                <p className="text-sm text-gray-600">{selectedSlot.visa_type}</p>
                <p className="text-sm text-gray-600">{selectedSlot.appointment_date} at {selectedSlot.appointment_time}</p>
                <p className="text-sm text-gray-600">{selectedSlot.location}</p>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Important:</strong> This will attempt to book the appointment using your BLS account credentials.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={bookingConfirmed}
                  onChange={(e) => setBookingConfirmed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I understand and want to proceed with booking this appointment
                </span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmBooking}
                disabled={!bookingConfirmed || isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 How It Works</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>• The system automatically checks for available appointment slots</li>
          <li>• When slots are found, they appear here and you'll receive an email notification</li>
          <li>• Click "Book Now" to automatically book an available slot</li>
          <li>• You'll receive confirmation details via email after successful booking</li>
          <li>• All appointment activity is logged for your reference</li>
        </ul>
      </div>
    </div>
  );
};

export default AppointmentSlots;