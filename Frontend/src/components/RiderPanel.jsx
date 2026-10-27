import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapPin, Navigation, Car, Bike, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, User, Star, Clock } from 'lucide-react';

export default function RiderPanel({ onCoordinatesChange, onOpenAuth }) {
  const { rider } = useAuth();
  const { socket, registerClient } = useSocket();

  const [pickup, setPickup] = useState('Connaught Place, New Delhi');
  const [destination, setDestination] = useState('India Gate, New Delhi');
  const [fares, setFares] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('car');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active Ride State
  const [activeRide, setActiveRide] = useState(null);
  const [rideStatus, setRideStatus] = useState('IDLE'); // IDLE, REQUESTED, ACCEPTED, IN_PROGRESS, COMPLETED
  const [assignedCaptain, setAssignedCaptain] = useState(null);

  // Register socket room when rider is logged in
  useEffect(() => {
    if (rider?.user?._id) {
      registerClient(rider.user._id, 'user');
    }
  }, [rider, socket]);

  // Listen for real-time ride updates from matching engine
  useEffect(() => {
    if (!socket) return;

    const handleRideAccepted = (data) => {
      console.log('[Rider WS] Ride accepted:', data);
      setRideStatus('ACCEPTED');
      setAssignedCaptain(data.captain);
      setActiveRide((prev) => ({
        ...(data.ride || {}),
        otp: data.ride?.otp || prev?.otp,
      }));
    };

    const handleRideStarted = (data) => {
      console.log('[Rider WS] Ride started:', data);
      setRideStatus('IN_PROGRESS');
      setActiveRide((prev) => ({
        ...(data.ride || {}),
        otp: data.ride?.otp || prev?.otp,
      }));
    };

    const handleRideEnded = (data) => {
      console.log('[Rider WS] Ride ended:', data);
      setRideStatus('COMPLETED');
      setActiveRide((prev) => ({
        ...(data.ride || {}),
        otp: data.ride?.otp || prev?.otp,
      }));
    };

    const handleNoCaptains = (data) => {
      console.log('[Rider WS] No captains found:', data);
      setError(data.message || 'All nearby drivers were busy or did not respond.');
      setRideStatus('IDLE');
    };

    socket.on('ride-accepted', handleRideAccepted);
    socket.on('ride-started', handleRideStarted);
    socket.on('ride-ended', handleRideEnded);
    socket.on('no-captains-found', handleNoCaptains);

    return () => {
      socket.off('ride-accepted', handleRideAccepted);
      socket.off('ride-started', handleRideStarted);
      socket.off('ride-ended', handleRideEnded);
      socket.off('no-captains-found', handleNoCaptains);
    };
  }, [socket]);

  // Calculate dynamic fare quotes
  const handleGetFares = async () => {
    if (!rider?.token) {
      onOpenAuth('rider');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:4000/rides/get-fare', {
        params: { pickup, destination },
        headers: { Authorization: `Bearer ${rider.token}` },
      });

      setFares(res.data.fare);
      setDistanceInfo({
        distance: res.data.distance,
        duration: res.data.duration,
      });

      if (onCoordinatesChange) {
        onCoordinatesChange({
          pickup: [28.6315, 77.2167],
          destination: [28.6129, 77.2295],
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to calculate fares');
    } finally {
      setLoading(false);
    }
  };

  // Create & Dispatch Ride
  const handleBookRide = async () => {
    if (!rider?.token) {
      onOpenAuth('rider');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(
        'http://localhost:4000/rides/create',
        { pickup, destination, vehicleType: selectedVehicle },
        { headers: { Authorization: `Bearer ${rider.token}` } }
      );

      setActiveRide(res.data);
      setRideStatus('REQUESTED');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveRide(null);
    setRideStatus('IDLE');
    setAssignedCaptain(null);
    setError(null);
    setFares(null);
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-zinc-100 leading-tight">Rider Experience</h2>
            <p className="text-[11px] text-zinc-400">
              {rider ? `${rider.user?.fullname?.firstname} ${rider.user?.fullname?.lastname || ''}` : 'Not Signed In'}
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
            rideStatus === 'IDLE'
              ? 'bg-dark-800 text-zinc-400'
              : rideStatus === 'REQUESTED'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
              : rideStatus === 'ACCEPTED'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : rideStatus === 'IN_PROGRESS'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
          }`}
        >
          {rideStatus}
        </span>
      </div>

      {/* Auth Guard Banner */}
      {!rider && (
        <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl text-xs flex items-center justify-between">
          <span className="text-zinc-400">Sign in to book a ride</span>
          <button
            onClick={() => onOpenAuth('rider')}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition"
          >
            Sign In
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking Form (when IDLE) */}
      {rideStatus === 'IDLE' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Pickup Location
            </label>
            <input
              type="text"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
              placeholder="Enter pickup address"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
              <Navigation className="w-3.5 h-3.5 text-rose-400" /> Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
              placeholder="Enter destination"
            />
          </div>

          <button
            onClick={handleGetFares}
            disabled={loading}
            className="w-full py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            {loading ? 'Routing Roads...' : 'Calculate Fares & Routes'}
          </button>

          {/* Luxury Fare Cards */}
          {fares && (
            <div className="mt-4 space-y-2.5 animate-in fade-in">
              <div className="flex justify-between items-center text-xs text-zinc-400 px-1">
                <span>Distance: <strong className="text-zinc-200">{distanceInfo?.distance?.text}</strong></span>
                <span>ETA: <strong className="text-zinc-200">{distanceInfo?.duration?.text}</strong></span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Auto */}
                <button
                  type="button"
                  onClick={() => setSelectedVehicle('auto')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedVehicle === 'auto'
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                      : 'border-dark-800 bg-dark-950 hover:border-dark-700'
                  }`}
                >
                  <Car className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[11px] text-zinc-300 font-bold">UberAuto</span>
                  <span className="text-sm font-extrabold text-white">₹{fares.auto}</span>
                </button>

                {/* Car */}
                <button
                  type="button"
                  onClick={() => setSelectedVehicle('car')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedVehicle === 'car'
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                      : 'border-dark-800 bg-dark-950 hover:border-dark-700'
                  }`}
                >
                  <Car className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-[11px] text-zinc-300 font-bold">UberGo</span>
                  <span className="text-sm font-extrabold text-white">₹{fares.car}</span>
                </button>

                {/* Moto */}
                <button
                  type="button"
                  onClick={() => setSelectedVehicle('moto')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedVehicle === 'moto'
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                      : 'border-dark-800 bg-dark-950 hover:border-dark-700'
                  }`}
                >
                  <Bike className="w-4 h-4 text-zinc-300 mb-1" />
                  <span className="text-[11px] text-zinc-300 font-bold">UberMoto</span>
                  <span className="text-sm font-extrabold text-white">₹{fares.moto}</span>
                </button>
              </div>

              <button
                onClick={handleBookRide}
                disabled={loading}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold py-3 rounded-xl text-xs tracking-wider uppercase shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Dispatching...' : `Confirm & Request ${selectedVehicle.toUpperCase()}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Searching State Radar */}
      {rideStatus === 'REQUESTED' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 animate-ping opacity-75"></div>
              <div className="w-12 h-12 rounded-full bg-dark-950 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                <Car className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Cascading Matching Engine Active</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Offering your trip to candidate captains in a 15-second sequential window...
              </p>
            </div>
          </div>

          {/* OTP Security Passcard shown immediately upon booking */}
          {activeRide?.otp && (
            <div className="p-4 bg-dark-950 border border-amber-500/40 rounded-2xl shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Your Boarding OTP Passcode
                </span>
                <div className="flex gap-2">
                  {String(activeRide.otp).split('').map((digit, i) => (
                    <div
                      key={i}
                      className="w-9 h-11 bg-dark-900 border border-amber-500/60 rounded-lg flex items-center justify-center text-lg font-mono font-black text-amber-400 shadow-inner"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  Share this 4-digit code with the captain once accepted
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">Fare</span>
                <span className="text-xl font-black text-zinc-100">₹{activeRide?.fare}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RIDE ACCEPTED & IN PROGRESS */}
      {(rideStatus === 'ACCEPTED' || rideStatus === 'IN_PROGRESS' || rideStatus === 'COMPLETED') && (
        <div className="space-y-4 animate-in fade-in">
          {/* OTP Security Passcard */}
          {activeRide?.otp && rideStatus !== 'COMPLETED' && (
            <div className="p-4 bg-dark-950 border border-emerald-500/40 rounded-2xl shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                  Ride Verification Passcode
                </span>
                <div className="flex gap-2">
                  {String(activeRide.otp).split('').map((digit, i) => (
                    <div
                      key={i}
                      className="w-9 h-11 bg-dark-900 border border-emerald-500/50 rounded-lg flex items-center justify-center text-lg font-mono font-black text-emerald-400 shadow-inner"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Share with driver upon boarding
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">Fare</span>
                <span className="text-xl font-black text-zinc-100">₹{activeRide?.fare}</span>
              </div>
            </div>
          )}

          {/* Assigned Driver Profile Card */}
          {assignedCaptain && (
            <div className="p-3.5 bg-dark-950 border border-dark-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-sm font-bold text-zinc-200">
                    {assignedCaptain.fullname?.firstname?.[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      {assignedCaptain.fullname?.firstname} {assignedCaptain.fullname?.lastname}
                      <span className="flex items-center text-[10px] text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.9
                      </span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {assignedCaptain.vehicle?.color} {assignedCaptain.vehicle?.vehicleType}
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-dark-900 border border-dark-700 rounded-md font-mono text-xs font-bold text-zinc-200">
                  {assignedCaptain.vehicle?.plate}
                </div>
              </div>
            </div>
          )}

          {/* Trip Completed Receipt */}
          {rideStatus === 'COMPLETED' && (
            <div className="p-5 bg-dark-950 border border-emerald-900/60 rounded-2xl text-center space-y-2.5 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-100">Trip Completed</h4>
              <p className="text-xs text-zinc-400">Payment settled. Digital receipt generated.</p>
              <button
                onClick={handleReset}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-2.5 rounded-xl text-xs transition"
              >
                Book Another Trip
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
