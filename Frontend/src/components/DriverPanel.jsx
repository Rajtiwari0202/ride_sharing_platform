import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Power, Car, Clock, Navigation, CheckCircle, XCircle, Play, CheckCheck, AlertCircle, MapPin, Radio, Shield } from 'lucide-react';

export default function DriverPanel({ onDriverLocationChange, onOpenAuth }) {
  const { captain } = useAuth();
  const { socket, registerClient } = useSocket();

  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Captain GPS Location state
  const [latitude, setLatitude] = useState(28.6129); // India Gate
  const [longitude, setLongitude] = useState(77.2295);

  // Incoming 15-Second Cascading Offer
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [countdown, setCountdown] = useState(15);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripStatus, setTripStatus] = useState('IDLE'); // IDLE, ACCEPTED, IN_PROGRESS, COMPLETED
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);

  // 4-Digit OTP inputs
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const otpInputsRef = useRef([]);

  // Register socket room
  useEffect(() => {
    if (captain?.captain?._id) {
      registerClient(captain.captain._id, 'captain');
    }
  }, [captain, socket]);

  // Listen for real-time dispatch events
  useEffect(() => {
    if (!socket) return;

    const handleNewOffer = (offer) => {
      console.log('[Captain WS] Ride offer received:', offer);
      setIncomingOffer(offer);
      setCountdown(offer.timeoutSeconds || 15);
    };

    const handleOfferExpired = () => {
      console.log('[Captain WS] Offer expired');
      setIncomingOffer(null);
    };

    const handleOfferCancelled = () => {
      console.log('[Captain WS] Offer cancelled');
      setIncomingOffer(null);
    };

    socket.on('new-ride-offer', handleNewOffer);
    socket.on('offer-expired', handleOfferExpired);
    socket.on('offer-cancelled', handleOfferCancelled);

    return () => {
      socket.off('new-ride-offer', handleNewOffer);
      socket.off('offer-expired', handleOfferExpired);
      socket.off('offer-cancelled', handleOfferCancelled);
    };
  }, [socket]);

  // 15-Second Countdown Timer
  useEffect(() => {
    if (!incomingOffer) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIncomingOffer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingOffer]);

  // Toggle Online/Offline Status
  const handleToggleStatus = async () => {
    if (!captain?.token) {
      onOpenAuth('captain');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newStatus = isOnline ? 'inactive' : 'active';
      await axios.patch(
        'http://localhost:4000/captains/status',
        { status: newStatus },
        { headers: { Authorization: `Bearer ${captain.token}` } }
      );
      setIsOnline(!isOnline);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Push Location Update to MongoDB 2dsphere
  const handleUpdateLocation = async (newLat, newLng) => {
    if (!captain?.token) return;

    const latVal = newLat !== undefined ? newLat : latitude;
    const lngVal = newLng !== undefined ? newLng : longitude;

    try {
      setLoading(true);
      setError(null);
      await axios.patch(
        'http://localhost:4000/captains/location',
        { latitude: latVal, longitude: lngVal },
        { headers: { Authorization: `Bearer ${captain.token}` } }
      );

      setLatitude(latVal);
      setLongitude(lngVal);
      if (onDriverLocationChange) {
        onDriverLocationChange([latVal, lngVal]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Accept Dispatched Offer
  const handleAcceptOffer = async () => {
    if (!captain?.token) return;

    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(
        'http://localhost:4000/rides/confirm',
        { rideId: incomingOffer.rideId },
        { headers: { Authorization: `Bearer ${captain.token}` } }
      );

      setActiveTrip(res.data);
      setTripStatus('ACCEPTED');
      setIncomingOffer(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept ride. It may have expired or been taken.');
    } finally {
      setLoading(false);
    }
  };

  // Decline Dispatched Offer (triggers instant cascade to next captain)
  const handleRejectOffer = async () => {
    if (!captain?.token) return;

    try {
      setLoading(true);
      await axios.post(
        'http://localhost:4000/rides/reject',
        { rideId: incomingOffer.rideId },
        { headers: { Authorization: `Bearer ${captain.token}` } }
      );
      setIncomingOffer(null);
    } catch (err) {
      console.error(err);
      setIncomingOffer(null);
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Handler (Auto-focus to next box)
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 3) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Start Ride with Passenger's 4-digit OTP
  const handleStartRide = async () => {
    if (!captain?.token) return;

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 4) {
      setError('Please enter all 4 digits of the passenger OTP');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(
        'http://localhost:4000/rides/start-ride',
        { rideId: activeTrip._id, otp: fullOtp },
        { headers: { Authorization: `Bearer ${captain.token}` } }
      );

      setActiveTrip(res.data);
      setTripStatus('IN_PROGRESS');
      setOtpDigits(['', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid passenger OTP. Please re-verify.');
    } finally {
      setLoading(false);
    }
  };

  // End Trip & Collect Payment
  const handleEndRide = async () => {
    if (!captain?.token) return;

    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(
        'http://localhost:4000/rides/end-ride',
        { rideId: activeTrip._id },
        { headers: { Authorization: `Bearer ${captain.token}` } }
      );

      setActiveTrip(res.data);
      setTripStatus('COMPLETED');
      setIsSimulatingDrive(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete trip.');
    } finally {
      setLoading(false);
    }
  };

  // GPS Drive Simulation
  const handleSimulateGPS = () => {
    if (isSimulatingDrive) return;
    setIsSimulatingDrive(true);

    const waypoints = [
      [28.6129, 77.2295],
      [28.6180, 77.2260],
      [28.6230, 77.2220],
      [28.6280, 77.2185],
      [28.6315, 77.2167],
    ];

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < waypoints.length) {
        const nextCoord = waypoints[step];
        setLatitude(nextCoord[0]);
        setLongitude(nextCoord[1]);
        if (onDriverLocationChange) {
          onDriverLocationChange(nextCoord);
        }
      } else {
        clearInterval(interval);
        setIsSimulatingDrive(false);
      }
    }, 2000);
  };

  const handleResetTrip = () => {
    setActiveTrip(null);
    setTripStatus('IDLE');
    setError(null);
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-zinc-100 leading-tight">Captain Dashboard</h2>
            <p className="text-[11px] text-zinc-400">
              {captain?.captain
                ? `${captain.captain.fullname?.firstname} (${captain.captain.vehicle?.vehicleType?.toUpperCase()})`
                : 'Not Signed In'}
            </p>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <button
          onClick={handleToggleStatus}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Auth Guard Banner */}
      {!captain && (
        <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl text-xs flex items-center justify-between">
          <span className="text-zinc-400">Sign in to go online as Captain</span>
          <button
            onClick={() => onOpenAuth('captain')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs rounded-lg transition"
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

      {/* Location Updater Console */}
      <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" /> GPS Coordinate Ingestion
          </span>
          <span className="font-mono text-[10px] text-zinc-400">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        </div>

        {/* Location presets */}
        <div className="flex gap-1.5">
          <button
            onClick={() => handleUpdateLocation(28.6129, 77.2295)}
            className="flex-1 py-1 px-2 bg-dark-850 hover:bg-dark-800 border border-dark-700 rounded-lg text-[10px] font-semibold text-zinc-300"
          >
            India Gate (Near)
          </button>
          <button
            onClick={() => handleUpdateLocation(28.6315, 77.2167)}
            className="flex-1 py-1 px-2 bg-dark-850 hover:bg-dark-800 border border-dark-700 rounded-lg text-[10px] font-semibold text-zinc-300"
          >
            Connaught Place
          </button>
          <button
            onClick={() => handleUpdateLocation(28.4950, 77.0895)}
            className="flex-1 py-1 px-2 bg-dark-850 hover:bg-dark-800 border border-dark-700 rounded-lg text-[10px] font-semibold text-zinc-300"
          >
            Gurugram (Far)
          </button>
        </div>

        <button
          onClick={() => handleUpdateLocation()}
          disabled={loading}
          className="w-full py-1.5 bg-dark-800 hover:bg-dark-700 text-zinc-200 rounded-lg font-bold text-[11px] border border-dark-700 transition"
        >
          Broadcast GPS Ping to MongoDB 2dsphere
        </button>
      </div>

      {/* Standby State */}
      {tripStatus === 'IDLE' && !incomingOffer && (
        <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-dark-950 border border-dark-800 flex items-center justify-center text-zinc-400">
            <Car className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-xs font-semibold text-zinc-200">
            {isOnline ? 'Standby: Listening for Dispatched Offers' : 'You are currently offline'}
          </p>
          <p className="text-[11px] text-zinc-500 max-w-xs">
            {isOnline ? 'When a rider requests a trip within 5km, you will receive a 15-second cascading offer.' : 'Switch to online status to start earning.'}
          </p>
        </div>
      )}

      {/* 15-SECOND INCOMING RIDE OFFER CARD */}
      {incomingOffer && (
        <div className="p-4 bg-dark-950 border-2 border-amber-500 rounded-2xl shadow-2xl space-y-3 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              ⚡ Cascading Trip Offer
            </span>
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border border-amber-500/30">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{countdown}s</span>
            </div>
          </div>

          {/* Linear Countdown Bar */}
          <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_#f59e0b]"
              style={{ width: `${(countdown / 15) * 100}%` }}
            ></div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-dark-800">
              <span className="text-zinc-400">Guaranteed Fare</span>
              <span className="text-lg font-black text-emerald-400">₹{incomingOffer.fare}</span>
            </div>
            <div className="py-0.5">
              <span className="text-zinc-400 block text-[10px]">Pickup</span>
              <span className="text-zinc-200 font-semibold">{incomingOffer.pickup}</span>
            </div>
            <div className="py-0.5">
              <span className="text-zinc-400 block text-[10px]">Drop-off</span>
              <span className="text-zinc-200 font-semibold">{incomingOffer.destination}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleRejectOffer}
              disabled={loading}
              className="py-2.5 bg-dark-800 hover:bg-dark-700 text-rose-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-dark-700"
            >
              <XCircle className="w-4 h-4" /> Decline
            </button>
            <button
              onClick={handleAcceptOffer}
              disabled={loading}
              className="py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-1.5 uppercase tracking-wide"
            >
              <CheckCircle className="w-4 h-4" /> Accept Offer
            </button>
          </div>
        </div>
      )}

      {/* RIDE ACCEPTED: TRIP EXECUTION & OTP VERIFICATION */}
      {tripStatus === 'ACCEPTED' && (
        <div className="space-y-3 p-4 bg-dark-950 border border-dark-800 rounded-2xl">
          <div className="flex justify-between items-center border-b border-dark-800 pb-2">
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-black tracking-widest">
                Offer Claimed
              </span>
              <h4 className="text-sm font-bold text-zinc-100">Proceed to Pickup Point</h4>
            </div>
            <span className="text-lg font-black text-emerald-400">₹{activeTrip?.fare}</span>
          </div>

          <p className="text-xs text-zinc-300">
            Passenger: <strong className="text-zinc-100">{activeTrip?.user?.fullname?.firstname}</strong> at{' '}
            <span className="text-emerald-400 font-medium">{activeTrip?.pickup}</span>
          </p>

          {/* GPS Simulation button */}
          <button
            onClick={handleSimulateGPS}
            disabled={isSimulatingDrive}
            className="w-full py-2 bg-dark-850 hover:bg-dark-800 border border-dark-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Play className={`w-3.5 h-3.5 text-amber-400 ${isSimulatingDrive ? 'animate-pulse' : ''}`} />
            {isSimulatingDrive ? 'Simulating Road GPS...' : 'Simulate GPS Drive to Passenger'}
          </button>

          {/* 4-Digit OTP Verification Form */}
          <div className="pt-2 border-t border-dark-800 space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Enter Passenger's 4-Digit OTP:
            </label>

            <div className="flex justify-center gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputsRef.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-11 h-12 bg-dark-900 border border-dark-700 rounded-xl text-center text-lg font-mono font-black text-emerald-400 focus:border-emerald-500 focus:outline-none shadow-inner"
                />
              ))}
            </div>

            <button
              onClick={handleStartRide}
              disabled={loading || otpDigits.join('').length !== 4}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-dark-800 disabled:text-zinc-500 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/30"
            >
              Verify Passcode & Start Trip
            </button>
          </div>
        </div>
      )}

      {/* TRIP IN PROGRESS */}
      {tripStatus === 'IN_PROGRESS' && (
        <div className="space-y-3 p-4 bg-dark-950 border border-emerald-900/60 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> Navigation Active
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Billing Live</span>
          </div>

          <div className="text-xs text-zinc-300">
            Driving to: <span className="text-zinc-100 font-bold">{activeTrip?.destination}</span>
          </div>

          <button
            onClick={handleEndRide}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
          >
            <CheckCheck className="w-4 h-4" /> End Trip & Collect Payment
          </button>
        </div>
      )}

      {/* TRIP COMPLETED */}
      {tripStatus === 'COMPLETED' && (
        <div className="p-5 bg-dark-950 border border-dark-800 rounded-2xl text-center space-y-2 shadow-2xl">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-100">Trip Completed</h4>
          <p className="text-xs text-zinc-400">Earnings credited to wallet. Driver returned to available status.</p>
          <button
            onClick={handleResetTrip}
            className="w-full mt-2 bg-dark-800 hover:bg-dark-700 text-zinc-200 py-2.5 rounded-xl text-xs font-bold transition"
          >
            Ready for Next Ride
          </button>
        </div>
      )}
    </div>
  );
}
