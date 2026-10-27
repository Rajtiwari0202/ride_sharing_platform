import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Car, Shield, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialRole = 'rider' }) {
  const { loginRider, registerRider, loginCaptain, registerCaptain } = useAuth();

  const [role, setRole] = useState(initialRole); // 'rider' | 'captain'
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Captain Vehicle Fields
  const [color, setColor] = useState('Obsidian Black');
  const [plate, setPlate] = useState('DL-01-AB-1234');
  const [capacity, setCapacity] = useState(4);
  const [vehicleType, setVehicleType] = useState('car');

  if (!isOpen) return null;

  // Auto-fill demo credentials
  const fillDemoRider = () => {
    setRole('rider');
    setIsRegister(false);
    setEmail('john@example.com');
    setPassword('password123');
  };

  const fillDemoCaptain = () => {
    setRole('captain');
    setIsRegister(false);
    setEmail('alex.captain@example.com');
    setPassword('captainpassword123');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (role === 'rider') {
        if (isRegister) {
          await registerRider({ firstname, lastname, email, password });
        } else {
          await loginRider(email, password);
        }
      } else {
        if (isRegister) {
          await registerCaptain({
            firstname,
            lastname,
            email,
            password,
            vehicle: { color, plate, capacity: parseInt(capacity), vehicleType }
          });
        } else {
          await loginCaptain(email, password);
        }
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-emerald-500 to-amber-500 blur-sm"></div>

        {/* Role Switcher */}
        <div className="grid grid-cols-2 p-1 bg-dark-950 border border-dark-800 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setRole('rider'); setError(null); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              role === 'rider'
                ? 'bg-dark-850 text-emerald-400 border border-emerald-500/30 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-4 h-4" /> Rider Portal
          </button>
          <button
            type="button"
            onClick={() => { setRole('captain'); setError(null); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              role === 'captain'
                ? 'bg-dark-850 text-amber-400 border border-amber-500/30 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Car className="w-4 h-4" /> Captain Portal
          </button>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
            {role === 'rider' ? 'Rider Authentication' : 'Captain (Driver) Sign In'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isRegister
              ? `Create your ${role === 'rider' ? 'rider' : 'captain'} account`
              : `Sign in to access the ${role === 'rider' ? 'booking' : 'dispatch'} console`}
          </p>
        </div>

        {/* Quick Demo Credentials Bar */}
        <div className="mb-4 p-2.5 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Fill Demo:
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={fillDemoRider}
              className="px-2 py-1 bg-dark-800 hover:bg-dark-700 text-emerald-400 rounded-md text-[11px] font-semibold border border-emerald-500/20"
            >
              Demo Rider
            </button>
            <button
              type="button"
              onClick={fillDemoCaptain}
              className="px-2 py-1 bg-dark-800 hover:bg-dark-700 text-amber-400 rounded-md text-[11px] font-semibold border border-amber-500/20"
            >
              Demo Captain
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegister && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 font-medium block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-medium block mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="e.g. Smith"
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-zinc-400 font-medium block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. driver@example.com"
              className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-zinc-400 font-medium block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Captain Vehicle Fields (Registration only) */}
          {role === 'captain' && isRegister && (
            <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-2.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Vehicle Profile
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-0.5">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="car">Car</option>
                    <option value="auto">Auto</option>
                    <option value="motorcycle">Moto</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-0.5">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-0.5">Color</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="White / Black"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-0.5">Plate Number</label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="DL-01-AB-1234"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:border-amber-500 focus:outline-none uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-white shadow-lg ${
              role === 'rider'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
            }`}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-4 pt-3 border-t border-dark-800 text-center text-xs text-zinc-400">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="text-zinc-200 font-bold hover:underline"
          >
            {isRegister ? 'Sign In instead' : 'Create an Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
